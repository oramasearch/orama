export const STEMMERS: Record<string, string> = {
  arabic: 'ar',
  armenian: 'am',
  bulgarian: 'bg',
  czech: 'cz',
  danish: 'dk',
  dutch: 'nl',
  english: 'en',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'gr',
  hungarian: 'hu',
  indian: 'in',
  indonesian: 'id',
  irish: 'ie',
  italian: 'it',
  lithuanian: 'lt',
  nepali: 'np',
  norwegian: 'no',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'rs',
  slovenian: 'ru',
  spanish: 'es',
  swedish: 'se',
  tamil: 'ta',
  turkish: 'tr',
  ukrainian: 'uk',
  sanskrit: 'sk'
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
  czech: /[^A-Z0-9a-zěščřžýáíéúůóťďĚŠČŘŽÝÁÍÉÓÚŮŤĎ-]+/gim
}

export const SUPPORTED_LANGUAGES = Object.keys(STEMMERS)

export function getLocale(language: string | undefined) {
  return language !== undefined && SUPPORTED_LANGUAGES.includes(language) ? STEMMERS[language] : undefined
}

export type Language = (typeof SUPPORTED_LANGUAGES)[number]
