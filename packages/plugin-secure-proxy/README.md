# Orama Secure Proxy Plugin

[![Tests](https://github.com/oramasearch/orama/actions/workflows/turbo.yml/badge.svg)](https://github.com/oramasearch/orama/actions/workflows/turbo.yml)

Orama plugin for generating embeddings and performing vector/hybrid search securely on the front-end.

# Usage

For the complete usage guide, please refer to the [official plugin documentation](https://docs.orama.com/open-source/plugins/plugin-secure-proxy).

To use the Orama Secure Proxy Plugin, you will need to sign up for a free account at [https://cloud.orama.com](https://cloud.orama.com)

```js
import { create, insert, search } from '@orama/orama'
import { pluginSecureProxy} from '@orama/plugin-secure-proxy'

const db = await create({
  schema: {
    title: 'string',
    description: 'string',
    embeddings: 'vector[384]'
  },
  plugins: [
    pluginSecureProxy({
      apiKey: 'xyz',
      embeddings: {
        defaultProperty: 'embeddings',
        model: 'orama/gte-small',
        onInsert: {
          generate: true, // Generate the embeddings at insert-time
          properties: ['title', 'description'], // Properties to generate embeddings from
          verbose: false
        },
      },
      chat: {
        model: 'openai/gpt-4o'
      }
    })
  ]
})
```

Available **embeddings** models:

| Model name                       | Provider | Dimensions |
| -------------------------------- | -------- | ---------- |
| `orama/gte-small`                | Orama    | 384        |
| `orama/gte-medium`               | Orama    | 768        |
| `orama/gte-large`                | Orama    | 1024       |
| `openai/text-embedding-ada-002`  | Openai   | 1536       |
| `openai/text-embedding-3-small`  | Openai   | 1536       |
| `openai/text-embedding-3-large`  | Openai   | 3072       |

Available **chat** models:

| Model name                       | Provider |
| -------------------------------- | -------- |
| `openai/openai/gpt-4o`           | Openai   |
| `openai/gpt-4o-mini`             | Openai   |
| `openai/gpt-4-turbo`             | Openai   |
| `openai/gpt-4`                   | Openai   |
| `openai/gpt-3.5-turbo`           | Openai   |

Mode models coming soon!

For the full configuration guide of this plugin, please follow the [official plugin documentation](https://docs.orama.com/open-source/plugins/plugin-secure-proxy).

# License

[Apache-2.0](/LICENSE.md)
