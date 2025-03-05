import { createTokenizer as createJapaneseTokenizer } from "./japanese.js";
import { createTokenizer as createMandarinTokenizer } from "./mandarin.js";

export default {
    japanese: createJapaneseTokenizer,
    mandarin: createMandarinTokenizer,
}