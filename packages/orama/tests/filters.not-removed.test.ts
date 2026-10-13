import t from 'tap'
import { count, create, getByID, insert, insertMultiple, load, remove, save, search } from '../src/index.js'

// `where: { not: ... }` has to be evaluated against the documents that are currently in the database:
// removed documents must not come back as hits, nor be counted.

const schema = {
  name: 'string',
  cat: 'string',
  embedding: 'vector[2]'
} as const

const docs = [
  { id: 'a', name: 'apple', cat: 'fruit', embedding: [1, 0] },
  { id: 'b', name: 'beetroot', cat: 'veg', embedding: [0, 1] },
  { id: 'c', name: 'cherry', cat: 'fruit', embedding: [1, 1] }
]

// Creates a database with the documents a, b and c, then removes "a".
async function createDBWithRemovedDoc() {
  const db = create({ schema })
  await insertMultiple(db, structuredClone(docs))
  t.equal(await remove(db, 'a'), true)
  return db
}

const ids = (results: { hits: { id: string }[] }) => results.hits.map((hit) => hit.id).sort()

t.test('where not, after removing a document', async (t) => {
  t.test('does not return the removed document', async (t) => {
    const db = await createDBWithRemovedDoc()

    t.equal(count(db), 2)
    t.equal(getByID(db, 'a'), undefined)

    const results = await search(db, { where: { not: { cat: 'veg' } } })

    t.same(ids(results), ['c'])
    t.equal(results.count, 1)
    t.notOk(
      results.hits.some((hit) => Object.keys(hit.document).length === 0),
      'no empty ghost documents'
    )
  })

  t.test('does not return the removed document when the negated filter matches nothing', async (t) => {
    const db = await createDBWithRemovedDoc()

    const results = await search(db, { where: { not: { cat: 'meat' } } })

    t.same(ids(results), ['b', 'c'])
    t.equal(results.count, 2)
  })

  t.test('does not return the removed document when the negated filter matches it', async (t) => {
    const db = await createDBWithRemovedDoc()

    const results = await search(db, { where: { not: { cat: 'fruit' } } })

    t.same(ids(results), ['b'])
    t.equal(results.count, 1)
  })

  t.test('works together with a search term', async (t) => {
    const db = await createDBWithRemovedDoc()

    const results = await search(db, { term: 'cherry', where: { not: { cat: 'veg' } } })

    t.same(ids(results), ['c'])
    t.equal(results.count, 1)
  })

  t.test('works when nested inside and / or', async (t) => {
    const db = await createDBWithRemovedDoc()

    const everything = await search(db, { where: { or: [{ cat: 'fruit' }, { not: { cat: 'fruit' } }] } })
    t.same(ids(everything), ['b', 'c'])
    t.equal(everything.count, 2)

    const both = await search(db, { where: { and: [{ not: { cat: 'veg' } }, { not: { cat: 'meat' } }] } })
    t.same(ids(both), ['c'])
    t.equal(both.count, 1)
  })

  t.test('returns nothing when every document has been removed', async (t) => {
    const db = await createDBWithRemovedDoc()
    await remove(db, 'b')
    await remove(db, 'c')

    const results = await search(db, { where: { not: { cat: 'meat' } } })

    t.same(results.hits, [])
    t.equal(results.count, 0)
  })

  t.test('returns a document that has been removed and inserted again once', async (t) => {
    const db = await createDBWithRemovedDoc()
    await insert(db, { id: 'a', name: 'artichoke', cat: 'veg', embedding: [1, 0] })

    const results = await search(db, { where: { not: { cat: 'fruit' } } })

    t.same(ids(results), ['a', 'b'])
    t.equal(results.count, 2)
  })

  t.test('keeps working after save() and load()', async (t) => {
    const db = await createDBWithRemovedDoc()

    const restored = create({ schema })
    load(restored, save(db))

    const results = await search(restored, { where: { not: { cat: 'veg' } } })

    t.same(ids(results), ['c'])
    t.equal(results.count, 1)
  })

  t.test('works with vector search', async (t) => {
    const db = await createDBWithRemovedDoc()

    const results = await search(db, {
      mode: 'vector',
      vector: { value: [1, 0], property: 'embedding' },
      similarity: 0,
      where: { not: { cat: 'veg' } }
    })

    t.same(ids(results), ['c'])
    t.equal(results.count, 1)
  })

  t.test('works with hybrid search', async (t) => {
    const db = await createDBWithRemovedDoc()

    const results = await search(db, {
      mode: 'hybrid',
      term: 'cherry',
      vector: { value: [1, 0], property: 'embedding' },
      similarity: 0,
      where: { not: { cat: 'veg' } }
    })

    t.same(ids(results), ['c'])
    t.equal(results.count, 1)
  })
})

t.test('where not, without removing any document', async (t) => {
  const db = create({ schema })
  await insertMultiple(db, structuredClone(docs))

  const results = await search(db, { where: { not: { cat: 'veg' } } })

  t.same(ids(results), ['a', 'c'])
  t.equal(results.count, 2)
})
