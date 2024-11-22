# Vitepress Plugin

[![Tests](https://github.com/oramasearch/orama/actions/workflows/turbo.yml/badge.svg)](https://github.com/oramasearch/orama/actions/workflows/turbo.yml)

Official plugin to provide search capabilities through Orama on any Vitepress website!

# Usage

For the complete usage guide, please refer to the [official plugin documentation](https://docs.oramasearch.com/open-source/plugins/plugin-vitepress).

# TL;DR

```js
// .vitepress/config.js

import { defineConfig } from 'vitepress'
import { OramaPlugin } from '@orama/plugin-vitepress'

export default defineConfig({
  // ...
  extends: {
    vite: {
      plugins: [OramaPlugin()]
    },
  }
})
```

# License

[Apache-2.0](/LICENSE.md)
