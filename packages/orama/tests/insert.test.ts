import t from 'tap'
import { readFileSync } from 'node:fs'
import { DocumentsStore } from '../src/components/documents-store.js'
import { Index } from '../src/components/index.js'
import { getInternalDocumentId } from '../src/components/internal-document-id-store.js'
import { AnyDocument, count, create, insert, insertMultiple, search } from '../src/index.js'
import { BKDTree } from '../src/trees/bkd.js'

const dataset = JSON.parse(readFileSync(new URL('./datasets/events.json', import.meta.url), 'utf-8')) as DataSet

t.test('insert method', async (t) => {
  t.test('should correctly insert and retrieve data', async (t) => {
    const db = await create({
      schema: {
        example: 'string'
      } as const
    })

    const ex1Insert = await insert(db, { example: 'The quick, brown, fox' })
    const ex1Search = await search(db, {
      term: 'quick',
      properties: ['example']
    })
    t.ok(ex1Insert)
    t.equal(ex1Search.count, 1)
    t.type(ex1Search.elapsed.raw, 'number')
    t.equal(ex1Search.hits[0].document.example, 'The quick, brown, fox')
  })

  t.test('should be able to insert documens with non-searchable fields', async (t) => {
    const db = create({
      schema: {
        quote: 'string',
        author: 'string',
        isFavorite: 'boolean',
        rating: 'number'
      } as const
    })

    await insert(db, {
      quote: 'Be yourself; everyone else is already taken.',
      author: 'Oscar Wilde',
      isFavorite: false,
      rating: 4
    })

    await insert(db, {
      quote: 'So many books, so little time.',
      author: 'Frank Zappa',
      isFavorite: true,
      rating: 5
    })

    const searchResult = await search(db, {
      term: 'frank'
    })

    t.equal(searchResult.count, 1)
    t.equal(searchResult.hits[0].document.author, 'Frank Zappa')
  })

  t.test("should use the 'id' field found in the document as index id", async (t) => {
    const db = create({
      schema: {
        id: 'string',
        name: 'string'
      } as const
    })

    const i1 = await insert(db, {
      id: 'john-01',
      name: 'John'
    })

    const i2 = await insert(db, {
      id: 'doe-02',
      name: 'Doe'
    })

    t.equal(i1, 'john-01')
    t.equal(i2, 'doe-02')
  })

  t.test("should use the custom 'id' function passed in the configuration object", async (t) => {
    const db = create({
      schema: {
        id: 'string',
        name: 'string'
      } as const,
      components: {
        getDocumentIndexId(doc: { name: string }): string {
          return `${doc.name.toLowerCase()}-foo-bar-baz`
        }
      }
    })

    const i1 = await insert(db, {
      id: 'john-01',
      name: 'John'
    })

    const i2 = await insert(db, {
      id: 'doe-02',
      name: 'Doe'
    })

    t.equal(i1, 'john-foo-bar-baz')
    t.equal(i2, 'doe-foo-bar-baz')
  })

  t.test("should throw an error if the 'id' field is not a string", async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const
    })

    try {
      insert(db, {
        id: 123,
        name: 'John'
      })
    } catch (e) {
      t.equal(e.code, 'DOCUMENT_ID_MUST_BE_STRING')
    }
  })

  t.test("should throw an error if the 'id' field is already taken", async (t) => {
    const db = create({
      schema: {
        id: 'string',
        name: 'string'
      } as const
    })

    await insert(db, {
      id: 'john-01',
      name: 'John'
    })

    try {
      insert(db, {
        id: 'john-01',
        name: 'John'
      })
    } catch (e) {
      t.equal(e.code, 'DOCUMENT_ALREADY_EXISTS')
    }
  })

  t.test('should use the ID field as index id even if not specified in the schema', async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const
    })

    const i1 = await insert(db, {
      id: 'john-01',
      name: 'John'
    })

    t.equal(i1, 'john-01')
  })

  t.test('should allow doc with missing schema keys to be inserted without indexing those keys', async (t) => {
    const db = create({
      schema: {
        quote: 'string',
        author: 'string'
      } as const
    })
    await insert(db, {
      quote: 'hello, world!',
      author: 'author should be singular'
    })

    t.equal(Object.keys(db.data.docs.docs).length, 1)

    const docWithExtraKey = {
      quote: 'hello, world!',
      author: '3',
      foo: { bar: 10 }
    }

    const insertedInfo = await insert(db, docWithExtraKey)

    t.ok(insertedInfo)
    t.equal(Object.keys(db.data.docs.docs).length, 2)

    t.ok('foo' in db.data.docs.docs[getInternalDocumentId(db.internalDocumentIDStore, insertedInfo)]!)
    t.same(docWithExtraKey.foo, db.data.docs.docs[getInternalDocumentId(db.internalDocumentIDStore, insertedInfo)]!.foo)
    t.notOk('foo' in (db.data.index as unknown as Index).indexes)
  })

  await t.test(
    'should allow doc with missing schema keys to be inserted without indexing those keys - nested schema version',
    async (t) => {
      const db = create({
        schema: {
          quote: 'string',
          author: {
            name: 'string',
            surname: 'string'
          },
          tag: {
            name: 'string',
            description: 'string'
          },
          isFavorite: 'boolean',
          rating: 'number'
        } as const
      })
      const nestedExtraKeyDoc = {
        quote: 'So many books, so little time.',
        author: {
          name: 'Frank',
          surname: 'Zappa'
        },
        tag: {
          name: 'books',
          description: 'Quotes about books',
          unexpectedNestedProperty: 'amazing'
        },
        isFavorite: false,
        rating: 5,
        unexpectedProperty: 'wow'
      }
      const insertedInfo = await insert(db, nestedExtraKeyDoc)

      t.ok(insertedInfo)
      t.equal(Object.keys((db.data.docs as DocumentsStore).docs).length, 1)

      t.same(
        nestedExtraKeyDoc.unexpectedProperty,
        (db.data.docs as DocumentsStore).docs[getInternalDocumentId(db.internalDocumentIDStore, insertedInfo)]!
          .unexpectedProperty
      )

      t.same(
        nestedExtraKeyDoc.tag.unexpectedNestedProperty,
        (
          (db.data.docs as DocumentsStore).docs[getInternalDocumentId(db.internalDocumentIDStore, insertedInfo)]!
            .tag as unknown as Record<string, string>
        ).unexpectedNestedProperty
      )

      t.notOk('unexpectedProperty' in (db.data.index as Index).indexes)
      t.notOk('tag.unexpectedProperty' in (db.data.index as Index).indexes)
    }
  )

  t.test('should validate', async (t) => {
    t.test('the properties are not mandatory', async (t) => {
      const db = create({
        schema: {
          id: 'string',
          name: 'string',
          inner: {
            name: 'string'
          }
        } as const
      })

      // not throwing
      insert(db, {})
      insert(db, { id: 'foo' })
      insert(db, { name: 'bar' })
      insert(db, { inner: {} })

      t.end()
    })

    await t.test('invalid document', async (t) => {
      const db = create({
        schema: {
          string: 'string',
          number: 'number',
          boolean: 'boolean',
          inner: {
            string: 'string',
            number: 'number',
            boolean: 'boolean'
          }
        } as const
      })

      const invalidDocuments: Array<object> = [
        { string: null },
        { string: 42 },
        { string: true },
        { string: false },
        { string: {} },
        { string: [] },
        { number: null },
        { number: '' },
        { number: true },
        { number: false },
        { number: {} },
        { number: [] },
        { boolean: null },
        { boolean: 42 },
        { boolean: '' },
        { boolean: {} },
        { boolean: [] }
      ]
      invalidDocuments.push(...invalidDocuments.map((d) => ({ inner: { ...d } })))
      for (const doc of invalidDocuments) {
        try {
          insert(db, doc)
        } catch (e) {
          t.equal(e.code, 'SCHEMA_VALIDATION_FAILURE')
        }
      }
    })
  })

  await t.test('should insert Geopoints', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        location: 'geopoint'
      } as const
    })

    t.ok(
      insert(db, {
        name: 't1',
        location: {
          lat: 45.5771622,
          lon: 9.261266
        }
      })
    )
    const index = db.data.index.indexes.location.node as BKDTree
    t.equal(index.root?.point.lat, 45.5771622)
    t.equal(index.root?.point.lon, 9.261266)
  })
})

