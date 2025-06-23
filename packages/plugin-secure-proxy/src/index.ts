import type { AnyOrama, SearchParams, TypedDocument, OramaPluginSync, PartialSchemaDeep } from '@orama/orama'
import { OramaProxy, EmbeddingModel, ChatModel } from '@oramacloud/client'

export type SecureProxyExtra = {
  proxy: OramaProxy
  pluginParams: SecureProxyPluginOptions
}

export type LLMModel = ChatModel

export type SecureProxyPluginOptions = {
  apiKey: string
  embeddings: {
    defaultProperty: string
    model: EmbeddingModel
    onInsert?: {
      generate: boolean
      properties: string[]
      verbose?: boolean
    }
  }
  chat?: {
    model: LLMModel
  }
}

function getPropertyValue(obj: object, path: string) {
  return path
    .split('.')
    .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj)
}

function getPropertiesValues(schema: object, properties: string[]) {
  return properties
    .map((prop) => getPropertyValue(schema, prop))
    .filter((value) => value !== undefined)
    .join('. ')
}

export function pluginSecureProxy(pluginParams: SecureProxyPluginOptions): OramaPluginSync<SecureProxyExtra> {
  if (!pluginParams.apiKey) throw new Error('Missing "apiKey" parameter for plugin-secure-proxy')
  if (!pluginParams.embeddings.defaultProperty)
    throw new Error('Missing "embeddings.defaultProperty" parameter for plugin-secure-proxy')
  if (!pluginParams.embeddings.model) throw new Error('Missing "embeddings.model" parameter for plugin-secure-proxy')

  const proxy = new OramaProxy({
    api_key: pluginParams.apiKey
  })

  return {
    name: 'orama-secure-proxy',
    extra: {
      proxy,
      pluginParams
    },

    async beforeInsert<T extends TypedDocument<any>>(_db: AnyOrama, _id: string, params: PartialSchemaDeep<T>) {
      if (!pluginParams.embeddings?.onInsert?.generate) {
        return
      }

      if (!pluginParams.embeddings?.onInsert?.properties) {
        throw new Error('Missing "embeddingsConfig.properties" parameter for plugin-secure-proxy')
      }

      const properties = pluginParams.embeddings.onInsert.properties
      const values = getPropertiesValues(params, properties)

      if (pluginParams.embeddings.onInsert.verbose) {
        console.log(`Generating embeddings for properties ${properties.join(', ')}: ${values}`)
      }

      const embeddings = await proxy.generateEmbeddings(values, pluginParams.embeddings.model)

      params[pluginParams.embeddings.defaultProperty] = embeddings
    },

    async beforeSearch<T extends AnyOrama>(_db: AnyOrama, params: SearchParams<T, TypedDocument<any>>) {
      if (params.mode !== 'vector' && params.mode !== 'hybrid') {
        return
      }

      if (params?.vector?.value) {
        return
      }

      if (!params.term) {
        throw new Error('Neither "term" nor "vector" parameters were provided')
      }

      const term = params.term
      const embeddings = await proxy.generateEmbeddings(term, pluginParams.embeddings.model)

      if (!params.vector) {
        params.vector = {
          // eslint-disable-next-line
          // @ts-ignore
          property: params?.vector?.property ?? pluginParams.embeddings.defaultProperty,
          value: embeddings
        }
      }

      params.vector.value = embeddings
    }
  }
}
