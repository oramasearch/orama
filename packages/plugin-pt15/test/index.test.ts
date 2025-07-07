import t from 'tap'
import { create, insertMultiple, load, remove, save, search } from '@orama/orama'
import { pluginPT15 } from '../src/index.js'
import { get_position } from '../src/algorithm.js'

t.test('get_position', async (t) => {
  t.equal(get_position(0, 1), 0)
  t.equal(get_position(1, 1), 1)

  t.equal(get_position(0, 50), 0)
  t.equal(get_position(1, 50), 0)
  t.equal(get_position(2, 50), 0)
  t.equal(get_position(3, 50), 0)

  t.equal(get_position(4, 50), 1)
  t.equal(get_position(5, 50), 1)
  t.equal(get_position(6, 50), 1)

  t.equal(get_position(7, 50), 2)
  t.equal(get_position(8, 50), 2)
  t.equal(get_position(9, 50), 2)

  t.equal(get_position(10, 50), 3)
  t.equal(get_position(11, 50), 3)
  t.equal(get_position(12, 50), 3)
  t.equal(get_position(13, 50), 3)

  t.equal(get_position(14, 50), 4)

  // skip some...

  t.equal(get_position(46, 50), 13)

  t.equal(get_position(47, 50), 14)
  t.equal(get_position(48, 50), 14)
  t.equal(get_position(49, 50), 14)
})

t.test('plugin-pt15', async (t) => {
  const db = create({
    schema: {
      name: 'string',
      age: 'number',
      isCool: 'boolean',
      algo: 'string[]',
      preferredNumbers: 'number[]'
    } as const,
    plugins: [pluginPT15()]
  })

  await insertMultiple(db, [
    {
      id: '1',
      name: 'The pen is on the table',
      age: 33,
      isCool: true,
      algo: ['algo1', 'algo2'],
      preferredNumbers: [20]
    },
    { id: '2', name: 'The can is near the table', age: 32, isCool: true, algo: ['algo3'], preferredNumbers: [55] },
    { id: '3', name: 'My table is cool', age: 22, isCool: false, algo: ['algo4'], preferredNumbers: [22] }
  ])

  const result = await search(db, {
    term: 't'
  })

  t.equal(result.count, 3)

  const dump = await save(db)
  const restored = JSON.parse(JSON.stringify(dump))

  const db2 = create({
    schema: {
      name: 'string',
      age: 'number',
      isCool: 'boolean',
      algo: 'string[]',
      preferredNumbers: 'number[]'
    } as const,
    plugins: [pluginPT15()]
  })
  await load(db2, restored)

  const result2 = await search(db2, {
    term: 't'
  })
  t.equal(result2.count, 3)

  await remove(db2, '1')

  const result3 = await search(db2, {
    term: 't'
  })
  t.equal(result3.count, 2)
})

t.test('where string', async (t) => {
  const db = create({
    schema: {
      name: 'string',
      age: 'number',
      isCool: 'boolean',
      algo: 'string[]',
      preferredNumbers: 'number[]'
    } as const,
    plugins: [pluginPT15()]
  })

  await insertMultiple(db, [
    {
      id: '1',
      name: 'The pen is on the table',
      age: 33,
      isCool: true,
      algo: ['algo1', 'algo2'],
      preferredNumbers: [20]
    },
    { id: '2', name: 'The can is near the table', age: 32, isCool: true, algo: ['algo3'], preferredNumbers: [55] },
    { id: '3', name: 'My table is cool', age: 22, isCool: false, algo: ['algo4'], preferredNumbers: [22] }
  ])

  t.throws(
    () =>
      search(db, {
        where: {
          name: 'The pen is on the table'
        }
      }),
    'String filters are not supported'
  )
})
