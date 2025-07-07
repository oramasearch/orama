import { AnySchema } from '@orama/orama'

export const restFetcher = async <T = unknown>(url: string, options?: any): Promise<T> => {
  const response = await fetch(url, options)

  if (response.status === 0) {
    throw new Error(`Request failed (network error): ${await response.text()}`)
  } else if (response.status >= 400) {
    const error = new Error(`Request failed (HTTP error ${response.status})}`)
    ;(error as any).response = response

    throw error
  }

  return await response.json()
}

export const postFetcher = async <T = unknown>(url: string, body: any, headers?: any): Promise<T> => {
  return await restFetcher(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

export async function loggedOperation(preMessage: string, fn: () => Promise<any>, postMessage: string) {
  if (preMessage != null) {
    console.debug(preMessage)
  }

  try {
    const response = await fn()

    if (postMessage != null) {
      console.debug(postMessage)
    }

    return response
  } catch (error: any) {
    throw new Error(`Error: ${error.message}`)
  }
}

export async function fetchEndpointConfig(baseUrl: string, APIKey: string, indexId: string) {
  const result = await loggedOperation(
    'Start: Fetch index endpoint config',
    async () =>
      await restFetcher(`${baseUrl}/api/v1/indexes/get-index?id=${indexId}`, {
        headers: {
          Authorization: `Bearer ${APIKey}`
        }
      }),
    'End: Fetch index endpoint config (success)'
  )

  return { endpoint: result?.api_endpoint, public_api_key: result?.api_key }
}

export async function createSnapshot(baseUrl: string, APIKey: string, indexId: string, documents: any[]) {
  await loggedOperation(
    'Start: Create snapshot',
    async () =>
      await postFetcher(`${baseUrl}/api/v1/webhooks/${indexId}/snapshot`, documents, {
        Authorization: `Bearer ${APIKey}`
      }),
    'End: Create snapshot (success)'
  )
}

export async function deployIndex(baseUrl: string, APIKey: string, indexId: string) {
  await loggedOperation(
    'Start: Deploy index',
    async () =>
      await postFetcher(
        `${baseUrl}/api/v1/webhooks/${indexId}/deploy`,
        {},
        {
          Authorization: `Bearer ${APIKey}`
        }
      ),
    'End: Deploy index (success)'
  )
}

export const DOCS_PRESET_SCHEMA: AnySchema = {
  title: 'string',
  content: 'string',
  path: 'string',
  section: 'string',
  category: 'enum',
  version: 'enum'
}
