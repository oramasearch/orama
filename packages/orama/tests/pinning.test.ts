import t from 'tap'
import { create, insert, insertMultiple, insertPin, deletePin, getPin, getAllPins, search } from '../src/index.js'
import type { PinRule } from '../src/components/pinning.js'
import type { TokenScore } from '../src/types.js'
import { applyPinningRules } from '../src/components/pinning-manager.js'

t.test('pinning public API', async (t) => {
  t.test('should add a pin rule', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    const rule: PinRule = {
      id: 'test_rule',
      conditions: [
        {
          anchoring: 'is',
          pattern: 'test'
        }
      ],
      consequence: {
        promote: [
          {
            doc_id: 'doc1',
            position: 0
          }
        ]
      }
    }

    insertPin(db, rule)

    const retrieved = getPin(db, 'test_rule')
    t.strictSame(retrieved, rule)
  })

  t.test('should remove a pin rule', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    const rule: PinRule = {
      id: 'test_rule',
      conditions: [
        {
          anchoring: 'is',
          pattern: 'test'
        }
      ],
      consequence: {
        promote: [
          {
            doc_id: 'doc1',
            position: 0
          }
        ]
      }
    }

    insertPin(db, rule)
    t.ok(getPin(db, 'test_rule'))

    const removed = deletePin(db, 'test_rule')
    t.equal(removed, true)
    t.equal(getPin(db, 'test_rule'), undefined)
  })

  t.test('should return all pin rules', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    const rule1: PinRule = {
      id: 'rule1',
      conditions: [{ anchoring: 'is', pattern: 'test' }],
      consequence: { promote: [{ doc_id: 'doc1', position: 0 }] }
    }

    const rule2: PinRule = {
      id: 'rule2',
      conditions: [{ anchoring: 'starts_with', pattern: 'hello' }],
      consequence: { promote: [{ doc_id: 'doc2', position: 0 }] }
    }

    insertPin(db, rule1)
    insertPin(db, rule2)

    const allRules = getAllPins(db)
    t.equal(allRules.length, 2)
    t.ok(allRules.find((r) => r.id === 'rule1'))
    t.ok(allRules.find((r) => r.id === 'rule2'))
  })

  t.end()
})

t.test('pinning in search results', async (t) => {
  t.test('should pin a document to position 0 in search results', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Red Shirt', description: 'A red shirt' },
      { id: '2', title: 'Blue Jeans', description: 'Blue denim jeans' },
      { id: '3', title: 'Green Hat', description: 'A green hat' }
    ])

    insertPin(db, {
      id: 'pin_blue_jeans',
      conditions: [{ anchoring: 'contains', pattern: 'shirt' }],
      consequence: {
        promote: [{ doc_id: '3', position: 0 }]
      }
    })

    const results = await search(db, { term: 'shirt' })

    // Document '3' should be at position 0 even though it doesn't match 'shirt'
    t.equal(results.hits[0].id, '3')
    t.equal(results.hits[1].id, '1') // Original match
  })

  t.test('should pin multiple documents to different positions', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1', description: 'First product' },
      { id: '2', title: 'Product 2', description: 'Second product' },
      { id: '3', title: 'Product 3', description: 'Third product' },
      { id: '4', title: 'Product 4', description: 'Fourth product' },
      { id: '5', title: 'Product 5', description: 'Fifth product' }
    ])

    insertPin(db, {
      id: 'featured_products',
      conditions: [{ anchoring: 'contains', pattern: 'product' }],
      consequence: {
        promote: [
          { doc_id: '5', position: 0 },
          { doc_id: '3', position: 1 },
          { doc_id: '1', position: 2 }
        ]
      }
    })

    const results = await search(db, { term: 'product' })

    // Check pinned positions
    t.equal(results.hits[0].id, '5') // Position 0
    t.equal(results.hits[1].id, '3') // Position 1
    t.equal(results.hits[2].id, '1') // Position 2
    // Unpinned documents should follow
    t.equal(results.count, 5)
  })

  t.test('should pin document from outside the result set', async (t) => {
    const db = create({
      schema: {
        title: 'string',
        description: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Red Shirt', description: 'A red shirt' },
      { id: '2', title: 'Blue Jeans', description: 'Blue denim jeans' },
      { id: '3', title: 'Featured Product', description: 'Special promotion' }
    ])

    insertPin(db, {
      id: 'promote_featured',
      conditions: [{ anchoring: 'contains', pattern: 'shirt' }],
      consequence: {
        promote: [
          { doc_id: '3', position: 0 } // This document doesn't match "shirt" search
        ]
      }
    })

    const results = await search(db, { term: 'shirt' })

    // Document 3 should be promoted to position 0 with score 0
    t.equal(results.count, 2)
    t.equal(results.hits[0].id, '3')
    t.equal(results.hits[0].score, 0) // Score should be 0 for promoted docs outside result set
    t.equal(results.hits[1].id, '1')
  })

  t.test('should not apply pinning when no rules match', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
      { id: '3', title: 'Product 3' }
    ])

    insertPin(db, {
      id: 'no_match_rule',
      conditions: [{ anchoring: 'is', pattern: 'shoes' }],
      consequence: {
        promote: [{ doc_id: '3', position: 0 }]
      }
    })

    const results = await search(db, { term: 'product' })

    // Results should be in natural order (no pinning applied)
    t.equal(results.count, 3)
  })

  t.test('should handle empty search results', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insert(db, { id: 'existing-doc', title: 'Existing' })

    insertPin(db, {
      id: 'test_rule',
      conditions: [{ anchoring: 'is', pattern: 'nonexistent' }],
      consequence: { promote: [{ doc_id: 'non-existent-doc', position: 0 }] }
    })

    const results = await search(db, { term: 'nonexistent' })

    // Should remain empty since the term doesn't match and the pinned document doesn't exist
    t.equal(results.count, 0)
  })

  t.end()
})

