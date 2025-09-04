import t from 'tap'
import { create, insertMultiple, search } from '../src/index.js'

t.test('create', async (t) => {
  t.test('should create a vector instance', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        description: 'string',
        embedding: 'vector[1536]'
      } as const
    })

    t.ok(db, 'db instance created')
  })

  t.test('should throw an error if no vector size is provided', async (t) => {
    try {
      await create({
        schema: {
          title: 'string',
          description: 'string',
          embedding: 'vector[]'
        } as const
      })
    } catch (err) {
      t.ok(err, 'error thrown')
    }
  })

  t.test('should throw an error if vector size is not a number', async (t) => {
    try {
      await create({
        schema: {
          title: 'string',
          description: 'string',
          embedding: 'vector[foo]'
        } as const
      })
    } catch (err) {
      t.ok(err, 'error thrown')
    }
  })
})

t.test('search', async (t) => {
  t.test('should return the most similar vectors', async (t) => {
    const db = await create({
      schema: {
        vector: 'vector[5]'
      } as const
    })

    await insertMultiple(db, [{ vector: [1, 1, 1, 1, 1] }, { vector: [0, 1, 1, 1, 1] }, { vector: [0, 0, 1, 1, 1] }])

    const results = await search(db, {
      mode: 'vector',
      vector: {
        value: [1, 1, 1, 1, 1],
        property: 'vector'
      },
      includeVectors: true
    })

    t.same(results.count, 2)
    t.same(results.hits[0].document.vector, [1, 1, 1, 1, 1])
    t.same(results.hits[1].document.vector, [0, 1, 1, 1, 1])
  })

  t.test('should search through nested properties', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        vectors: {
          embedding: 'vector[5]'
        }
      } as const
    })

    await insertMultiple(db, [
      { title: 'foo', vectors: { embedding: [1, 1, 1, 1, 1] } },
      { title: 'bar', vectors: { embedding: [0, 1, 1, 1, 1] } },
      { title: 'baz', vectors: { embedding: [0, 0, 1, 1, 1] } }
    ])

    const results = await search(db, {
      mode: 'vector',
      vector: {
        value: [1, 1, 1, 1, 1],
        property: 'vectors.embedding'
      },
      includeVectors: true
    })

    t.same(results.count, 2)
    t.same((results.hits[0].document as any).vectors.embedding, [1, 1, 1, 1, 1])
    t.same((results.hits[1].document as any).vectors.embedding, [0, 1, 1, 1, 1])
  })

  t.test('should search through deeply nested properties', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        deeply: {
          nested: {
            vectors: 'vector[5]'
          }
        }
      } as const
    })

    await insertMultiple(db, [
      { title: 'foo', deeply: { nested: { vectors: [1, 1, 1, 1, 1] } } },
      { title: 'bar', deeply: { nested: { vectors: [0, 1, 1, 1, 1] } } },
      { title: 'baz', deeply: { nested: { vectors: [0, 0, 1, 1, 1] } } }
    ])

    const results = await search(db, {
      mode: 'vector',
      vector: {
        value: [1, 1, 1, 1, 1],
        property: 'deeply.nested.vectors'
      },
      includeVectors: true
    })

    t.same(results.count, 2)
    t.same((results.hits[0].document as any).deeply.nested.vectors, [1, 1, 1, 1, 1])
    t.same((results.hits[1].document as any).deeply.nested.vectors, [0, 1, 1, 1, 1])
  })

  t.test('should be able to work on multiple vector properties at creation time', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        vectors: {
          embedding: 'vector[5]',
          embedding_2: 'vector[6]'
        }
      } as const
    })

    await insertMultiple(db, [
      { title: 'foo', vectors: { embedding: [1, 1, 1, 1, 1], embedding_2: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2] } },
      { title: 'bar', vectors: { embedding: [0, 1, 1, 1, 1], embedding_2: [0.2, 0.02, 0.1, 0.1, 0.1, 0.1] } },
      { title: 'baz', vectors: { embedding: [0, 0, 1, 1, 1], embedding_2: [0.2, 0.2, 0.21, 0.21, 0.21, 0.21] } }
    ])

    const results1 = await search(db, {
      mode: 'vector',
      vector: {
        value: [1, 1, 1, 1, 1],
        property: 'vectors.embedding'
      },
      includeVectors: true
    })

    const results2 = await search(db, {
      mode: 'vector',
      vector: {
        value: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        property: 'vectors.embedding_2'
      },
      includeVectors: true
    })

    t.same(results1.count, 2)
    t.same((results1.hits[0].document as any).vectors.embedding, [1, 1, 1, 1, 1])
    t.same((results1.hits[1].document as any).vectors.embedding, [0, 1, 1, 1, 1])

    t.same(results2.count, 3)
    t.same((results2.hits[0].document as any).vectors.embedding_2, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2])
    t.same((results2.hits[1].document as any).vectors.embedding_2, [0.2, 0.2, 0.21, 0.21, 0.21, 0.21])
    t.same((results2.hits[2].document as any).vectors.embedding_2, [0.2, 0.02, 0.1, 0.1, 0.1, 0.1])
  })

  t.test('should throw an error when using unknown vector property', async (t) => {
    const db = await create({
      schema: {
        title: 'string',
        embedding: 'vector[5]'
      } as const
    })

    await insertMultiple(db, [{ title: 'foo', embedding: [1, 1, 1, 1, 1] }])

    try {
      await search(db, {
        mode: 'vector',
        vector: {
          value: [1, 1, 1, 1, 1],
          property: 'nonexistent_vector'
        }
      })
      t.fail('Should have thrown an error')
    } catch (err: any) {
      t.ok(err.message.includes('Unknown vector property "nonexistent_vector"'), 'error message contains property name')
      t.same(err.code, 'UNKNOWN_VECTOR_PROPERTY', 'correct error code')
    }
  })
})

t.test('vector search with where clause', async (t) => {
  const db = await create({
    schema: {
      embedding: 'vector[5]',
      rating: 'number'
    } as const
  })

  const [, id2] = await insertMultiple(db, [
    { embedding: [1, 1, 1, 1, 1], rating: 4.5 },
    { embedding: [0, 1, 1, 1, 1], rating: 4.3 },
    { embedding: [0, 0, 1, 1, 1], rating: 4.1 }
  ])

  const results = await search(db, {
    mode: 'vector',
    vector: {
      value: [1, 1, 1, 1, 1],
      property: 'embedding'
    },
    where: {
      rating: {
        eq: 4.3
      }
    }
  })

  t.same(results.count, 1)
  t.same(results.hits[0].id, id2)
})

t.test('vector search with facets', async (t) => {
  const db = await create({
    schema: {
      embedding: 'vector[5]',
      rating: 'number'
    } as const
  })

  await insertMultiple(db, [
    { embedding: [1, 1, 1, 1, 1], rating: 1 },
    { embedding: [0, 1, 1, 1, 1], rating: 2 },
    { embedding: [0, 0, 1, 1, 1], rating: 4 }
  ])

  const results = await search(db, {
    mode: 'vector',
    vector: {
      value: [1, 1, 1, 1, 1],
      property: 'embedding'
    },
    similarity: 0,
    facets: {
      rating: {
        ranges: [
          { from: 0, to: 1 },
          { from: 1, to: 3 },
          { from: 3, to: 5 }
        ]
      }
    }
  })

  t.same(results.count, 3)
  t.same(results.facets?.rating.values['0-1'], 1)
  t.same(results.facets?.rating.values['1-3'], 2)
  t.same(results.facets?.rating.values['3-5'], 1)
})
