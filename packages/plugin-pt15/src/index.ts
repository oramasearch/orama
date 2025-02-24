import type {
  AnyOrama,
  SearchableType,
  IIndex,
  SearchableValue,
  Tokenizer,
  OnlyStrings,
  FlattenSchemaProperty,
  TokenScore,
  WhereCondition,
  OramaPluginSync,
  AnySchema,
  ObjectComponents,
  BM25Params
} from '@orama/orama'
import { index as Index, internalDocumentIDStore } from '@orama/orama/components'
import {
  PT15IndexStore,
  insertString,
  recursiveCreate,
  PositionsStorage,
  searchString,
  removeString
} from './algorithm.js'

type InternalDocumentID = internalDocumentIDStore.InternalDocumentID
type InternalDocumentIDStore = internalDocumentIDStore.InternalDocumentIDStore
type DocumentID = internalDocumentIDStore.DocumentID

export function pluginPT15(): OramaPluginSync {
  return {
    name: 'orama-plugin-pt15',

    getComponents: function getComponents(schema: AnySchema) {
      return createComponents(schema)
    }
  }
}

function createComponents(schema: AnySchema): Partial<ObjectComponents<any, any, any>> {
  return {
    index: {
      create: function create() {
        const indexDatastore: PT15IndexStore = {
          indexes: {},
          vectorIndexes: {},
          searchableProperties: [],
          searchablePropertiesWithTypes: {}
        }

        recursiveCreate(indexDatastore, schema, '')

        return indexDatastore
      },
      insert: function insert(
        implementation: IIndex<PT15IndexStore>,
        indexDatastorage: PT15IndexStore,
        prop: string,
        id: DocumentID,
        internalId: InternalDocumentID,
        value: SearchableValue,
        schemaType: SearchableType,
        language: string | undefined,
        tokenizer: Tokenizer,
        docsCount: number
      ) {
        if (!(schemaType === 'string' || schemaType === 'string[]')) {
          return Index.insert(
            implementation as unknown as IIndex<Index.Index>,
            indexDatastorage as unknown as Index.Index,
            prop,
            id,
            internalId,
            value,
            schemaType,
            language,
            tokenizer,
            docsCount
          )
        }

        const storage = indexDatastorage.indexes[prop].node as PositionsStorage

        if (Array.isArray(value)) {
          for (const item of value) {
            insertString(item as string, storage, prop, internalId, language, tokenizer)
          }
        } else {
          insertString(value as string, storage, prop, internalId, language, tokenizer)
        }
      },
      // remove: <T extends I>(implementation: IIndex<T>, index: T, prop: string, id: DocumentID, value: SearchableValue, schemaType: SearchableType, language: string | undefined, tokenizer: Tokenizer, docsCount: number) => SyncOrAsyncValue<boolean>;
      remove: function remove(
        implementation: IIndex<PT15IndexStore>,
        indexDatastorage: PT15IndexStore,
        prop: string,
        id: DocumentID,
        internalId: InternalDocumentID,
        value: SearchableValue,
        schemaType: SearchableType,
        language: string | undefined,
        tokenizer: Tokenizer,
        docsCount: number
      ) {
        if (!(schemaType === 'string' || schemaType === 'string[]')) {
          return Index.remove(
            implementation as IIndex<Index.Index>,
            indexDatastorage as Index.Index,
            prop,
            id,
            internalId,
            value,
            schemaType,
            language,
            tokenizer,
            docsCount
          )
        }

        const storage = indexDatastorage.indexes[prop].node as PositionsStorage

        if (Array.isArray(value)) {
          for (const item of value) {
            removeString(item as string, storage, prop, internalId, tokenizer, language)
          }
        } else {
          removeString(value as string, storage, prop, internalId, tokenizer, language)
        }

        return true
      },
      insertDocumentScoreParameters: () => {
        throw new Error()
      },
      insertTokenScoreParameters: () => {
        throw new Error()
      },
      removeDocumentScoreParameters: () => {
        throw new Error()
      },
      removeTokenScoreParameters: () => {
        throw new Error()
      },
      calculateResultScores: () => {
        throw new Error()
      },
      search: function search<T extends AnyOrama>(
        index: PT15IndexStore,
        term: string,
        tokenizer: Tokenizer,
        language: string | undefined,
        propertiesToSearch: string[],
        exact: boolean,
        tolerance: number,
        boost: Partial<Record<OnlyStrings<FlattenSchemaProperty<T>[]>, number>>,
        relevance: Required<BM25Params>,
        docsCount: number,
        whereFiltersIDs: Set<InternalDocumentID> | undefined
      ): TokenScore[] {
        if (tolerance !== 0) {
          throw new Error('Tolerance not implemented yet')
        }
        if (exact === true) {
          throw new Error('Exact not implemented yet')
        }

        const maps: Map<number, number>[] = []
        const propertyLength = propertiesToSearch.length
        let max = {
          score: -Infinity,
          id: -1
        }
        for (let i = 0; i < propertyLength; i++) {
          const property = propertiesToSearch[i]
          const storage = index.indexes[property].node as PositionsStorage
          const boostPerProp = boost[property] ?? 1
          const map = searchString(tokenizer, term, storage, boostPerProp, whereFiltersIDs)
          if (map.size > max.score) {
            max = {
              score: map.size,
              id: i
            }
          }
          maps.push(map)
        }

        if (maps.length === 1) {
          return Array.from(maps[0])
        }

        const base = maps[max.id]
        for (let i = 0; i < maps.length; i++) {
          if (i === max.id) {
            continue
          }

          const map = maps[i]
          for (const [id, score] of map) {
            if (base.has(id)) {
              base.set(id, base.get(id)! + score)
            } else {
              base.set(id, score)
            }
          }
        }

        return Array.from(base)
      },
      searchByWhereClause: function searchByWhereClause<T extends AnyOrama>(
        index: PT15IndexStore,
        tokenizer: Tokenizer,
        filters: Partial<WhereCondition<T['schema']>>,
        language: string | undefined
      ) {
        const stringFiltersList = Object.entries(filters).filter(
          ([propName]) => index.indexes[propName].type === 'Position'
        )

        // PT15 doen't support string filters.
        // this plugin doesn't distringuish between prefix and exact match.
        if (stringFiltersList.length !== 0) {
          throw new Error('String filters are not supported')
        }

        return Index.searchByWhereClause(index as Index.Index, tokenizer, filters, language)
      },
      getSearchableProperties: function getSearchableProperties(index: PT15IndexStore): string[] {
        return index.searchableProperties
      },
      getSearchablePropertiesWithTypes: function (index: PT15IndexStore) {
        return index.searchablePropertiesWithTypes
      },
      load: function load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): PT15IndexStore {
        const dump1 = Index.load(sharedInternalDocumentStore, raw[0])
        const dump2 = raw[1]
        return {
          ...dump1,
          indexes: {
            ...Object.fromEntries(dump2),
            ...dump1.indexes
          } as PT15IndexStore['indexes']
        }
      },
      save: function save<R = unknown>(index: PT15IndexStore): R {
        const baseIndex = index as unknown as Index.Index
        const nonStringIndexes = Object.entries(index.indexes).filter(([, { type }]) => type !== 'Position')
        const dump1 = Index.save({
          ...baseIndex,
          indexes: Object.fromEntries(nonStringIndexes) as Index.Index['indexes']
        })

        const stringIndexes = Object.entries(index.indexes).filter(([, { type }]) => type === 'Position')

        return [dump1, stringIndexes] as unknown as R
      }
    }
  }
}
