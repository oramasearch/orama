import t from 'tap'

import { getLocale, SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_LOCALES } from '../src/components/tokenizer/languages.js'

t.test('language locales', async (t) => {
  t.test('every supported language maps to a canonical, well-formed BCP-47 locale', async (t) => {
    for (const language of SUPPORTED_LANGUAGES) {
      const locale = getLocale(language)

      t.type(locale, 'string', `getLocale('${language}') returns a locale`)

      let canonical: string[] = []
      t.doesNotThrow(() => {
        canonical = Intl.getCanonicalLocales(locale)
      }, `'${locale}' (${language}) is a well-formed BCP-47 tag`)
      t.strictSame(canonical, [locale], `'${locale}' (${language}) is already in canonical form`)
    }
  })

  t.test('specific language to locale mappings', async (t) => {
    const expectedLocales = {
      czech: 'cs',
      slovenian: 'sl',
      danish: 'da',
      greek: 'el',
      swedish: 'sv',
      serbian: 'sr',
      armenian: 'hy',
      sanskrit: 'sa',
      indian: 'hi',
      irish: 'ga',
      nepali: 'ne'
    }

    for (const [language, locale] of Object.entries(expectedLocales)) {
      t.equal(getLocale(language), locale, `getLocale('${language}') returns '${locale}'`)
    }
  })

  t.test('supported languages include czech and slovenian', async (t) => {
    t.ok(SUPPORTED_LANGUAGES.includes('czech'))
    t.ok(SUPPORTED_LANGUAGES.includes('slovenian'))
    t.strictSame(SUPPORTED_LANGUAGES, Object.keys(SUPPORTED_LANGUAGE_LOCALES))
  })

  t.test('unknown or missing languages return undefined', async (t) => {
    t.equal(getLocale(undefined), undefined)
    t.equal(getLocale('klingon'), undefined)
  })
})
