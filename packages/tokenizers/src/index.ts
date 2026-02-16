import { createTokenizer as createJapaneseTokenizer } from './japanese.js'
import { createTokenizer as createKoreanTokenizer } from './korean.js'
import { createTokenizer as createMandarinTokenizer } from './mandarin.js'

export default {
  japanese: createJapaneseTokenizer,
  korean: createKoreanTokenizer,
  mandarin: createMandarinTokenizer
}