t.test('insert short prefixes, as in #327 and #328', async (t) => {
  await t.test('example 1', async (t) => {
    const db = await create({
      schema: {
        id: 'string',
        abbrv: 'string',
        type: 'string'
      } as const
    })

    await insertMultiple(db, [
      {
        id: '1',
        abbrv: 'RDGE',
        type: 'Ridge'
      },
      {
        id: '2',
        abbrv: 'RD',
        type: 'Road'
      }
    ])

    const exactResults = await search(db, {
      term: 'RD',
      exact: true
    })

    const prefixResults = await search(db, {
      term: 'RD',
      exact: false
    })

    t.same(exactResults.count, 1)
    t.same(exactResults.hits[0].id, '2')
    t.same(exactResults.hits[0].document.abbrv, 'RD')

    t.same(prefixResults.count, 2)
    t.same(prefixResults.hits[0].id, '1')
    t.same(prefixResults.hits[0].document.abbrv, 'RDGE')
    t.same(prefixResults.hits[1].id, '2')
    t.same(prefixResults.hits[1].document.abbrv, 'RD')
  })

  await t.test('example 2', async (t) => {
    const db = await create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', quote: 'AB' },
      { id: '2', quote: 'ABCDEF' },
      { id: '3', quote: 'CDEF' },
      { id: '4', quote: 'AB' }
    ])

    const exactResults = await search(db, {
      term: 'AB',
      exact: true
    })

    t.same(exactResults.count, 2)
    t.same(exactResults.hits[0].id, '1')
    t.same(exactResults.hits[0].document.quote, 'AB')
    t.same(exactResults.hits[1].id, '4')
    t.same(exactResults.hits[1].document.quote, 'AB')
  })
})

