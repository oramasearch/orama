# Orama Analytics Plugin

[![Tests](https://github.com/oramasearch/orama/actions/workflows/turbo.yml/badge.svg)](https://github.com/oramasearch/orama/actions/workflows/turbo.yml)

Official plugin to provide analytics data on your searches.

# Usage

For the complete usage guide, please refer to the [official plugin documentation](https://docs.oramasearch.com/open-source/plugins/plugin-analytics).

To use the Orama Analytics Plugin, you will need to sign up for a free account at [https://cloud.orama.com](https://cloud.orama.com)

```js
import { create, insert, search } from '@orama/orama'
import { pluginAnalytics} from '@orama/plugin-analytics'

const db = await create({
  schema: {
    title: 'string',
    description: 'string'
  },
  plugins: [
    pluginAnalytics({
      apiKey: '<API-KEY>',
      endpoint: '<ENDPOINT>'
    })
  ]
})
```

For the full configuration guide of this plugin, please follow the [official plugin documentation](https://docs.oramasearch.com/open-source/plugins/plugin-analytics).

# License

[Apache-2.0](/LICENSE.md)
