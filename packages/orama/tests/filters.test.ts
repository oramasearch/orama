import t from 'tap'
import { create, insert, search, remove, insertMultiple, AnyOrama } from '../src/index.js'

t.test('filters', async (t) => {
  t.test('should throw on unknown field', async (t) => {
    const [db] = await createSimpleDB()

    t.throws(
      () =>
        search(db, {
          term: 'coffee',
          where: {
            unknownField: '5'
          }
        }),
      {
        message: 'Unknown filter property "unknownField"',
        code: 'UNKNOWN_FILTER_PROPERTY'
      }
    )

    t.throws(
      () =>
        search(db, {
          term: 'coffee',
          where: {
            unknownField: { gt: '5' } as unknown as string
          }
        }),
      {
        message: 'Unknown filter property "unknownField"',
        code: 'UNKNOWN_FILTER_PROPERTY'
      }
    )

    t.throws(
      () =>
        search(db, {
          term: 'coffee',
          where: {
            unknownField: true as unknown as string
          }
        }),
      {
        message: 'Unknown filter property "unknownField"',
        code: 'UNKNOWN_FILTER_PROPERTY'
      }
    )

    t.end()
  })

  t.test('greater than', async (t) => {
    const [db, [id1]] = await createSimpleDB()

    const r1_gt = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          gt: 4
        }
      }
    })

    t.equal(r1_gt.count, 1)
    t.equal(r1_gt.hits[0].id, id1)
  })

  t.test('greater than or equal to', async (t) => {
    const [db, [id1, , id3]] = await createSimpleDB()

    const r1_gte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          gte: 3
        }
      }
    })

    t.equal(r1_gte.count, 2)
    t.equal(r1_gte.hits[0].id, id3)
    t.equal(r1_gte.hits[1].id, id1)
  })

  t.test('less than', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lt = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          lt: 5
        }
      }
    })

    t.equal(r1_lt.count, 1)
    t.equal(r1_lt.hits[0].id, id3)
  })

  t.test('less than or equal to', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          lte: 3
        }
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('equal', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          eq: 3
        }
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('between', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          between: [1, 4]
        }
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('multiple filters', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          between: [1, 4]
        },
        price: {
          lte: 40
        }
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('multiple filters, and operation', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        rating: {
          between: [1, 4]
        },
        price: {
          lte: 40
        },
        'meta.sales': {
          eq: 25
        }
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('explicit and operator', async (t) => {
    const [db, [, , id3]] = await createSimpleDB()

    const r1_lte = await search(db, {
      term: 'coffee',
      where: {
        and: [{ rating: { between: [1, 4] } }, { price: { lte: 40 } }, { 'meta.sales': { eq: 25 } }]
      }
    })

    t.equal(r1_lte.count, 1)
    t.equal(r1_lte.hits[0].id, id3)
  })

  t.test('or operator', async (t) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, [id1, id2, id3]] = await createSimpleDB()

    const r1_or = await search(db, {
      term: 'coffee',
      where: {
        or: [{ rating: { gt: 4 } }, { price: { lt: 30 } }]
      }
    })

    t.equal(r1_or.count, 1)
    const resultIds = r1_or.hits.map((hit) => hit.id).sort()
    t.strictSame(resultIds, [id1].sort())
  })

  t.test('not operator', async (t) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, [id1, id2, id3]] = await createSimpleDB()

    const r1_not = await search(db, {
      term: 'coffee',
      where: {
        not: { rating: { gt: 4 } }
      }
    })

    t.equal(r1_not.count, 1)
    const resultIds = r1_not.hits.map((hit) => hit.id).sort()
    t.strictSame(resultIds, [id3].sort())
  })

  t.test('nested logical operators', async (t) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, [id1, id2, id3]] = await createSimpleDB()

    const r1_nested = await search(db, {
      term: 'coffee',
      where: {
        or: [
          {
            and: [{ rating: { gt: 4 } }, { price: { gt: 50 } }]
          },
          {
            and: [{ not: { rating: { gt: 4 } } }, { price: { lt: 30 } }]
          }
        ]
      }
    })

    t.equal(r1_nested.count, 1)
    t.equal(r1_nested.hits[0].id, id1)
  })

  t.test('empty and array', async (t) => {
    const [db] = await createSimpleDB()

    const r1_empty = await search(db, {
      term: 'coffee',
      where: {
        and: []
      }
    })

    t.equal(r1_empty.count, 0)
  })

  t.test('empty or array', async (t) => {
    const [db] = await createSimpleDB()

    const r1_empty = await search(db, {
      term: 'coffee',
      where: {
        or: []
      }
    })

    t.equal(r1_empty.count, 0)
  })
})