t.test('pin condition matching', async (t) => {
  t.test('should match exact pattern with "is" anchoring', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Blue Jeans' },
      { id: '2', title: 'Red Shirt' }
    ])

    insertPin(db, {
      id: 'exact_match',
      conditions: [{ anchoring: 'is', pattern: 'blue jeans' }],
      consequence: { promote: [{ doc_id: '2', position: 0 }] }
    })

    const results1 = await search(db, { term: 'blue jeans' })
    const results2 = await search(db, { term: 'Blue Jeans' }) // case insensitive
    const results3 = await search(db, { term: 'blue' })

    // Should apply pinning for exact match
    t.equal(results1.hits[0].id, '2')
    t.equal(results2.hits[0].id, '2')
    // Should not apply pinning for partial match
    t.equal(results3.hits[0].id, '1')
  })

  t.test('should match pattern with "starts_with" anchoring', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Headphones' },
      { id: '2', title: 'Wireless Headphones' },
      { id: '3', title: 'Speaker' }
    ])

    insertPin(db, {
      id: 'starts_with_match',
      conditions: [{ anchoring: 'starts_with', pattern: 'headphone' }],
      consequence: { promote: [{ doc_id: '3', position: 0 }] }
    })

    const results1 = await search(db, { term: 'headphones' })
    const results2 = await search(db, { term: 'headphone jack' })
    const results3 = await search(db, { term: 'wireless headphones' })

    // Should apply pinning for starts_with match
    t.equal(results1.hits[0].id, '3')
    t.equal(results2.hits[0].id, '3')
    // Should not apply pinning when term doesn't start with pattern
    t.not(results3.hits[0].id === '3', 'should not pin when term does not start with pattern')
  })

  t.test('should match pattern with "contains" anchoring', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Wireless Headphones' },
      { id: '2', title: 'Best Wireless Earbuds' },
      { id: '3', title: 'Wired Headphones' }
    ])

    insertPin(db, {
      id: 'contains_match',
      conditions: [{ anchoring: 'contains', pattern: 'wireless' }],
      consequence: { promote: [{ doc_id: '3', position: 0 }] }
    })

    const results1 = await search(db, { term: 'wireless' })
    const results2 = await search(db, { term: 'wireless headphones' })
    const results3 = await search(db, { term: 'best wireless earbuds' })

    // Should apply pinning for contains match
    t.equal(results1.hits[0].id, '3')
    t.equal(results2.hits[0].id, '3')
    t.equal(results3.hits[0].id, '3')
  })

  t.test('should match rule with multiple conditions (AND logic)', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Winter Jacket' },
      { id: '2', title: 'Winter Coat' },
      { id: '3', title: 'Jacket' }
    ])

    insertPin(db, {
      id: 'multi_condition',
      conditions: [
        { anchoring: 'contains', pattern: 'winter' },
        { anchoring: 'contains', pattern: 'jacket' }
      ],
      consequence: { promote: [{ doc_id: '3', position: 0 }] }
    })

    const results1 = await search(db, { term: 'winter jacket' })
    const results2 = await search(db, { term: 'winter coat' })
    const results3 = await search(db, { term: 'jacket' })

    // Should apply pinning only when all conditions match
    t.equal(results1.hits[0].id, '3')
    // Should not apply when one condition doesn't match
    t.not(results2.hits[0].id === '3', 'should not pin when one condition does not match')
    t.not(results3.hits[0].id === '3', 'should not pin when one condition does not match')
  })

  t.end()
})

