import { Pool } from 'pg'

interface DocumentRow {
  id: string
  similarity?: string
  document?: any
}

export type PgvectorManagerOptions = {
  connectionString: string
  tableName: string
  dimension: number
  memoryLimit: number | string
  lazyLoad: boolean
  maxMemoryDocs: number
  vectorSearchOnly?: boolean
}

export class PgvectorManager {
  private pool: Pool
  private tableName: string
  private dimension: number
  private memoryLimit: number
  private lazyLoad: boolean
  private maxMemoryDocs: number
  private vectorSearchOnly: boolean
  private memoryCache = new Map<string, any>()
  private accessOrder: string[] = []

  constructor(options: PgvectorManagerOptions) {
    this.pool = new Pool({ connectionString: options.connectionString })
    this.tableName = options.tableName
    this.dimension = options.dimension
    this.lazyLoad = options.lazyLoad
    this.maxMemoryDocs = options.maxMemoryDocs
    this.vectorSearchOnly = options.vectorSearchOnly ?? false

    // Parse memory limit
    if (typeof options.memoryLimit === 'string') {
      const match = options.memoryLimit.match(/^(\d+)(MB|GB)?$/)
      if (match) {
        const value = parseInt(match[1])
        const unit = match[2] || 'MB'
        this.memoryLimit = unit === 'GB' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024
      } else {
        this.memoryLimit = 500 * 1024 * 1024 // Default 500MB
      }
    } else {
      this.memoryLimit = options.memoryLimit
    }
  }

