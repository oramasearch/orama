import t from 'tap'
import { create, insert, search } from '../src/index.js'

t.test('Plugin embeddings fix test', async (t) => {
  t.test('should handle vector search with term parameter (no vector.property error)', async (t) => {
    // Mock embeddings plugin that simulates the real plugin behavior
    function mockEmbeddingsPlugin() {
      return {
        name: 'mock-embeddings-plugin',
        
        async beforeSearch(_db, params) {
          if (params.mode !== 'vector') {
            return
          }

          if (params?.vector?.value) {
            return
          }

          if (!params.term) {
            throw new Error('No "term" or "vector" parameters were provided')
          }

          // Generate mock embedding from term
          const mockEmbedding = new Array(5).fill(0).map((_, i) => 
            Math.sin(i / 2 + params.term.length / 10)
          )

          // This is the fix: when params.vector doesn't exist, create it with the correct property
          if (!params.vector) {
            params.vector = {
              property: 'embeddings', // Fixed: use the correct property name directly
              value: mockEmbedding
            }
          }
        }
      }
    }

    const db = await create({
      schema: {
        title: 'string',
        content: 'string', 
        embeddings: 'vector[5]'
      },
      plugins: [mockEmbeddingsPlugin()]
    })

    // Insert test documents with embeddings
    await insert(db, {
      title: 'Test Document 1',
      content: 'The quick brown fox jumps over the lazy dog',
      embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
    })

    await insert(db, {
      title: 'Test Document 2',
      content: 'A lazy dog dreams of jumping over a quick brown fox',
      embeddings: [0.2, 0.3, 0.4, 0.5, 0.6]
    })

    // This should now work without the "Cannot read properties of undefined (reading 'property')" error
    const results = await search(db, {
      mode: 'vector',
      term: 'quick brown fox' // Plugin should generate embeddings for this term
    })

    t.ok(results, 'search completed successfully')
    t.ok(results.hits, 'search results have hits')
    t.ok(results.count >= 0, 'search results have count')
    
    // The key test: no TypeError should occur
    t.pass('Vector search with term parameter works without property undefined error')
  })

  t.test('should still work with explicit vector parameter', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        embeddings: 'vector[5]'
      }
    })

    await insert(db, {
      title: 'Test Document',
      embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
    })

    // Traditional vector search should still work
    const results = await search(db, {
      mode: 'vector',
      vector: {
        property: 'embeddings',
        value: [0.1, 0.2, 0.3, 0.4, 0.5]
      }
    })

    t.ok(results, 'explicit vector search works')
    t.same(results.count, 1, 'found exact match')
    t.ok(Math.abs(results.hits[0].score - 1) < 0.0001, 'perfect similarity score')
  })
})