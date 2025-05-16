import { useEffect, useState } from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { useColorMode } from '@docusaurus/theme-common'
import { usePluginData } from '@docusaurus/useGlobalData'
import { ungzip } from 'pako'
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
		const searchResponse = await fetch(indexGzipURL);

		if (!searchResponse.ok) {
			const errorText = await searchResponse.text();
			throw new Error(`HTTP error ${searchResponse.status}: ${errorText}`);
		}

		const buffer = await searchResponse.arrayBuffer();
		const deflatedString = ungzip(buffer, { to: 'string' });
		const parsedData = JSON.parse(deflatedString);

		const db = create({
			schema: { ...DOCS_PRESET_SCHEMA, version: 'enum' },
			plugins: getOramaPlugins(plugins)
		});

		const documents: Record<string, unknown>[] = Object.values(parsedData.docs.docs);
		await insertMultiple(db, documents);

		return db;
	} catch (error) {
		console.error('Error loading search index:', error);
		throw error;
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
      let searchBoxBasicConfig = {}
      
      if (isCloudData(oramaData)) {
        searchBoxBasicConfig = {
          index: {
            endpoint: oramaData.indexConfig.endpoint,
            api_key: oramaData.indexConfig.api_key
          }
        }
      } else if (oramaData.oramaDocs) {
        oramaInstance = await createOramaInstance(oramaData.oramaDocs)
        searchBoxBasicConfig = { clientInstance: oramaInstance }
      } else {
        oramaInstance = await getOramaLocalData(indexGzipURL, oramaData.plugins)
        searchBoxBasicConfig = { clientInstance: oramaInstance }
      }
      
      setSearchBoxConfig({
        basic: {
          ...searchBoxBasicConfig,
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
