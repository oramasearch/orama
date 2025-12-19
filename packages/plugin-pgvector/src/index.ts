import type { AnyOrama, OramaPluginSync } from '@orama/orama'
import { remove } from '@orama/orama'
import { PgvectorManager } from './pgvector-manager.js'

// Global map to store managers by Orama instance ID
const pgvectorManagers = new Map<string, PgvectorManager>()
// Store original documents with vectors before Orama processes them
const originalDocuments = new Map<string, any>()
// Flag to prevent afterRemove when removing from memory
let removingFromMemory = false

export type PgvectorPluginOptions = {
  connectionString: string
  tableName?: string
  dimension: number
  memoryLimit?: number | string // Memory limit for document caching
  lazyLoad?: boolean // Load documents on demand
  maxMemoryDocs?: number // Maximum documents to keep in memory
  vectorSearchOnly?: boolean // Skip loading full documents for vector search (IDs + scores only)
}

export function pluginPgvector(options: PgvectorPluginOptions): OramaPluginSync {
  if (!options.connectionString) {
    throw new Error('PostgreSQL connection string is required')
  }
  if (!options.dimension || options.dimension <= 0) {
    throw new Error('Vector dimension must be a positive number')
  }

  const tableName = options.tableName || 'orama_documents'
  const memoryLimit = options.memoryLimit || '500MB'
  const lazyLoad = options.lazyLoad ?? true
  const maxMemoryDocs = options.maxMemoryDocs || 10000
  const vectorSearchOnly = options.vectorSearchOnly ?? false

  return {
    name: 'orama-plugin-pgvector',

    beforeInsert: function beforeInsert(orama: AnyOrama, id: string, doc: any) {
      // 🚫 PREVENT: Remove ALL properties including id before Orama indexes them (zero memory mode)
      
      // Store original document with all properties for PostgreSQL storage
      originalDocuments.set(id, { ...doc })
      
      // Remove ALL properties from the document Orama will index - ZERO indexing
      for (const prop in doc) {
        delete doc[prop]
      }
      
      // Modify in place, no return needed
    },

    afterCreate: async function afterCreate(orama: AnyOrama) {
      // Store manager synchronously first
      const manager = new PgvectorManager({
        connectionString: options.connectionString,
        tableName,
        dimension: options.dimension,
        memoryLimit,
        lazyLoad,
        maxMemoryDocs,
        vectorSearchOnly
      })
      pgvectorManagers.set(orama.id, manager)

      // Initialize the database table asynchronously
      try {
        await manager.initializeTable(orama.schema)

        // Load existing documents based on configuration
        if (!lazyLoad) {
          await manager.loadAllDocuments(orama)
        }
      } catch (error) {
        // Remove manager if initialization failed
        pgvectorManagers.delete(orama.id)
        throw error
      }
    },

    afterInsert: async function afterInsert(orama: AnyOrama, id: string, doc: any) {
      const manager = pgvectorManagers.get(orama.id)
      if (!manager) return

      // Use original document with vectors for PostgreSQL storage
      const originalDoc = originalDocuments.get(id) || doc
      await manager.insertDocument(id, originalDoc)
      
      // 🚫 MEMORY: Remove document from Orama's memory to save space (vector-only mode)
      removingFromMemory = true
      await remove(orama, id)
      removingFromMemory = false
      
      // Clean up stored document
      originalDocuments.delete(id)
    },

    afterRemove: async function afterRemove(orama: AnyOrama, id: string, doc: any) {
      // Skip if we're removing from memory (no PG operation needed)
      if (removingFromMemory) return
      
      const manager = pgvectorManagers.get(orama.id)
      if (!manager) return

      // Remove document from PostgreSQL
      await manager.removeDocument(id)
      
      // Clean up any stored original document
      originalDocuments.delete(id)
    },

    afterSearch: async function afterSearch(orama: AnyOrama, params: any, language: string | undefined, results: any) {
      const manager = pgvectorManagers.get(orama.id)
      if (!manager) return

    // Handle vector search
    if (params.mode === 'vector' && params.vector) {
      const vectorProperty = params.vector.property
      const queryVector = params.vector.value
      const similarity = params.similarity || 0.8
      const limit = params.limit || 10

      // Perform vector search in pgvector
      const searchResults = await manager.vectorSearch(
        vectorProperty,
        queryVector,
        limit,
        similarity
      )

      if (vectorSearchOnly) {
        // Memory-efficient mode: return only IDs and scores
        results.hits = searchResults.map(([docId, score]: [string, number]) => ({
          id: docId,
          score
          // No document field - saves memory
        }))
      } else {
        // Load full documents and format results
        results.hits = await Promise.all(
          searchResults.map(async ([docId, score]: [string, number]) => {
            const document = await manager.getDocument(docId, orama)
            return {
              id: docId,
              score,
              document
            }
          })
        )
      }

      results.count = results.hits.length
      return
    }      // For text search, let Orama handle it with documents in memory
      // The manager ensures frequently searched documents are cached
      if (manager.getLazyLoad() && results.hits) {
        // Preload documents that were found in search results
        await Promise.all(
          results.hits.map(async (hit: any) => {
            if (!manager.isDocumentInMemory(hit.id)) {
              await manager.loadDocumentIntoMemory(hit.id, orama)
            }
          })
        )
      }
    }

    // Custom methods for advanced usage
    // getPgvectorManager: (orama: AnyOrama) => pgvectorManagers.get(orama)
  }
}