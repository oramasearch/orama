import t from 'tap'
import { stopwords as englishStopwords } from '@orama/stopwords/english'
import { create, getByID, insert, insertMultiple, search } from '../src/index.js'

t.test('search method', async (t) => {
  t.test('with term', async (t) => {
    const [db, id1, id2, id3, id4] = createSimpleDB()

    t.test('should return all the document on empty string', async (t) => {
      const result = await search(db, {
        term: ''
      })

      t.ok(result.elapsed)
      t.ok(result.elapsed.raw)
      t.ok(result.elapsed.formatted)

      for (const id of [id1, id2, id3, id4]) {
        const doc = getByID(db, id as string)
        t.strictSame(
          result.hits.find((d) => d.id === id),
          {
            id,
            score: 0,
            document: doc
          }
        )
      }

      t.end()
    })

    t.test('should return all the document if params is an empty object', async (t) => {
      const result = await search(db, {})

      for (const id of [id1, id2, id3, id4]) {
        const doc = getByID(db, id as string)
        t.strictSame(
          result.hits.find((d) => d.id === id),
          {
            id,
            score: 0,
            document: doc
          }
        )
      }

      t.end()
    })

    t.test('should filter the result based on "term" value', async (t) => {
      const { hits: allDocs } = await search(db, {})
      const docIdsShouldNotMatch = allDocs.filter((d) => !/coffee/.test(d.document.name as string)).map((d) => d.id)
      const docIdsShouldMatch = allDocs.filter((d) => /coffee/.test(d.document.name as string)).map((d) => d.id)

      const result = await search(db, {
        term: 'coffee',
      })

      const matchedIds = result.hits.map((d) => d.id)
      t.strictSame(new Set(docIdsShouldMatch), new Set(matchedIds))
      t.notOk(docIdsShouldNotMatch.find((id) => matchedIds.includes(id)))

      t.end()
    })

    t.test('should filter the result based on "term" value # 2', async (t) => {
      const db = create({
        schema: {
          quote: 'string',
          author: 'string'
        } as const,
        components: {
          tokenizer: {
            stemming: true,
            stopWords: englishStopwords
          }
        }
      })

      await insert(db, { quote: 'the quick, brown fox jumps over the lazy dog. What a fox!', author: 'John Doe' })
      await insert(db, { quote: 'Foxes are nice animals. But I prefer having a dog.', author: 'John Doe' })
      await insert(db, { quote: 'I like dogs. They are the best.', author: 'Jane Doe' })
      await insert(db, { quote: 'I like cats. They are the best.', author: 'Jane Doe' })

      // Exact search
      const result1 = await search(db, { term: 'fox', exact: true })
      const result2 = await search(db, { term: 'dog', exact: true })

      t.equal(result1.count, 0)
      t.equal(result2.count, 0)

      // Prefix search
      const result3 = await search(db, { term: 'fox', exact: false })
      const result4 = await search(db, { term: 'dog', exact: false })

      t.equal(result3.count, 2)
      t.equal(result4.count, 3)

      // Typo-tolerant search
      const result5 = await search(db, { term: 'fx', tolerance: 1 })
      const result6 = await search(db, { term: 'dg', tolerance: 2 })

      t.equal(result5.count, 2)
      t.equal(result6.count, 4)

      // Long string search (Tests for https://github.com/oramasearch/orama/issues/159 )
      const result7 = await search(db, { term: 'They are the best'})
      const result8 = await search(db, { term: 'Foxes are nice animals'})

      t.equal(result7.count, 2)
      t.equal(result8.count, 2)
    })

    t.test('should apply term only on indexed fields', async (t) => {
      const db = create({
        schema: {
          quote: 'string',
          author: 'string'
        } as const
      })

      insert(db, {
        quote: 'I like dogs. They are the best.',
        author: 'Jane Doe',
        nested: { unindexedNestedField: 'unindexedNestedValue' }
      })

      insert(db, {
        quote: 'I like cats. They are the best.',
        author: 'Jane Doe',
        unindexedField: 'unindexedValue'
      })

      const result1 = await search(db, { term: 'unindexedNestedValue' })
      const result2 = await search(db, { term: 'unindexedValue' })

      t.equal(result1.count, 0)
      t.equal(result2.count, 0)
    })

    t.test('should throw an error when searching in non-existing indices', async (t) => {
      const db = create({ schema: { foo: 'string', baz: 'string' } as const })

      t.throws(
        () =>
          search(db, {
            term: 'foo',
            properties: ['bar'] as unknown as ('foo' | 'baz')[]
          }),
        {
          code: 'UNKNOWN_INDEX'
        }
      )
    })

    t.test('should return empty array if term is removed by tokenizer', async (t) => {
      const [db] = createSimpleDB()

      await insert(db, {
        name: 'Allowed',
        rating: 5,
        price: 900,
        meta: {
          sales: 100
        }
      })
      const result = await search(db, {
        term: 'all'
      })

      t.equal(result.count, 0)

      t.end()
    })

    t.end()
  })

  t.test('with exact', async (t) => {
    t.test('should exact match', async (t) => {
      const db = create({
        schema: {
          author: 'string',
          quote: 'string'
        } as const
      })

      const id = await insert(db, {
        quote: 'Be yourself; everyone else is already taken.',
        author: 'Oscar Wilde'
      })

      const partialSearch = await search(db, {
        term: 'alr',
        exact: true
      })

      t.equal(partialSearch.count, 0)
      t.strictSame(partialSearch.hits, [])

      const exactSearch = await search(db, {
        term: 'already',
        exact: true
      })

      t.equal(exactSearch.count, 0)
      t.strictSame(
        exactSearch.hits.map((d) => d.id),
        []
      )

      const fullQuoteSearch = await search(db, {
        term: 'Be yourself; everyone else is already taken.',
        exact: true
      })

      t.equal(fullQuoteSearch.count, 1)
      t.strictSame(
        fullQuoteSearch.hits.map((d) => d.id),
        [id]
      )
    })

    t.test('should match entire property value when exact is true', async (t) => {
      const db = create({
        schema: {
          path: 'string',
          title: 'string'
        } as const
      })

      const id1 = await insert(db, { path: 'First Note.md', title: 'First Note' })
      await insert(db, { path: 'Second Note.md', title: 'Second Note' })
      const id3 = await insert(db, { path: 'first', title: 'Just first' })

      // Search for "first" in path with exact: true
      // Should only match the document where path is exactly "first", not "First Note.md"
      const exactPathSearch = await search(db, {
        term: 'first',
        properties: ['path'],
        exact: true
      })

      t.equal(exactPathSearch.count, 1)
      t.strictSame(exactPathSearch.hits.map(d => d.id), [id3])

      // Search for "First Note.md" in path with exact: true
      // Should match the document where path is exactly "First Note.md"
      const exactFullPathSearch = await search(db, {
        term: 'First Note.md',
        properties: ['path'],
        exact: true
      })

      t.equal(exactFullPathSearch.count, 1)
      t.strictSame(exactFullPathSearch.hits.map(d => d.id), [id1])

      // Search for "first" in title with exact: true  
      // Should not match "First Note" title
      const exactTitleSearch = await search(db, {
        term: 'first',
        properties: ['title'],
        exact: true
      })

      t.equal(exactTitleSearch.count, 0)

      // Search for "First Note" in title with exact: true
      // Should match the document where title is exactly "First Note"
      const exactFullTitleSearch = await search(db, {
        term: 'First Note',
        properties: ['title'],
        exact: true
      })

      t.equal(exactFullTitleSearch.count, 1)
      t.strictSame(exactFullTitleSearch.hits.map(d => d.id), [id1])
    })

    t.end()
  })

  t.test('with tollerate', async (t) => {
    t.test("shouldn't tolerate typos if set to 0", async (t) => {
      const db = create({
        schema: {
          quote: 'string',
          author: 'string'
        } as const
      })

      await insert(db, {
        quote:
          'Absolutely captivating creatures, seahorses seem like a product of myth and imagination rather than of nature.',
        author: 'Sara A. Lourie'
      })

      const searchResult = await search(db, {
        term: 'seahrse',
        tolerance: 0
      })

      t.equal(searchResult.count, 0)
    })

    t.test('should tolerate typos', async (t) => {
      const db = create({
        schema: {
          quote: 'string',
          author: 'string'
        } as const
      })

      const id1 = await insert(db, {
        quote:
          'Absolutely captivating creatures, seahorses seem like a product of myth and imagination rather than of nature.',
        author: 'Sara A. Lourie'
      })

      const id2 = await insert(db, {
        quote: 'Seahorses look mythical, like dragons, but these magnificent shy creatures are real.',
        author: 'Jennifer Keats Curtis'
      })

      const tolerantSearch = await search(db, {
        term: 'seahrse',
        tolerance: 2
      })

      t.equal(tolerantSearch.count, 2)
      t.strictSame(new Set(tolerantSearch.hits.map((d) => d.id)), new Set([id1, id2]))

      const moreTolerantSearch = await search(db, {
        term: 'sahrse',
        tolerance: 5
      })

      t.equal(moreTolerantSearch.count, 2)
      t.strictSame(new Set(tolerantSearch.hits.map((d) => d.id)), new Set([id1, id2]))
    })

    t.test('should correctly match with tolerance. even if prefix doesnt match.', async (t) => {
      const db = create({
        schema: {
          name: 'string'
        } as const,
        components: {
          tokenizer: {
            stemming: true,
            stopWords: englishStopwords
          }
        }
      })

      await insert(db, { name: 'Dhris' })
      const result1 = await search(db, { term: 'Chris', tolerance: 1 })
      const result2 = await search(db, { term: 'Cgris', tolerance: 1 })
      const result3 = await search(db, { term: 'Cgris', tolerance: 2 })
      t.equal(result1.count, 1)
      t.equal(result2.count, 0)
      t.equal(result3.count, 1)

      await insert(db, { name: 'Chris ' })
      await insert(db, { name: 'Craig' })
      await insert(db, { name: 'Chxy' }) //create h node in radix tree.
      await insert(db, { name: 'Crxy' }) //create r node in radix tree.

      //issue 480 says following will not match because the prefix "Cr" exists so prefix Ch is not searched.
      const result4 = await search(db, { term: 'Cris', tolerance: 1 })
      t.equal(result4.count, 1)

      //should match "Craig" even if prefix "Ca" exists.
      const result5 = await search(db, { term: 'Caig', tolerance: 1 })
      t.equal(result5.count, 1)
      t.end()
    })

    //issue#544
    //bug both words apple and apply arent matching even after PR#580
    t.test('match exact prefix , along with tolerance', async (t) => {
      // Creating the database
      const db = create({
        schema: {
          word: 'string'
        } as const,
        components: {
          tokenizer: {
            stemming: true,
            stopWords: englishStopwords
          }
        }
      })

      await insert(db, { word: 'apt' })
      await insert(db, { word: 'apple' })
      await insert(db, { word: 'app' })
      await insert(db, { word: 'apply' })
      await insert(db, { word: 'about' })
      await insert(db, { word: 'again' })

      // Searching for 'app' with a tolerance of 1
      const result = await search(db, { term: 'app', tolerance: 1 })

      //apt,app,apple,apply should match.
      t.equal(result.count, 4, 'Should match 4 words for "app" with tolerance 1')
      t.end()
    })
    t.end()
  })

  t.test('with pagination', async (t) => {
    t.test('should correctly paginate results', async (t) => {
      const db = create({
        schema: {
          animal: 'string'
        } as const
      })

      const id1 = await insert(db, { id: '0', animal: 'Quick brown fox' })
      await insert(db, { id: '1', animal: 'Lazy dog' })
      await insert(db, { id: '2', animal: 'Jumping penguin' })
      const id4 = await insert(db, { id: '3', animal: 'Fast chicken' })
      const id5 = await insert(db, { id: '4', animal: 'Fabolous ducks' })
      const id6 = await insert(db, { id: '5', animal: 'Fantastic horse' })

      const cases = [
        { limit: 1, offset: 0, expectedIds: [id4] },
        { limit: 1, offset: 1, expectedIds: [id5] },
        { limit: 1, offset: 2, expectedIds: [id6] },
        { limit: 2, offset: 2, expectedIds: [id6, id1] },
        { limit: 0, offset: 0, expectedIds: [] },
        { limit: 1, offset: 100000, expectedIds: [] }
      ]
      for (const c of cases) {
        const { limit, offset, expectedIds } = c
        const name = `limit: ${limit}, offset: ${offset}`
        t.test(name, async (t) => {
          const result = await search(db, { term: 'f', limit, offset })
          const actualIds = result.hits.map((d) => d.id)

          t.equal(result.count, 4)
          t.strictSame(actualIds, expectedIds)
          t.end()
        })
      }

      t.end()
    })
    t.end()
  })

  t.test('should correctly search without term', async (t) => {    const db = create({
      schema: {
        quote: 'string',
        author: 'string'
      } as const,
      components: {
        tokenizer: {
          stopWords: englishStopwords,
          stemming: true
        }
      }
    })

    const docs = [
      { id: '0', quote: 'the quick, brown fox jumps over the lazy dog. What a fox!', author: 'John Doe' },
      { id: '1', quote: 'Foxes are nice animals. But I prefer having a dog.', author: 'John Doe' },
      { id: '2', quote: 'I like dogs. They are the best.', author: 'Jane Doe' }
    ]

    await insert(db, docs[0])
    await insert(db, docs[1])
    await insert(db, docs[2])

    // Exact search
    const result1 = await search(db, { exact: false })
    const result2 = await search(db, { exact: true })

    t.equal(result1.count, 3)
    t.equal(result2.count, 3)
    t.strictSame(
      result1.hits.sort((a, b) => a.id.localeCompare(b.id)).map((h) => h.document),
      docs
    )
    t.strictSame(
      result1.hits.sort((a, b) => a.id.localeCompare(b.id)).map((h) => h.document),
      docs
    )
  })

  t.test('should correctly search for data returning doc including with unindexed keys', async (t) => {    const db = create({
      schema: {
        quote: 'string',
        author: 'string'
      } as const,
      components: {
        tokenizer: { language: 'english', stemming: false, stopWords: englishStopwords }
      }
    })

    const documentWithUnindexedField = {
      quote: 'I like cats. They are the best.',
      author: 'Jane Doe',
      unindexedField: 'unindexedValue'
    }
    const documentWithNestedUnindexedField = {
      quote: 'Foxes are nice animals. But I prefer having a dog.',
      author: 'John Doe',
      nested: { unindexedNestedField: 'unindexedNestedValue' }
    }

    await insert(db, documentWithNestedUnindexedField)
    await insert(db, documentWithUnindexedField)

    const result1 = await search(db, { term: 'They are the best' })
    const result2 = await search(db, { term: 'Foxes are nice animals' })

    t.equal(result1.count, 1)
    t.equal(result2.count, 1)
    t.same(result1.hits[0].document, documentWithUnindexedField)
    t.same(result2.hits[0].document, documentWithNestedUnindexedField)
  })

  t.test('should throw an error when searching in non-existing indices', async (t) => {    const db = create({ schema: { foo: 'string', baz: 'string' } })

    t.throws(
      () =>
        search(db, {
          term: 'foo',
          properties: ['bar'] as unknown as ('foo' | 'baz')[]
        }),
      {
        code: 'UNKNOWN_INDEX'
      }
    )
  })

  t.test('should support nested properties', async (t) => {    const db = create({
      schema: {
        quote: 'string',
        author: {
          name: 'string',
          surname: 'string'
        }
      } as const
    })

    await insert(db, {
      quote: 'Harry Potter, the boy who lived, come to die. Avada kedavra.',
      author: {
        name: 'Tom',
        surname: 'Riddle'
      }
    })

    await insert(db, {
      quote: 'I am Homer Simpson.',
      author: {
        name: 'Homer',
        surname: 'Simpson'
      }
    })

    const resultAuthorSurname = await search(db, {
      term: 'Riddle',
      properties: ['author.surname']
    })

    const resultAuthorName = await search(db, {
      term: 'Riddle',
      properties: ['author.name']
    })

    const resultSimpsonQuote = await search(db, {
      term: 'Homer',
      properties: ['quote']
    })

    const resultSimpsonAuthorName = await search(db, {
      term: 'Homer',
      properties: ['author.name']
    })

    t.equal(resultSimpsonAuthorName.count, 1)
    t.equal(resultSimpsonQuote.count, 1)
    t.equal(resultAuthorSurname.count, 1)
    t.equal(resultAuthorName.count, 0)
  })

  t.test('should support multiple nested properties', async (t) => {    const db = create({
      schema: {
        quote: 'string',
        author: {
          name: 'string',
          surname: 'string'
        },
        tag: {
          name: 'string',
          description: 'string'
        }
      } as const
    })

    await insert(db, {
      quote: 'Be yourself; everyone else is already taken.',
      author: {
        name: 'Oscar',
        surname: 'Wild'
      },
      tag: {
        name: 'inspirational',
        description: 'Inspirational quotes'
      }
    })

    await insert(db, {
      quote: 'So many books, so little time.',
      author: {
        name: 'Frank',
        surname: 'Zappa'
      },
      tag: {
        name: 'books',
        description: 'Quotes about books'
      }
    })

    await insert(db, {
      quote: 'A room without books is like a body without a soul.',
      author: {
        name: 'Marcus',
        surname: 'Tullius Cicero'
      },
      tag: {
        name: 'books',
        description: 'Quotes about books'
      }
    })

    const resultAuthor = await search(db, {
      term: 'Oscar'
    })

    const resultTag = await search(db, {
      term: 'books'
    })

    const resultQuotes = await search(db, {
      term: 'quotes'
    })

    t.equal(resultAuthor.count, 1)
    t.equal(resultTag.count, 2)
    t.equal(resultQuotes.count, 3)
  })

  t.test('with afterSearchHook', async (t) => {
    t.test('should run afterSearch hook', async (t) => {
      let called = 0
      const db = create({
        schema: {
          animal: 'string'
        } as const,
        plugins: [
          {
            name: 'after-search-hook',
            afterSearch: () => {
              called++
            }
          }
        ]
      })

      await insertMultiple(db, [
        { id: '0', animal: 'Quick brown fox' },
        { id: '1', animal: 'Lazy dog' },
        { id: '2', animal: 'Jumping penguin' },
        { id: '3', animal: 'Fast chicken' },
        { id: '4', animal: 'Fabolous ducks' },
        { id: '5', animal: 'Fantastic horse' }
      ])

      await search(db, { term: 'f' })

      t.equal(called, 1)

      t.end()
    })
    t.end()
  })

  t.test('should return all the documents that contains the property on empty search', async (t) => {
    const db = create({
      schema: {
        animal: 'string'
      } as const
    })

    await insertMultiple(db, [{ animal: 'foo' }, {}, {}, {}, {}, {}])

    const result = await search(db, {
      term: '',
      properties: ['animal']
    })

    t.equal(result.count, 1)

    t.end()
  })

  t.test('with geosearch', async (t) => {    const db = create({
      schema: {
        id: 'string',
        name: 'string',
        location: 'geopoint'
      } as const
    })

    await insert(db, { id: '1', name: 'Duomo di Milano', location: { lat: 9.1916185, lon: 45.4641833 } })
    await insert(db, { id: '2', name: 'Piazza Duomo (Milano)', location: { lat: 9.1897839, lon: 45.464236 } })
    await insert(db, { id: '3', name: 'Piazzetta Reale', location: { lat: 9.1908889, lon: 45.4633179 } })
    await insert(db, { id: '4', name: 'Duomo M1/M3', location: { lat: 9.1868877, lon: 45.4641707 } })

    const r1 = await search(db, {
      term: 'Duomo',
      where: {
        location: {
          radius: {
            coordinates: { lat: 9.1852139, lon: 45.4642677 },
            value: 1,
            unit: 'km'
          }
        }
      }
    })

    t.equal(r1.count, 3)
    t.strictSame(r1.hits.map((h) => h.id).sort(), ['1', '2', '4'])

    const r2 = await search(db, {
      term: 'Duomo',
      where: {
        location: {
          polygon: {
            coordinates: [
              { lat: 9.1885737, lon: 45.4648233 },
              { lat: 9.1885528, lon: 45.4636546 },
              { lat: 9.1928014, lon: 45.4636546 },
              { lat: 9.1927755, lon: 45.4648084 },
              { lat: 9.1885737, lon: 45.4648233 }
            ]
          }
        }
      }
    })

    t.equal(r2.count, 2)
    t.strictSame(r2.hits.map((h) => h.id).sort(), ['1', '2'])
  })

  t.test('with custom tokenizer', async (t) => {    const normalizationCache = new Map([['english:foo:dogs', 'Dogs']])

    const db = create({
      schema: {
        quote: 'string',
        author: 'string'
      } as const,
      components: {
        tokenizer: {
          language: 'english',
          normalizationCache,
          tokenize: (raw: string) => {
            return raw.split(' ').filter((word) => word.toLowerCase().startsWith('b'))
          }
        }
      }
    })

    t.equal(db.tokenizer.normalizationCache.get('english:foo:dogs'), 'Dogs')

    await insert(db, { quote: 'the quick, brown fox jumps over the lazy dog. What a fox!', author: 'John Doe' })
    await insert(db, { quote: 'foxes are nice animals. But I prefer having a dog.', author: 'John Doe' })
    await insert(db, { quote: 'I like dogs. They are the best.', author: 'Jane Doe' })
    await insert(db, { quote: 'I like cats. They are the best.', author: 'Jane Doe' })

    const result1 = await search(db, { term: 'foxes', exact: true })
    const result2 = await search(db, { term: 'cats', exact: true })
    const result3 = await search(db, { term: 'brown', exact: true })

    t.equal(result1.count, 0)
    t.equal(result2.count, 0)
    t.equal(result3.count, 1)
    t.end()
  })

  t.end()
})

