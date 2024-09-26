import type { AnyOrama, SearchParams, TypedDocument, OramaPluginAsync, PartialSchemaDeep } from '@orama/orama'
import { load as loadModel } from '@tensorflow-models/universal-sentence-encoder'

export type PluginEmbeddingsParams = {
  embeddings: {
    defaultProperty: string
    onInsert?: {
      generate: boolean
      properties: string[]
      verbose?: boolean
    }
  }
}

function getPropertyValue (obj: object, path: string) {
  return path.split('.').reduce((current, key) => 
    current && current[key] !== undefined ? current[key] : undefined, obj
  )
}

function getPropertiesValues(schema: object, properties: string[]) {
  return properties
    .map(prop => getPropertyValue(schema, prop))
    .filter(value => value !== undefined)
    .join('. ')
}

export const embeddingsType = 'vector[512]'

export async function pluginEmbeddings(pluginParams: PluginEmbeddingsParams): Promise<OramaPluginAsync> {
  const model = await loadModel()

  return {
    name: 'orama-plugin-embeddings',

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
        console.log(`Generating embeddings for properties "${properties.join(', ')}": "${values}"`)
      }

      const embeddings = await model.embed(values)

      params[pluginParams.embeddings.defaultProperty] = (await embeddings.data()) as unknown as number[]
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

      const embeddings = await model.embed(params.term) as unknown as number[]

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