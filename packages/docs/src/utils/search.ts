import type { OramaClient } from '@oramacloud/client'

export function getCurrentCategory() {
  const url = new URL(window.location.href).pathname

  if (url.startsWith('/cloud')) return 'Cloud'
  if (url.startsWith('/open-source')) return 'Open Source'

  return null
}

export function getOramaUserId() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const cookies = document.cookie.split(';')
  const oid = cookies.find((cookie) => cookie.trim().startsWith('oid='))

  if (oid) {
    return oid.split('=')[1]
  }

  return undefined
}

export function userSessionRefresh(
  client: OramaClient,
  userId: string | undefined,
  updateCallback: (userId: string | undefined) => void
) {
  const currentUserId = getOramaUserId()
  if (currentUserId !== userId) {
    console.warn('User ID changed:', currentUserId)
    client.reset()
    updateCallback(currentUserId)
  }
}

export function searchSessionTracking(client: OramaClient, userId: string) {
  if (!window?.posthog) return
  try {
    if (userId) {
      // TODO: remove this console.log
      console.log('Identifying user with Cookie ID:', userId)
      client.identify(userId)
    } else {
      // TODO: remove this console.log
      console.log('Identifying session with PostHog:', window.posthog.get_distinct_id())
      client.alias(window.posthog.get_distinct_id())
    }
  } catch (error) {
    console.log(`Error setting identity: ${error}`)
  }
}
