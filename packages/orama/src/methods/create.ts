import { formatElapsedTime, getDocumentIndexId, getDocumentProperties, validateSchema } from '../components/defaults.js'
import { DocumentsStore, createDocumentsStore } from '../components/documents-store.js'
import { AVAILABLE_PLUGIN_HOOKS, getAllPluginsByHook } from '../components/plugins.js'
import { FUNCTION_COMPONENTS, OBJECT_COMPONENTS, runAfterCreate } from '../components/hooks.js'
import { Index, createIndex } from '../components/index.js'
import { createInternalDocumentIDStore } from '../components/internal-document-id-store.js'
import { Sorter, createSorter } from '../components/sorter.js'
import { createTokenizer } from '../components/tokenizer/index.js'
import { createPinning } from '../components/pinning.js'
import { createError } from '../errors.js'
import {
  AnySchema,
  Components,
  FunctionComponents,
  IDocumentsStore,
  IIndex,
  ISorter,
  ObjectComponents,
  Orama,
  OramaPlugin,
  SorterConfig,
  Tokenizer
} from '../types.js'
import { uniqueId } from '../utils.js'

interface CreateArguments<OramaSchema, TIndex, TDocumentStore, TSorter, TPinning> {
  schema: OramaSchema
  sort?: SorterConfig
  language?: string
  components?: Components<
    Orama<OramaSchema, TIndex, TDocumentStore, TSorter, TPinning>,
    OramaSchema,
    TIndex,
    TDocumentStore,
    TSorter,
    TPinning
  >
  plugins?: OramaPlugin[]
  id?: string
}

function validateComponents<
  OramaSchema,
  TIndex,
  TDocumentStore,
  TSorter,
  TPinning,
  TOrama extends Orama<OramaSchema, TIndex, TDocumentStore, TSorter, TPinning>
>(components: Components<TOrama, OramaSchema, TIndex, TDocumentStore, TSorter, TPinning>) {
  const defaultComponents = {
    formatElapsedTime,
    getDocumentIndexId,
    getDocumentProperties,
    validateSchema
  }

  for (const rawKey of FUNCTION_COMPONENTS) {
    const key = rawKey as keyof FunctionComponents<OramaSchema>

    if (components[key]) {
      if (typeof components[key] !== 'function') {
        throw createError('COMPONENT_MUST_BE_FUNCTION', key)
      }
    } else {
      components[key] = defaultComponents[key] as any
    }
  }

  for (const rawKey of Object.keys(components)) {
    if (!OBJECT_COMPONENTS.includes(rawKey) && !FUNCTION_COMPONENTS.includes(rawKey)) {
      throw createError('UNSUPPORTED_COMPONENT', rawKey)
    }
  }
}

export function create<
  OramaSchema extends AnySchema,
  TIndex = IIndex<Index>,
  TDocumentStore = IDocumentsStore<DocumentsStore>,
  TSorter = ISorter<Sorter>,
  TPinning = any
>({
  schema,
  sort,
  language,
  components,
  id,
  plugins
}: CreateArguments<OramaSchema, TIndex, TDocumentStore, TSorter, TPinning>): Orama<
  OramaSchema,
  TIndex,
  TDocumentStore,
  TSorter,
  TPinning
> {
  if (!components) {
    components = {}
  }

  for (const plugin of plugins ?? []) {
    if (!('getComponents' in plugin)) {
      continue
    }
    if (typeof plugin.getComponents !== 'function') {
      continue
    }

    const pluginComponents = plugin.getComponents(schema) as Partial<
      ObjectComponents<TIndex, TDocumentStore, TSorter, TPinning>
    >

    const keys = Object.keys(pluginComponents)
    for (const key of keys) {
      if (components![key]) {
        throw createError('PLUGIN_COMPONENT_CONFLICT', key, plugin.name)
      }
    }
    components = {
      ...components,
      ...pluginComponents
    }
  }

  if (!id) {
    id = uniqueId()
  }

  let tokenizer = components.tokenizer
  let index: TIndex | undefined = components.index
  let documentsStore: TDocumentStore | undefined = components.documentsStore
  let sorter: TSorter | undefined = components.sorter
  let pinning = components.pinning

  if (!tokenizer) {
    // Use the default tokenizer
    tokenizer = createTokenizer({ language: language ?? 'english' })
  } else if (!(tokenizer as Tokenizer).tokenize) {
    // If there is no tokenizer function, we assume this is a TokenizerConfig
    tokenizer = createTokenizer(tokenizer)
  } else {
    const customTokenizer = tokenizer as Tokenizer
    tokenizer = customTokenizer
  }

  if (components.tokenizer && language) {
    // Accept language only if a tokenizer is not provided
    throw createError('NO_LANGUAGE_WITH_CUSTOM_TOKENIZER')
  }

  const internalDocumentStore = createInternalDocumentIDStore()

  index ||= createIndex() as TIndex
  sorter ||= createSorter() as TSorter
  documentsStore ||= createDocumentsStore() as TDocumentStore
  pinning ||= createPinning() as any

  // Validate all other components
  validateComponents(components)

  // Assign only recognized components and hooks
  const { getDocumentProperties, getDocumentIndexId, validateSchema, formatElapsedTime } = components

  const orama = {
    data: {},
    caches: {},
    schema,
    tokenizer,
    index,
    sorter,
    documentsStore,
    pinning,
    internalDocumentIDStore: internalDocumentStore,
    getDocumentProperties,
    getDocumentIndexId,
    validateSchema,
    beforeInsert: [],
    afterInsert: [],
    beforeRemove: [],
    afterRemove: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeUpsert: [],
    afterUpsert: [],
    beforeSearch: [],
    afterSearch: [],
    beforeInsertMultiple: [],
    afterInsertMultiple: [],
    beforeRemoveMultiple: [],
    afterRemoveMultiple: [],
    beforeUpdateMultiple: [],
    afterUpdateMultiple: [],
    beforeUpsertMultiple: [],
    afterUpsertMultiple: [],
    afterCreate: [],
    formatElapsedTime,
    id,
    plugins,
    version: getVersion()
  } as unknown as Orama<OramaSchema, TIndex, TDocumentStore, TSorter, TPinning>

  orama.data = {
    index: orama.index.create(orama, internalDocumentStore, schema),
    docs: orama.documentsStore.create(orama, internalDocumentStore),
    sorting: orama.sorter.create(orama, internalDocumentStore, schema, sort),
    pinning: orama.pinning.create(internalDocumentStore)
  }

  for (const hook of AVAILABLE_PLUGIN_HOOKS) {
    orama[hook] = (orama[hook] ?? []).concat(getAllPluginsByHook(orama, hook))
  }

  const afterCreate = orama['afterCreate']
  if (afterCreate) {
    runAfterCreate(afterCreate, orama)
  }

  return orama
}

function getVersion() {
  return '{{VERSION}}'
}
