//@ts-nocheck
import { useEffect, useState } from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { useColorMode } from '@docusaurus/theme-common'
import { usePluginData } from '@docusaurus/useGlobalData'
import { ungzip } from 'pako'
import { OramaClient } from '@oramacloud/client'
import { create, insertMultiple } from '@orama/orama'
import { pluginAnalytics } from '@orama/plugin-analytics'
import { DOCS_PRESET_SCHEMA } from '../../utils'

export interface PluginData {
  searchData: {
    current: { data: ArrayBuffer } | null
  },
  searchBoxCustomConfig?: { [key:string]: any }
  searchBtnConfig?: { [key:string]: any }
  endpoint: { url: string; key: string } | null
  analytics: { apiKey: string; indexId: string; enabled: boolean } | null
  docsInstances: string[]
}

export const useOrama = () => {
  const [searchBoxConfig, setSearchBoxConfig] = useState({
    basic: null,
    custom: null
  })
  const { colorMode } = useColorMode()
  const { searchData, endpoint, analytics, searchBoxCustomConfig, searchBtnConfig }: PluginData = usePluginData('@orama/plugin-docusaurus-v3') as PluginData

  const baseURL = useBaseUrl('orama-search-index-current.json.gz')
  const isBrowser = useIsBrowser()

  useEffect(() => {
    async function loadOrama() {
      let oramaInstance = null

      if (endpoint?.url) {
        oramaInstance = new OramaClient({
          endpoint: endpoint.url,
          api_key: endpoint.key
        })
      } else {
        let buffer

        if (searchData?.current) {
          buffer = searchData.current.data
        } else {
          const searchResponse = await fetch(baseURL)

          if (searchResponse.status === 0) {
            throw new Error(`Network error: ${await searchResponse.text()}`)
          } else if (searchResponse.status !== 200) {
            throw new Error(`HTTP error ${searchResponse.status}: ${await searchResponse.text()}`)
          }

          buffer = await searchResponse.arrayBuffer()
        }

        const deflated = ungzip(buffer, { to: 'string' })
        const parsedDeflated = JSON.parse(deflated)

        const db = await create({
          schema: { ...DOCS_PRESET_SCHEMA, version: 'enum' },
          plugins: [
            ...(analytics
              ? [
                pluginAnalytics({
                  apiKey: analytics.apiKey,
                  indexId: analytics.indexId,
                  enabled: analytics.enabled
                })
              ]
              : [])
          ]
        })

        await insertMultiple(db, Object.values(parsedDeflated.docs.docs))

        oramaInstance = db
      }

      setSearchBoxConfig({
        basic: {
          clientInstance: oramaInstance,
          facetProperty: 'category',
        },
        custom: searchBoxCustomConfig
      })
    }

    if (!isBrowser) {
      return
    }

    loadOrama().catch((error) => {
      console.error('Cannot load search index.', error)
    })
  }, [isBrowser])

  return { searchBoxConfig, searchBtnConfig, colorMode, clientMode: endpoint?.url ? 'cloud' : 'oss' }
}
