import t from 'tap'
import { create, insertMultiple, search } from '../src/index.js'

// A document is counted once per range, even when several values of its `number[]` property fall in that range.

const ranges = [
  { from: 0, to: 5 },
  { from: 6, to: 20 }
]

async function rangeFacet(values: number[][]) {
  const db = create({ schema: { title: 'string', nums: 'number[]' } as const })
  await insertMultiple(
    db,
    values.map((nums) => ({ title: 'doc', nums }))
  )

  const results = await search(db, { term: 'doc', facets: { nums: { ranges } } })
  return results.facets!.nums.values
}

t.test('number[] range facets', async (t) => {
  t.test('counts a document with two values in the same range once', async (t) => {
    t.strictSame(await rangeFacet([[1, 2]]), { '0-5': 1 })
  })

  t.test('counts a document with three values in the same range once', async (t) => {
    t.strictSame(await rangeFacet([[1, 2, 3]]), { '0-5': 1 })
  })

  t.test('counts every document once per range', async (t) => {
    t.strictSame(
      await rangeFacet([
        [1, 2],
        [1, 2]
      ]),
      { '0-5': 2 }
    )
    t.strictSame(await rangeFacet([[1], [1, 2], [1, 2, 3]]), { '0-5': 3 })
  })

  t.test('counts a document once in each range it has values in', async (t) => {
    t.strictSame(await rangeFacet([[1, 10]]), { '0-5': 1, '6-20': 1 })
    t.strictSame(await rangeFacet([[1, 2, 10, 11]]), { '0-5': 1, '6-20': 1 })
  })

  t.test('does not count a document in ranges none of its values fall in', async (t) => {
    t.strictSame(
      await rangeFacet([
        [100, 200],
        [1, 2]
      ]),
      { '0-5': 1 }
    )
  })
})

t.test('number range facets', async (t) => {
  t.test('still count one value per document', async (t) => {
    const db = create({ schema: { title: 'string', n: 'number' } as const })
    await insertMultiple(db, [
      { title: 'doc', n: 1 },
      { title: 'doc', n: 2 },
      { title: 'doc', n: 10 }
    ])

    const results = await search(db, { term: 'doc', facets: { n: { ranges } } })
    t.strictSame(results.facets!.n.values, { '0-5': 2, '6-20': 1 })
  })
})
