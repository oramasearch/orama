import { create, insert, search } from '@orama/orama'
import t from 'tap'
import { UNSUPPORTED_FORMAT, METHOD_MOVED } from '../src/errors.js'
import {
  persist,
  restore,
  persistToFile as deprecatedPersistToFile,
  restoreFromFile as deprecatedRestoreFromFile
} from '../src/index.js'
import { persistToFile, restoreFromFile } from '../src/server.js'

// Allow referencing Deno in cross-runtime tests without type errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

function hitsApproxEqual(a: any[], b: any[], epsilon = 1e-5): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const ha = a[i]
    const hb = b[i]
    if (ha.id !== hb.id) return false
    if (JSON.stringify(ha.document) !== JSON.stringify(hb.document)) return false
    if (typeof ha.score === 'number' && typeof hb.score === 'number') {
      if (Math.abs(ha.score - hb.score) > epsilon) return false
    }
  }
  return true
}

let _rm

async function rm(path: string): Promise<void> {
  if (!_rm) {
    _rm = typeof Deno !== 'undefined' ? Deno.remove : (await import('node:fs/promises')).rm
  }

  return _rm(path)
}

async function generateTestDBInstance() {
  const db = await create({
    schema: {
      quote: 'string',
      author: 'string',
      genre: 'enum',
      colors: 'enum[]'
    } as const
  })

  await insert(db, {
    quote: 'I am a great programmer',
    author: 'Bill Gates',
    genre: 'tech',
    colors: ['red', 'blue']
  })

  await insert(db, {
    quote: 'Be yourself; everyone else is already taken.',
    author: 'Oscar Wilde',
    genre: 'life',
    colors: ['red', 'green']
  })

  await insert(db, {
    quote: "I have not failed. I've just found 10,000 ways that won't work.",
    author: 'Thomas A. Edison',
    genre: 'tech',
    colors: ['red', 'blue']
  })

  await insert(db, {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs'
  })

  return db
}

t.test('binary persistence', (t) => {
  t.plan(5)

  t.test('should generate a persistence file on the disk with random name', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in binary format
    const path = await persistToFile(db, 'binary')
    t.teardown(rmTeardown(path))

    // Load database from disk in binary format
    const db2 = await restoreFromFile('binary')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should generate a persistence file on the disk with a given name', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in binary format
    const path = await persistToFile(db, 'binary', 'test.dpack')
    t.teardown(rmTeardown(path))

    // Load database from disk in binary format
    const db2 = await restoreFromFile('binary', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should generate a persistence file on the disk using ORAMA_DB_NAME env', async (t) => {
    t.plan(3)
    let currentOramaDBNameValue: string | undefined

    if (typeof Deno !== 'undefined') {
      currentOramaDBNameValue = Deno.env.get('ORAMA_DB_NAME')
      Deno.env.set('ORAMA_DB_NAME', 'example_db_dump')
    } else {
      currentOramaDBNameValue = process.env.ORAMA_DB_NAME
      process.env.ORAMA_DB_NAME = 'example_db_dump'
    }

    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in binary format
    const path = await persistToFile(db, 'binary')
    t.teardown(rmTeardown(path))
    t.match(path, 'example_db_dump')

    // Load database from disk in binary format
    const db2 = await restoreFromFile('binary', path)

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)

    if (currentOramaDBNameValue) {
      if (typeof Deno !== 'undefined') {
        Deno.env.set('ORAMA_DB_NAME', currentOramaDBNameValue)
      } else {
        process.env.ORAMA_DB_NAME = currentOramaDBNameValue
      }
    }
  })

  t.test('should continue to work with `enum`', async (t) => {
    t.plan(1)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    const path = await persistToFile(db, 'binary', 'test.dpack')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('binary', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })

  t.test('should continue to work with `enum[]`', async (t) => {
    t.plan(1)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    const path = await persistToFile(db, 'binary', 'test.dpack')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('binary', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })
})

t.test('json persistence', (t) => {
  t.plan(5)

  t.test('should generate a persistence file on the disk with random name and json format', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in json format
    const path = await persistToFile(db, 'json')
    t.teardown(rmTeardown(path))

    // Load database from disk in json format
    const db2 = await restoreFromFile('json')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should generate a persistence file on the disk with support for vectors', async (t) => {
    t.plan(1)
    const db1 = await create({
      schema: {
        text: 'string',
        vector: 'vector[5]'
      } as const
    })

    await insert(db1, { text: 'vector 1', vector: [1, 0, 0, 0, 0] })
    await insert(db1, { text: 'vector 2', vector: [1, 1, 0, 0, 0] })
    await insert(db1, { text: 'vector 3', vector: [0, 0, 0, 0, 0] })

    // Persist database on disk in json format
    const path = await persistToFile(db1, 'json', 'test.json')
    t.teardown(rmTeardown(path))

    // Load database from disk in json format
    const db2 = await restoreFromFile('json', 'test.json')

    const qp1 = await search(db1, {
      mode: 'vector',
      vector: {
        value: [1, 0, 0, 0, 0],
        property: 'vector'
      }
    })

    const qp2 = await search(db2, {
      mode: 'vector',
      vector: {
        value: [1, 0, 0, 0, 0],
        property: 'vector'
      }
    })

    // Queries on the loaded database should match the original database
    t.same(qp1.hits, qp2.hits)
  })

  t.test('should generate a persistence file on the disk with a given name and json format', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in json format
    const path = await persistToFile(db, 'json', 'test.json')
    t.teardown(rmTeardown(path))

    // Load database from disk in json format
    const db2 = await restoreFromFile('json', 'test.json')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should continue to work with `enum`', async (t) => {
    t.plan(1)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    const path = await persistToFile(db, 'json', 'test.json')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('json', 'test.json')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })

  t.test('should continue to work with `enum[]`', async (t) => {
    t.plan(1)

    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    const path = await persistToFile(db, 'json', 'test.json')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('json', 'test.json')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })
})

