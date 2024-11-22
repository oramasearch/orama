import t from 'tap'
import { create, insert, search } from '../src/index.js'
import { SUPPORTED_LANGUAGES } from '../src/components/tokenizer/languages.js'

t.test('language', async (t) => {
  t.test('should throw an error if the desired language is not supported', async (t) => {
    await t.throws(
      () =>
        create({
          schema: {} as const,
          language: 'latin'
        }),
      { code: 'LANGUAGE_NOT_SUPPORTED' }
    )
  })

  t.test('should throw an error if the desired language is not supported during insertion', async (t) => {
    const db = await create({
      schema: { foo: 'string' }
    })

    await t.throws(
      () =>
        insert(
          db,
          // @ts-expect-error - error case
          { foo: 'bar' },
          'latin'
        ),
      { code: 'LANGUAGE_NOT_SUPPORTED' }
    )
  })

  t.test('should not throw if if the language is supported', async (t) => {
    try {
      create({
        schema: {},
        language: 'portuguese'
      })

      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  t.test('should not throw if if the language is supported', async (t) => {
    try {
      create({
        schema: {},
        language: 'slovenian'
      })

      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  t.test('should not throw if if the language is supported', async (t) => {
    try {
      create({
        schema: {},
        language: 'bulgarian'
      })

      t.pass()
    } catch (e) {
      t.fail()
    }
  })
})

/*
t.test('custom tokenizer configuration', async (t) => {
  t.test('tokenizerFn', async (t) => {
    const db = await create({
      schema: {
        txt: 'string'
      } as const,
      components: {
        tokenizer: {
          tokenize(text: string) {
            console.log(text)
            return text.split(',')
          },
          language: 'english',
          normalizationCache: new Map()
        }
      }
    })

    await insert(db, {
      txt: 'hello, world! How are you?'
    })

    const searchResult = await search(db, {
      term: ' world! How are you?',
      exact: true
    })

    const searchResult2 = await search(db, {
      term: 'How are you?',
      exact: true
    })

    t.same(searchResult.count, 1)
    t.same(searchResult2.count, 0)
  })
})
  */

t.test('should access own properties exclusively', async (t) => {
  const db = await create({
    schema: {
      txt: 'string'
    } as const
  })

  await insert(db, {
    txt: 'constructor'
  })

  await search(db, {
    term: 'constructor',
    tolerance: 1
  })

  t.same(1, 1)
})

t.test('should search numbers in supported languages', async (t) => {
  for (const language of SUPPORTED_LANGUAGES) {
    const db = await create({
      schema: {
        number: 'string'
      } as const,
      components: {
        tokenizer: { language: language, stemming: false }
      }
    })

    await insert(db, {
      number: '123'
    })

    const searchResult = await search(db, {
      term: '123'
    })

    t.same(searchResult.count, 1, `Language: ${language}`)
  }

  t.end()
})

//  Tests for https://github.com/oramasearch/orama/issues/230
t.test('should correctly search accented words in Italian', async (t) => {
  const db = await create({
    schema: {
      description: 'string'
    } as const,
    components: {
      tokenizer: { language: 'italian', stemming: false }
    }
  })

  await insert(db, {
    description: 'Il mio nome è Josè'
  })

  const searchResult = await search(db, {
    term: 'jose'
  })
  t.equal(searchResult.count, 1)
})

//  Tests for https://github.com/oramasearch/orama/issues/230
t.test('should correctly search accented words in English', async (t) => {
  const db = await create({
    schema: {
      description: 'string'
    } as const,
    components: {
      tokenizer: { language: 'english', stemming: false }
    }
  })

  await insert(db, {
    description: 'My name is Josè'
  })

  const searchResult = await search(db, {
    term: 'jose'
  })
  t.equal(searchResult.count, 1)
})

//  Tests for https://github.com/oramasearch/orama/issues/230
t.test('should correctly search accented words in Dutch', async (t) => {
  const db = await create({
    schema: {
      description: 'string'
    } as const,
    components: {
      tokenizer: { language: 'dutch', stemming: false }
    }
  })

  await insert(db, {
    description: 'Mein Name ist Josè'
  })

  const searchResult = await search(db, {
    term: 'jose'
  })
  t.equal(searchResult.count, 1)
})

t.test('should correctly search accented words in Slovenian', async (t) => {
  const db = await create({
    schema: {
      description: 'string'
    } as const,
    components: {
      tokenizer: { language: 'slovenian', stemming: false }
    }
  })

  await insert(db, {
    description: 'ščisti se pešec čez križišče'
  })

  await insert(db, {
    description: 'na vrhu hriba je križ'
  })

  await insert(db, {
    description: 'okroglo križišče je krožišče'
  })

  const searchResult = await search(db, {
    term: 'križišče'
  })
  t.equal(searchResult.count, 2)
})

t.test('should correctly search words in Bulgarian', async (t) => {
  const db = await create({
    schema: {
      description: 'string'
    } as const,
    components: {
      tokenizer: { language: 'bulgarian', stemming: false }
    }
  })

  await insert(db, {
    // text in the same vain as the quick brown fox, including all cyrillic letters
    description: 'Жълтата дюля беше щастлива, че пухът, който цъфна, замръзна като гьон'
  })

  await insert(db, {
    description: 'Пингвините са нелетящи птици, обитаващи Южното полукълбо'
  })

  await insert(db, {
    description: 'Гръдните мускули на пингвините са много по-мощни от тези на летящите им родственици'
  })

  const firstSearchResult = await search(db, {
    term: 'пингвин'
  })
  t.equal(firstSearchResult.count, 2)

  const secondSearchResult = await search(db, {
    term: 'жълта'
  })
  t.equal(secondSearchResult.count, 1)
})
