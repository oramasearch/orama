import t from 'tap'
import { create, insertMultiple, search } from '../src/index.js'

// String facets are sorted by count and then paginated with `offset` and `limit`:
// `limit` is the number of values to return, starting at `offset`.

async function createDB() {
  const db = create({ schema: { title: 'string', cat: 'string' } as const })
  // Distinct counts, so the order of the values does not depend on how ties are sorted: a:5 b:4 c:3 d:2 e:1
  const counts: Record<string, number> = { a: 5, b: 4, c: 3, d: 2, e: 1 }
  const docs = Object.entries(counts).flatMap(([cat, n]) => Array.from({ length: n }, () => ({ title: 'doc', cat })))
  await insertMultiple(db, docs)
  return db
}

async function facetValues(definition: { limit?: number; offset?: number; sort?: 'asc' | 'desc' }) {
  const db = await createDB()
  const results = await search(db, { term: 'doc', limit: 1, facets: { cat: definition } })
  return { values: results.facets!.cat.values, count: results.facets!.cat.count }
}

t.test('string facets limit and offset', async (t) => {
  t.test('returns every value when neither limit nor offset are set', async (t) => {
    const { values, count } = await facetValues({})
    t.strictSame(values, { a: 5, b: 4, c: 3, d: 2, e: 1 })
    t.equal(count, 5)
  })

  t.test('limit alone returns the first values', async (t) => {
    const { values } = await facetValues({ limit: 2 })
    t.strictSame(values, { a: 5, b: 4 })
  })

  t.test('offset alone skips the first values', async (t) => {
    const { values } = await facetValues({ offset: 2 })
    t.strictSame(values, { c: 3, d: 2, e: 1 })
  })

  t.test('limit is the number of values returned after the offset', async (t) => {
    t.strictSame((await facetValues({ limit: 2, offset: 1 })).values, { b: 4, c: 3 })
    t.strictSame((await facetValues({ limit: 2, offset: 2 })).values, { c: 3, d: 2 })
    t.strictSame((await facetValues({ limit: 1, offset: 3 })).values, { d: 2 })
  })

  t.test('limit larger than the remaining values returns the remaining values', async (t) => {
    t.strictSame((await facetValues({ limit: 10, offset: 3 })).values, { d: 2, e: 1 })
  })

  t.test('offset past the last value returns no values', async (t) => {
    t.strictSame((await facetValues({ limit: 2, offset: 5 })).values, {})
  })

  t.test('works together with sort: asc', async (t) => {
    t.strictSame((await facetValues({ sort: 'asc', limit: 2, offset: 1 })).values, { d: 2, c: 3 })
  })

  t.test('count is the total number of values, not the number of returned values', async (t) => {
    t.equal((await facetValues({ limit: 2, offset: 2 })).count, 5)
  })
})
