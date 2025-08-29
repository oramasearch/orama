import { parseMarkdownHeadingId, writeMarkdownHeadingId } from '@docusaurus/utils'
import type { Plugin } from '@docusaurus/types'
import type { LoadContext } from '@docusaurus/types';
import { readFileSync, writeFileSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzip } from 'pako'
import { AnyOrama, create, insertMultiple, save } from '@orama/orama'
import { CloudManager } from '@oramacloud/client'
import { JSDOM } from 'jsdom'
import MarkdownIt from 'markdown-it'
import matter from 'gray-matter'

import { createOramaInstance, fetchEndpointConfig, loggedOperation } from './utils.js'
import { CloudConfig, DeployType, IndexConfig, OramaData, OramaDoc, PluginOptions } from './types.js'

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

async function syncOramaIndex({
  oramaDocs,
  cloudConfig
}: {
  oramaDocs: OramaDoc[]
  cloudConfig: CloudConfig
}): Promise<IndexConfig> {
  const { apiKey, indexId, deploy, collectionId } = cloudConfig

  if(!collectionId) { // NOTE: lack of collectionId means legacy Orama
    const baseUrl = process.env.ORAMA_CLOUD_BASE_URL || 'https://cloud.oramasearch.com/api/v1'

    const cloudManager = new CloudManager({
      api_key: apiKey!,
      baseURL: baseUrl
    })

    const index = cloudManager.index(indexId)

    const endpointConfig = await fetchEndpointConfig(baseUrl, apiKey, indexId)

    if (deploy) {
      await loggedOperation('Orama: Reset index data', async () => await index.empty(), 'Orama: Index data reset')
      await insertChunkDocumentsIntoIndex(index, oramaDocs)

      if (cloudConfig.deploy === DeployType.DEFAULT) {
        await loggedOperation('Orama: Start deployment', async () => await index.deploy(), 'Orama: Deployment started.')
      }
    }

    // TODO: redo deploy for OramaCore
    return {
      ...endpointConfig,
      collection_id: collectionId
    }
  }

  return {
    api_key: apiKey,
    endpoint: 'https://collections.orama.com',
    collection_id: collectionId
  }
}

export async function insertChunkDocumentsIntoIndex(oramaIndex: any, docs: any[], limit = 50, offset = 0) {
  const chunk = docs.slice(offset, offset + limit)

  if (chunk.length > 0) {
    await loggedOperation(
      `Orama: Start documents insertion (range ${offset + 1}-${offset + chunk.length})`,
      async () => await oramaIndex.insert(chunk),
      'Orama: insert created successfully'
    )
    await insertChunkDocumentsIntoIndex(oramaIndex, docs, limit, offset + limit)
  }
}

async function createOramaGzip({
  oramaInstance,
  context
}: {
  oramaInstance: AnyOrama
  context: LoadContext
}) {
  console.debug('Orama: Creating gzipped index file.')

  const version = 'current'
  const serializedOrama = JSON.stringify(save(oramaInstance))
  const gzippedOrama = gzip(serializedOrama)
  writeFileSync(indexPath(context.generatedFilesDir, version), gzippedOrama)

  console.debug('Orama: Gzipped index file created.')
}

async function fetchOramaDocs(
  searchDataConfig: {
    docs?: any
    pages?: any
    blogs?: any
  }[],
  context: LoadContext
) {
  let versions: string[] = []
  const docsInstances: string[] = []
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
                  siteDir: context.siteDir,
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
                siteDir: context.siteDir,
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
                siteDir: context.siteDir,
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

  const oramaDocs: OramaDoc[] = (await Promise.all(allOramaDocsPromises)).flat().reduce((acc, curr) => {
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

  return { oramaDocs, versions, docsInstances }
}

function validateCloudConfiguration(cloudConfig: CloudConfig) {
  let isValid = true

  const { indexId, apiKey, deploy, collectionId } = cloudConfig

  if (!indexId && !collectionId) {
    console.error('Orama: Either indexId or collection are mandatory in cloud configuration.')
    isValid = false
  }

  if (!apiKey) {
    console.error('Orama: Missing apiKey in cloud configuration.')
    isValid = false
  }

  if (deploy && !Object.values(DeployType).includes(deploy)) {
    console.error('Orama: Invalid deploy type in cloud configuration.')
    isValid = false
  }

  if (!isValid) {
    throw new Error('Orama: Invalid cloud configuration.')
  }

  return isValid
}

export default function OramaPluginDocusaurus(context: LoadContext, options: PluginOptions): Plugin {
  return {
    name: '@orama/plugin-docusaurus-v3',

    configureWebpack(config, isServer, utils) {
      return {}
    },

    getThemePath() {
      return '../dist/theme'
    },

    getTypeScriptThemePath() {
      return '../src/theme'
    },

    getClientModules() {
      return ['../dist/theme/SearchBar/index.css']
    },

    async allContentLoaded({ actions, allContent }) {
      const { cloud: cloudConfig, ...otherOptions } = options
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

      const { oramaDocs, versions, docsInstances } = await fetchOramaDocs(searchDataConfig, context)

      if (cloudConfig) {
        validateCloudConfiguration(cloudConfig)

        const indexConfig = await syncOramaIndex({
          oramaDocs,
          cloudConfig
        })

        actions.setGlobalData({
          oramaMode: 'cloud',
          indexConfig,
          docsInstances,
          ...otherOptions
        } as OramaData)
      } else {
        const oramaInstance = await createOramaInstance(oramaDocs)

        await createOramaGzip({ oramaInstance, context })

        actions.setGlobalData({
          oramaMode: 'oss',
          oramaDocs,
          availableVersions: versions,
          docsInstances,
          ...otherOptions
        } as OramaData)
      }
    },

    async postBuild({ outDir }) {
      !options.cloud && (await cp(indexPath(context.generatedFilesDir, 'current'), indexPath(outDir, 'current')))
    }
  }
}
