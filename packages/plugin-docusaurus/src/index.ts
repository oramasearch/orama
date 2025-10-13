import { readFileSync, writeFileSync } from 'node:fs'
import type { Plugin } from '@docusaurus/types'
import { cp } from 'node:fs/promises'
import { gzip } from 'pako'
import { resolve } from 'node:path'
import { create, insertMultiple, save } from '@orama/orama'
import { JSDOM } from 'jsdom'
import MarkdownIt from 'markdown-it'
import matter from 'gray-matter'
import { createSnapshot, deployIndex, DOCS_PRESET_SCHEMA, fetchEndpointConfig } from './utils.js'
import { parseMarkdownHeadingId, writeMarkdownHeadingId } from '@docusaurus/utils'

enum DeployType {
  SNAPSHOT_ONLY = 'snapshot-only',
  DEFAULT = 'default'
}

type CloudConfig = {
  deploy: DeployType | false
  endpoint: string
  indexId: string
  oramaCloudAPIKey?: string
  public_api_key: string
}

type PluginOptions = {
  analytics?: {
    enabled: boolean
    apiKey: string
    indexId: string
  }
  cloud?: CloudConfig
  searchbox?: { [key: string]: any }
  searchButton?: { [key: string]: any }
}

export default function OramaPluginDocusaurus(
  ctx: {
    siteDir: any
    generatedFilesDir: any
  },
  options: PluginOptions
): Plugin {
  let versions: any[] = []

  return {
    name: '@orama/plugin-docusaurus',

    getThemePath() {
      return '../dist/theme'
    },

    getTypeScriptThemePath() {
      return '../src/theme'
    },

    getClientModules() {
      return ['../dist/theme/SearchBar/index.css']
    },

    async contentLoaded({ actions, allContent }) {
      const isDevelopment =
        process.env.NODE_ENV === 'development' || !options.cloud?.oramaCloudAPIKey || !options.cloud?.deploy
      const docsInstances: string[] = []
      const oramaCloudAPIKey = options.cloud?.oramaCloudAPIKey
      const searchDataConfig = [
        {
          docs: allContent['docusaurus-plugin-content-docs']
        },
        {
          blogs: allContent['docusaurus-plugin-content-blog']
        },
        {
          pages: allContent['docusaurus-plugin-content-pages']
        }
      ]
      const allOramaDocsPromises: Promise<any>[] = []

      searchDataConfig.forEach((config) => {
        const [key, value] = Object.entries(config)[0]
        switch (key) {
          case 'docs':
            if (!value) break
            Object.keys(value).forEach((docsInstance: any) => {
              const loadedVersions = value?.[docsInstance]?.loadedVersions
              versions = loadedVersions.map((v: any) => v.versionName)
              docsInstances.push(docsInstance)
              versions.flatMap(async (version) => {
                const currentVersion = loadedVersions.find((v: any) => v.versionName === version)
                if (!currentVersion) return
                allOramaDocsPromises.push(
                  ...currentVersion.docs.map((data: any) =>
                    generateDocs({
                      siteDir: ctx.siteDir,
                      version,
                      category: docsInstance,
                      data
                    })
                  )
                )
              })
            })
            break
          case 'blogs':
            if (!value) break
            Object.keys(value).forEach(async (instance) => {
              const loadedInstance = value[instance]
              if (!loadedInstance) return
              allOramaDocsPromises.push(
                ...loadedInstance.blogPosts.map(({ metadata }: any) => {
                  return generateDocs({
                    siteDir: ctx.siteDir,
                    version: 'current',
                    category: 'blogs',
                    data: metadata
                  })
                })
              )
            })
            break
          case 'pages':
            if (!value) break
            Object.keys(value).forEach(async (instance) => {
              const loadedInstance = value[instance]
              if (!loadedInstance) return
              allOramaDocsPromises.push(
                ...loadedInstance.map((data: any) =>
                  generateDocs({
                    siteDir: ctx.siteDir,
                    version: 'current',
                    category: 'pages',
                    data
                  })
                )
              )
            })

            break
        }
      })

      const oramaDocs = (await Promise.all(allOramaDocsPromises)).flat().reduce((acc, curr) => {
        if (!!curr.title && !!curr.content) {
          acc.push({
            title: curr.title,
            content: curr.content,
            section: curr.originalTitle,
            version: curr.version,
            path: curr.path,
            category: curr.category
          })
        }

        return acc
      }, [])

      if (isDevelopment) {
        await deployData({
          oramaDocs,
          generatedFilesDir: ctx.generatedFilesDir,
          version: 'current'
        })

        actions.setGlobalData({
          searchData: Object.fromEntries([['current', readFileSync(indexPath(ctx.generatedFilesDir, 'current'))]]),
          docsInstances,
          availableVersions: versions,
          searchBoxCustomConfig: options.searchbox ?? {},
          searchBtnConfig: options.searchButton ?? {}
        })
      } else {
        const deployConfig = options.cloud && {
          indexId: options.cloud.indexId,
          oramaCloudAPIKey,
          type: options.cloud.deploy
        }

        const endpointConfig = await deployData({
          oramaDocs,
          generatedFilesDir: ctx.generatedFilesDir,
          version: 'current',
          deployConfig
        })

        actions.setGlobalData({
          docsInstances,
          availableVersions: versions,
          analytics: options.analytics,
          searchBoxCustomConfig: options.searchbox ?? {},
          searchBtnConfig: options.searchButton ?? {},
          endpoint: {
            url: endpointConfig?.endpoint,
            key: endpointConfig?.public_api_key
          }
        })
      }
    },

    async postBuild({ outDir }) {
      !options.cloud && (await cp(indexPath(ctx.generatedFilesDir, 'current'), indexPath(outDir, 'current')))
    }
  }
}

