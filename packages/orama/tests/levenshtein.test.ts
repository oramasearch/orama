import t from 'tap'
import { boundedLevenshtein, levenshtein, syncBoundedLevenshtein } from '../src/components/levenshtein.js'
import { create } from '../src/methods/create.js'
import { insertMultiple } from '../src/methods/insert.js'
import { search } from '../src/methods/search.js'

t.test('syncBoundedLevenshtein', async (t) => {
  // Test exact match
  t.same(
    syncBoundedLevenshtein('hello', 'hello', 3),
    { distance: 0, isBounded: true },
    'Exact match should return distance 0 and isBounded true'
  )

  // Test within tolerance
  t.same(
    syncBoundedLevenshtein('hello', 'helo', 2),
    { distance: 1, isBounded: true },
    'Strings within tolerance should return correct distance and isBounded true'
  )

  // Test at tolerance limit
  t.same(
    syncBoundedLevenshtein('hello', 'hllo', 1),
    { distance: 1, isBounded: true },
    'Strings at tolerance limit should return correct distance and isBounded true'
  )

  // Test beyond tolerance
  t.same(
    syncBoundedLevenshtein('hello', 'hi', 1),
    { distance: -1, isBounded: false },
    'Strings beyond tolerance should return distance -1 and isBounded false'
  )

  // Test empty string
  t.same(
    syncBoundedLevenshtein('', 'hello', 5),
    { distance: 5, isBounded: true },
    'Empty string should return correct distance and isBounded true if within tolerance'
  )

  // Test prefix
  t.same(
    syncBoundedLevenshtein('hel', 'hello', 5),
    { distance: 0, isBounded: true },
    'Prefix should return distance 0 and isBounded true'
  )

  // Test suffix
  t.same(
    syncBoundedLevenshtein('llo', 'hello', 5),
    { distance: 2, isBounded: true },
    'Suffix should return correct distance and isBounded true if within tolerance'
  )

  // This never happens in the real world: the function accepts tokenized strings
  // so, the stings are always the same case
  // t.same(
  //   syncBoundedLevenshtein('Hello', 'hello', 1),
  //   { distance: 0, isBounded: true },
  //   'Case difference should not be counted in the distance'
  // )

  // Test with tolerance 0
  t.same(
    syncBoundedLevenshtein('hello', 'helo', 0),
    { distance: -1, isBounded: false },
    'Any difference should return distance -1 and isBounded false when tolerance is 0'
  )

  // Test with very large tolerance
  t.same(
    syncBoundedLevenshtein('short', 'very long string', 100),
    { distance: 14, isBounded: true },
    'Large tolerance should allow for big differences'
  )

  t.end()
})

t.test('levenshtein', async (t) => {
  t.test('should be 0 when both inputs are empty', async (t) => {
    t.equal(levenshtein('', ''), 0)
  })

  t.test('should be the max input length when either strings are empty', async (t) => {
    t.equal(levenshtein('', 'some'), 4)
    t.equal(levenshtein('body', ''), 4)
  })

  t.test('some examples', async (t) => {
    t.equal(levenshtein('aa', 'b'), 2)
    t.equal(levenshtein('b', 'aa'), 2)
    t.equal(levenshtein('somebody once', 'told me'), 9)
    t.equal(levenshtein('the world is gonna', 'roll me'), 15)
    t.equal(levenshtein('kaushuk chadhui', 'caushik chakrabar'), 8)
  })
})

t.test('boundedLevenshtein', async (t) => {
  t.test('should be 0 when both inputs are empty', async (t) => {
    t.match(boundedLevenshtein('', '', 0), { distance: 0, isBounded: true })
    t.match(boundedLevenshtein('', '', 1), { distance: 0, isBounded: true })
  })

  t.test('should be the max input length when either strings are empty', async (t) => {
    t.match(boundedLevenshtein('', 'some', 0), { distance: -1, isBounded: false })

    t.match(boundedLevenshtein('', 'some', 4), { distance: 4, isBounded: true })
    t.match(boundedLevenshtein('body', '', 4), { distance: 4, isBounded: true })
  })

  t.test('should tell whether the Levenshtein distance is upperbounded by a given tolerance', async (t) => {
    t.match(boundedLevenshtein('somebody once', 'told me', 9), { isBounded: true })
    t.match(boundedLevenshtein('somebody once', 'told me', 8), { isBounded: false })
  })
})

