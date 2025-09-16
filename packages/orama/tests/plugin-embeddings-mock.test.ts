import t from 'tap'
import { create, insert, search } from '../src/index.js'

t.test('Plugin embeddings fix test', async (t) => {
  t.test('should handle vector search with term parameter (no vector.property error)', async (t) => {
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

          const mockEmbedding = new Array(5).fill(0).map((_, i) => Math.sin(i / 2 + params.term.length / 10))

          if (!params.vector) {
            params.vector = {
              property: 'embeddings',
              value: mockEmbedding
            }
          }
        }
      }
    }

    const db = create({
      schema: {
        title: 'string',
        content: 'string',
        embeddings: 'vector[5]'
      },
      plugins: [mockEmbeddingsPlugin()]
    })

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

    const results = await search(db, {
      mode: 'vector',
      term: 'quick brown fox'
    })

    t.ok(results, 'search completed successfully')
    t.ok(results.hits, 'search results have hits')
    t.ok(results.count >= 0, 'search results have count')

    t.pass('Vector search with term parameter works without property undefined error')
  })

  t.test('should still work with explicit vector parameter', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        embeddings: 'vector[5]'
      }
    })

    await insert(db, {
      title: 'Test Document',
      embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
    })

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