t.test('should throw when using multiple operators', async (t) => {
  const [db] = await createSimpleDB()

  t.throws(
    () =>
      search(db, {
        term: 'coffee',
        where: {
          rating: {
            gt: 4,
            lte: 10
          }
        }
      }),
    { code: 'INVALID_FILTER_OPERATION' }
  )
})

t.test('boolean filters', async (t) => {
  const db = create({
    schema: {
      id: 'string',
      isAvailable: 'boolean',
      name: 'string'
    } as const
  })

  await insert(db, {
    id: '1',
    isAvailable: true,
    name: 'coffee'
  })

  await insert(db, {
    id: '2',
    isAvailable: true,
    name: 'coffee machine'
  })

  await insert(db, {
    id: '3',
    isAvailable: false,
    name: 'coffee maker'
  })

  const r1 = await search(db, {
    term: 'coffee',
    where: {
      isAvailable: true
    }
  })

  t.equal(r1.count, 2)
  t.equal(r1.hits[0].id, '1')
  t.equal(r1.hits[1].id, '2')

  const r2 = await search(db, {
    term: 'coffee',
    where: {
      isAvailable: false
    }
  })

  t.equal(r2.count, 1)
  t.equal(r2.hits[0].id, '3')

  await remove(db, '2')

  const r3 = await search(db, {
    term: 'coffee',
    where: {
      isAvailable: true
    }
  })

  t.equal(r3.count, 1)
  t.equal(r3.hits[0].id, '1')
})

t.test('string filters', async (t) => {
  const db = await create({
    schema: {
      id: 'string',
      name: 'string',
      tags: 'string'
    } as const
  })

  await insert(db, {
    id: '1',
    name: 'coffee type',
    tags: 'coffee type'
  })

  await insert(db, {
    id: '2',
    name: 'coffee machine',
    tags: 'coffee machine'
  })

  await insert(db, {
    id: '3',
    name: 'coffee maker',
    tags: 'coffee maker'
  })

  await insert(db, {
    id: '4',
    name: 'coffee drinker',
    tags: 'coffee drinker'
  })

  await insert(db, {
    id: '5',
    name: 'another',
    tags: 'coffee drinker'
  })

  const r1 = await search(db, {
    term: 'coffee',
    properties: ['name'],
    where: {
      tags: 'coffee'
    }
  })

  t.equal(r1.count, 4)
  t.equal(r1.hits[0].id, '1')
  t.equal(r1.hits[1].id, '2')
  t.equal(r1.hits[2].id, '3')
  t.equal(r1.hits[3].id, '4')

  const r2 = await search(db, {
    term: 'coffee',
    properties: ['name'],
    where: {
      name: ['machine', 'maker']
    }
  })

  t.equal(r2.count, 2)
  t.equal(r2.hits[0].id, '2')
  t.equal(r2.hits[1].id, '3')

  const r3 = await search(db, {
    term: 'another',
    properties: ['name'],
    where: {
      name: ['coffee']
    }
  })

  t.equal(r3.count, 0)

  const r4 = await search(db, {
    term: '',
    where: {
      name: []
    }
  })

  t.equal(r4.count, 0)
})

t.test('string filters with stemming', async (t) => {
  const db = await create({
    schema: {
      id: 'string',
      name: 'string',
      tags: 'string'
    } as const,
    components: {
      tokenizer: {
        stemming: true
      }
    }
  })

  await insert(db, {
    id: '1',
    name: 'coffee',
    tags: 'machine'
  })

  await insert(db, {
    id: '2',
    name: 'coffee',
    tags: 'machines'
  })

  const r1 = await search(db, {
    term: 'coffee',
    properties: ['name'],
    where: {
      tags: 'machine'
    }
  })

  t.equal(r1.count, 2)
  t.equal(r1.hits[0].id, '1')
  t.equal(r1.hits[1].id, '2')

  const r2 = await search(db, {
    term: 'coffee',
    properties: ['name'],
    where: {
      tags: 'machines'
    }
  })

  t.equal(r2.count, 2)
  t.equal(r2.hits[0].id, '1')
  t.equal(r2.hits[1].id, '2')
})

async function createSimpleDB(): Promise<[AnyOrama, string[]]> {
  let i = 0
  const db = await create({
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

  const ids = await insertMultiple(db, [
    {
      name: 'super coffee maker',
      rating: 5,
      price: 900,
      meta: {
        sales: 100
      }
    },
    {
      name: 'washing machine',
      rating: 5,
      price: 900,
      meta: {
        sales: 100
      }
    },
    {
      name: 'coffee maker',
      rating: 3,
      price: 30,
      meta: {
        sales: 25
      }
    }
  ])

  return [db, ids]
}
