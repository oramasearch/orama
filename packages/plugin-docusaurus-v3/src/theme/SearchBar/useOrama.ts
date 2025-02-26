import { useEffect, useState } from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { useColorMode } from '@docusaurus/theme-common'
import { usePluginData } from '@docusaurus/useGlobalData'
import { ungzip } from 'pako'
import { OramaClient } from '@oramacloud/client'
import { create, insertMultiple } from '@orama/orama'
import { pluginAnalytics } from '@orama/plugin-analytics'

import { DOCS_PRESET_SCHEMA } from '../../constants'
import type { OramaCloudData, OramaData, OramaPlugins } from '../../types'
import { createOramaInstance } from '../../utils'

function getOramaPlugins(plugins: OramaPlugins | undefined): any[] {
  const pluginsArray = []

  if (plugins?.analytics) {
    pluginsArray.push(
      pluginAnalytics({
        apiKey: plugins.analytics.apiKey,
        indexId: plugins.analytics.indexId,
        enabled: plugins.analytics.enabled
      })
    )
  }

  return pluginsArray
}

async function getOramaLocalData(indexGzipURL: string, plugins: OramaPlugins | undefined) {
  try {
    const searchResponse = await fetch(indexGzipURL)
    let buffer

    if (searchResponse.status === 0) {
      throw new Error(`Network error: ${await searchResponse.text()}`)
    } else if (searchResponse.status !== 200) {
      throw new Error(`HTTP error ${searchResponse.status}: ${await searchResponse.text()}`)
    }

    buffer = await searchResponse.arrayBuffer()

    const deflated = ungzip(buffer, { to: 'string' })
    const parsedDeflated = JSON.parse(deflated)

    const db = create({
      schema: { ...DOCS_PRESET_SCHEMA, version: 'enum' },
      plugins: getOramaPlugins(plugins)
    })

    await insertMultiple(db, Object.values(parsedDeflated.docs.docs))

    return db
  } catch (e: any) {
    console.error('Error loading search index', e)
    throw e
  }
}

function isCloudData(data: OramaData): data is OramaCloudData {
  return data.oramaMode === 'cloud'
}

export default function useOrama() {
  const [searchBoxConfig, setSearchBoxConfig] = useState<{
    basic: Record<string, any>
    custom: Record<string, any>
  }>({
    basic: {},
    custom: {}
  })
  const { colorMode } = useColorMode()
  const oramaData: OramaData = usePluginData('@orama/plugin-docusaurus-v3') as OramaData

  const indexGzipURL = useBaseUrl('orama-search-index-current.json.gz')
  const isBrowser = useIsBrowser()

  useEffect(() => {
    async function loadOrama() {
      let oramaInstance

      if (isCloudData(oramaData)) {
        oramaInstance = new OramaClient(oramaData.indexConfig)
      } else if (oramaData.oramaDocs) {
        oramaInstance = await createOramaInstance(oramaData.oramaDocs)
      } else {
        oramaInstance = await getOramaLocalData(indexGzipURL, oramaData.plugins)
      }

      setSearchBoxConfig({
        basic: {
          clientInstance: oramaInstance,
          facetProperty: 'category',
          disableChat: !isCloudData(oramaData)
        },
        custom: oramaData.searchbox ?? {}
      })
    }

    if (!isBrowser) {
      return
    }

    loadOrama().catch((error) => {
      console.error('Cannot load search index.', error)
    })
  }, [isBrowser])

  return { searchBoxConfig, searchBtnConfig: oramaData.searchButton, colorMode }
}
