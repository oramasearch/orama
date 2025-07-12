import t from 'tap'
import { create, insert, getByID, upsert, upsertMultiple, count, search } from '../src/index.js'

t.test('upsert method', async (t) => {
  t.test('should insert a document when it does not exist', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    const docId = await upsert(db, {
      id: 'doc-1',
      quote: "Life is what happens when you're busy making other plans",
      author: 'John Lennon'
    })

    t.equal(docId, 'doc-1')
    t.equal(count(db), 1)

    const doc = getByID(db, docId)
    t.ok(doc)
    t.equal(doc!.quote, "Life is what happens when you're busy making other plans")
    t.equal(doc!.author, 'John Lennon')
  })

  t.test('should update a document when it already exists', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    // First insert a document
    const initialDocId = await insert(db, {
      id: 'doc-1',
      quote: "Life is what happens when you're busy making other plans",
      author: 'John Lennon'
    })

    t.equal(initialDocId, 'doc-1')
    t.equal(count(db), 1)

    // Now upsert with the same ID should update
    const upsertedDocId = await upsert(db, {
      id: 'doc-1',
      quote: 'What I cannot create, I do not understand',
      author: 'Richard Feynman'
    })

    t.equal(upsertedDocId, 'doc-1')
    t.equal(count(db), 1)

    const doc = getByID(db, upsertedDocId)
    t.ok(doc)
    t.equal(doc!.quote, 'What I cannot create, I do not understand')
    t.equal(doc!.author, 'Richard Feynman')
  })

  t.test('should work with custom getDocumentIndexId function', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        email: 'string'
      } as const,
      components: {
        getDocumentIndexId(doc: { email: string }): string {
          return doc.email
        }
      }
    })

    // First upsert (insert)
    const docId1 = await upsert(db, {
      name: 'John Doe',
      email: 'john@example.com'
    })

    t.equal(docId1, 'john@example.com')
    t.equal(count(db), 1)

    // Second upsert with same email (update)
    const docId2 = await upsert(db, {
      name: 'John Smith',
      email: 'john@example.com'
    })

    t.equal(docId2, 'john@example.com')
    t.equal(count(db), 1)

    const doc = getByID(db, docId2)
    t.ok(doc)
    t.equal(doc!.name, 'John Smith')
    t.equal(doc!.email, 'john@example.com')
  })

  t.test('should throw an error if document ID is not a string', async (t) => {
    const db = create({
      schema: {
        name: 'string'
      } as const
    })

    try {
      await upsert(db, {
        id: 123,
        name: 'John'
      })
      t.fail('Should have thrown an error')
    } catch (e) {
      t.equal(e.code, 'DOCUMENT_ID_MUST_BE_STRING')
    }
  })

  t.test('should throw an error if document fails schema validation', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        name: 'string'
      } as const
    })

    try {
      await upsert(db, {
        id: 'test-id',
        name: 123
      } as any)
      t.fail('Should have thrown an error')
    } catch (e) {
      t.equal(e.code, 'SCHEMA_VALIDATION_FAILURE')
    }
  })

  t.test('should maintain searchability after upsert', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        title: 'string',
        content: 'string'
      } as const
    })

    // First upsert (insert)
    await upsert(db, {
      id: 'article-1',
      title: 'JavaScript Basics',
      content: 'Learn the fundamentals of JavaScript programming'
    })

    const searchResult1 = await search(db, {
      term: 'JavaScript'
    })
    t.equal(searchResult1.count, 1)

    // Second upsert (update)
    await upsert(db, {
      id: 'article-1',
      title: 'Advanced TypeScript',
      content: 'Master advanced TypeScript features and patterns'
    })

    const searchResult2 = await search(db, {
      term: 'JavaScript'
    })
    t.equal(searchResult2.count, 0)

    const searchResult3 = await search(db, {
      term: 'TypeScript'
    })
    t.equal(searchResult3.count, 1)
    t.equal(searchResult3.hits[0].document.title, 'Advanced TypeScript')
  })

  t.test('should work with nested schema', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        user: {
          name: 'string',
          email: 'string'
        },
        meta: {
          tags: 'string'
        }
      } as const
    })

    // First upsert (insert)
    const docId1 = await upsert(db, {
      id: 'user-1',
      user: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      meta: {
        tags: 'admin, user'
      }
    })

    t.equal(docId1, 'user-1')
    t.equal(count(db), 1)

    // Second upsert (update)
    const docId2 = await upsert(db, {
      id: 'user-1',
      user: {
        name: 'John Smith',
        email: 'john.smith@example.com'
      },
      meta: {
        tags: 'moderator, user'
      }
    })

    t.equal(docId2, 'user-1')
    t.equal(count(db), 1)

    const doc = getByID(db, docId2)
    t.ok(doc)
    t.equal(doc!.user.name, 'John Smith')
    t.equal(doc!.user.email, 'john.smith@example.com')
    t.equal(doc!.meta.tags, 'moderator, user')
  })
})

