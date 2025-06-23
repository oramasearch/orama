import React, {useEffect, useState, lazy} from 'react'
import {useLocation} from '@docusaurus/router'
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useActiveVersion, useVersions} from '@docusaurus/plugin-content-docs/client'
import {usePluginData} from '@docusaurus/useGlobalData'
import {CollectionManager} from '@orama/core';

import useOrama from './useOrama.js'
import {OramaData} from '../../types.js'
import {getColorMode, getPreferredVersion} from "./utils.js";

const OramaSearchButton = lazy(() =>
	import('@orama/react-components').then(module => ({
		default: module.OramaSearchButton
	})) as Promise<{ default: React.ComponentType<{ children?: any, colorScheme?: string, className: string }> }>
);

const OramaSearchBox = lazy(() =>
	import('@orama/react-components').then(module => ({
		default: module.OramaSearchBox
	})) as Promise<{ default: React.ComponentType<{ children?: any, oramaCoreClientInstance?: CollectionManager, colorScheme?: string, searchParams: any }> }>
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
	const {searchBoxConfig, searchBtnConfig = {
		text: 'Search'
	}} = useOrama()
	const collectionManager = searchBoxConfig.basic?.collectionManager

	return (
		<React.Fragment>
			<OramaSearchButton
				colorScheme={colorMode}
				className="DocSearch-Button"
				{...searchBtnConfig}
			>
				{searchBtnConfig?.text}
			</OramaSearchButton>
			<OramaSearchBox
				{...(collectionManager ? {} : searchBoxConfig.basic)}
				{...searchBoxConfig.custom}
				oramaCoreClientInstance={collectionManager}
				colorScheme={colorMode}
				searchParams={{
					where: formatSearchParams('current', collectionManager)
				}}
			/>
		</React.Fragment>
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

	return (
		<React.Fragment>
			<OramaSearchButton
				colorScheme={colorMode}
				className="DocSearch-Button"
				{...searchBtnConfig}
			>
				{searchBtnConfig?.text || 'Search'}
			</OramaSearchButton>
			<OramaSearchBox
				{...(collectionManager ? {} : searchBoxConfig.basic)}
				{...searchBoxConfig.custom}
				oramaCoreClientInstance={collectionManager}
				colorScheme={colorMode}
				searchParams={{
					where: searchParams
				}}
			/>
		</React.Fragment>
	)
}

export default function OramaSearchWrapper() {
	const {pathname} = useLocation()
	const {docsInstances}: OramaData = usePluginData('@orama/plugin-docusaurus-v3')
	let pluginId: string | undefined = undefined

	if (docsInstances) {
		pluginId = docsInstances.find((id: string) => pathname.includes(id)) || docsInstances?.[0]
	}

	return <BrowserOnly fallback={<div>Loading Search...</div>}>
		{() => {
			return pluginId ? <OramaSearchWithDocs pluginId={pluginId}/> : <OramaSearchNoDocs/>
		}}
	</BrowserOnly>
}
