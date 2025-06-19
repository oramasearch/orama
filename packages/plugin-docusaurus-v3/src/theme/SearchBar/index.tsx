import React from 'react'
import {useLocation} from '@docusaurus/router'
import {useActiveVersion, useVersions} from '@docusaurus/plugin-content-docs/client'
import {usePluginData} from '@docusaurus/useGlobalData'
import BrowserOnly from '@docusaurus/BrowserOnly';
import {OramaSearchBox, OramaSearchButton} from '@orama/react-components';
import {CollectionManager} from '@orama/core';

import useOrama from './useOrama.js'
import {OramaData} from '../../types.js'
import {getColorMode, getPreferredVersion} from "./utils.js";

const LazyOramaSearchButton: React.LazyExoticComponent<React.ComponentProps<typeof OramaSearchButton>> = React.lazy(() =>
	import('@orama/react-components').then(module => ({default: module.OramaSearchButton}))
);
const LazyOramaSearchBox: React.LazyExoticComponent<React.ComponentProps<typeof OramaSearchBox>> = React.lazy(() =>
	import('@orama/react-components').then(module => ({default: module.OramaSearchBox}))
);

// Add `where` when collectionManager is provided
// Handles different query APIs
function formatSearchParams(
	versionName: string,
	collectionManager: CollectionManager | undefined) {
	if (collectionManager) {
		return {
			version: versionName
		}
	}

	return {
		version: {eq: versionName} as any
	}
}

export function OramaSearchNoDocs() {
	const colorMode = getColorMode()
	const {searchBoxConfig, searchBtnConfig = {}} = useOrama()
	const collectionManager = searchBoxConfig.basic?.collectionManager

	return (
		<React.Suspense fallback={<div>Loading search components...</div>}>
			<React.Fragment>
				<LazyOramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
					{searchBtnConfig?.text || 'Search'}
				</LazyOramaSearchButton>
				<LazyOramaSearchBox
					{...(collectionManager ? {} : searchBoxConfig.basic)}
					{...searchBoxConfig.custom}
					oramaCoreClientInstance={collectionManager}
					colorScheme={colorMode}
					searchParams={{
						where: formatSearchParams('current', collectionManager)
					}}
				/>
			</React.Fragment>
		</React.Suspense>
	)
}

export function OramaSearchWithDocs({pluginId}: { pluginId: string }) {
	const colorMode = getColorMode()
	const {searchBoxConfig, searchBtnConfig} = useOrama()
	const collectionManager = searchBoxConfig.basic?.collectionManager
	const versions = useVersions(pluginId)
	const activeVersion = useActiveVersion(pluginId)
	const preferredVersion = getPreferredVersion(searchBoxConfig.basic.clientInstance)
	const currentVersion = activeVersion || preferredVersion || versions[0]

	const searchParams = {
		...(currentVersion && {
			...formatSearchParams(currentVersion, collectionManager)
		})
	}

	/**
	 * [] SearchBar missing
	 * [] Where clause is not working
	 */

	return (
		<React.Suspense fallback={<div>Loading search components...</div>}>
			<React.Fragment>
				<LazyOramaSearchButton colorScheme={colorMode} className="DocSearch-Button" {...searchBtnConfig}>
					{searchBtnConfig?.text || 'Search'}
				</LazyOramaSearchButton>
				{searchBoxConfig.basic && (
					<LazyOramaSearchBox
						{...(collectionManager ? {} : searchBoxConfig.basic)}
						{...searchBoxConfig.custom}
						oramaCoreClientInstance={collectionManager}
						colorScheme={colorMode}
						searchParams={{
							where: searchParams
						}}
					/>
				)}
			</React.Fragment>
		</React.Suspense>
	)
}

export default function OramaSearchWrapper() {
	const {pathname} = useLocation()
	const {docsInstances}: OramaData = usePluginData('@orama/plugin-docusaurus-v3')
	const pluginId = docsInstances?.filter((id: string) => pathname.includes(id))[0] || docsInstances?.[0]

	return <BrowserOnly fallback={<div>Loading Search...</div>}>
		{() => {
			return pluginId ? <OramaSearchWithDocs pluginId={pluginId}/> : <OramaSearchNoDocs/>
		}}
	</BrowserOnly>
}
