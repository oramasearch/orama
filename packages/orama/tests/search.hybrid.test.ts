import t from 'tap'
import { search, insertMultiple, create } from '../src/index.js'

t.test('hybrid search', async (t) => {
  t.test('should return results', async (t) => {
    const db = await create({
      schema: {
        text: 'string',
        embedding: 'vector[5]',
        number: 'number'
      } as const
    })

    await insertMultiple(db, [
      { text: 'hello world', embedding: [1, 2, 3, 4, 5], number: 1 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 2 }
    ])

    const results = await search(db, {
      mode: 'hybrid',
      term: 'hello',
      vector: {
        value: [1, 2, 3, 4, 5],
        property: 'embedding'
      },
      similarity: 1
    })

    t.equal(results.count, 2)
  })

  t.test('should return results with filters', async (t) => {
    const db = await create({
      schema: {
        text: 'string',
        embedding: 'vector[5]',
        number: 'number'
      } as const
    })

    await insertMultiple(db, [
      { text: 'hello world', embedding: [1, 2, 3, 4, 5], number: 1 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 2 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 3 }
    ])

    const results1 = await search(db, {
      mode: 'hybrid',
      term: 'hello',
      vector: {
        property: 'embedding',
        value: [1, 2, 3, 4, 4]
      },
      similarity: 1,
      where: {
        number: {
          eq: 3
        }
      }
    })

    const results2 = await search(db, {
      mode: 'hybrid',
      term: 'hello',
      vector: {
        property: 'embedding',
        value: [1, 2, 3, 4, 4]
      },
      similarity: 0.99,
      where: {
        number: {
          eq: 0
        }
      }
    })

    t.equal(results1.count, 1)
    t.equal(results2.count, 0)
  })

  t.test('should correctly paginate the results', async (t) => {
    const db = await create({
      schema: {
        text: 'string',
        embedding: 'vector[5]',
        number: 'number'
      } as const
    })

    await insertMultiple(db, [
      { text: 'hello world', embedding: [1, 2, 3, 4, 5], number: 1 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 2 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 3 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 4 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 5 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 6 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 7 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 8 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 9 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 10 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 11 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 12 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 13 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 14 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 15 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 16 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 17 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 18 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 19 },
      { text: 'hello there', embedding: [1, 2, 3, 4, 4], number: 20 }
    ])

    const page1 = await search(db, {
      term: 'hello there',
      mode: 'hybrid',
      vector: {
        property: 'embedding',
        value: [1, 2, 3, 4, 4]
      },
      similarity: 0.5,
      limit: 2,
      offset: 0
    })

    const page2 = await search(db, {
      term: 'hello there',
      mode: 'hybrid',
      vector: {
        property: 'embedding',
        value: [1, 2, 3, 4, 4]
      },
      similarity: 0.5,
      limit: 2,
      offset: 1
    })

    const page3 = await search(db, {
      term: 'hello there',
      mode: 'hybrid',
      vector: {
        property: 'embedding',
        value: [1, 2, 3, 4, 4]
      },
      similarity: 0.5,
      limit: 2,
      offset: 2
    })

    t.equal(page1.count, 20)
    t.equal(page2.count, 20)
    t.equal(page3.count, 20)
    t.equal(page1.hits.length, 2)
    t.equal(page2.hits.length, 2)
    t.equal(page3.hits.length, 2)

    // Result with number 1 is skipped since it's not similar enough
    t.equal(page1.hits[0].document.number, 2)
    t.equal(page1.hits[1].document.number, 3)

    t.equal(page2.hits[0].document.number, 3)
    t.equal(page2.hits[1].document.number, 4)

    t.equal(page3.hits[0].document.number, 4)
    t.equal(page3.hits[1].document.number, 5)
  })

  t.test('should use custom weights correctly', async (t) => {
    const db = await create({
      schema: {
        text: 'string',
        embedding: 'vector[5]',
        number: 'number'
      } as const
    })

    await insertMultiple(db, [
      { text: 'hello world', embedding: [0, 41, 10, 39, 12], number: 1 },
      { text: 'hello world', embedding: [1, 2, 3, 4, 4], number: 2 }
    ])

    const results = await search(db, {
      mode: 'hybrid',
      term: 'hello world',
      vector: {
        value: [1, 2, 3, 4, 5],
        property: 'embedding'
      },
      similarity: 1,
      hybridWeights: {
        text: 1, // only consider text, which is identical for both documents
        vector: 0
      }
    })

    t.equal(results.count, 2)
    // With a text weight of 1 and a vector weight of 0 the score is the (normalized) text score only,
    // which is 1 for both documents. 0.5 is what the default 0.5/0.5 weights would give.
    t.equal(results.hits[0].score, 1)
    t.equal(results.hits[1].score, 1)
  })

  t.test('hybridWeights with a weight of 0', async (t) => {
    const schema = {
      title: 'string',
      embedding: 'vector[3]'
    } as const

    // "a" is the only text match for "apple" and has the vector farthest from the query,
    // "c" is not a text match and has the vector identical to the query, "b" is in between.
    const docs = [
      { id: 'a', title: 'apple pie recipe', embedding: [1, 0, 0] },
      { id: 'b', title: 'banana bread', embedding: [0.9, 0.1, 0] },
      { id: 'c', title: 'cherry tart', embedding: [0, 1, 0] }
    ]

    async function hybridSearch(hybridWeights?: unknown) {
      const db = create({ schema })
      await insertMultiple(db, structuredClone(docs))

      const results = await search(db, {
        mode: 'hybrid',
        term: 'apple',
        vector: { value: [0, 1, 0], property: 'embedding' },
        similarity: 0.1,
        ...(hybridWeights === undefined ? {} : { hybridWeights: hybridWeights as { text: number; vector: number } })
      })
      return new Map(results.hits.map((hit) => [hit.id, hit.score]))
    }

    t.test('should use the default weights when hybridWeights is not provided', async (t) => {
      const scores = await hybridSearch()

      t.equal(scores.get('a'), 0.5)
      t.equal(scores.get('c'), 0.5)
    })

    t.test('should only consider the vector when the text weight is 0', async (t) => {
      const scores = await hybridSearch({ text: 0, vector: 1 })

      t.same([...scores.keys()], ['c', 'b', 'a'], 'ranked by vector similarity only')
      t.equal(scores.get('c'), 1)
      t.equal(scores.get('a'), 0, 'the text match gets no text contribution')
    })

    t.test('should only consider the text when the vector weight is 0', async (t) => {
      const scores = await hybridSearch({ text: 1, vector: 0 })

      t.equal([...scores.keys()][0], 'a', 'the text match is ranked first')
      t.equal(scores.get('a'), 1)
      t.equal(scores.get('b'), 0, 'no vector contribution')
      t.equal(scores.get('c'), 0, 'no vector contribution, even for the identical vector')
    })

    t.test('should still apply non-zero custom weights', async (t) => {
      const scores = await hybridSearch({ text: 0.2, vector: 0.8 })

      t.same([...scores.keys()].slice(0, 2), ['c', 'a'])
      t.equal(scores.get('c'), 0.8)
      t.equal(scores.get('a'), 0.2)
    })

    t.test('should fall back to the default weights when only one weight is provided', async (t) => {
      const defaults = await hybridSearch()

      t.same([...(await hybridSearch({ text: 1 })).entries()], [...defaults.entries()])
      t.same([...(await hybridSearch({ vector: 1 })).entries()], [...defaults.entries()])
    })
  })
})

