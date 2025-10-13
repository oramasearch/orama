import t from 'tap'
import { create, getByID, insert, insertMultiple, load, remove, save, search, update } from '../src/index.js'

t.test('create should support array of string', async (t) => {
  const db = create({
    schema: {
      id: 'string',
      name: 'string[]'
    } as const
  })

  const albusId = await insert(db, {
    name: ['Albus', 'Percival', 'Wulfric', 'Brian']
  })

  const [harryId, jamesId, lilyId] = await insertMultiple(db, [
    { id: '1', name: ['Harry', 'James', 'Potter'] },
    { id: '2', name: ['James', 'Potter'] },
    { id: '3', name: ['Lily', 'Lily', 'Lily', 'Lily', 'Evans', 'Potter'] }
  ])

  await checkSearchTerm(t, db, 'Albus', [albusId])
  await checkSearchTerm(t, db, 'Harry', [harryId])
  await checkSearchTerm(t, db, 'James', [harryId, jamesId])
  await checkSearchTerm(t, db, 'Potter', [harryId, jamesId, lilyId])
  await checkSearchTerm(t, db, 'P', [albusId, harryId, jamesId, lilyId])
  await checkSearchTerm(t, db, 'foo', [])

  await checkSearchWhere(t, db, 'name', 'Albus', [albusId])

  await checkSearchWhere(t, db, 'name', 'Harry', [harryId])
  await checkSearchWhere(t, db, 'name', 'James', [harryId, jamesId])
  await checkSearchWhere(t, db, 'name', 'Potter', [harryId, jamesId, lilyId])
  await checkSearchWhere(t, db, 'name', 'P', [])
  await checkSearchWhere(t, db, 'name', 'foo', [])

  await checkSearchWhere(t, db, 'name', ['Albus'], [albusId])
  await checkSearchWhere(t, db, 'name', ['Harry'], [harryId])
  await checkSearchWhere(t, db, 'name', ['James'], [harryId, jamesId])
  await checkSearchWhere(t, db, 'name', ['Percival', 'Evans'], [albusId, lilyId])
  await checkSearchWhere(t, db, 'name', ['P'], [])
  await checkSearchWhere(t, db, 'name', ['foo'], [])

  await checkSearchFacets(
    t as unknown as Tap.Test,
    db,
    'name',
    {},
    {
      count: 9,
      values: {
        James: 2,
        Potter: 3,
        Lily: 1,
        Evans: 1,
        Albus: 1,
        Percival: 1,
        Wulfric: 1,
        Brian: 1,
        Harry: 1
      }
    }
  )

  t.end()
})

t.test('create should support array of number', async (t) => {
  const db = create({
    schema: {
      num: 'number[]'
    } as const
  })

  const first = await insert(db, {
    num: [5]
  })

  const [second, third, fourth] = await insertMultiple(db, [
    { num: [2, 7] },
    { num: [3, 5, 7, 35] },
    { num: [3, 2, 5] }
  ])

  await checkSearchWhere(t, db, 'num', { eq: 5 }, [first, third, fourth])

  await checkSearchWhere(t, db, 'num', { eq: 35 }, [third])
  await checkSearchWhere(t, db, 'num', { gt: 6 }, [second, third])
  await checkSearchWhere(t, db, 'num', { gte: 7 }, [second, third])
  await checkSearchWhere(t, db, 'num', { between: [6, 10] }, [second, third])
  await checkSearchWhere(t, db, 'num', { eq: 42 }, [])

  await checkSearchFacets(
    t as unknown as Tap.Test,
    db,
    'num',
    {
      ranges: [
        { from: 0, to: 3 },
        { from: 3, to: 7 },
        { from: 7, to: 10 }
      ]
    },
    {
      count: 3,
      values: {
        '0-3': 3,
        '3-7': 4,
        '7-10': 2
      }
    }
  )

  t.end()
})

t.test('create should support array of boolean', async (t) => {
  const db = create({
    schema: {
      b: 'boolean[]'
    } as const
  })

  const first = await insert(db, {
    b: [true]
  })

  const [second, third, fourth] = await insertMultiple(db, [
    { b: [false] },
    { b: [true, false] },
    { b: [true, true, true] }
  ])

  await checkSearchWhere(t, db, 'b', true, [first, third, fourth])
  await checkSearchWhere(t, db, 'b', false, [second, third])

  await checkSearchFacets(
    t as unknown as Tap.Test,
    db,
    'b',
    {
      true: true,
      false: true
    },
    {
      count: 2,
      values: {
        true: 3,
        false: 2
      }
    }
  )

  t.end()
})

t.test('remove should support array as well', async (t) => {
  const db = create({
    schema: {
      strings: 'string[]',
      num: 'number[]',
      b: 'boolean[]'
    } as const
  })

  const docId = await insert(db, {
    strings: ['Albus', 'Percival', 'Wulfric', 'Brian'],
    num: [3, 5, 7, 35],
    b: [true, true, true]
  })
  t.ok(docId)

  const removed = await remove(db, docId)
  t.ok(removed)
})

t.test('serialization should support array as well', async (t) => {
  const db = create({
    schema: {
      strings: 'string[]',
      num: 'number[]',
      b: 'boolean[]'
    } as const
  })
  const docId = await insert(db, {
    strings: ['Albus', 'Percival', 'Wulfric', 'Brian'],
    num: [3, 5, 7, 35],
    b: [true, true, true]
  })
  t.ok(docId)

  const raw = save(db)
  const db2 = create({
    schema: {
      strings: 'string[]',
      num: 'number[]',
      b: 'boolean[]'
    }
  })
  load(db2, raw)

  const doc = getByID(db, docId)
  t.strictSame(doc, {
    strings: ['Albus', 'Percival', 'Wulfric', 'Brian'],
    num: [3, 5, 7, 35],
    b: [true, true, true]
  })
})

t.test('update supports array as well', async (t) => {
  const db = create({
    schema: {
      strings: 'string[]',
      num: 'number[]',
      b: 'boolean[]'
    } as const
  })
  const docId = await insert(db, {
    strings: ['Albus', 'Percival', 'Wulfric', 'Brian'],
    num: [3, 5, 7, 35],
    b: [true, true, true]
  })
  t.ok(docId)

  const newDocId = await update(db, docId, {
    strings: ['Harry', 'James', 'Potter'],
    num: [2, 3],
    b: [false, true]
  })
  t.ok(newDocId)
})

async function checkSearchTerm(t, db, term, expectedIds) {
  const result = await search(db, {
    term
  })
  t.equal(result.hits.length, expectedIds.length)
  t.equal(result.count, expectedIds.length)
  t.strictSame(new Set(result.hits.map((h) => h.id)), new Set(expectedIds))
}

async function checkSearchWhere(t, db, key, where, expectedIds) {
  const result = await search(db, {
    where: {
      [key]: where
    }
  })
  t.equal(result.hits.length, expectedIds.length)
  t.equal(result.count, expectedIds.length)
  t.strictSame(new Set(result.hits.map((h) => h.id).sort()), new Set(expectedIds))
}

async function checkSearchFacets(t: any, db, key, facet, expectedFacet) {
  const result = await search(db, {
    facets: {
      [key]: facet
    }
  })
  t.strictSame(result.facets![key], expectedFacet)
}