t.test('fix-544', async (t) => {
  const db = create({
    schema: {
      name: 'string'
    } as const,
    components: {
      tokenizer: {
        stemming: true,
        stopWords: englishStopwords
      }
    }
  })

  await insert(db, { name: 'Christopher' })
  let result

  result = await search(db, { term: 'Chris', tolerance: 0 })
  t.equal(result.count, 1)

  result = await search(db, { term: 'Chris', tolerance: 1 })
  t.equal(result.count, 1)

  result = await search(db, { term: 'Chris', tolerance: 2 })
  t.equal(result.count, 1)

  t.end()
})

t.test('fix-601', async (t) => {
  const db = create({
    schema: {
      name: 'string'
    } as const
  })

  Object.prototype['examplePrototypeFunction'] = () => {}

  await insert(db, { name: 'John Doe' })
  const result = await search(db, { term: 'John Doe' })

  t.equal(result.count, 1)
  t.end()
})

t.test('full-text search with vector properties', async (t) => {
  t.test("shouldn't return vectors unless explicitly specified", async (t) => {
    const db = create({
      schema: {
        text: 'string',
        embeddings: {
          first: 'vector[2]',
          second: 'vector[2]'
        }
      } as const
    })

    await insert(db, {
      text: 'foo',
      embeddings: {
        first: [1, 2],
        second: [3, 4]
      }
    })

    await insert(db, {
      text: 'bar',
      embeddings: {
        first: [5, 6],
        second: [7, 8]
      }
    })

    const result2 = await search(db, {
      term: 'foo'
    })

    t.strictSame(
      result2.hits.map((hit) => hit.document.embeddings),
      [{ first: null, second: null }]
    )
  })
})

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
      tokenizer: {
        stopWords: englishStopwords
      },
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
  })

  const id2 = insert(db, {
    name: 'washing machine',
    rating: 5,
    price: 900,
    meta: {
      sales: 100
    }
  })

  const id3 = insert(db, {
    name: 'coffee maker',
    rating: 3,
    price: 30,
    meta: {
      sales: 25
    }
  })

  const id4 = insert(db, {
    name: 'coffee maker deluxe',
    rating: 5,
    price: 45,
    meta: {
      sales: 25
    }
  })

  return [db, id1, id2, id3, id4] as const
}
