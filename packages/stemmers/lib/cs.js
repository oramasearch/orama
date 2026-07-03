/**
 * Light Stemmer for Czech.
 *
 * Port of Apache Lucene's CzechStemmer (Apache License 2.0), which implements
 * the algorithm described in: Ljiljana Dolamic and Jacques Savoy,
 * "Indexing and stemming approaches for the Czech language",
 * Information Processing & Management 45 (2009).
 *
 * Removes case endings and possessive suffixes from nouns and adjectives,
 * then normalizes palatalized stem endings. Input is expected to be lowercase.
 */

const CASE_SUFFIXES_4 = ['ětem', 'etem', 'atům']

const CASE_SUFFIXES_3 = [
  'ech',
  'ich',
  'ích',
  'ého',
  'ěmi',
  'emi',
  'ému',
  'ěte',
  'ete',
  'ěti',
  'eti',
  'ího',
  'iho',
  'ími',
  'ímu',
  'imu',
  'ách',
  'ata',
  'aty',
  'ých',
  'ama',
  'ami',
  'ové',
  'ovi',
  'ými'
]

const CASE_SUFFIXES_2 = ['em', 'es', 'ém', 'ím', 'ům', 'at', 'ám', 'os', 'us', 'ým', 'mi', 'ou']

const CASE_SUFFIXES_1 = 'aeiouůyáéíýě'

const POSSESSIVE_SUFFIXES = ['ov', 'in', 'ův']

function endsWithAny(word, suffixes) {
  return suffixes.some((suffix) => word.endsWith(suffix))
}

/**
 * Removes Czech case endings from nouns and adjectives, longest match first.
 */
function removeCase(word) {
  if (word.length > 7 && word.endsWith('atech')) {
    return word.slice(0, -5)
  }
  if (word.length > 6 && endsWithAny(word, CASE_SUFFIXES_4)) {
    return word.slice(0, -4)
  }
  if (word.length > 5 && endsWithAny(word, CASE_SUFFIXES_3)) {
    return word.slice(0, -3)
  }
  if (word.length > 4 && endsWithAny(word, CASE_SUFFIXES_2)) {
    return word.slice(0, -2)
  }
  if (word.length > 3 && CASE_SUFFIXES_1.includes(word[word.length - 1])) {
    return word.slice(0, -1)
  }
  return word
}

/**
 * Removes the possessive suffixes "-ov", "-in" and "-ův".
 */
function removePossessives(word) {
  if (word.length > 5 && endsWithAny(word, POSSESSIVE_SUFFIXES)) {
    return word.slice(0, -2)
  }
  return word
}

/**
 * Normalizes the stem ending so inflectional variants conflate:
 * palatalized consonants are rewritten ("čt" → "ck", "št" → "sk",
 * "c"/"č" → "k", "z"/"ž" → "h"), a fleeting penultimate "e" is dropped
 * ("desek" → "desk") and a penultimate "ů" becomes "o" ("dům" → "dom").
 */
function normalize(word) {
  if (word.endsWith('čt')) {
    return word.slice(0, -2) + 'ck'
  }
  if (word.endsWith('št')) {
    return word.slice(0, -2) + 'sk'
  }

  const last = word[word.length - 1]
  if (last === 'c' || last === 'č') {
    return word.slice(0, -1) + 'k'
  }
  if (last === 'z' || last === 'ž') {
    return word.slice(0, -1) + 'h'
  }

  if (word.length > 1 && word[word.length - 2] === 'e') {
    return word.slice(0, -2) + last
  }
  if (word.length > 2 && word[word.length - 2] === 'ů') {
    return word.slice(0, -2) + 'o' + last
  }

  return word
}

export function stemmer(word) {
  let stem = removeCase(word)
  stem = removePossessives(stem)

  if (stem.length > 0) {
    stem = normalize(stem)
  }

  return stem
}
