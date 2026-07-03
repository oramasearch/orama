// Maps each supported language to its BCP-47 locale tag.
// The keys are the canonical language names accepted by Orama (they define
// `SUPPORTED_LANGUAGES` and the `Language` type); the values are passed to
// `String.prototype.localeCompare` for locale-aware string sorting (see `getLocale`).
// Note: these locale tags are intentionally decoupled from the file-id codes used by
// `@orama/stemmers` / `@orama/stopwords` (e.g. Danish stems live in `dk.js` but the
// locale is `da`), so keep them as valid BCP-47 primary subtags.
export const SUPPORTED_LANGUAGE_LOCALES: Record<string, string> = {
  arabic: 'ar',
  armenian: 'hy',
  bulgarian: 'bg',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'el',
  hungarian: 'hu',
  indian: 'hi',
  indonesian: 'id',
  irish: 'ga',
  italian: 'it',
  lithuanian: 'lt',
  nepali: 'ne',
  norwegian: 'no',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'sr',
  slovenian: 'sl',
  spanish: 'es',
  swedish: 'sv',
  tamil: 'ta',
  turkish: 'tr',
  ukrainian: 'uk',
  vietnamese: 'vi',
  sanskrit: 'sa'
}

export const SPLITTERS: Record<Language, RegExp> = {
  dutch: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  english: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  french: /[^a-z0-9äâàéèëêïîöôùüûœç-]+/gim,
  italian: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
  norwegian: /[^a-z0-9_æøåÆØÅäÄöÖüÜ]+/gim,
  portuguese: /[^a-z0-9à-úÀ-Ú]/gim,
  russian: /[^a-z0-9а-яА-ЯёЁ]+/gim,
  spanish: /[^a-z0-9A-Zá-úÁ-ÚñÑüÜ]+/gim,
  swedish: /[^a-z0-9_åÅäÄöÖüÜ-]+/gim,
  german: /[^a-z0-9A-ZäöüÄÖÜß]+/gim,
  finnish: /[^a-z0-9äöÄÖ]+/gim,
  danish: /[^a-z0-9æøåÆØÅ]+/gim,
  hungarian: /[^a-z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/gim,
  romanian: /[^a-z0-9ăâîșțĂÂÎȘȚ]+/gim,
  serbian: /[^a-z0-9čćžšđČĆŽŠĐ]+/gim,
  turkish: /[^a-z0-9çÇğĞıİöÖşŞüÜ]+/gim,
  lithuanian: /[^a-z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]+/gim,
  arabic: /[^a-z0-9أ-ي]+/gim,
  nepali: /[^a-z0-9अ-ह]+/gim,
  irish: /[^a-z0-9áéíóúÁÉÍÓÚ]+/gim,
  indian: /[^a-z0-9अ-ह]+/gim,
  armenian: /[^a-z0-9ա-ֆ]+/gim,
  greek: /[^a-z0-9α-ωά-ώ]+/gim,
  indonesian: /[^a-z0-9]+/gim,
  ukrainian: /[^a-z0-9а-яА-ЯіїєІЇЄ]+/gim,
  slovenian: /[^a-z0-9čžšČŽŠ]+/gim,
  bulgarian: /[^a-z0-9а-яА-Я]+/gim,
  tamil: /[^a-z0-9அ-ஹ]+/gim,
  sanskrit: /[^a-z0-9A-Zāīūṛḷṃṁḥśṣṭḍṇṅñḻḹṝ]+/gim,
  vietnamese: /[^a-z0-9A-ZáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ_]+/gim,
  czech: /[^A-Z0-9a-zěščřžýáíéúůóťďĚŠČŘŽÝÁÍÉÓÚŮŤĎ-]+/gim
}

export const SUPPORTED_LANGUAGES = Object.keys(SUPPORTED_LANGUAGE_LOCALES)

export function getLocale(language: string | undefined) {
  return language !== undefined && SUPPORTED_LANGUAGES.includes(language)
    ? SUPPORTED_LANGUAGE_LOCALES[language]
    : undefined
}

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

// Languages whose diacritics are semantically significant (e.g. Vietnamese tone marks).
// Their tokens must not be folded to ASCII during tokenization, otherwise distinct
// words collapse together (e.g. "tài" -> "tai") and search quality breaks.
export const LANGUAGES_WITH_SIGNIFICANT_DIACRITICS = new Set<Language>(['vietnamese'])