  async initializeTable(schema: any): Promise<void> {
    const client = await this.pool.connect()

    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector')

      // Create documents table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id VARCHAR(255) PRIMARY KEY,
          document JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `
      await client.query(createTableQuery)

      // Add vector columns based on schema
      for (const [fieldName, fieldType] of Object.entries(schema)) {
        if (typeof fieldType === 'string' && fieldType.startsWith('vector[')) {
          const vectorColumn = `${fieldName}_vector`
          const addColumnQuery = `
            ALTER TABLE ${this.tableName}
            ADD COLUMN IF NOT EXISTS ${vectorColumn} VECTOR(${this.dimension})
          `
          await client.query(addColumnQuery)

          // Create vector index
          const indexName = `${this.tableName}_${fieldName}_idx`
          const createIndexQuery = `
            CREATE INDEX IF NOT EXISTS ${indexName}
            ON ${this.tableName}
            USING ivfflat (${vectorColumn} vector_cosine_ops)
          `
          await client.query(createIndexQuery)
        }
      }

      // Create indexes for common fields
      const commonFields = ['title', 'category', 'author', 'created_at']
      for (const field of commonFields) {
        if (schema[field]) {
          const indexQuery = `
            CREATE INDEX IF NOT EXISTS ${this.tableName}_${field}_idx
            ON ${this.tableName} ((document->>'${field}'))
          `
          await client.query(indexQuery)
        }
      }

      // Create full-text search index
      const ftsIndexQuery = `
        CREATE INDEX IF NOT EXISTS ${this.tableName}_content_fts_idx
        ON ${this.tableName}
        USING gin (to_tsvector('english', document->>'content'))
      `
      await client.query(ftsIndexQuery)

    } finally {
      client.release()
    }
  }

  async insertDocument(id: string, document: any): Promise<void> {
    const client = await this.pool.connect()

    try {
      // Prepare vector columns and create document without vectors for JSONB storage
      const vectorColumns: string[] = []
      const vectorValues: any[] = []
      const vectorPlaceholders: string[] = []
      const documentWithoutVectors = { ...document } // Copy document

      let placeholderIndex = 3 // 1 is for id, 2 is for document, 3+ for vectors

      for (const [key, value] of Object.entries(document)) {
        if (Array.isArray(value) && value.length === this.dimension &&
            typeof value[0] === 'number') {
          // This looks like a vector - store separately and remove from document
          vectorColumns.push(`${key}_vector`)
          vectorValues.push(`[${value.join(',')}]`)  // Convert array to pgvector string format
          vectorPlaceholders.push(`$${placeholderIndex}`)
          placeholderIndex++

          // Remove vector from document to avoid duplication
          delete documentWithoutVectors[key]
        }
      }

      // Build the query
      const columns = ['id', 'document', ...vectorColumns]
      const placeholders = ['$1', '$2', ...vectorPlaceholders]
      const values = [id, JSON.stringify(documentWithoutVectors), ...vectorValues]

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (id) DO UPDATE SET
          document = EXCLUDED.document,
          updated_at = NOW()
          ${vectorColumns.map(col => `, ${col} = EXCLUDED.${col}`).join('')}
      `

      const result = await client.query(query, values)

      // Update memory cache with original document (including vectors)
      this.updateMemoryCache(id, document)

    } finally {
      client.release()
    }
  }

  async removeDocument(id: string): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id])

      // Remove from memory cache
      this.memoryCache.delete(id)
      const index = this.accessOrder.indexOf(id)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }

    } finally {
      client.release()
    }
  }

  async vectorSearch(
    vectorProperty: string,
    queryVector: number[],
    limit: number = 10,
    similarity: number = 0.8
  ): Promise<Array<[string, number]>> {
    const client = await this.pool.connect()

    try {
      const vectorColumn = `${vectorProperty}_vector`
      const query = `
        SELECT id, 1 - (${vectorColumn} <=> $1) as similarity
        FROM ${this.tableName}
        WHERE ${vectorColumn} IS NOT NULL
        AND 1 - (${vectorColumn} <=> $1) >= $2
        ORDER BY ${vectorColumn} <=> $1
        LIMIT $3
      `

      const result = await client.query(query, [`[${queryVector.join(',')}]`, similarity, limit])

      return result.rows.map((row: DocumentRow) => [row.id, parseFloat(row.similarity || '0')])

    } finally {
      client.release()
    }
  }

  async getDocument(id: string, orama?: any): Promise<any> {
    // Check memory cache first
    if (this.memoryCache.has(id)) {
      this.updateAccessOrder(id)
      return this.memoryCache.get(id)
    }

    // Load from database
    const client = await this.pool.connect()

    try {
      // Get both document and vectors
      const result = await client.query(
        `SELECT document, embedding_vector FROM ${this.tableName} WHERE id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      const document = result.rows[0].document
      const embeddingVector = result.rows[0].embedding_vector

      // Reconstruct full document with embedding
      const fullDocument = { ...document }
      if (embeddingVector) {
        // Parse the vector string back to array if needed
        // pgvector returns vectors as strings like '[1,2,3]'
        if (typeof embeddingVector === 'string' && embeddingVector.startsWith('[')) {
          fullDocument.embedding = embeddingVector
            .slice(1, -1) // Remove brackets
            .split(',')   // Split by comma
            .map((v: string) => parseFloat(v.trim())) // Parse to numbers
        } else {
          fullDocument.embedding = embeddingVector
        }
      }

      // Cache in memory
      this.updateMemoryCache(id, fullDocument)

      return fullDocument

    } finally {
      client.release()
    }
  }

  async loadAllDocuments(orama: any): Promise<void> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(`SELECT id, document, embedding_vector FROM ${this.tableName}`)

      for (const row of result.rows) {
        // Reconstruct full document with embedding
        const fullDocument = { ...row.document }
        if (row.embedding_vector) {
          if (typeof row.embedding_vector === 'string' && row.embedding_vector.startsWith('[')) {
            fullDocument.embedding = row.embedding_vector
              .slice(1, -1)
              .split(',')
              .map((v: string) => parseFloat(v.trim()))
          } else {
            fullDocument.embedding = row.embedding_vector
          }
        }

        // Insert into Orama
        await orama.insert(fullDocument)

        // Cache in memory
        this.updateMemoryCache(row.id, fullDocument)
      }

    } finally {
      client.release()
    }
  }

  async loadDocumentIntoMemory(id: string, orama: any): Promise<void> {
    const document = await this.getDocument(id)
    if (document) {
      // Insert into Orama if not already there
      try {
        await orama.insert(document)
      } catch (error) {
        // Document might already exist, ignore
      }
    }
  }

  isDocumentInMemory(id: string): boolean {
    return this.memoryCache.has(id)
  }

  getLazyLoad(): boolean {
    return this.lazyLoad
  }

  private updateMemoryCache(id: string, document: any): void {
    // Check memory limit
    if (this.memoryCache.size >= this.maxMemoryDocs) {
      // Remove least recently used
      const lruId = this.accessOrder.shift()
      if (lruId) {
        this.memoryCache.delete(lruId)
      }
    }

    // Add/update in cache
    this.memoryCache.set(id, document)
    this.updateAccessOrder(id)
  }

  private updateAccessOrder(id: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(id)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }

    // Add to end (most recently used)
    this.accessOrder.push(id)
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}