t.test('dpack persistence', (t) => {
  t.plan(4)

  t.test('should generate a persistence file on the disk with random name and dpack format', async (t) => {
    t.plan(2)

    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in dpack format
    const path = await persistToFile(db, 'dpack')
    t.teardown(rmTeardown(path))

    // Load database from disk in dpack format
    const db2 = await restoreFromFile('dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should generate a persistence file on the disk with a given name and dpack format', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      term: 'way'
    })

    const q2 = await search(db, {
      mode: 'fulltext',
      term: 'i'
    })

    // Persist database on disk in json format
    const path = await persistToFile(db, 'dpack', 'test.dpack')
    t.teardown(rmTeardown(path))

    // Load database from disk in json format
    const db2 = await restoreFromFile('dpack', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      term: 'way'
    })

    const qp2 = await search(db2, {
      mode: 'fulltext',
      term: 'i'
    })

    // Queries on the loaded database should match the original database
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.same(q2.hits, qp2.hits)
  })

  t.test('should continue to work with `enum`', async (t) => {
    t.plan(1)

    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    const path = await persistToFile(db, 'dpack', 'test.dpack')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('dpack', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        genre: { eq: 'way' }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })

  t.test('should continue to work with `enum[]`', async (t) => {
    t.plan(1)

    const db = await generateTestDBInstance()
    const q1 = await search(db, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    const path = await persistToFile(db, 'dpack', 'test.dpack')
    t.teardown(rmTeardown(path))

    const db2 = await restoreFromFile('dpack', 'test.dpack')

    const qp1 = await search(db2, {
      mode: 'fulltext',
      where: {
        colors: { containsAll: ['green'] }
      }
    })

    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })
})

t.test('seqproto persistence', (t) => {
  t.plan(5)

  t.test('should generate a persistence file on the disk with random name (seqproto)', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, { mode: 'fulltext', term: 'way' })
    const q2 = await search(db, { mode: 'fulltext', term: 'i' })
    const path = await persistToFile(db, 'seqproto')
    t.teardown(rmTeardown(path))
    const db2 = await restoreFromFile('seqproto')
    const qp1 = await search(db2, { mode: 'fulltext', term: 'way' })
    const qp2 = await search(db2, { mode: 'fulltext', term: 'i' })
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.ok(hitsApproxEqual(q2.hits, qp2.hits))
  })

  t.test('should generate a persistence file on the disk with a given name (seqproto)', async (t) => {
    t.plan(2)
    const db = await generateTestDBInstance()
    const q1 = await search(db, { mode: 'fulltext', term: 'way' })
    const q2 = await search(db, { mode: 'fulltext', term: 'i' })
    const path = await persistToFile(db, 'seqproto', 'test.seqp')
    t.teardown(rmTeardown(path))
    const db2 = await restoreFromFile('seqproto', 'test.seqp')
    const qp1 = await search(db2, { mode: 'fulltext', term: 'way' })
    const qp2 = await search(db2, { mode: 'fulltext', term: 'i' })
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.ok(hitsApproxEqual(q2.hits, qp2.hits))
  })

  t.test('should generate a persistence file on the disk using ORAMA_DB_NAME env (seqproto)', async (t) => {
    t.plan(3)
    let currentOramaDBNameValue: string | undefined
    if (typeof Deno !== 'undefined') {
      currentOramaDBNameValue = Deno.env.get('ORAMA_DB_NAME')
      Deno.env.set('ORAMA_DB_NAME', 'example_db_dump_seqproto')
    } else {
      currentOramaDBNameValue = process.env.ORAMA_DB_NAME
      process.env.ORAMA_DB_NAME = 'example_db_dump_seqproto'
    }
    const db = await generateTestDBInstance()
    const q1 = await search(db, { mode: 'fulltext', term: 'way' })
    const q2 = await search(db, { mode: 'fulltext', term: 'i' })
    const path = await persistToFile(db, 'seqproto')
    t.teardown(rmTeardown(path))
    t.match(path, 'example_db_dump_seqproto')
    const db2 = await restoreFromFile('seqproto', path)
    const qp1 = await search(db2, { mode: 'fulltext', term: 'way' })
    const qp2 = await search(db2, { mode: 'fulltext', term: 'i' })
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
    t.ok(hitsApproxEqual(q2.hits, qp2.hits))
    if (currentOramaDBNameValue) {
      if (typeof Deno !== 'undefined') {
        Deno.env.set('ORAMA_DB_NAME', currentOramaDBNameValue)
      } else {
        process.env.ORAMA_DB_NAME = currentOramaDBNameValue
      }
    }
  })

  t.test('should continue to work with `enum` (seqproto)', async (t) => {
    t.plan(1)
    const db = await generateTestDBInstance()
    const q1 = await search(db, { mode: 'fulltext', where: { genre: { eq: 'way' } } })
    const path = await persistToFile(db, 'seqproto', 'test_enum.seqp')
    t.teardown(rmTeardown(path))
    const db2 = await restoreFromFile('seqproto', 'test_enum.seqp')
    const qp1 = await search(db2, { mode: 'fulltext', where: { genre: { eq: 'way' } } })
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })

  t.test('should continue to work with `enum[]` (seqproto)', async (t) => {
    t.plan(1)
    const db = await generateTestDBInstance()
    const q1 = await search(db, { mode: 'fulltext', where: { colors: { containsAll: ['green'] } } })
    const path = await persistToFile(db, 'seqproto', 'test_enum_arr.seqp')
    t.teardown(rmTeardown(path))
    const db2 = await restoreFromFile('seqproto', 'test_enum_arr.seqp')
    const qp1 = await search(db2, { mode: 'fulltext', where: { colors: { containsAll: ['green'] } } })
    t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  })
})

