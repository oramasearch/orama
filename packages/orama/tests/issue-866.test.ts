import t from 'tap'
import { create, insert, search } from '../src/index.js'

t.test('issue-866: exact search should only match exact terms', async (t) => {
  t.test('should not match partial words when exact is true', async (t) => {
    const db = create({
      schema: {
        path: 'string',
        title: 'string'
      }
    })

    await insert(db, { path: 'First Note.md', title: 'First Note' })
    await insert(db, { path: 'Second Note.md', title: 'Second Note' })

    // Without exact, should match because "first" is a prefix
    const noExact = await search(db, {
      term: 'first',
      properties: ['path']
    })

    // With exact: true, should NOT match "First Note.md" because "first" !== "First"
    const withExact = await search(db, {
      term: 'first',
      properties: ['path'],
      exact: true
    })

    t.ok(noExact.count >= 1, 'Without exact, should find results with prefix match')
    t.equal(withExact.count, 0, 'With exact: true, should not match "first" with "First"')
  })

  t.test('should match exact terms when exact is true', async (t) => {
    const db = create({
      schema: {
        path: 'string',
        title: 'string'
      }
    })

    await insert(db, { path: 'First Note.md', title: 'First Note' })
    await insert(db, { path: 'first note.md', title: 'first note' })
    await insert(db, { path: 'another first file.md', title: 'another' })

    // With exact: true, searching for "first" should only match documents with lowercase "first"
    const result = await search(db, {
      term: 'first',
      properties: ['path'],
      exact: true
    })

    t.equal(result.count, 2, 'Should match exactly two documents with lowercase "first"')
    const paths = result.hits.map(h => h.document.path).sort()
    t.strictSame(paths, ['another first file.md', 'first note.md'], 'Should match only lowercase versions')
  })

  t.test('should not match prefix when exact is true', async (t) => {
    const db = create({
      schema: {
        name: 'string'
      }
    })

    await insert(db, { name: 'apple' })
    await insert(db, { name: 'application' })
    await insert(db, { name: 'app' })

    // Without exact, "app" should match all three
    const noExact = await search(db, {
      term: 'app',
      exact: false
    })

    // With exact: true, "app" should only match the document with "app"
    const withExact = await search(db, {
      term: 'app',
      exact: true
    })

    t.equal(noExact.count, 3, 'Without exact, should match all prefix matches')
    t.equal(withExact.count, 1, 'With exact: true, should only match exact term')
    t.equal(withExact.hits[0].document.name, 'app', 'Should match only "app"')
  })

  t.test('should handle case sensitivity with exact match', async (t) => {
    const db = create({
      schema: {
        name: 'string'
      }
    })

    await insert(db, { name: 'Test' })
    await insert(db, { name: 'test' })
    await insert(db, { name: 'testing' })
    await insert(db, { name: 'test again' })

    // With exact: true, searching for "test" should match only documents with lowercase "test"
    const result = await search(db, {
      term: 'test',
      exact: true
    })

    t.equal(result.count, 2, 'Should match two documents with lowercase "test"')
    const names = result.hits.map(h => h.document.name).sort()
    t.strictSame(names, ['test', 'test again'], 'Should match only lowercase versions')
  })
})
