# Orama's Astro Plugin

[![Tests](https://github.com/oramasearch/orama/actions/workflows/turbo.yml/badge.svg)](https://github.com/oramasearch/orama/actions/workflows/turbo.yml)

This package is a (still experimental) [Orama](https://oramasearch.com) integration for
[Astro](https://astro.build).

## Usage

### Configuring the Astro integration

```typescript
// In `astro.config.mjs`
import orama from '@orama/plugin-astro'

// https://astro.build/config
export default defineConfig({
  integrations: [
    orama({
      // We can generate more than one DB, with different configurations
      mydb: {
        // Required. Only pages matching this path regex will be indexed
        pathMatcher: /blog\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\/.+$/,

        // Optional. 'english' by default
        language: 'spanish',

        // Optional. ['body'] by default. Use it to constraint what is used to
        // index a page.
        contentSelectors: ['h1', 'main']
      }
    })
  ]
})
```

When running the `astro build` command, a new DB file will be persisted in the
`dist/assets` directory. For the particular case of this example, it will be
saved in the file `dist/assets/oramaDB_mydb.json`.

### Using generated DBs in your pages

To use the generated DBs in your pages, you can include a script in your
`<head>` section, as the following one:

```html
<head>
  <!-- Other stuff -->
  <script>
    // Astro will do the job of bundling everything for you
    import { getOramaDB, search } from "@orama/plugin-astro/client"

    // We load the DB that we generated at build time, this is an asynchronous
    // operation, so we must either await, or rely on `.then` calls.
    const db = await getOramaDB('mydb')

    // Now we can search inside our DB. Of course, feel free to use it in more
    // interesting ways.
    console.log('Search Results')
    console.log(search(db, { term: 'mySearchTerm' }))
  </script>
</head>
```

**NOTE:** For now, this plugin only supports readonly DBs. This might change in
the future if there's demand for it.
