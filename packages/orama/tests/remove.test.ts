import t from 'tap'
import { Index } from '../src/components/index.js'
import {
  SearchParams,
  TypedDocument,
  count,
  create,
  getByID,
  insert,
  remove,
  removeMultiple,
  search
} from '../src/index.js'

t.test('remove method', (t) => {
  t.test('removes the given document', async (t) => {
    const [db, id1, id2, id3, id4] = createSimpleDB()

    const doc1 = getByID(db, id1)!
    t.ok(getByID(db, id1))

    const r = await remove(db, id1)
    t.ok(r)
    t.notOk(getByID(db, id1))

    const cases = [
      { name: 'and is not searchable anymore for name', params: { term: doc1.name } },
      {
        name: 'and is not searchable anymore for name - substr',
        params: { term: doc1.name.substring(0, 5) }
      },
      { name: 'and is not searchable anymore for rating - number - eq', params: { where: { rating: { eq: 5 } } } },
      { name: 'and is not searchable anymore for price - number - eq', params: { where: { price: { eq: 900 } } } },
      {
        name: 'and is not searchable anymore for meta.sales - number - eq',
        params: { where: { 'meta.sales': { eq: 100 } } }
      }
    ]
    for (const c of cases) {
      const { name, params } = c
      t.test(name, async (t) => {
        const result = await search(db, params as SearchParams<typeof db, TypedDocument<typeof db>>)
        const hitIds = result.hits.map((d) => d.id)
        t.equal(hitIds.includes(id1), false)

        t.end()
      })
    }

    t.test('but keep the others', async (t) => {
      t.ok(getByID(db, id2))
      t.ok(getByID(db, id3))
      t.ok(getByID(db, id4))

      const result = await search(db, {
        term: ''
      })
      t.equal(result.count, 3)

      t.end()
    })

    t.end()
  })

  t.test('remove index also for nested field', async (t) => {
    t.plan(5)

    const [db, id1, id2] = createSimpleDB()

    const r1_gt = await search(db, {
      where: {
        // @ts-expect-error - err
        'meta.sales': {
          eq: 100
        }
      }
    })

    t.equal(r1_gt.count, 2)
    t.equal(r1_gt.hits[0].id, id1)
    t.equal(r1_gt.hits[1].id, id2)

    remove(db, id1)

    const r2_gt = await search(db, {
      where: {
        // @ts-expect-error - err
        'meta.sales': {
          eq: 100
        }
      }
    })

    t.equal(r2_gt.count, 1)
    t.equal(r2_gt.hits[0].id, id2)
  })

  // Tests for https://github.com/oramasearch/orama/issues/52
  t.test('should correctly remove documents via substring search', async (t) => {
    t.plan(1)

    const orama = await create({
      schema: {
        word: 'string'
      } as const
    })

    const halo = await insert(orama, { word: 'Halo' })
    await insert(orama, { word: 'Halloween' })
    await insert(orama, { word: 'Hal' })

    await remove(orama, halo)

    const searchResult = await search(orama, {
      term: 'Hal'
    })

    t.equal(searchResult.count, 2)
  })

  t.test('should preserve identical docs after deletion', (t) => {
    t.test('- delete old document', async (t) => {
      const [db, id1] = createSimpleDB()
      const doc = getByID(db, id1)!
      const id5 = insert(db, { ...doc, id: undefined })

      remove(db, id1)

      const searchResult1 = await search(db, {
        term: doc.name as string,
        exact: true,
        properties: ['name']
      })
      t.ok(searchResult1.hits.find((d) => d.id === id5))

      const searchResult2 = await search(db, {
        where: {
          // @ts-expect-error - err
          'meta.sales': { eq: (doc.meta as Record<string, number>).sales }
        }
      })
      t.ok(searchResult2.hits.find((d) => d.id === id5))

      t.end()
    })

    t.test('- delete new document', async (t) => {
      const [db, id1] = createSimpleDB()
      const doc = getByID(db, id1)!
      const id5 = await insert(db, { ...doc, id: undefined })

      remove(db, id5)

      const searchResult1 = await search(db, {
        term: doc.name as string,
        exact: true,
        properties: ['name']
      })
      t.ok(searchResult1.hits.find((d) => d.id === id1))

      const searchResult2 = await search(db, {
        where: {
          // @ts-expect-error - err
          'meta.sales': { eq: (doc.meta as Record<string, number>).sales }
        }
      })
      t.ok(searchResult2.hits.find((d) => d.id === id1))

      t.end()
    })

    t.end()
  })

  t.test('should throw an error on unknown document', (t) => {
    const [db] = createSimpleDB()
    t.equal(remove(db, 'unknown index id'), false)
    t.end()
  })

  t.test('should remove unindexed-document', async (t) => {
    const [db] = await createSimpleDB()
    const id5 = await insert(db, {})

    await remove(db, id5)

    t.end()
  })

  t.end()
})