t.test('should persist data in-memory', async (t) => {
  t.plan(5)
  const db = await generateTestDBInstance()

  const q1 = await search(db, {
    mode: 'fulltext',
    term: 'way'
  })

  const q2 = await search(db, {
    mode: 'fulltext',
    term: 'i'
  })

  // Persist database in-memory
  const binDB = await persist(db, 'binary')
  const jsonDB = await persist(db, 'json')
  const dpackDB = await persist(db, 'dpack')
  const seqprotoDB = await persist(db, 'seqproto')

  // Load database from in-memory
  const binDB2 = await restore('binary', binDB)
  const jsonDB2 = await restore('json', jsonDB)
  const dpackDB2 = await restore('dpack', dpackDB)
  const seqprotoDB2 = await restore('seqproto', seqprotoDB)

  const qp1 = await search(binDB2, {
    mode: 'fulltext',
    term: 'way'
  })

  const qp2 = await search(jsonDB2, {
    mode: 'fulltext',
    term: 'i'
  })

  const qp3 = await search(dpackDB2, {
    mode: 'fulltext',
    term: 'way'
  })

  const qp4 = await search(dpackDB2, {
    mode: 'fulltext',
    term: 'i'
  })

  const qp5 = await search(seqprotoDB2, {
    mode: 'fulltext',
    term: 'way'
  })

  // Queries on the loaded database should match the original database
  t.ok(hitsApproxEqual(q1.hits, qp1.hits))
  t.same(q2.hits, qp2.hits)
  t.ok(hitsApproxEqual(q1.hits, qp3.hits))
  t.same(q2.hits, qp4.hits)
  t.ok(hitsApproxEqual(q1.hits, qp5.hits))
})

t.test('errors', (t) => {
  t.plan(2)

  t.test('should throw an error when trying to persist a database in an unsupported format', async (t) => {
    t.plan(1)

    const db = await generateTestDBInstance()
    try {
      // @ts-expect-error - 'unsupported' is not a supported format
      await persistToFile(db, 'unsupported')
    } catch ({ message }) {
      t.match(message, 'Unsupported serialization format: unsupported')
    }
  })

  t.test('should throw an error when trying to restoreFromFile a database from an unsupported format', async (t) => {
    t.plan(1)

    const format = 'unsupported'
    const db = await generateTestDBInstance()
    const path = await persistToFile(db, 'binary', 'supported')
    t.teardown(rmTeardown(path))

    try {
      // @ts-expect-error - 'unsupported' is not a supported format
      await restoreFromFile(format, path)
    } catch ({ message }) {
      t.match(message, UNSUPPORTED_FORMAT(format))
    }
  })
})

t.test('should throw an error when trying to use a deprecated method', async (t) => {
  t.plan(2)
  const db = await generateTestDBInstance()

  try {
    await deprecatedPersistToFile(db, 'binary')
  } catch ({ message }) {
    t.match(message, METHOD_MOVED('persistToFile'))
  }

  try {
    await deprecatedRestoreFromFile('binary', 'path')
  } catch ({ message }) {
    t.match(message, METHOD_MOVED('restoreFromFile'))
  }
})

function rmTeardown(p: string) {
  return async () => {
    try {
      await rm(p)
    } catch (e) {}
  }
}
