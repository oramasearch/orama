/* eslint-disable node/no-missing-import */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Custom config file for testing purposes
 */

import { defineConfig } from 'astro/config'
import orama from '@orama/plugin-astro'

// https://astro.build/config
export default defineConfig({
  integrations: [
    orama({
      animals: { pathMatcher: /animals_.+$/ },
      games: { pathMatcher: /games_.+$/ },
      dynamic: { pathMatcher: /blog\/inner-path\/article(.*)$/ },
      allSite: { pathMatcher: /.*/ },
      // Anchored matcher that only matches when the path has a leading slash.
      // Since Astro 5 the plugin tests pathMatcher against `/${pathname}`, so
      // this collects exactly the `/animals_cat/` page and nothing else.
      leadingSlash: { pathMatcher: /^\/animals_cat\// }
    })
  ],
  trailingSlash: 'always'
})