t.test('removeMultiple method', (t) => {
  t.test('should remove all the given items', async (t) => {
    const [db, id1, id2, id3, id4] = createSimpleDB()

    removeMultiple(db, [id1, id2])

    t.ok(getByID(db, id3))
    t.ok(getByID(db, id4))

    t.equal(count(db), 2)

    t.end()
  })

  // @todo: make sure sync methods do not block the event loop too.
  t.skip('should run event loop every batch', async (t) => {
    const [db, id1, id2, id3, id4] = createSimpleDB()

    let count = 0
    const intervalId = setInterval(() => {
      count++
    }, 0)

    removeMultiple(db, [id1, id2, id3, id4], 1)

    clearInterval(intervalId)

    t.equal(count, 5)

    t.end()
  })

  t.test('should throw an error on error', async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const,
      plugins: [
        {
          name: 'throw-error',
          afterRemoveMultiple: () => {
            throw new Error('Kaboom')
          }
        }
      ]
    })
    const id1 = await insert(db, { name: 'coffee' })

    t.throws(() => removeMultiple(db, [id1]), {
      message: 'Kaboom'
    })

    t.end()
  })

  t.end()
})

t.test('should remove a document and update index field length', async (t) => {
  t.plan(2)

  const [db] = createSimpleDB()

  const fieldLengths = { ...(db.data.index as Index).fieldLengths }
  const avgFieldLength = { ...(db.data.index as Index).avgFieldLength }

  const id4 = insert(db, {
    name: 'other machine',
    rating: 5,
    price: 900,
    meta: {
      sales: 100
    }
  })
  remove(db, id4 as string)

  t.same((db.data.index as Index).fieldLengths, fieldLengths)
  t.same((db.data.index as Index).avgFieldLength, avgFieldLength)
})

// Test cases for issue https://github.com/oramasearch/orama/issues/486
t.test('should correctly remove documents with vector properties', async (t) => {
  t.plan(2)

  const db = await create({
    schema: {
      name: 'string',
      vector: 'vector[10]'
    } as const
  })

  const id1 = await insert(db, {
    name: 'coffee maker',
    vector: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  })

  const id2 = await insert(db, {
    name: 'better coffee maker',
    vector: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  })

  await remove(db, id1)

  t.notOk(await getByID(db, id1))
  t.ok(await getByID(db, id2))
})

t.test(
  'test case for #766: Zero division when computing scores after removing all documents from an index.',
  async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const
    })

    const id = insert(db, { name: 'test' })

    const success = remove(db, id as string)

    insert(db, { name: 'foo' })
    insert(db, { name: 'bar' })

    t.ok(success)
  }
)

function createSimpleDB() {
  let i = 0
  const db = create({
    schema: {
      name: 'string',
      rating: 'number',
      price: 'number',
      meta: {
        sales: 'number'
      }
    } as const,
    components: {
      getDocumentIndexId(): string {
        return `__${++i}`
      }
    }
  })

  const id1 = insert(db, {
    name: 'super coffee maker',
    rating: 5,
    price: 900,
    meta: {
      sales: 100
    }
  }) as string

  const id2 = insert(db, {
    name: 'washing machine',
    rating: 5,
    price: 900,
    meta: {
      sales: 100
    }
  }) as string

  const id3 = insert(db, {
    name: 'coffee maker',
    rating: 3,
    price: 30,
    meta: {
      sales: 25
    }
  }) as string

  const id4 = insert(db, {
    name: 'coffee maker deluxe',
    rating: 5,
    price: 45,
    meta: {
      sales: 25
    }
  }) as string

  return [db, id1, id2, id3, id4] as const
}