t.test('pinning serialization', async (t) => {
  t.test('should persist pinning rules through save/load', async (t) => {
    const { save, load } = await import('../src/index.js')

    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
      { id: '3', title: 'Product 3' }
    ])

    insertPin(db, {
      id: 'rule1',
      conditions: [{ anchoring: 'is', pattern: 'test' }],
      consequence: { promote: [{ doc_id: '1', position: 0 }] }
    })

    insertPin(db, {
      id: 'rule2',
      conditions: [
        { anchoring: 'starts_with', pattern: 'hello' },
        { anchoring: 'contains', pattern: 'world' }
      ],
      consequence: {
        promote: [
          { doc_id: '2', position: 0 },
          { doc_id: '3', position: 1 }
        ]
      }
    })

    // Save
    const saved = save(db)

    // Load into new db
    const db2 = create({
      schema: {
        title: 'string'
      } as const
    })

    load(db2, saved)

    // Verify loaded db has the same rules
    const allRules = getAllPins(db2)
    t.equal(allRules.length, 2)

    const loadedRule1 = getPin(db2, 'rule1')
    const loadedRule2 = getPin(db2, 'rule2')

    t.ok(loadedRule1)
    t.ok(loadedRule2)
    t.equal(loadedRule1?.id, 'rule1')
    t.equal(loadedRule2?.id, 'rule2')
  })

  t.end()
})

t.test('pinning edge cases', async (t) => {
  t.test('should handle conflicting pin positions (first wins)', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
      { id: '3', title: 'Product 3' }
    ])

    // Two documents trying to be pinned to position 0
    insertPin(db, {
      id: 'conflict_rule',
      conditions: [{ anchoring: 'contains', pattern: 'product' }],
      consequence: {
        promote: [
          { doc_id: '1', position: 0 },
          { doc_id: '2', position: 0 } // Same position!
        ]
      }
    })

    const results = await search(db, { term: 'product' })

    // First promotion in the list should take precedence
    t.equal(results.hits[0].id, '1')
    t.equal(results.count, 3)
  })

  t.test('should handle pin position beyond result set length', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' }
    ])

    insertPin(db, {
      id: 'beyond_length',
      conditions: [{ anchoring: 'contains', pattern: 'product' }],
      consequence: {
        promote: [{ doc_id: '1', position: 10 }] // Position beyond array length
      }
    })

    const results = await search(db, { term: 'product' })

    // All documents should still be present
    t.equal(results.count, 2)
  })

  t.test('should handle pinning the same document multiple times', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
      { id: '3', title: 'Product 3' }
    ])

    insertPin(db, {
      id: 'duplicate_pin',
      conditions: [{ anchoring: 'contains', pattern: 'product' }],
      consequence: {
        promote: [
          { doc_id: '1', position: 0 },
          { doc_id: '1', position: 2 } // Same document, different position
        ]
      }
    })

    const results = await search(db, { term: 'product' })

    // Document should only appear once
    const doc1Count = results.hits.filter((hit) => hit.id === '1').length
    t.equal(doc1Count, 1)
    t.equal(results.count, 3)
  })

  t.end()
})

// Test internal applyPinningRules function for lower-level testing
t.test('internal pinning logic', async (t) => {
  t.test('should apply pinning rules to TokenScore array', async (t) => {
    const db = create({
      schema: {
        title: 'string'
      } as const
    })

    await insertMultiple(db, [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
      { id: '3', title: 'Product 3' }
    ])

    insertPin(db, {
      id: 'test',
      conditions: [{ anchoring: 'contains', pattern: 'test' }],
      consequence: {
        promote: [{ doc_id: '3', position: 0 }]
      }
    })

    const mockResults: TokenScore[] = [
      [1, 10.0],
      [2, 9.0],
      [3, 8.0]
    ]

    const pinnedResults = applyPinningRules(db, db.data.pinning, mockResults, 'test')

    t.equal(pinnedResults[0][0], 3)
    t.equal(pinnedResults.length, 3)
  })

  t.end()
})
