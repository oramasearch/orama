import { useActivePlugin } from '@docusaurus/plugin-content-docs/client'
import { ReactContextError, useDocsPreferredVersion } from '@docusaurus/theme-common'

export function getColorMode() {
  if (typeof document === 'undefined') {
    return 'light'
  }
  const html = document.querySelector('html')
  return html?.dataset.theme
}

export function getPreferredVersion(index: unknown) {
  const activePlugin = useActivePlugin()

  try {
    const { preferredVersion } = useDocsPreferredVersion(activePlugin?.pluginId ?? 'default') as {
      preferredVersion: { name: string }
    }

    if (!preferredVersion) {
      throw new ReactContextError('Not using versioned docs')
    }

    return preferredVersion.name
  } catch (e: unknown) {
    if (index) {
      if (e instanceof ReactContextError) {
        return 'current'
      } else {
        throw e
      }
    }

    return null
  }
}
