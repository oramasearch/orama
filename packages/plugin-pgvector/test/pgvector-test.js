import t from 'tap'
import { create, insert, search } from '@orama/orama'
import { pluginPgvector } from '../src/index.js'

// Mock embedding function for testing (deterministic)
function generateMockEmbedding(text, dimension = 384) {
  const words = text.toLowerCase().split(/\s+/)
  const vector = new Array(dimension).fill(0)
  
  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i)
      const index = (charCode + i + wordIndex) % dimension
      vector[index] += charCode / (100 + wordIndex)
    }
  })
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector
}

const DIMENSION = 384

// Skip database tests if no connection string (CI-friendly)
const shouldSkipDbTests = !process.env.NEON_CONNECTION_STRING

t.test('plugin-pgvector basic functionality', async (t) => {
  if (shouldSkipDbTests) {
    t.skip('Skipping - NEON_CONNECTION_STRING not set')
    return
  }

  const db = await create({
    schema: {
      id: 'string',
      title: 'string',
      content: 'string',
      embedding: `vector[${DIMENSION}]`
    },
    plugins: [
      pluginPgvector({
        connectionString: process.env.NEON_CONNECTION_STRING,
        tableName: 'test_pgvector_basic',
        dimension: DIMENSION,
        memoryLimit: '50MB',
        lazyLoad: true
      })
    ]
  })

  t.ok(db, 'Database created')
  t.ok(db.plugins, 'Plugins registered')
  t.equal(db.plugins.length, 1, 'One plugin registered')
})

t.test('insert and search with vectors', async (t) => {
  if (shouldSkipDbTests) {
    t.skip('Skipping - NEON_CONNECTION_STRING not set')
    return
  }

  const db = await create({
    schema: {
      id: 'string',
      title: 'string',
      content: 'string',
      embedding: `vector[${DIMENSION}]`
    },
    plugins: [
      pluginPgvector({
        connectionString: process.env.NEON_CONNECTION_STRING,
        tableName: 'test_pgvector_search',
        dimension: DIMENSION,
        memoryLimit: '50MB',
        lazyLoad: true
      })
    ]
  })

  // Insert documents with embeddings
  await insert(db, {
    id: 'doc1',
    title: 'Machine Learning',
    content: 'Introduction to ML',
    embedding: generateMockEmbedding('Machine Learning Introduction to ML', DIMENSION)
  })

  await insert(db, {
    id: 'doc2',
    title: 'Deep Learning',
    content: 'Neural networks',
    embedding: generateMockEmbedding('Deep Learning Neural networks', DIMENSION)
  })

  // Wait for writes
  await new Promise(resolve => setTimeout(resolve, 500))

  // Perform vector search
  const queryEmbedding = generateMockEmbedding('machine learning', DIMENSION)
  const results = await search(db, {
    mode: 'vector',
    vector: {
      property: 'embedding',
      value: queryEmbedding
    },
    similarity: 0.3,
    limit: 5
  })

  t.ok(results, 'Search results returned')
  t.ok(results.hits, 'Search hits exist')
})

t.test('plugin hooks are registered', async (t) => {
  if (shouldSkipDbTests) {
    t.skip('Skipping - NEON_CONNECTION_STRING not set')
    return
  }

  const db = await create({
    schema: {
      id: 'string',
      title: 'string',
      embedding: `vector[${DIMENSION}]`
    },
    plugins: [
      pluginPgvector({
        connectionString: process.env.NEON_CONNECTION_STRING,
        tableName: 'test_pgvector_hooks',
        dimension: DIMENSION,
        memoryLimit: '50MB',
        lazyLoad: true
      })
    ]
  })

  t.ok(db.afterInsert, 'afterInsert hook exists')
  t.ok(db.afterSearch, 'afterSearch hook exists')
  t.ok(db.afterInsert.length > 0, 'afterInsert has handlers')
  t.ok(db.afterSearch.length > 0, 'afterSearch has handlers')
})