t.test('insertMultiple method', async (t) => {
  t.test("should use the custom 'id' function passed in the configuration object", async (t) => {
    const db = create({
      schema: {
        id: 'string',
        name: 'string'
      } as const,
      components: {
        getDocumentIndexId(doc: { id: string; name: string }): string {
          return `${doc.name.toLowerCase()}-${doc.id}`
        }
      }
    })

    const ids = await insertMultiple(db, [
      { id: '01', name: 'John' },
      { id: '02', name: 'Doe' }
    ])

    t.strictSame(ids, ['john-01', 'doe-02'])
  })

  t.test("should use the 'id' field as index id if found in the document", async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const
    })

    const ids = await insertMultiple(db, [
      { name: 'John' },
      {
        id: '02',
        name: 'Doe'
      }
    ])

    t.ok(ids.includes('02'))
  })

  await t.test('should support batch insert of documents', async (t) => {
    const db = create({
      schema: {
        date: 'string',
        description: 'string',
        lang: 'string',
        category1: 'string',
        category2: 'string',
        granularity: 'string'
      } as const
    })

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const docs = (dataset as DataSet).result.events.slice(0, 2000)
    const wrongSchemaDocs: WrongDataEvent[] = docs.map((doc) => ({
      ...doc,
      date: +new Date()
    }))

    insertMultiple(db, docs)
    t.equal(Object.keys((db.data.docs as DocumentsStore).docs).length, 2000)

    try {
      insertMultiple(db, wrongSchemaDocs as unknown as DataEvent[])
    } catch (e) {
      t.equal(e.code, 'SCHEMA_VALIDATION_FAILURE')
    }
  })

  // Skipping this test for now, as it is not reliable
  t.skip('should support `timeout` parameter', async (t) => {
    const db = create({
      schema: {
        description: 'string'
      } as const
    })

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const docs = (dataset as DataSet).result.events.slice(0, 1000)

    const batchSize = 10

    const before = Date.now()
    insertMultiple(db, docs, batchSize, undefined, false, 200)
    const after = Date.now()

    t.equal(count(db), 1000)
    const batchNumber = Math.ceil(docs.length / batchSize)
    // the "sleep" is yeilded between batches,
    // so it is not fired for the last batch
    const expectedTime = (batchNumber - 1) * 20
    t.equal(after - before > expectedTime, true)
  })

  t.test('should correctly rebalance AVL tree once the threshold is reached', async (t) => {
    const db = await create({
      schema: {
        id: 'string',
        name: 'string',
        number: 'number'
      } as const
    })

    function getRandomNumberExcept(n: number): number {
      const exceptions = [25, 250]

      if (exceptions.includes(n)) {
        return n
      }

      let random = Math.floor(Math.random() * 1000)

      while (exceptions.includes(random) || random === n) {
        random = Math.floor(Math.random() * 1000)
      }

      return random
    }

    const docs = Array.from({ length: 1000 }, (_, i) => ({
      id: i.toString(),
      name: `name-${i}`,
      number: getRandomNumberExcept(i)
    }))

    await insertMultiple(db, docs, 200)

    const results25 = await search(db, {
      term: 'name-25',
      where: {
        number: {
          eq: 25
        }
      }
    })

    const results250 = await search(db, {
      term: 'name',
      where: {
        number: {
          eq: 250
        }
      }
    })

    t.equal(results25.count, 1)
    t.equal(results25.hits[0].document.id, '25')

    t.equal(results250.count, 1)
    t.equal(results250.hits[0].document.id, '250')
  })
})

t.test("insert shouldn't use tokenizer cache", async (t) => {
  const db = await create({
    schema: {
      name: 'string'
    } as const
  })

  await insert(db, {
    name: 'The quick brown fox jumps over the lazy dog'
  })

  // Empty map
  t.strictSame(db.tokenizer.normalizationCache, new Map())
})

interface BaseDataEvent extends AnyDocument {
  description: string
  lang: string
  category1: string
  category2: string
  granularity: string
}

interface DataEvent extends BaseDataEvent {
  date: string
}

interface WrongDataEvent extends BaseDataEvent {
  date: number
}

interface DataSet {
  result: { events: DataEvent[] }
}