t.test('upsertMultiple method', async (t) => {
  t.test('should insert multiple documents when they do not exist', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    const docIds = await upsertMultiple(db, [
      {
        id: 'doc-1',
        quote: "Life is what happens when you're busy making other plans",
        author: 'John Lennon'
      },
      {
        id: 'doc-2',
        quote: 'What I cannot create, I do not understand',
        author: 'Richard Feynman'
      }
    ])

    t.equal(docIds.length, 2)
    t.equal(count(db), 2)

    const doc1 = getByID(db, 'doc-1')
    const doc2 = getByID(db, 'doc-2')
    t.ok(doc1)
    t.ok(doc2)
    t.equal(doc1!.author, 'John Lennon')
    t.equal(doc2!.author, 'Richard Feynman')
  })

  t.test('should update multiple documents when they already exist', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    // First insert some documents
    await insert(db, {
      id: 'doc-1',
      quote: "Life is what happens when you're busy making other plans",
      author: 'John Lennon'
    })

    await insert(db, {
      id: 'doc-2',
      quote: 'What I cannot create, I do not understand',
      author: 'Richard Feynman'
    })

    t.equal(count(db), 2)

    // Now upsert with the same IDs should update
    const docIds = await upsertMultiple(db, [
      {
        id: 'doc-1',
        quote: 'He who is brave is free',
        author: 'Seneca'
      },
      {
        id: 'doc-2',
        quote: 'You must be the change you wish to see in the world',
        author: 'Mahatma Gandhi'
      }
    ])

    t.equal(docIds.length, 2)
    t.equal(count(db), 2)

    const doc1 = getByID(db, 'doc-1')
    const doc2 = getByID(db, 'doc-2')
    t.ok(doc1)
    t.ok(doc2)
    t.equal(doc1!.author, 'Seneca')
    t.equal(doc2!.author, 'Mahatma Gandhi')
  })

  t.test('should handle mixed insert and update operations', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    // First insert one document
    await insert(db, {
      id: 'doc-1',
      quote: "Life is what happens when you're busy making other plans",
      author: 'John Lennon'
    })

    t.equal(count(db), 1)

    // Now upsert with one existing and one new document
    const docIds = await upsertMultiple(db, [
      {
        id: 'doc-1', // This should update
        quote: 'He who is brave is free',
        author: 'Seneca'
      },
      {
        id: 'doc-2', // This should insert
        quote: 'You must be the change you wish to see in the world',
        author: 'Mahatma Gandhi'
      }
    ])

    t.equal(docIds.length, 2)
    t.equal(count(db), 2)

    const doc1 = getByID(db, 'doc-1')
    const doc2 = getByID(db, 'doc-2')
    t.ok(doc1)
    t.ok(doc2)
    t.equal(doc1!.author, 'Seneca')
    t.equal(doc2!.author, 'Mahatma Gandhi')
  })

  t.test('should throw an error if any document fails schema validation', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const
    })

    try {
      await upsertMultiple(db, [
        {
          id: 'doc-1',
          quote: 'Valid quote'
        },
        {
          id: 'doc-2',
          quote: 123 // Invalid type
        }
      ] as any)
      t.fail('Should have thrown an error')
    } catch (e) {
      t.equal(e.code, 'SCHEMA_VALIDATION_FAILURE')
    }

    // Should not have inserted any documents
    t.equal(count(db), 0)
  })

  t.test('should throw an error if any document ID is not a string', async (t) => {
    const db = create({
      schema: {
        quote: 'string'
      } as const
    })

    try {
      await upsertMultiple(db, [
        {
          id: 'doc-1',
          quote: 'Valid quote'
        },
        {
          id: 123, // Invalid ID type
          quote: 'Another quote'
        }
      ] as any)
      t.fail('Should have thrown an error')
    } catch (e) {
      t.equal(e.code, 'DOCUMENT_ID_MUST_BE_STRING')
    }

    // Should not have inserted any documents
    t.equal(count(db), 0)
  })

  t.test('should work with custom getDocumentIndexId function', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        email: 'string'
      } as const,
      components: {
        getDocumentIndexId(doc: { email: string }): string {
          return doc.email
        }
      }
    })

    // First upsert (mixed insert/update)
    const docIds1 = await upsertMultiple(db, [
      {
        name: 'John Doe',
        email: 'john@example.com'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com'
      }
    ])

    t.equal(docIds1.length, 2)
    t.equal(count(db), 2)

    // Second upsert with same emails (update)
    const docIds2 = await upsertMultiple(db, [
      {
        name: 'John Updated',
        email: 'john@example.com'
      },
      {
        name: 'Jane Updated',
        email: 'jane@example.com'
      }
    ])

    t.equal(docIds2.length, 2)
    t.equal(count(db), 2)

    const doc1 = getByID(db, 'john@example.com')
    const doc2 = getByID(db, 'jane@example.com')
    t.ok(doc1)
    t.ok(doc2)
    t.equal(doc1!.name, 'John Updated')
    t.equal(doc2!.name, 'Jane Updated')
  })

  t.test('should maintain searchability after upsertMultiple', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        title: 'string',
        content: 'string'
      } as const
    })

    // First upsert (insert)
    await upsertMultiple(db, [
      {
        id: 'article-1',
        title: 'JavaScript Basics',
        content: 'Learn the fundamentals of JavaScript programming'
      },
      {
        id: 'article-2',
        title: 'Python Basics',
        content: 'Learn the fundamentals of Python programming'
      }
    ])

    const searchResult1 = await search(db, {
      term: 'JavaScript'
    })
    t.equal(searchResult1.count, 1)

    const searchResult2 = await search(db, {
      term: 'Python'
    })
    t.equal(searchResult2.count, 1)

    // Second upsert (update)
    await upsertMultiple(db, [
      {
        id: 'article-1',
        title: 'Advanced TypeScript',
        content: 'Master advanced TypeScript features and patterns'
      },
      {
        id: 'article-2',
        title: 'Advanced Rust',
        content: 'Master advanced Rust features and patterns'
      }
    ])

    const searchResult3 = await search(db, {
      term: 'JavaScript'
    })
    t.equal(searchResult3.count, 0)

    const searchResult4 = await search(db, {
      term: 'Python'
    })
    t.equal(searchResult4.count, 0)

    const searchResult5 = await search(db, {
      term: 'TypeScript'
    })
    t.equal(searchResult5.count, 1)

    const searchResult6 = await search(db, {
      term: 'Rust'
    })
    t.equal(searchResult6.count, 1)
  })

  t.test('should work with batch size parameter', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string',
        author: 'string'
      } as const
    })

    const documents: { id: string; quote: string; author: string }[] = []
    for (let i = 0; i < 10; i++) {
      documents.push({
        id: `doc-${i}`,
        quote: `Quote ${i}`,
        author: `Author ${i}`
      })
    }

    const docIds = await upsertMultiple(db, documents, 3) // Batch size of 3

    t.equal(docIds.length, 10)
    t.equal(count(db), 10)

    for (let i = 0; i < 10; i++) {
      const doc = getByID(db, `doc-${i}`)
      t.ok(doc)
      t.equal(doc!.author, `Author ${i}`)
    }
  })

  t.test('should work with empty array', async (t) => {
    const db = create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const
    })

    const docIds = await upsertMultiple(db, [])

    t.equal(docIds.length, 0)
    t.equal(count(db), 0)
  })
})

