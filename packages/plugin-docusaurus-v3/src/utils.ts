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
    'Orama: Fetch index endpoint config',
    async () =>
      await restFetcher(`${baseUrl}/indexes/get-index?id=${indexId}`, {
        headers: {
          Authorization: `Bearer ${APIKey}`
        }
      }),
    'Orama: Fetch index endpoint config (success)'
  )

  return { endpoint: result?.api_endpoint, public_api_key: result?.api_key }
}

export async function bulkInsert(oramaIndex: any, docs: any[], limit = 50, offset = 0) {
  const chunk = docs.slice(offset, offset + limit)

  if (chunk.length > 0) {
    await loggedOperation(
      `Orama: Start documents insertion (range ${offset + 1}-${offset + chunk.length})`,
      async () => await oramaIndex.insert(docs),
      'Orama: insert created successfully'
    )
    await bulkInsert(oramaIndex, docs, limit, offset + limit)
  }
}

export const DOCS_PRESET_SCHEMA: AnySchema = {
  title: 'string',
  content: 'string',
  path: 'string',
  section: 'string',
  category: 'enum',
  version: 'enum'
}
