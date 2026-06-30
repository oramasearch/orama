import { create, insert, Tokenizer } from '@orama/orama'
import t from 'tap'
import {
  afterInsert,
  loadWithHighlight,
  OramaWithHighlight,
  saveWithHighlight,
  searchWithHighlight
} from '../src/index.js'

t.test('it should store the position of tokens', async (t) => {
  const db = create({
    schema: {
      text: 'string'
    } as const,
    plugins: [
      {
        name: 'highlight',
        afterInsert
      }
    ]
  })

  const id = await insert(db, { text: 'hello world' })

  t.same((db as OramaWithHighlight<typeof db>).data.positions[id], {
    text: { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] }
  })
})

t.test('it should manage nested schemas', async (t) => {
  const schema = {
    other: {
      text: 'string'
    }
  } as const

  const db = create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  const id = await insert(db, { other: { text: 'hello world' } })

  t.same((db as OramaWithHighlight<typeof db>).data.positions[id], {
    'other.text': { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] }
  })
})

t.test("it shouldn't stem tokens", async (t) => {
  const schema = {
    text: 'string'
  } as const

  const db = create({
    schema,
    plugins: [
      {
        name: 'highlight',
        afterInsert
      }
    ],
    components: { tokenizer: { stemming: false } }
  })

  const id = await insert(db, { text: 'hello personalization' })

  t.same((db as OramaWithHighlight<typeof db>).data.positions[id], {
    text: { hello: [{ start: 0, length: 5 }], personalization: [{ start: 6, length: 15 }] }
  })
})

t.test('should retrieve positions', async (t) => {
  const schema = {
    text: 'string'
  } as const

  const db = await create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  await insert(db, { text: 'hello world' })

  const results = await searchWithHighlight(db, { term: 'hello' })
  t.same(results.hits[0].positions, { text: { hello: [{ start: 0, length: 5 }] } })
})

t.test('should retrieve positions also with typo, if tolerance is used', async (t) => {
  const schema = {
    title: 'string',
    summary: 'string',
    id: 'string',
    slug: 'string'
  } as const

  const db = create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  await insert(db, {
    title: 'Introduction to React',
    summary:
      'React is a popular JavaScript library for building user interfaces, primarily for single-page applications. By utilizing a component-based architecture, it allows developers to build reusable UI components and manage the state of an application seamlessly. This introduction covers its core philosophies, JSX, and the virtual DOM.',
    id: '1a2b3c',
    slug: 'introduction-to-react'
  })

  const results = await searchWithHighlight(db, { term: 'reat', tolerance: 1 })

  t.same(results.hits[0].positions, {
    title: { react: [{ start: 16, length: 5 }] },
    summary: { react: [{ start: 0, length: 5 }] },
    id: {},
    slug: {}
  })
})

t.test('should work with texts containing constructor and __proto__ properties', async (t) => {
  const schema = {
    text: 'string'
  } as const

  const db = create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  await insert(db, { text: 'constructor __proto__' })

  const results = await searchWithHighlight(db, { term: 'constructor' })

  t.same(results.hits[0].positions, {
    text: { constructor: [{ start: 0, length: 11 }] }
  })
})

t.test('should correctly save and load data with positions', async (t) => {
  const schema = {
    text: 'string'
  } as const

  const originalDB = create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  const id = await insert(originalDB, { text: 'hello world' })

  const DBData = saveWithHighlight(originalDB)

  const newDB = create({ schema, plugins: [{ name: 'highlight', afterInsert }] })

  loadWithHighlight(newDB, DBData)

  t.same((newDB as OramaWithHighlight<typeof newDB>).data.positions[id], {
    text: { hello: [{ start: 0, length: 5 }], world: [{ start: 6, length: 5 }] }
  })
})

// A minimal word-granularity CJK tokenizer, equivalent to @orama/tokenizers/mandarin.
// CJK text has no word spaces, so a whole run is matched as a single word by the
// position indexer and the tokenizer splits it into several tokens.
function createCjkTokenizer(): Tokenizer {
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
  return {
    language: 'mandarin',
    normalizationCache: new Map(),
    tokenize(input: string): string[] {
      if (typeof input !== 'string') return [input]
      const tokens: string[] = []
      for (const segment of segmenter.segment(input)) {
        if (segment.isWordLike) tokens.push(segment.segment)
      }
      return tokens
    }
  }
}

t.test('it should record a position for every token of a multi-token word (CJK)', async (t) => {
  const tokenizer = createCjkTokenizer()
  const db = create({
    schema: { text: 'string' } as const,
    components: { tokenizer },
    plugins: [{ name: 'highlight', afterInsert }]
  })

  const text = '我喜欢编程'
  const expected = new Set(tokenizer.tokenize(text))
  t.ok(expected.size > 1, 'the tokenizer splits the run into multiple tokens')

  const id = await insert(db, { text })
  const recorded = (db as OramaWithHighlight<typeof db>).data.positions[id].text

  t.same(new Set(Object.keys(recorded)), expected, 'every token has a recorded position')

  // a token other than the first one is found by search and can be highlighted
  const lastToken = [...expected][expected.size - 1]
  const results = await searchWithHighlight(db, { term: lastToken })
  t.ok(results.hits.length > 0, 'search finds the document')
  t.ok(Array.isArray(results.hits[0].positions.text[lastToken]), 'a non-leading token is highlightable')
})
