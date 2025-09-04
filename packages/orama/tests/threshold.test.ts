import t from 'tap'
import { create, insert, search } from '../src/index.js'

t.test('should only return results with all the search terms (exact match)', async (t) => {
  t.plan(4)

  const db = await create({
    schema: {
      title: 'string'
    }
  })

  await insert(db, { title: 'Blue t-shirt slim fit' })
  await insert(db, { title: 'Blue t-shirt oversize fit' })
  await insert(db, { title: 'Red t-shirt v-neck cut' })
  await insert(db, { title: 'Colored t-shirt slim fit' })
  await insert(db, { title: 'Red t-shirt slim fit' })

  const r1 = await search(db, {
    term: 'blue t-shirt',
    threshold: 0
  })
  const r2 = await search(db, {
    term: 'red t-shirt',
    threshold: 0
  })
  const r3 = await search(db, {
    term: 'slim fit',
    threshold: 0
  })
  const r4 = await search(db, {
    term: 'red fit',
    threshold: 0
  })

  t.same(r1.count, 2)
  t.same(r2.count, 2)
  t.same(r3.count, 3)
  t.same(r4.count, 1)
})

t.test('should only return results with all the search terms (exact match) on more complex schema', async (t) => {
  t.plan(4)

  const db = await create({
    schema: {
      title: 'string',
      description: 'string'
    }
  })

  await insert(db, {
    title: 'Blue t-shirt',
    description: 'Beautiful blue t-shirt, slim fit. Wears well with jeans and sneakers.'
  })

  await insert(db, {
    title: 'Blue t-shirt',
    description: 'Beautiful blue t-shirt. A bit oversize.'
  })

  await insert(db, {
    title: 'Red t-shirt v-neck cut',
    description: 'Great t-shirt for a night out.'
  })

  await insert(db, {
    title: 'Colored t-shirt slim fit',
    description: 'Colorful t-shirt, slim fit.'
  })

  await insert(db, {
    title: 'Green t-shirt',
    description: 'Green t-shirt, oversize fit.'
  })

  const r1 = await search(db, {
    term: 'blue t-shirt',
    threshold: 0
  })
  const r2 = await search(db, {
    term: 'red t-shirt',
    threshold: 0
  })
  const r3 = await search(db, {
    term: 'slim fit',
    threshold: 0
  })
  const r4 = await search(db, {
    term: 'oversize fit',
    threshold: 0
  })

  t.same(r1.count, 2)
  t.same(r2.count, 1)
  t.same(r3.count, 2)
  t.same(r4.count, 1)
})

t.test('should return all the results if threshold is 1', async (t) => {
  t.plan(2)

  const db = await create({
    schema: {
      title: 'string'
    }
  })

  await insert(db, { title: 'Blue t-shirt slim fit' })
  await insert(db, { title: 'Blue t-shirt oversize fit' })
  await insert(db, { title: 'Red t-shirt v-neck cut' })
  await insert(db, { title: 'Colored t-shirt slim fit' })

  const r1 = await search(db, {
    term: 'blue t-shirt',
    threshold: 1
  })

  const r2 = await search(db, {
    term: 'slim fit',
    threshold: 1
  })

  t.same(r1.count, 4)
  t.same(r2.count, 3)
})

t.test('should return all the exact matches + X% of the partial matches', async (t) => {
  t.plan(2)

  const db = await create({
    schema: {
      title: 'string'
    }
  })

  await insert(db, { title: 'Blue t-shirt slim fit' })
  await insert(db, { title: 'Blue t-shirt oversize fit' })
  await insert(db, { title: 'Red t-shirt v-neck cut' })
  await insert(db, { title: 'Colored t-shirt slim fit' })

  const r1 = await search(db, {
    term: 'blue t-shirt',
    threshold: 0.6
  })

  const r2 = await search(db, {
    term: 'slim fit',
    threshold: 0.7
  })

  t.same(r1.count, 4)
  t.same(r2.count, 3)
})

// Related issue: https://github.com/oramasearch/orama/issues/911
t.test('should return results for words with same root if threshold is 0', async (t) => {
  const db = create({
    schema: {
      title: 'string'
    }
  })

  await insert(db, { title: 'Phone, phonogram' })
  await insert(db, { title: 'Bet, better' })
  await insert(db, { title: 'Some random sentence' })
  await insert(db, { title: 'The quick brown fox jumps over the lazy dog' })

  const testCases: [string, number][] = [
    ['p', 1],
    ['ph', 1],
    ['pho', 1],
    ['phone', 1],
    ['phono', 1],

    ['b', 2],
    ['be', 1],
    ['bet', 1],
    ['bett', 1],
    ['bet hi', 0], // the term "hi" is not in any document, there should be no hits with threshold 0

    ['s', 1],
    ['r', 1],
    ['se', 1],
    ['so', 1],

    ['some random se', 1],
    ['some random stuff', 0],

    ['the qui', 1],
    ['the quick brown dog', 1]
  ]

  t.plan(testCases.length)

  for (const [term, expectedCount] of testCases) {
    const result = await search(db, { term, threshold: 0 })
    t.same(
      result.count,
      expectedCount,
      `Search term "${term}" with threshold 0 should match ${expectedCount} record(s), but matched ${result.count}`
    )
  }
})