t.test('should correctly paginate the results with a where clause', async (t) => {
  const db = await create({
    schema: {
      text: 'string',
      embedding: 'vector[5]',
      number: 'number',
      itemId: 'string'
    } as const
  })

  await insertMultiple(db, [
    { text: 'hello world', itemId: '1', embedding: [1, 2, 3, 4, 5], number: 1 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 2 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 3 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 4 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 5 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 6 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 7 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 8 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 9 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 10 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 11 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 12 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 13 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 14 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 15 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 16 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 17 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 18 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 19 },
    { text: 'hello there', itemId: '1', embedding: [1, 2, 3, 4, 4], number: 20 }
  ])

  const page1 = await search(db, {
    term: 'hello there',
    mode: 'hybrid',
    where: {
      itemId: '1'
    },
    vector: {
      property: 'embedding',
      value: [1, 2, 3, 4, 4]
    },
    similarity: 0.5,
    limit: 2,
    offset: 0
  })

  const page2 = await search(db, {
    term: 'hello there',
    mode: 'hybrid',
    where: {
      itemId: '1'
    },
    vector: {
      property: 'embedding',
      value: [1, 2, 3, 4, 4]
    },
    similarity: 0.5,
    limit: 2,
    offset: 1
  })

  const page3 = await search(db, {
    term: 'hello there',
    mode: 'hybrid',
    where: {
      itemId: '1'
    },
    vector: {
      property: 'embedding',
      value: [1, 2, 3, 4, 4]
    },
    similarity: 0.5,
    limit: 2,
    offset: 2
  })
  const page4 = await search(db, {
    term: 'hello there',
    mode: 'hybrid',
    where: {
      itemId: '1'
    },
    vector: {
      property: 'embedding',
      value: [1, 2, 3, 4, 4]
    },
    similarity: 0.5,
    limit: 10,
    offset: 5
  })
  t.equal(page1.hits.length, 2)
  t.equal(page2.hits.length, 2)
  t.equal(page3.hits.length, 2)
  t.equal(page4.hits.length, 10)

  t.equal(page1.hits[0].document.number, 2)
  t.equal(page1.hits[1].document.number, 3)

  t.equal(page2.hits[0].document.number, 3)
  t.equal(page2.hits[1].document.number, 4)

  t.equal(page3.hits[0].document.number, 4)
  t.equal(page3.hits[1].document.number, 5)

  t.equal(page1.count, 20)
  t.equal(page2.count, 20)
  t.equal(page3.count, 20)
  t.equal(page4.count, 20)
})
