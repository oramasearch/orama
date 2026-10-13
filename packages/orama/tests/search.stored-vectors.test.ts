import t from 'tap'
import { create, getByID, insertMultiple, load, save, search } from '../src/index.js'
import type { AnyOrama } from '../src/index.js'

// Searching without `includeVectors` strips the vectors from the returned hits only:
// the documents kept by the database (getByID, save) must never be altered.

const flatSchema = {
  title: 'string',
  embedding: 'vector[3]'
} as const

const flatDocs = [
  { id: 'a', title: 'apple pie recipe', embedding: [1, 0, 0] },
  { id: 'b', title: 'banana bread', embedding: [0.9, 0.1, 0] },
  { id: 'c', title: 'cherry tart', embedding: [0, 1, 0] }
]

type Mode = 'vector' | 'fulltext' | 'hybrid'

function runSearch(db: AnyOrama, mode: Mode, includeVectors?: boolean, property = 'embedding') {
  const common = includeVectors === undefined ? {} : { includeVectors }
  switch (mode) {
    case 'vector':
      return search(db, { mode: 'vector', vector: { value: [1, 0, 0], property }, similarity: 0.5, ...common })
    case 'fulltext':
      return search(db, { term: 'apple', ...common })
    case 'hybrid':
      return search(db, {
        mode: 'hybrid',
        term: 'apple',
        vector: { value: [1, 0, 0], property },
        similarity: 0.5,
        ...common
      })
  }
}

for (const mode of ['vector', 'fulltext', 'hybrid'] as const) {
  t.test(`${mode} search`, async (t) => {
    t.test('does not alter the stored document when includeVectors is not set', async (t) => {
      const db = create({ schema: flatSchema })
      await insertMultiple(db, structuredClone(flatDocs))

      const results: any = await runSearch(db, mode)
      t.ok(results.count > 0)
      t.equal(results.hits[0].id, 'a')
      t.equal(results.hits[0].document.embedding, null, 'the hit does not contain the vector')

      t.strictSame(getByID(db, 'a'), flatDocs[0], 'the stored document still contains the vector')
      t.strictSame((save(db).docs as any).docs['1'], flatDocs[0], 'save() still serializes the vector')
    })

    t.test('does not alter the stored document when includeVectors is false', async (t) => {
      const db = create({ schema: flatSchema })
      await insertMultiple(db, structuredClone(flatDocs))

      const results: any = await runSearch(db, mode, false)
      t.equal(results.hits[0].document.embedding, null)
      t.strictSame(getByID(db, 'a'), flatDocs[0])
    })

    t.test('returns the vector on a later search with includeVectors: true', async (t) => {
      const db = create({ schema: flatSchema })
      await insertMultiple(db, structuredClone(flatDocs))

      await runSearch(db, mode, false)
      const withVectors: any = await runSearch(db, mode, true)
      t.strictSame(withVectors.hits[0].document.embedding, [1, 0, 0])
    })

    t.test('can toggle includeVectors between searches', async (t) => {
      const db = create({ schema: flatSchema })
      await insertMultiple(db, structuredClone(flatDocs))

      for (const includeVectors of [false, true, false, true]) {
        const results: any = await runSearch(db, mode, includeVectors)
        t.strictSame(
          results.hits[0].document.embedding,
          includeVectors ? [1, 0, 0] : null,
          `includeVectors: ${includeVectors}`
        )
      }
      t.strictSame(getByID(db, 'a'), flatDocs[0])
    })

    t.test('keeps the vectors of a nested property intact', async (t) => {
      const db = create({
        schema: { title: 'string', meta: { embedding: 'vector[3]' } } as const
      })
      await insertMultiple(db, [
        { id: 'a', title: 'apple', meta: { embedding: [1, 0, 0] } },
        { id: 'b', title: 'banana', meta: { embedding: [0, 1, 0] } }
      ])

      const results: any = await runSearch(db, mode, undefined, 'meta.embedding')
      t.strictSame(results.hits[0].document, { id: 'a', title: 'apple', meta: { embedding: null } })
      t.notOk('meta.embedding' in results.hits[0].document, 'no stray "meta.embedding" key in the hit')

      t.strictSame(getByID(db, 'a'), { id: 'a', title: 'apple', meta: { embedding: [1, 0, 0] } })
      t.notOk('meta.embedding' in (getByID(db, 'a') as object), 'no stray "meta.embedding" key in the stored document')

      const withVectors: any = await runSearch(db, mode, true, 'meta.embedding')
      t.strictSame(withVectors.hits[0].document.meta.embedding, [1, 0, 0])
    })

    t.test('save() and load() round trip after a search keeps the vectors', async (t) => {
      const db = create({ schema: flatSchema })
      await insertMultiple(db, structuredClone(flatDocs))
      await runSearch(db, mode)

      const restored = create({ schema: flatSchema })
      load(restored, save(db))

      t.strictSame(getByID(restored, 'a'), flatDocs[0])
      const results: any = await runSearch(restored, mode, true)
      t.strictSame(results.hits[0].document.embedding, [1, 0, 0])
    })
  })
}

t.test('fulltext search strips every vector property without altering the stored document', async (t) => {
  const db = create({
    schema: {
      title: 'string',
      vectors: { first: 'vector[3]', second: 'vector[2]' }
    } as const
  })
  const doc = { id: 'a', title: 'apple', vectors: { first: [1, 0, 0], second: [0, 1] } }
  await insertMultiple(db, [structuredClone(doc)])

  const results: any = await search(db, { term: 'apple' })
  t.strictSame(results.hits[0].document, { id: 'a', title: 'apple', vectors: { first: null, second: null } })
  t.strictSame(getByID(db, 'a'), doc)
})

t.test('vector search with includeVectors: true returns the stored document', async (t) => {
  const db = create({ schema: flatSchema })
  await insertMultiple(db, structuredClone(flatDocs))

  const results: any = await runSearch(db, 'vector', true)
  t.strictSame(results.hits[0].document, flatDocs[0])
})
