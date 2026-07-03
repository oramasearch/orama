/**
 * Light stemmer for Slovene (Slovenian).
 *
 * Slovene has no official Snowball stemmer, so this is a conservative,
 * dependency-free light stemmer in the structural spirit of the light
 * stemmers bundled with Apache {@link https://github.com/apache/lucene | Lucene}
 * (cf. the Bulgarian and Russian light stemmers): a single longest-match
 * removal of the most frequent inflectional ending, followed by a trim of
 * residual theme vowels, with minimum stem-length guards so short words and
 * short stems are left intact.
 *
 * The ending inventory follows standard Slovene inflectional morphology
 * (noun declensions — sklanjatve — across the three genders and the
 * singular/dual/plural numbers, adjective agreement, and the productive verb
 * classes; cf. J. Toporišič, *Slovenska slovnica*) and was cross-checked
 * against the suffix set of the unpublished Slovene Snowball stemmer drafted
 * by Boštjan Jerko and rewritten by Martin Porter (snowball-discuss mailing
 * list, 19 Apr 2005
 * {@link http://snowball.tartarus.org/archives/snowball-discuss/0725.html}).
 * Derivational suffixes are intentionally left in place so that a lemma's
 * citation form and its inflected forms collapse to the same stem.
 *
 * This is an original implementation, released under the Apache-2.0 license
 * of this repository. Input is expected to be a single lowercased token;
 * the diacritics č/š/ž are preserved.
 */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

/**
 * Inflectional endings, longest first so that the first match is the longest
 * match. Each entry is `[ending, minStem]`: the ending is only removed when
 * at least `minStem` characters would remain. The stricter guard of 4 is
 * used where a guard of 3 would clip common citation forms (e.g. "letalo",
 * "palma", "uspeh") rather than inflected ones.
 */
const ENDINGS = [
  // adjectives/pronouns: genitive and dative singular m./n. (velikega, velikemu)
  ['ega', 3],
  ['emu', 3],
  // verbs: 1st person plural present (delamo, nesemo, nosimo)
  ['amo', 3],
  ['emo', 3],
  ['imo', 3],
  // verbs: infinitive of the productive a-class (delati)
  ['ati', 3],
  // verbs: l-participle f./n./plural (delala, videle, nosili, govorilo)
  ['ala', 4],
  ['ale', 4],
  ['ali', 4],
  ['alo', 4],
  ['ela', 4],
  ['ele', 4],
  ['eli', 4],
  ['elo', 4],
  ['ila', 4],
  ['ile', 4],
  ['ili', 4],
  ['ilo', 4],
  // nouns: extended m. plural/oblique stems in -ov-/-ev- (gradovi, sinova, kraljevi)
  ['ova', 3],
  ['ove', 3],
  ['ovi', 3],
  ['ovo', 3],
  ['eva', 3],
  ['eve', 3],
  ['evi', 3],
  ['evo', 3],
  // nouns: genitive plural m. (korakov, stricev)
  ['ov', 3],
  ['ev', 3],
  // nouns: instrumental singular / dative plural (mestom, nožem, hišam);
  // verbs: 1st person singular present (delam, nosim); adjectives: instrumental (velikim)
  ['om', 3],
  ['em', 3],
  ['am', 3],
  ['im', 3],
  // nouns: locative plural (hišah, mestih, gradeh)
  ['ah', 3],
  ['ih', 4],
  ['eh', 4],
  // verbs: 2nd person singular present (delaš, neseš, nosiš)
  ['aš', 3],
  ['eš', 3],
  ['iš', 3],
  // nouns: instrumental singular f. (nočjo, perutjo); with the vowel trim
  // below this also covers the 3rd person plural (delajo → dela → del,
  // nosijo → nosi → nos)
  ['jo', 3],
  // nouns: dual/plural dative and instrumental in -ma/-mi (hišama, stvarmi)
  ['ma', 4],
  ['mi', 4],
  // verbs: l-participle m. singular (govoril, ostal)
  ['al', 4],
  ['el', 4],
  ['il', 4]
]

/**
 * Stem a lowercased Slovene token.
 *
 * @param {string} word input token
 * @return {string} the stemmed token, never shorter than 3 characters
 */
export function stemmer(word) {
  if (word.length <= 3) {
    // do not stem short words (pes, luč, in, na, ...)
    return word
  }

  let stem = word

  // Step 1: remove the longest matching inflectional ending, if its
  // minimum-stem guard allows it.
  for (const [ending, minStem] of ENDINGS) {
    if (stem.length - ending.length >= minStem && stem.endsWith(ending)) {
      stem = stem.slice(0, stem.length - ending.length)
      break
    }
  }

  // Step 2: trim residual theme/case vowels (mesta → mest, hiši → hiš),
  // plus a final 'j' glide when it follows a consonant (vprašanje →
  // vprašanj → vprašan, bratje → brat) or an 'i' — where -ij- is always an
  // inflectional/thematic tail, so the whole -ija class collapses (operacija,
  // operacije, operacijo, operacij → operac; ladja/ladij → lad). After
  // a/e/o/u the 'j' is part of the stem (muzej, kraj, razvoj) and is kept.
  // The stem is never shortened below 3 characters.
  let end = stem.length
  while (end > 3) {
    const last = stem[end - 1]
    const prev = stem[end - 2]
    if (VOWELS.has(last) || (last === 'j' && (prev === 'i' || !VOWELS.has(prev)))) {
      end--
      continue
    }
    break
  }

  return end < stem.length ? stem.slice(0, end) : stem
}
