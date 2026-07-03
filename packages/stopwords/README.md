# Orama Stop-words

<!-- LANGUAGES:START -->
This package provides support for stop-words removal in 33 languages:

- Arabic
- Armenian
- Bulgarian
- Chinese (Mandarin)
- Czech
- Danish
- Dutch
- English
- Finnish
- French
- German
- Greek
- Hindi
- Hungarian
- Indonesian
- Irish
- Italian
- Japanese
- Lithuanian
- Nepali
- Norwegian
- Portuguese
- Romanian
- Russian
- Sanskrit
- Serbian
- Slovenian
- Spanish
- Swedish
- Tamil
- Turkish
- Ukrainian
- Vietnamese
<!-- LANGUAGES:END -->

```js
import { create } from '@orama/orama'
import { stopwords as italianStopwords } from '@orama/stopwords/italian'

const db = create({
  schema: {
  components: {
    tokenizer: {
      stopwords: italianStopwords
    }
  }
})
```

Read more in the official docs: [https://docs.orama.com/docs/orama-js/text-analysis/stop-words](https://docs.orama.com/docs/orama-js/text-analysis/stop-words).

# License

[Apache 2.0](/LICENSE.md)