async function generateDocs({
  siteDir,
  version,
  category,
  data
}: {
  siteDir: string
  version: string
  category: string
  data: Record<string, string>
}) {
  const { title, permalink, source } = data
  const fileContent = readFileSync(source.replace('@site', siteDir), 'utf-8')
  const contentWithoutFrontMatter = matter(fileContent).content
  const contentWithIds = writeMarkdownHeadingId(contentWithoutFrontMatter)

  return parseHTMLContent({
    originalTitle: title,
    version,
    category,
    html: new MarkdownIt().render(contentWithIds),
    path: permalink
  })
}

function parseHTMLContent({
  html,
  path,
  originalTitle,
  version,
  category
}: {
  html: any
  path: any
  originalTitle: any
  version: string
  category: string
}) {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const sections: {
    originalTitle: any
    title: string
    header: string
    content: string
    version: string
    category: string
    path: any
  }[] = []

  const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (!headers.length) {
    sections.push({
      originalTitle,
      title: originalTitle,
      header: 'h1',
      content: html,
      version,
      category,
      path
    })
  }
  headers.forEach((header) => {
    const headerText = header.textContent?.trim() ?? ''
    const headerTag = header.tagName.toLowerCase()

    // Use parseMarkdownHeadingId to extract clean title and section ID
    const { text: sectionTitle, id: sectionId } = parseMarkdownHeadingId(headerText)

    let sectionContent = ''

    let sibling = header.nextElementSibling
    while (sibling && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(sibling.tagName)) {
      sectionContent += sibling.textContent?.trim() + '\n'
      sibling = sibling.nextElementSibling
    }

    sections.push({
      originalTitle,
      title: sectionTitle ?? '',
      header: headerTag,
      content: sectionContent,
      version,
      category,
      path: headerTag === 'h1' ? path : `${removeTrailingSlash(path)}#${sectionId}`
    })
  })

  return sections
}

function removeTrailingSlash(str: string): string {
  return str.endsWith('/') ? str.slice(0, -1) : str
}

function indexPath(outDir: string, version: string) {
  return resolve(outDir, 'orama-search-index-@VERSION@.json.gz'.replace('@VERSION@', version))
}

async function deployData({
  oramaDocs,
  generatedFilesDir,
  version,
  deployConfig
}: {
  oramaDocs: any[]
  generatedFilesDir: string
  version: string
  deployConfig?: {
    indexId: string
    oramaCloudAPIKey: string | undefined
    type: DeployType | false
  }
}) {
  const { ORAMA_CLOUD_BASE_URL } = process.env
  const baseUrl = ORAMA_CLOUD_BASE_URL || 'https://cloud.orama.com'

  if (deployConfig?.type) {
    if (deployConfig.type === DeployType.DEFAULT || deployConfig.type === DeployType.SNAPSHOT_ONLY) {
      const endpointConfig = await fetchEndpointConfig(baseUrl, deployConfig.oramaCloudAPIKey!, deployConfig.indexId!)

      await createSnapshot(baseUrl, deployConfig.oramaCloudAPIKey!, deployConfig.indexId!, oramaDocs)

      if (deployConfig.type === DeployType.DEFAULT) {
        await deployIndex(baseUrl, deployConfig.oramaCloudAPIKey!, deployConfig.indexId!)
      }
      return endpointConfig
    } else {
      throw new Error('Invalid deploy type')
    }
  } else {
    const db = await create({
      schema: { ...DOCS_PRESET_SCHEMA, version: 'enum' }
    })

    await insertMultiple(db, oramaDocs as any)

    const serializedOrama = JSON.stringify(await save(db))
    const gzipedOrama = gzip(serializedOrama)
    writeFileSync(indexPath(generatedFilesDir, version), gzipedOrama)

    return undefined
  }
}
