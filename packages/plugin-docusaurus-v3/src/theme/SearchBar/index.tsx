import React from 'react'
import { useLocation } from '@docusaurus/router'
import { useActiveVersion, useVersions } from '@docusaurus/plugin-content-docs/client'
import { useDocsPreferredVersion } from '@docusaurus/theme-common'
import { usePluginData } from '@docusaurus/useGlobalData'
import BrowserOnly from '@docusaurus/BrowserOnly';
import { OramaSearchButton, OramaSearchBox } from '@orama/react-components'; // Imported for type inference
import { CollectionManager } from '@orama/core';

const LazyOramaSearchButton: React.LazyExoticComponent<React.ComponentProps<typeof OramaSearchButton>> = React.lazy(() =>
  import('@orama/react-components').then(module => ({ default: module.OramaSearchButton }))
);
const LazyOramaSearchBox: React.LazyExoticComponent<React.ComponentProps<typeof OramaSearchBox>> = React.lazy(() =>
  import('@orama/react-components').then(module => ({ default: module.OramaSearchBox }))
);

import useOrama from './useOrama.js'
import { OramaData } from '../../types.js'

const collectionId = "o1a6pniok8xff8hw02c8zlvj"
const endpoint = "https://collections.orama.com"
const apiKey = "XpZXhp2MY9l8oVyg0ZVNLoPke7416Ef2"

export function OramaSearchNoDocs() {
  const { searchBoxConfig, searchBtnConfig = {}, colorMode } = useOrama()

  const collectionManager = new CollectionManager({
    url: endpoint,
    collectionID: collectionId,
    readAPIKey: apiKey
  })

  return (
    <div>
      {searchBoxConfig.basic && (
        <BrowserOnly fallback={<div>Loading Search...</div>}>
          {() => (
            <React.Suspense fallback={<div>Loading search components...</div>}>
              <React.Fragment>
                <LazyOramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
                  {searchBtnConfig?.text || 'Search'}
                </LazyOramaSearchButton>
                <LazyOramaSearchBox
                  // {...searchBoxConfig.basic}
                  // {...searchBoxConfig.custom}
                  oramaCoreClientInstance={collectionManager}
                  colorScheme={colorMode}
                  // where={{
                  //   source: 'docusaurus'
                  // }}
                  // searchParams={{
                  //   where: {
                  //     source: 'docusaurus'
                  //   }
                  // }}
                  datasourceIDs={['docusaurus']}
                />
              </React.Fragment>
            </React.Suspense>
          )}
        </BrowserOnly>
      )}
    </div>
  )
}

export function OramaSearchWithDocs({ pluginId }: { pluginId: string }) {
  const versions = useVersions(pluginId)
  const activeVersion = useActiveVersion(pluginId)
  const { preferredVersion } = useDocsPreferredVersion(pluginId) as { preferredVersion: string }
  const currentVersion = activeVersion || preferredVersion || versions[0]
  const { searchBoxConfig, searchBtnConfig, colorMode } = useOrama()

  const collectionManager = new CollectionManager({
    url: endpoint,
    collectionID: collectionId,
    readAPIKey: apiKey
  })

  const searchParams = {
    ...(currentVersion && {
      
    })
  }

  /**
   * [] SearchBar missing
   * [] Where clause is not working
   */

  return (
    <div>
      <BrowserOnly fallback={<div>Loading Search...</div>}>
        {() => (
          <React.Suspense fallback={<div>Loading search components...</div>}>
            <React.Fragment>
              <LazyOramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
                {searchBtnConfig?.otext || 'Search'}
              </LazyOramaSearchButton>
              {searchBoxConfig.basic && (
                <LazyOramaSearchBox
                  // {...searchBoxConfig.basic}
                  // {...searchBoxConfig.custom}
                  oramaCoreClientInstance={collectionManager}
                  colorScheme={colorMode}
                  // searchParams={{
                  //   where: {
                  //     source: 'docusaurus'
                  //   },
                  // }}
                  where={{
                    source: 'docusaurus'
                  }}
                  datasourceIDs={['docusaurus']}
                />
              )}
            </React.Fragment>
          </React.Suspense>
        )}
      </BrowserOnly>
    </div>
  )
}

export default function OramaSearchWrapper() {
  const { pathname } = useLocation()
  const { docsInstances }: OramaData = usePluginData('@orama/plugin-docusaurus-v3')
  const pluginId = docsInstances?.filter((id: string) => pathname.includes(id))[0] || docsInstances?.[0]

  if (!pluginId) {
    return <OramaSearchNoDocs />
  }

  return <OramaSearchWithDocs pluginId={pluginId} />
}