import { AnyOrama, create, insertMultiple } from '@orama/orama'
import { IndexConfig, OramaDoc } from './types'
import { DOCS_PRESET_SCHEMA } from './constants'

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

export async function fetchEndpointConfig(baseUrl: string, APIKey: string, indexId: string): Promise<IndexConfig> {
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

  return { endpoint: result?.api_endpoint, api_key: result?.api_key }
}

export async function createOramaInstance(oramaDocs: OramaDoc[]): Promise<AnyOrama> {
  console.debug('Orama: Creating instance.')
  const db = create({
    schema: { ...DOCS_PRESET_SCHEMA, version: 'enum' }
  })

  await insertMultiple(db, oramaDocs as any)

  console.debug('Orama: Instance created.')

  return db
}
