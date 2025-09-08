import t from 'tap'
import { create, insert, save, load, search } from '../src/index.js'

t.test('Plugin embeddings serialization', async (t) => {
  t.test('should persist embeddings added by beforeInsert hook', async (t) => {
    function mockEmbeddingsPlugin() {
      return {
        name: 'mock-embeddings-plugin',

        async beforeInsert(_db, _id, doc) {
          const mockEmbedding = new Array(5).fill(0).map((_, i) => Math.sin(i / 2 + doc.title.length / 10))

          doc.embedding = mockEmbedding
        }
      }
    }

    const db = create({
      schema: {
        title: 'string',
        embedding: 'vector[5]'
      },
      plugins: [mockEmbeddingsPlugin()]
    })

    await insert(db, {
      title: 'Test document'
    })

    const searchResults = await search(db, {
      term: '',
      properties: ['title'],
      includeVectors: true
    })

    t.ok(searchResults.count === 1, 'document inserted')
    t.ok(searchResults.hits[0].document.embedding, 'document has embedding')
    t.ok(Array.isArray(searchResults.hits[0].document.embedding), 'embedding is array')
    t.ok(searchResults.hits[0].document.embedding.length === 5, 'embedding has correct size')

    const serialized = save(db)

    t.ok(serialized.index.vectorIndexes, 'vector indexes present in serialized data')
    t.ok(serialized.index.vectorIndexes.embedding, 'embedding vector index present')
    t.ok(serialized.index.vectorIndexes.embedding.vectors.length === 1, 'one vector in index')

    const newDb = create({
      schema: {
        title: 'string',
        embedding: 'vector[5]'
      }
    })

    load(newDb, serialized)

    const restoredResults = await search(newDb, {
      term: '',
      properties: ['title'],
      includeVectors: true
    })

    t.ok(restoredResults.count === 1, 'document restored')
    t.ok(restoredResults.hits[0].document.embedding, 'restored document has embedding')
    t.same(
      restoredResults.hits[0].document.embedding,
      searchResults.hits[0].document.embedding,
      'embedding values preserved after restoration'
    )

    const vectorSearchResults = await search(newDb, {
      mode: 'vector',
      vector: {
        property: 'embedding',
        value: searchResults.hits[0].document.embedding
      }
    })

    t.ok(vectorSearchResults.count === 1, 'vector search works after restoration')
    t.ok(vectorSearchResults.hits[0].score === 1, 'perfect similarity match')
  })

  t.test('should work with multiple documents and embeddings', async (t) => {
    function mockEmbeddingsPlugin() {
      return {
        name: 'mock-embeddings-plugin',

        async beforeInsert(_db, _id, doc) {
          const seed = doc.title.length
          const mockEmbedding = new Array(3).fill(0).map((_, i) => (seed + i) / 10)

          doc.embedding = mockEmbedding
        }
      }
    }

    const db = await create({
      schema: {
        title: 'string',
        embedding: 'vector[3]'
      },
      plugins: [mockEmbeddingsPlugin()]
    })

    await insert(db, { title: 'Doc A' })
    await insert(db, { title: 'Doc B' })

    const allDocs = await search(db, {
      term: '',
      properties: ['title'],
      includeVectors: true
    })

    t.ok(allDocs.count === 2, 'both documents inserted')

    const originalEmbeddings = new Map()
    for (const hit of allDocs.hits) {
      t.ok(hit.document.embedding, `original document "${hit.document.title}" has embedding`)
      t.ok(hit.document.embedding.length === 3, 'embedding has correct size')
      originalEmbeddings.set(hit.document.title, [...hit.document.embedding]) // Copy array
    }

    const serialized = save(db)

    t.ok(serialized.index.vectorIndexes.embedding, 'vector index serialized')
    t.ok(serialized.index.vectorIndexes.embedding.vectors.length === 2, 'both vectors in index')

    t.ok(serialized.docs, 'documents serialized')
    t.ok(Object.keys(serialized.docs).length > 0, 'serialized documents exist')

    const newDb = create({
      schema: {
        title: 'string',
        embedding: 'vector[3]'
      }
    })
    load(newDb, serialized)

    const restoredDocs = await search(newDb, {
      term: '',
      properties: ['title'],
      includeVectors: true
    })

    t.ok(restoredDocs.count === 2, 'both documents restored')

    const documentsToTest = [] as any[]
    for (let i = 0; i < restoredDocs.hits.length; i++) {
      const hit = restoredDocs.hits[i]
      const originalEmbedding = originalEmbeddings.get(hit.document.title)

      if (!hit.document.embedding) {
        t.fail(`Document "${hit.document.title}" missing embedding after restoration`)
        continue
      }

      t.ok(hit.document.embedding, `restored document "${hit.document.title}" has embedding`)

      if (originalEmbedding && hit.document.embedding) {
        t.same(hit.document.embedding, originalEmbedding, `embedding preserved for "${hit.document.title}"`)

        documentsToTest.push({
          title: hit.document.title,
          embedding: [...hit.document.embedding]
        })
      }
    }

    for (const docInfo of documentsToTest) {
      const vectorResults = await search(newDb, {
        mode: 'vector',
        vector: {
          property: 'embedding',
          value: docInfo.embedding
        }
      })

      t.ok(vectorResults.count >= 1, `vector search works for "${docInfo.title}"`)
    }
  })
})