t.test('syncBoundedLevenshtein substrings are ok even if with tolerance pppppp', async (t) => {
  t.match(boundedLevenshtein('Dhris', 'Chris', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Chris', 1), { isBounded: true, distance: 1 })
  t.match(boundedLevenshtein('Dhris', 'Cgris', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Cgris', 2), { isBounded: true, distance: 2 })
  t.match(boundedLevenshtein('Dhris', 'Cgris', 3), { isBounded: true, distance: 2 })

  t.match(boundedLevenshtein('Dhris', 'Cris', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Cris', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Cris', 2), { isBounded: true, distance: 2 })

  t.match(boundedLevenshtein('Dhris', 'Caig', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Caig', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Caig', 2), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Caig', 3), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Dhris', 'Caig', 4), { isBounded: true, distance: 4 })

  t.match(boundedLevenshtein('Chris', 'Chris', 0), { isBounded: true, distance: 0 })
  t.match(boundedLevenshtein('Chris', 'Chris', 1), { isBounded: true, distance: 0 })
  t.match(boundedLevenshtein('Chris', 'Chris', 2), { isBounded: true, distance: 0 })

  t.match(boundedLevenshtein('Chris', 'Cris', 0), { isBounded: false, distance: -1 })

  t.match(boundedLevenshtein('Chris', 'Cris', 1), { isBounded: true, distance: 1 })
  t.match(boundedLevenshtein('Chris', 'Cris', 2), { isBounded: true, distance: 1 })

  t.match(boundedLevenshtein('Chris', 'Caig', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chris', 'Caig', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chris', 'Caig', 2), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chris', 'Caig', 3), { isBounded: true, distance: 3 })

  t.match(boundedLevenshtein('Craig', 'Caig', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Craig', 'Caig', 1), { isBounded: true, distance: 1 })
  t.match(boundedLevenshtein('Craig', 'Caig', 2), { isBounded: true, distance: 1 })

  t.match(boundedLevenshtein('Chxy', 'Cris', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Cris', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Cris', 2), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Cris', 3), { isBounded: true, distance: 3 })

  t.match(boundedLevenshtein('Chxy', 'Caig', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Caig', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Caig', 2), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Chxy', 'Caig', 3), { isBounded: true, distance: 3 })

  t.match(boundedLevenshtein('Crxy', 'Cris', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Crxy', 'Cris', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Crxy', 'Cris', 2), { isBounded: true, distance: 2 })

  t.match(boundedLevenshtein('Crxy', 'Caig', 0), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Crxy', 'Caig', 1), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Crxy', 'Caig', 2), { isBounded: false, distance: -1 })
  t.match(boundedLevenshtein('Crxy', 'Caig', 3), { isBounded: true, distance: 3 })

  t.match(boundedLevenshtein('Crxy', 'Caig', 3), { isBounded: true, distance: 3 })

  t.match(boundedLevenshtein('Christopher', 'Chris', 0), { isBounded: false, distance: -1 })

  t.match(boundedLevenshtein('Christopher', 'Chris', 1), { isBounded: false, distance: -1 })
  // To return true, the prefix must be within tolerance
  t.match(boundedLevenshtein('Christopher', 'Chris', 'Christopher'.length - 'Chris'.length), {
    isBounded: true,
    distance: 6
  })

  t.end()
})

// Test cases for https://github.com/oramasearch/orama/issues/744
t.test('Issue #744', async (t) => {
  const index = await create({
    schema: {
      libelle: 'string'
    } as const
  })

  const docs = [
    { id: '1', libelle: 'abricot moelleux' },
    { id: '2', libelle: 'moelleux choc bio' },
    { id: '3', libelle: 'crepe moelleuse' },
    { id: '4', libelle: 'os moelle' }
  ]
  await insertMultiple(index, docs)

  const searchTerm = 'moelleux'

  // doc1 and doc2 match searchTerm exactly
  t.equal(syncBoundedLevenshtein(searchTerm, searchTerm, 0).isBounded, true)
  // doc3 don't match searchTerm with tolerance 1
  t.equal(syncBoundedLevenshtein(searchTerm, 'moelleuse', 1).isBounded, false)
  // but doc3 match searchTerm with tolerance 2 ("x" => "se" are 2 operations)
  t.equal(syncBoundedLevenshtein(searchTerm, 'moelleuse', 2).isBounded, true)
  // doc4 don't match searchTerm with tolerance 1
  t.equal(syncBoundedLevenshtein(searchTerm, 'moelle', 1).isBounded, false)
  // but doc4 match searchTerm with tolerance 2 ("ux" => "" are 2 operation)
  t.equal(syncBoundedLevenshtein('moelle', searchTerm, 2).isBounded, true)

  const s1 = await search(index, {
    term: searchTerm
  })
  t.equal(s1.count, 2)
  t.strictSame(
    s1.hits.map((h) => h.id),
    ['1', '2']
  )

  const s2 = await search(index, {
    term: searchTerm,
    tolerance: 0
  })
  t.equal(s2.count, 2)
  t.strictSame(
    s2.hits.map((h) => h.id),
    ['1', '2']
  )

  const s3 = await search(index, {
    term: searchTerm,
    tolerance: 1
  })
  t.equal(s3.count, 2)
  t.strictSame(
    s3.hits.map((h) => h.id),
    ['1', '2']
  )

  const s4 = await search(index, {
    term: searchTerm,
    tolerance: 2
  })
  t.equal(s4.count, 4)
  t.strictSame(
    s4.hits.map((h) => h.id),
    ['3', '4', '1', '2']
  )
})

// https://github.com/oramasearch/orama/issues/797
t.test('Issue #797', async (t) => {
  const db = await create({
    schema: {
      name: 'string'
    } as const
  })
  await insertMultiple(db, [
    { id: '1', name: 'S' },
    { id: '2', name: 'Scroll' }
  ])

  const res = await search(db, {
    term: 'scrol',
    tolerance: 1
  })

  t.equal(res.count, 1)
  t.equal(res.hits[0].id, '2')
})