t.test('upsert with hooks', async (t) => {
  t.test('should call upsert hooks when inserting', async (t) => {
    let beforeUpsertCalled = false
    let afterUpsertCalled = false

    const db = create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const,
      plugins: [
        {
          name: 'test-plugin',
          beforeUpsert: () => {
            beforeUpsertCalled = true
          },
          afterUpsert: () => {
            afterUpsertCalled = true
          }
        }
      ]
    })

    await upsert(db, {
      id: 'doc-1',
      quote: 'Test quote'
    })

    t.ok(beforeUpsertCalled)
    t.ok(afterUpsertCalled)
  })

  t.test('should call upsert hooks when updating', async (t) => {
    let beforeUpsertCalled = false
    let afterUpsertCalled = false

    const db = create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const,
      plugins: [
        {
          name: 'test-plugin',
          beforeUpsert: () => {
            beforeUpsertCalled = true
          },
          afterUpsert: () => {
            afterUpsertCalled = true
          }
        }
      ]
    })

    // First insert
    await insert(db, {
      id: 'doc-1',
      quote: 'Original quote'
    })

    // Reset flags
    beforeUpsertCalled = false
    afterUpsertCalled = false

    // Now upsert (update)
    await upsert(db, {
      id: 'doc-1',
      quote: 'Updated quote'
    })

    t.ok(beforeUpsertCalled)
    t.ok(afterUpsertCalled)
  })

  t.test('should call upsertMultiple hooks', async (t) => {
    let beforeUpsertMultipleCalled = false
    let afterUpsertMultipleCalled = false

    const db = create({
      schema: {
        id: 'string',
        quote: 'string'
      } as const,
      plugins: [
        {
          name: 'test-plugin',
          beforeUpsertMultiple: () => {
            beforeUpsertMultipleCalled = true
          },
          afterUpsertMultiple: () => {
            afterUpsertMultipleCalled = true
          }
        }
      ]
    })

    await upsertMultiple(db, [
      {
        id: 'doc-1',
        quote: 'Test quote 1'
      },
      {
        id: 'doc-2',
        quote: 'Test quote 2'
      }
    ])

    t.ok(beforeUpsertMultipleCalled)
    t.ok(afterUpsertMultipleCalled)
  })
})
