import React from 'react'
import { useLocation } from '@docusaurus/router'
import { useActiveVersion, useVersions } from '@docusaurus/plugin-content-docs/client'
import { useDocsPreferredVersion } from '@docusaurus/theme-common'
import { usePluginData } from '@docusaurus/useGlobalData'
import { OramaSearchBox, OramaSearchButton } from '@orama/react-components'

import useOrama from './useOrama'
import { OramaData } from '../../types'

export function OramaSearchNoDocs() {
  const { searchBoxConfig, searchBtnConfig = {}, colorMode } = useOrama()

  return (
    <div>
      {searchBoxConfig.basic && (
        <>
          <OramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
            {searchBtnConfig?.text || 'Search'}
          </OramaSearchButton>
          <OramaSearchBox
            {...searchBoxConfig.basic}
            {...searchBoxConfig.custom}
            colorScheme={colorMode}
            searchParams={{
              where: {
                version: { eq: 'current' } as any
              }
            }}
          />
        </>
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

  const searchParams = {
    ...(currentVersion && {
      where: {
        version: { eq: currentVersion.name }
      }
    })
  }

  return (
    <div>
      <OramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
        {searchBtnConfig?.text || 'Search'}
      </OramaSearchButton>
      {searchBoxConfig.basic && (
        <OramaSearchBox
          {...searchBoxConfig.basic}
          {...searchBoxConfig.custom}
          colorScheme={colorMode}
          searchParams={searchParams}
        />
      )}
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
