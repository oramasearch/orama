import type { AnyOrama, Orama, SearchParams } from '@orama/orama'
import { create as createOramaDB, insert as insertIntoOramaDB, save as saveOramaDB } from '@orama/orama'
import type { AstroIntegration, RouteData } from 'astro'
import { compile } from 'html-to-text'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

interface AstroPage {
  pathname: string
}

const isWindows = process.platform === 'win32'
const joinPath = (isWindows ? path.win32 : path).join

export const defaultSchema = {
  path: 'string',
  title: 'string',
  h1: 'string',
  content: 'string'
} as const

export type PageIndexSchema = typeof defaultSchema

export interface OramaOptions {
  language: string
  /**
   * Controls whether generatedFilePath is filter
   * using case sensitive or case insensitive comparison
   * @default false
   *
   */
  caseSensitive?: boolean
  pathMatcher: RegExp
  contentSelectors?: string[]
  searchOptions?: Omit<SearchParams<AnyOrama, any>, 'term'> | undefined
}

const PKG_NAME = '@orama/plugin-astro'

const titleConverter = compile({
  baseElements: { selectors: ['title'] }
})
const h1Converter = compile({
  baseElements: { selectors: ['h1'] }
})

async function prepareOramaDb(
  dbConfig: OramaOptions,
  pages: AstroPage[],
  routes: RouteData[],
  dir: URL
): Promise<Orama<PageIndexSchema, any, any, any>> {
  const contentConverter = compile({
    baseElements: {
      selectors: dbConfig.contentSelectors?.length ? dbConfig.contentSelectors : ['body']
    }
  })

  // All routes are in the same folder, we can use the first one to get the basePath
  const basePath = dir.pathname.slice(isWindows ? 1 : 0)
  // Create a dist urls
  const distUrls = routes.flatMap((r) => r.distURL)
  const pathsToBeIndexed = pages
    .filter(({ pathname }) => dbConfig.pathMatcher.test(pathname))
    .map(({ pathname }) => {
      // Some pages like 404 are generated as 404.html while others are usually pageName/index.html
      const matchingPathname = distUrls
        .find((url) => url?.pathname.endsWith(pathname.replace(/\/$/, '') + '.html'))
        ?.pathname?.slice(isWindows ? 1 : 0)
      return {
        pathname,
        generatedFilePath: matchingPathname ?? `${basePath}${pathname.replace(/\/+$/, '')}/index.html`
      }
    })
    .filter(({ generatedFilePath }) => !!generatedFilePath)

  const oramaDB = createOramaDB({
    schema: defaultSchema,
    ...(dbConfig.language ? { language: dbConfig.language } : undefined)
  })

  for (const { pathname, generatedFilePath } of pathsToBeIndexed) {
    const htmlContent = readFileSync(generatedFilePath, { encoding: 'utf8' })

    const title = titleConverter(htmlContent) ?? ''
    const h1 = h1Converter(htmlContent) ?? ''
    const content = contentConverter(htmlContent)

    insertIntoOramaDB(
      oramaDB,
      {
        path: `/${pathname}`,
        title,
        h1,
        content
      },
      dbConfig.language
    )
  }

  return oramaDB
}

export function createPlugin(options: Record<string, OramaOptions>): AstroIntegration {
  return {
    name: PKG_NAME,
    hooks: {
      'astro:build:done': async function ({ pages, routes, dir }): Promise<void> {
        const assetsDir = joinPath(dir.pathname, 'assets').slice(isWindows ? 1 : 0)
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir)
        }

        for (const [dbName, dbConfig] of Object.entries(options)) {
          const namedDb = await prepareOramaDb(dbConfig, pages, routes, dir)

          writeFileSync(joinPath(assetsDir, `oramaDB_${dbName}.json`), JSON.stringify(await saveOramaDB(namedDb)), {
            encoding: 'utf8'
          })
        }
      }
    }
  }
}

export default createPlugin
