import type { Optional } from '../../types.js'
import { createError } from '../../errors.js'
import { Stemmer, Tokenizer, DefaultTokenizerConfig } from '../../types.js'
import { replaceDiacritics } from './diacritics.js'
import { Language, SPLITTERS, SUPPORTED_LANGUAGES } from './languages.js'
import { stemmer as english } from './english-stemmer.js'

export interface DefaultTokenizer extends Tokenizer {
  language: Language
  stemmer?: Stemmer
  tokenizeSkipProperties: Set<string>
  stemmerSkipProperties: Set<string>
  stopWords?: string[]
  allowDuplicates: boolean
  normalizationCache: Map<string, string>
  normalizeToken(this: DefaultTokenizer, prop: Optional<string>, token: string, withCache: Optional<boolean>): string
}

export function normalizeToken(this: DefaultTokenizer, prop: string, token: string, withCache: boolean = true): string {
  const key = `${this.language}:${prop}:${token}`

  if (withCache && this.normalizationCache.has(key)) {
    return this.normalizationCache.get(key)!
  }

  // Remove stopwords if enabled
  if (this.stopWords?.includes(token)) {
    if (withCache) {
      this.normalizationCache.set(key, '')
    }
    return ''
  }

  // Apply stemming if enabled
  if (this.stemmer && !this.stemmerSkipProperties.has(prop)) {
    token = this.stemmer(token)
  }

  token = replaceDiacritics(token)
  if (withCache) {
    this.normalizationCache.set(key, token)
  }
  return token
}

/* c8 ignore next 10 */
function trim(text: string[]): string[] {
  while (text[text.length - 1] === '') {
    text.pop()
  }
  while (text[0] === '') {
    text.shift()
  }
  return text
}

function tokenize(
  this: DefaultTokenizer,
  input: string,
  language?: string,
  prop?: string,
  withCache: boolean = true
): string[] {
  if (language && language !== this.language) {
    throw createError('LANGUAGE_NOT_SUPPORTED', language)
  }

  /* c8 ignore next 3 */
  if (typeof input !== 'string') {
    return [input]
  }

  const normalizeToken = this.normalizeToken.bind(this, prop ?? '')
  let tokens: string[]
  if (prop && this.tokenizeSkipProperties.has(prop)) {
    tokens = [normalizeToken(input, withCache)]
  } else {
    const splitRule = SPLITTERS[this.language]
    tokens = input
      .toLowerCase()
      .split(splitRule)
      .map((t) => normalizeToken(t, withCache))
      .filter(Boolean)
  }

  const trimTokens = trim(tokens)

  if (!this.allowDuplicates) {
    return Array.from(new Set(trimTokens))
  }

  return trimTokens
}

export function createTokenizer(config: DefaultTokenizerConfig = {}): DefaultTokenizer {
  if (!config.language) {
    config.language = 'english'
  } else if (!SUPPORTED_LANGUAGES.includes(config.language)) {
    throw createError('LANGUAGE_NOT_SUPPORTED', config.language)
  }

  // Handle stemming - It is disabled by default
  let stemmer: Optional<Stemmer>

  if (config.stemming || (config.stemmer && !('stemming' in config))) {
    if (config.stemmer) {
      if (typeof config.stemmer !== 'function') {
        throw createError('INVALID_STEMMER_FUNCTION_TYPE')
      }

      stemmer = config.stemmer
    } else {
      if (config.language === 'english') {
        stemmer = english
      } else {
        throw createError('MISSING_STEMMER', config.language)
      }
    }
  }

  // Handle stopwords
  let stopWords: Optional<string[]>

  if (config.stopWords !== false) {
    stopWords = []

    if (Array.isArray(config.stopWords)) {
      stopWords = config.stopWords
    } else if (typeof config.stopWords === 'function') {
      stopWords = config.stopWords(stopWords)
    } else if (config.stopWords) {
      throw createError('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY')
    }

    // Make sure stopWords is just an array of strings
    if (!Array.isArray(stopWords)) {
      throw createError('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY')
    }

    for (const s of stopWords) {
      if (typeof s !== 'string') {
        throw createError('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY')
      }
    }
  }

  // Create the tokenizer
  const tokenizer: DefaultTokenizer = {
    tokenize,
    language: config.language,
    stemmer,
    stemmerSkipProperties: new Set(config.stemmerSkipProperties ? [config.stemmerSkipProperties].flat() : []),
    tokenizeSkipProperties: new Set(config.tokenizeSkipProperties ? [config.tokenizeSkipProperties].flat() : []),
    stopWords,
    allowDuplicates: Boolean(config.allowDuplicates),
    normalizeToken,
    normalizationCache: new Map()
  }

  tokenizer.tokenize = tokenize.bind(tokenizer)
  tokenizer.normalizeToken = normalizeToken

  return tokenizer
}
