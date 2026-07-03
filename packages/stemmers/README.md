# Orama Stemmers

Orama can analyze the input and perform a `stemming` operation, which allows the engine to perform more optimized queries, as well as save indexing space.

<!-- LANGUAGES:START -->
Right now, Orama supports 31 languages and stemmers out of the box:

- Arabic
- Armenian
- Bulgarian
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

Chinese (Mandarin) and Japanese are supported through dedicated tokenizers (`@orama/tokenizers`) and stop-word removal (`@orama/stopwords`), not through stemming.

```js
import { create } from '@orama/orama'
import { stemmer, language } from '@orama/stemmers/italian'

const db = create({
  schema: {
  components: {
    tokenizer: {
      stemming: true,
      stemmer,
      language
    }
  }
})
```

Read more in the official docs: [https://docs.orama.com/docs/orama-js/text-analysis/stemming](https://docs.orama.com/docs/orama-js/text-analysis/stemming).

# License

[Apache 2.0](/LICENSE.md)
