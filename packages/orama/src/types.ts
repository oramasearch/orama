import type { InsertOptions } from './methods/insert.js'
import { MODE_FULLTEXT_SEARCH, MODE_HYBRID_SEARCH, MODE_VECTOR_SEARCH } from './constants.js'
import { DocumentsStore } from './components/documents-store.js'
import { Index, TTree } from './components/index.js'
import { DocumentID, InternalDocumentID, InternalDocumentIDStore } from './components/internal-document-id-store.js'
import { Sorter } from './components/sorter.js'
import { Language } from './components/tokenizer/languages.js'
import { Point } from './trees/bkd.js'
import { VectorIndex, VectorType } from './trees/vector.js'

export type {
  IAnswerSessionConfig,
  AnswerSession,
  AnswerSessionEvents,
  AskParams,
  GenericContext,
  Interaction,
  Message,
  MessageRole,
  RegenerateLastParams
} from './methods/answer-session.js'

export { MODE_FULLTEXT_SEARCH, MODE_HYBRID_SEARCH, MODE_VECTOR_SEARCH } from './constants.js'

export type { DefaultTokenizer } from './components/tokenizer/index.js'

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type SingleOrArray<T> = T | T[]

export type SyncOrAsyncValue<T = void> = T | PromiseLike<T>

export type HybridWeights = {
  text: number
  vector: number
}

// Given a type T, return a new type with:
// - the concatenation of nested properties as key
// - the type of the nested property as value
type Flatten<T extends object> = object extends T
  ? object
  : {
        [K in keyof T]-?: (
          // Create a function as argument:
          // - Pick<T, K> if the value is not an object (not run recursion)
          // - { [key concatenation]: function calculated by recursion }
          // - never is the value is an array
          x: NonNullable<T[K]> extends infer V
            ? V extends object
              ? V extends readonly any[]
                ? never // Orama schema doens't allow array as value
                : Flatten<V> extends infer FV
                  ? {
                      [P in keyof FV as `${Extract<K, string>}.${Extract<P, string>}`]: FV[P]
                    }
                  : never // Never happen: it is needed due to `extends` typescript syntax
              : Pick<T, K>
            : never // Never happen: it is needed due to typescript syntax
        ) => void
      } extends Record<keyof T, (y: infer O) => void>
    ? O // Return the type of the function argument
    : never // Never happen: it is needed due to typescript syntax

export type SchemaTypes<Value> = Value extends 'string'
  ? string
  : Value extends 'string[]'
    ? string[]
    : Value extends 'boolean'
      ? boolean
      : Value extends 'boolean[]'
        ? boolean[]
        : Value extends 'number'
          ? number
          : Value extends 'number[]'
            ? number[]
            : Value extends 'enum'
              ? string | number
              : Value extends 'enum[]'
                ? (string | number)[]
                : Value extends 'geopoint'
                  ? Point
                  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    Value extends `vector[${number}]`
                    ? number[]
                    : Value extends object
                      ? { [Key in keyof Value]: SchemaTypes<Value[Key]> } & {
                          [otherKeys: PropertyKey]: any
                        }
                      : never

export type Schema<TSchema> = TSchema extends AnySchema
  ? InternalTypedDocument<{
      -readonly [Key in keyof TSchema]: SchemaTypes<TSchema[Key]>
    }>
  : never

export type AnyDocument = InternalTypedDocument<any>

export type InternalTypedDocument<TSchema extends object> = { id: DocumentID } & TSchema & {
    [otherKeys: PropertyKey]: any
  }
export type TypedDocument<T extends AnyOrama> = T['typeSchema']

export type AnySchema = {
  [key: PropertyKey]: SearchableType | AnySchema
}

export type PartialSchemaDeepObject<T> = T extends object
  ? {
      [K in keyof T]?: T[K]
    }
  : T

export type PartialSchemaDeep<T> = {
  [K in keyof T]?: PartialSchemaDeepObject<T[K]>
}

/**
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Document extends Record<string, SearchableValue | Document | unknown> {}

export type Vector = `vector[${number}]`

export type ScalarSearchableType = 'string' | 'number' | 'boolean' | 'enum' | 'geopoint'
export type ArraySearchableType = 'string[]' | 'number[]' | 'boolean[]' | 'enum[]' | Vector

export type SearchableType = ScalarSearchableType | ArraySearchableType

export type ScalarSearchableValue = string | number | boolean | Point
export type ArraySearchableValue = string[] | number[] | boolean[] | VectorType
export type SearchableValue = ScalarSearchableValue | ArraySearchableValue

export type SortType = 'string' | 'number' | 'boolean'
export type SortValue = string | number | boolean

export type BM25Params = {
  k?: number
  b?: number
  d?: number
}

export type GenericSorting = 'asc' | 'desc' | 'ASC' | 'DESC'

export type FacetSorting = GenericSorting

export interface StringFacetDefinition {
  limit?: number
  offset?: number
  sort?: FacetSorting
}

export interface NumberFacetDefinition {
  ranges: { from: number; to: number }[]
}

export interface BooleanFacetDefinition {
  true?: boolean
  false?: boolean
}

export type FacetsParams<T extends AnyOrama> = Partial<Record<LiteralUnion<T['schema']>, FacetDefinition>>

export type FacetDefinition = StringFacetDefinition | NumberFacetDefinition | BooleanFacetDefinition

export type ReduceFunction<T, R> = (values: ScalarSearchableValue[], acc: T, value: R, index: number) => T
export type Reduce<T, R = AnyDocument> = {
  reducer: ReduceFunction<T, R>
  getInitialValue: (elementCount: number) => T
}

export type GroupByParams<T extends AnyOrama, ResultDocument> = {
  properties: LiteralUnion<T['schema']>[]
  maxResult?: number
  reduce?: Reduce<ResultDocument>
}

export type ComparisonOperator = {
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  eq?: number
  between?: [number, number]
}

export type EnumComparisonOperator = {
  eq?: string | number | boolean
  in?: (string | number | boolean)[]
  nin?: (string | number | boolean)[]
}

export type EnumArrComparisonOperator = {
  containsAll?: (string | number | boolean)[]
  containsAny?: (string | number | boolean)[]
}

export type GeosearchDistanceUnit = 'cm' | 'm' | 'km' | 'ft' | 'yd' | 'mi'

export type GeosearchRadiusOperator = {
  radius: {
    coordinates: Point
    value: number
    unit?: GeosearchDistanceUnit
    inside?: boolean
    highPrecision?: boolean
  }
}

export type GeosearchPolygonOperator = {
  polygon: {
    coordinates: Point[]
    inside?: boolean
    highPrecision?: boolean
  }
}

export type GeosearchOperation = GeosearchRadiusOperator | GeosearchPolygonOperator

export type Operator<Value> = Value extends 'string'
  ? string | string[]
  : Value extends 'string[]'
    ? string | string[]
    : Value extends 'boolean'
      ? boolean
      : Value extends 'boolean[]'
        ? boolean
        : Value extends 'number'
          ? ComparisonOperator
          : Value extends 'number[]'
            ? ComparisonOperator
            : Value extends 'enum'
              ? EnumComparisonOperator
              : Value extends 'enum[]'
                ? EnumArrComparisonOperator
                : Value extends 'geopoint'
                  ? GeosearchOperation
                  : never
export type WhereCondition<TSchema> = {
  [key in keyof TSchema]?: Operator<TSchema[key]>
}

/**
 * A custom sorter function item as [id, score, document].
 */
export type CustomSorterFunctionItem<ResultDocument> = [InternalDocumentID, number, ResultDocument]

export type CustomSorterFunction<ResultDocument> = (
  a: CustomSorterFunctionItem<ResultDocument>,
  b: CustomSorterFunctionItem<ResultDocument>
) => number
// thanks to https://github.com/sindresorhus/type-fest/blob/main/source/literal-union.d.ts
export type LiteralUnion<T> = (keyof T extends string ? keyof T : never) | (string & Record<never, never>)
/**
 * Define which properties to sort for.
 */
export type SorterParams<T extends AnyOrama> = {
  /**
   * The key of the document used to sort the result.
   */
  property: LiteralUnion<T['schema']>
  /**
   * Whether to sort the result in ascending or descending order.
   */
  order?: 'ASC' | 'DESC'
}

export type FlattenSchema<T extends AnyOrama> = Flatten<T['schema']>
export type FlattenSchemaProperty<T extends AnyOrama> = T['schema'] extends object ? keyof FlattenSchema<T> : string
export type OnlyStrings<T extends any[]> = T[number] extends infer V ? (V extends string ? V : never) : never

export type SortByParams<T extends AnyOrama, ResultDocument> = SorterParams<T> | CustomSorterFunction<ResultDocument>

export type SearchMode = typeof MODE_FULLTEXT_SEARCH | typeof MODE_HYBRID_SEARCH | typeof MODE_VECTOR_SEARCH

// eslint-disable-next-line
export interface SearchParamsBase<T extends AnyOrama, ResultDocument = TypedDocument<T>> {}

export interface SearchParamsFullText<T extends AnyOrama, ResultDocument = TypedDocument<T>>
  extends SearchParamsBase<T, ResultDocument> {
  /**
   * The term, sentence, or word to search.
   */
  term?: string

  /**
   * Search mode. Tell Orama to perform either a fulltext search, a vector search or a hybrid search.
   * By default, Orama will perform a full-text search.
   */
  mode?: typeof MODE_FULLTEXT_SEARCH

  /**
   * The properties of the document to search in.
   */
  properties?: '*' | FlattenSchemaProperty<T>[]

  /**
   * The number of matched documents to return.
   */
  limit?: number

  /**
   * The number of matched documents to skip.
   */
  offset?: number

  /**
   * The key of the document used to sort the result.
   */
  sortBy?: SortByParams<T, ResultDocument>

  /**
   * Whether to match the term exactly.
   */
  exact?: boolean

  /**
   * The maximum [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
   * between the term and the searchable property.
   */
  tolerance?: number

  /**
   * The BM25 parameters to use.
   *
   * k: Term frequency saturation parameter.
   * The higher the value, the more important the term frequency becomes.
   * The default value is 1.2. It should be set to a value between 1.2 and 2.0.
   *
   * b: Document length saturation impact. The higher the value, the more
   * important the document length becomes. The default value is 0.75.
   *
   * d: Frequency normalization lower bound. Default value is 0.5.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/changing-search-algorithm#bm25-best-matching-25
   *
   * @see https://en.wikipedia.org/wiki/Okapi_BM25
   */
  relevance?: BM25Params

  /**
   * The boost to apply to the properties.
   *
   * The boost is a number that is multiplied to the score of the property.
   * It can be used to give more importance to some properties.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/fields-boosting
   *
   * @example
   * // Give more importance to the 'title' property.
   * const result = await search(db, {
   *  term: 'Michael',
   *  properties: ['title', 'author'],
   *  boost: {
   *   title: 2
   *  }
   * });
   *
   * // In that case, the score of the 'title' property will be multiplied by 2.
   */
  boost?: Partial<Record<OnlyStrings<FlattenSchemaProperty<T>[]>, number>>

  /**
   * Facets configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/facets
   *
   * A facet is a feature that allows users to narrow down their search results by specific
   * attributes or characteristics, such as category, price, or location.
   * This can help users find more relevant and specific results for their search query.
   *
   * @example
   *
   * const results = await search(db, {
   *  term: 'Personal Computer',
   *  properties: ['title', 'description', 'category.primary', 'category.secondary'],
   *  facets: {
   *    'category.primary': {
   *      limit: 10,
   *      sort: 'ASC',
   *    }
   *  }
   * });
   */
  facets?: FacetsParams<T>

  /**
   * Distinct configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/introduction#distinct
   *
   * @example
   * const results = await search(db, {
   *  term: 'Headphones',
   *  distinctOn: 'category.primary',
   * })
   */
  distinctOn?: LiteralUnion<T['schema']>

  /**
   * Groups configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/grouping
   *
   * @example
   * const results = await search(db, {
   *  term: 'Headphones',
   *  groupBy: {
   *   properties: ['category.primary'],
   *   maxResult: 10,
   *  }
   * })
   */
  groupBy?: GroupByParams<T, ResultDocument>

  /**
   * Filter the search results.
   * Full documentation: https://docs.orama.com/open-source/usage/search/filters
   *
   * @example
   * // Search for documents that contain 'Headphones' in the 'description' and 'title' fields and
   * // have a price less than 100.
   *
   * const result = await search(db, {
   *  term: 'Headphones',
   *  properties: ['description', 'title'],
   *  where: {
   *    price: {
   *      lt: 100
   *    }
   *  }
   * });
   */
  where?: Partial<WhereCondition<T['schema']>>

  /**
   * Threshold to use for refining the search results.
   * The threshold is a number between 0 and 1 that represents the minimum score of the documents to return.
   * By default, the threshold is 0.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/threshold
   *
   * @example
   *
   * const result = await search(db, {
   *  term: 'Red Headphones'
   *  threshold: 0
   * });
   *
   * // The result will contain all the documents that contain both 'Red' and 'Headphones' in their properties.
   *
   * const result2 = await search(db, {
   *  term: 'Red Headphones'
   *  threshold: 1
   * });
   *
   * // The result will contain all the documents that contain either 'Red' and 'Headphones' in their properties.
   */
  threshold?: number

  /**
   * Preflight query.
   * Will return just the facets (if needed) and the number of matched documents for the given query.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/preflight
   *
   * @example
   *
   * const result = await search(db, {
   *  term: 'Red Headphones',
   *  preflight: true
   * });
   *
   * console.log(result);
   *
   * // {
   * //   elapsed: {
   * //     raw: 181208,
   * //     formatted: '181μs'
   * //   },
   * //   count: 100,
   * // }
   */
  preflight?: boolean

  /**
   * Whether to include the vectors in the result.
   * By default, Orama will not include the vectors, as they can be quite large.
   * If set to "false" (default), vectors will be presented as "null".
   */
  includeVectors?: boolean
}

export interface SearchParamsHybrid<T extends AnyOrama, ResultDocument = TypedDocument<T>>
  extends SearchParamsBase<T, ResultDocument> {
  /**
   * The vector used to perform vector similarity search.
   * Since "mode" is set to "hybrid", Orama will perform a full-text search and a vector search,
   * therefore, you have to provide a "term" property as well when setting the "vector" property.
   *
   * @example
   * const result = await search(db, {
   *  term: 'Noise cancelling headphones',
   *  vector: {
   *    value: [0.1, 0.2, 0.3],
   *    property: 'embedding'
   *  }
   * })
   */
  vector?: {
    value: Array<number> | VectorType
    property: string
  }

  /**
   * The term, sentence, or word to search.
   * @example
   * const result = await search(db, {
   *   term: 'Noise cancelling headphones',
   *   mode: 'hybrid',
   * })
   */
  term: string

  /**
   * Search mode. Tell Orama to perform either a fulltext search, a vector search or a hybrid search.
   * By default, Orama will perform a full-text search.
   */
  mode: typeof MODE_HYBRID_SEARCH

  /**
   * The properties of the document to search in (for the full-text search part).
   */
  properties?: '*' | FlattenSchemaProperty<T>[]

  /**
   * The maximum [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
   * between the term and the searchable property.
   */
  tolerance?: number

  /**
   * The BM25 parameters to use.
   *
   * k: Term frequency saturation parameter.
   * The higher the value, the more important the term frequency becomes.
   * The default value is 1.2. It should be set to a value between 1.2 and 2.0.
   *
   * b: Document length saturation impact. The higher the value, the more
   * important the document length becomes. The default value is 0.75.
   *
   * d: Frequency normalization lower bound. Default value is 0.5.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/changing-search-algorithm#bm25-best-matching-25
   *
   * @see https://en.wikipedia.org/wiki/Okapi_BM25
   */
  relevance?: BM25Params

  /**
   * The number of matched documents to return.
   * By default, Orama will return 10 of each (10 for full-text search, and 10 for vector search).
   */
  limit?: number

  /**
   * The number of matched documents to skip.
   * By default, Orama will skip 0 of each (0 for full-text search, and 0 for vector search).
   */
  offset?: number

  /**
   * Similarity threshold for the vector search.
   * By default, Orama will use 0.8.
   */
  similarity?: number

  /**
   * Whether to include the vectors in the result.
   * By default, Orama will not include the vectors, as they can be quite large.
   * If set to "false" (default), vectors will be presented as "null".
   */
  includeVectors?: boolean

  /**
   * Groups configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/grouping
   */
  groupBy?: GroupByParams<T, ResultDocument>

  /**
   * Filter the search results.
   * Full documentation: https://docs.orama.com/open-source/usage/search/filters
   */
  where?: Partial<WhereCondition<T['schema']>>

  /**
   * Threshold to use for refining the search results.
   * The threshold is a number between 0 and 1 that represents the minimum score of the documents to return.
   * By default, the threshold is 1. Only applies to the full-text search.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/threshold
   */
  threshold?: number

  /**
   * The boost to apply to the properties.
   *
   * The boost is a number that is multiplied to the score of the property.
   * It can be used to give more importance to some properties. Only applies to the full-text search.
   *
   * Full documentation: https://docs.orama.com/open-source/usage/search/fields-boosting
   */
  boost?: Partial<Record<OnlyStrings<FlattenSchemaProperty<T>[]>, number>>

  /**
   * Facets configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/facets
   *
   * A facet is a feature that allows users to narrow down their search results by specific
   * attributes or characteristics, such as category, price, or location.
   * This can help users find more relevant and specific results for their search query.
   */
  facets?: FacetsParams<T>

  /**
   * Hybrid search weights.
   * By default, Orama will use 0.5 for the full-text search and 0.5 for the vector search, which means that both will have the same importance.
   * You can change the weights to give more importance to the full-text search or the vector search.
   * Full documentation: https://docs.orama.com/open-source/usage/search/hybrid-search
   */
  hybridWeights?: HybridWeights
}

export interface SearchParamsVector<T extends AnyOrama, ResultDocument = TypedDocument<T>>
  extends SearchParamsBase<T, ResultDocument> {
  /**
   * Search mode. Tell Orama to perform either a fulltext search, a vector search or a hybrid search.
   * By default, Orama will perform a full-text search.
   */
  mode: typeof MODE_VECTOR_SEARCH

  /**
   * The search term. If used with the Orama Secure Proxy, this will be converted into a vector automatically for you.
   *
   * @example
   * import { pluginSecureProxy } from '@orama/plugin-secure-proxy'
   *
   * const db = await create({
   *   schema: {
   *     title: 'string',
   *     description: 'string',
   *     embedding: 'vector[3]',
   *   },
   *   plugins: [
   *     await pluginSecureProxy({ apiKey: '', defaultProperty: 'embedding' })
   *   ]
   * });
   *
   * const result = await search(db, {
   *   mode: 'vector',
   *   term: 'Noise cancelling headphones',
   * });
   */
  term?: string

  /**
   * The vector used to perform vector similarity search.
   *
   * @example
   * const db = await create({
   *   schema: {
   *     embeddings: 'vector[3]'
   *   }
   * })
   *
   * const result = await search(db, {
   *   mode: 'vector',
   *   vector {
   *     value: [0.1, 0.2, 0.3],
   *     property: 'embedding',
   *   }
   * })
   */
  vector?: {
    value: Array<number> | VectorType
    property: string
  }

  /**
   * The minimum similarity score between the vector and the document.
   * By default, Orama will use 0.8.
   */
  similarity?: number

  /**
   * Filter the search results.
   * Full documentation: https://docs.orama.com/open-source/usage/search/filters
   */
  where?: Partial<WhereCondition<T['schema']>>

  /**
   * Facets configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/facets
   */
  facets?: FacetsParams<T>

  /**
   * Groups configuration
   * Full documentation: https://docs.orama.com/open-source/usage/search/grouping
   */
  groupBy?: GroupByParams<T, ResultDocument>

  /**
   * The number of matched documents to return.
   * By default, Orama will return 10.
   */
  limit?: number

  /**
   * The number of matched documents to skip.
   * By default, Orama will skip 0.
   */
  offset?: number

  /**
   * Whether to include the vectors in the result.
   * By default, Orama will not include the vectors, as they can be quite large.
   * If set to "false" (default), vectors will be presented as "null".
   */
  includeVectors?: boolean
}

export type SearchParams<T extends AnyOrama, ResultDocument = TypedDocument<T>> =
  | SearchParamsFullText<T, ResultDocument>
  | SearchParamsHybrid<T, ResultDocument>
  | SearchParamsVector<T, ResultDocument>

export type Result<Document> = {
  /**
   * The id of the document.
   */
  id: string
  /**
   * The score of the document in the search.
   */
  score: number
  /**
   * The document
   */
  document: Document
}

export type FacetResult = Record<
  string,
  {
    count: number
    values: Record<string, number>
  }
>

export type GroupResult<Document> = {
  values: ScalarSearchableValue[]
  result: Result<Document>[]
}[]

export type TokenScore = [id: InternalDocumentID, score: number]

export type TokenMap = Record<string, TokenScore[]>

export type IndexMap = Record<string, TokenMap>

export type SearchContext<
  T extends AnyOrama,
  ResultDocument = TypedDocument<T>,
  P = SearchParams<T, ResultDocument>
> = {
  timeStart: bigint
  tokenizer: Tokenizer
  index: T['index']
  documentsStore: T['documentsStore']
  language: string | undefined
  params: P
  docsCount: number
  uniqueDocsIDs: Record<number, number>
  indexMap: IndexMap
  docsIntersection: TokenMap
}

export type ElapsedTime = {
  raw: number
  formatted: string
}

export interface HybridResultsBase<Document> {
  /**
   * The number of all the matched documents, combining vector and full-text search. Will contain duplicated results between vector and full-text search.
   */
  count: number

  /**
   * All the matched elements from the full-text search.
   */
  hits: Result<Document>[]

  /**
   * The time taken to search.
   */
  elapsed: ElapsedTime

  /**
   * The facets results. Includes full-text search facets only.
   */
  facets?: FacetResult

  /**
   * The groups results. Includes full-text search groups only.
   */
  groups?: GroupResult<Document>
}

export interface HybridResultsCombine<Document> extends HybridResultsBase<Document> {
  /**
   * All the matched elements from the vector search.
   */
  hitsVector: Result<Document>[]
}

export type Results<Document> = {
  /**
   * The number of all the matched documents.
   */
  count: number

  /**
   * An array of matched documents taking `limit` and `offset` into account.
   */
  hits: Result<Document>[]

  /**
   * The time taken to search.
   */
  elapsed: ElapsedTime

  /**
   * The facets results.
   */
  facets?: FacetResult

  /**
   * The groups results.
   */
  groups?: GroupResult<Document>
}

/**
 * Sometimes {@link doc} will not have the correct type; in these cases,
 * you can simply create a new variable and convert it to the correct type like:
 *
 * @example```ts
 * const fixedType = doc as MyType;
 * ```
 */
export type SingleCallbackComponent<T extends AnyOrama> = (
  orama: T,
  id: string,
  doc?: TypedDocument<T>
) => SyncOrAsyncValue

/**
 * Sometimes {@link doc} will not have the correct type; in these cases,
 * you can simply create a new variable and convert it to the correct type like:
 *
 * @example```ts
 * const fixedType = doc as MyType;
 * ```
 */
export type MultipleCallbackComponent<T extends AnyOrama> = (
  orama: T,
  doc: TypedDocument<T>[] | string[]
) => SyncOrAsyncValue

/**
 * Sometimes {@link results} will not have the correct type; in these cases,
 * you can simply create a new variable and convert it to the correct type like:
 *
 * @example```ts
 * const fixedType = results as Results<MyType>;
 * ```
 */
export type AfterSearch<T extends AnyOrama, ResultDocument extends TypedDocument<T> = TypedDocument<T>> = (
  db: T,
  params: SearchParams<T, ResultDocument>,
  language: string | undefined,
  results: Results<ResultDocument>
) => SyncOrAsyncValue

export type BeforeSearch<T extends AnyOrama> = (
  db: T,
  params: SearchParams<T>,
  language: string | undefined
) => SyncOrAsyncValue

export type AfterCreate<T extends AnyOrama> = (db: T) => SyncOrAsyncValue

export type IIndexInsertOrRemoveHookFunction = <R = void>(
  index: AnyIndexStore,
  prop: string,
  id: string,
  value: SearchableValue,
  type: SearchableType,
  language: string | undefined,
  tokenizer: Tokenizer,
  docsCount: number
) => SyncOrAsyncValue<R>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnyIndexStore {
  vectorIndexes: Record<string, TTree<'Vector', VectorIndex>>
}
export type AnyIndex = IIndex<AnyIndexStore>

export interface IIndex<I extends AnyIndexStore> {
  create<T extends AnyOrama>(
    orama: T,
    sharedInternalDocumentStore: T['internalDocumentIDStore'],
    schema: T['schema']
  ): I

  beforeInsert?: IIndexInsertOrRemoveHookFunction
  insert: <T extends I>(
    implementation: IIndex<T>,
    index: T,
    prop: string,
    id: DocumentID,
    internalId: InternalDocumentID,
    value: SearchableValue,
    schemaType: SearchableType,
    language: string | undefined,
    tokenizer: Tokenizer,
    docsCount: number,
    options?: InsertOptions
  ) => void
  afterInsert?: IIndexInsertOrRemoveHookFunction

  beforeRemove?: IIndexInsertOrRemoveHookFunction
  remove: <T extends I>(
    implementation: IIndex<T>,
    index: T,
    prop: string,
    id: DocumentID,
    internalId: InternalDocumentID,
    value: SearchableValue,
    schemaType: SearchableType,
    language: string | undefined,
    tokenizer: Tokenizer,
    docsCount: number
  ) => SyncOrAsyncValue<boolean>
  afterRemove?: IIndexInsertOrRemoveHookFunction

  insertDocumentScoreParameters(index: I, prop: string, id: DocumentID, tokens: string[], docsCount: number): void
  insertTokenScoreParameters(index: I, prop: string, id: DocumentID, tokens: string[], token: string): void
  removeDocumentScoreParameters(index: I, prop: string, id: DocumentID, docsCount: number): SyncOrAsyncValue
  removeTokenScoreParameters(index: I, prop: string, token: string): void
  calculateResultScores(
    index: AnyIndexStore,
    prop: string,
    term: string,
    ids: InternalDocumentID[],
    docsCount: number,
    bm25Relevance: Required<BM25Params>,
    resultsMap: Map<number, number>,
    boostPerProperty: number,
    whereFiltersIDs: Set<InternalDocumentID> | undefined,
    keywordMatchesMap: Map<InternalDocumentID, Map<string, number>>
  ): void

  search<T extends AnyOrama>(
    index: AnyIndexStore,
    term: string,
    tokenizer: Tokenizer,
    language: string | undefined,
    propertiesToSearch: string[],
    exact: boolean,
    tolerance: number,
    boost: Partial<Record<OnlyStrings<FlattenSchemaProperty<T>[]>, number>>,
    relevance: Required<BM25Params>,
    docsCount: number,
    whereFiltersIDs: Set<InternalDocumentID> | undefined,
    threshold?: number
  ): TokenScore[]

  searchByWhereClause<T extends AnyOrama>(
    index: AnyIndexStore,
    tokenizer: Tokenizer,
    filters: Partial<WhereCondition<T['schema']>>,
    language: string | undefined
  ): Set<InternalDocumentID>

  getSearchableProperties(index: I): string[]
  getSearchablePropertiesWithTypes(index: I): Record<string, SearchableType>

  load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): I
  save<R = unknown>(index: I): SyncOrAsyncValue<R>
}

export interface AnyDocumentStore {
  docs: Record<InternalDocumentID, AnyDocument>
}

export interface IDocumentsStore<D extends AnyDocumentStore = AnyDocumentStore> {
  create<T extends AnyOrama>(orama: T, sharedInternalDocumentStore: InternalDocumentIDStore): D
  get(store: D, id: DocumentID): Optional<AnyDocument>
  getMultiple(store: D, ids: DocumentID[]): Optional<AnyDocument>[]
  getAll(store: D): SyncOrAsyncValue<Record<InternalDocumentID, AnyDocument>>
  store(store: D, id: DocumentID, internalId: InternalDocumentID, doc: AnyDocument): boolean
  remove(store: D, id: DocumentID, internalId: InternalDocumentID): SyncOrAsyncValue<boolean>
  count(store: D): number

  load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): D
  save<R = unknown>(store: D): SyncOrAsyncValue<R>
}

export interface SorterConfig {
  enabled?: boolean
  unsortableProperties?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnySorterStore {}
export type AnySorter = ISorter<AnySorterStore>

export interface ISorter<So extends AnySorterStore> {
  create<T extends AnyOrama>(
    orama: T,
    sharedInternalDocumentStore: InternalDocumentIDStore,
    schema: T['schema'],
    sorterConfig?: SorterConfig
  ): So
  insert: <T extends So>(
    sorter: T,
    prop: string,
    id: DocumentID,
    value: SortValue,
    schemaType: SortType,
    language: string | undefined
  ) => void
  remove: <T extends So>(sorter: T, prop: string, id: DocumentID) => void

  load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): So
  save<R = unknown>(sorter: So): R

  sortBy<T extends AnyOrama>(sorter: So, docIds: [DocumentID, number][], by: SorterParams<T>): [DocumentID, number][]

  getSortableProperties(sorter: So): string[]
  getSortablePropertiesWithTypes(sorter: So): Record<string, SortType>
}

export type Stemmer = (word: string) => string

export type DefaultTokenizerConfig = {
  language?: Language
  stemming?: boolean
  stemmer?: Stemmer
  stemmerSkipProperties?: string | string[]
  tokenizeSkipProperties?: string | string[]
  stopWords?: boolean | string[] | ((stopWords: string[]) => string[])
  allowDuplicates?: boolean
}

export interface Tokenizer {
  language: string
  normalizationCache: Map<string, string>
  tokenize: (raw: string, language?: string, prop?: string, withCache?: boolean) => string[]
}

export interface ObjectComponents<I, D, So> {
  tokenizer: Tokenizer | DefaultTokenizerConfig
  index: I
  documentsStore: D
  sorter: So
}

export interface FunctionComponents<S> {
  validateSchema(doc: AnyDocument, schema: S): string | undefined
  getDocumentIndexId(doc: AnyDocument): string
  getDocumentProperties(doc: AnyDocument, paths: string[]): Record<string, string | number | boolean>
  formatElapsedTime(number: bigint): number | string | object | ElapsedTime
}

export interface SingleOrArrayCallbackComponents<T extends AnyOrama> {
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeInsert: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterInsert: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeRemove: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterRemove: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeUpdate: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterUpdate: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeUpsert: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterUpsert: SingleOrArray<SingleCallbackComponent<T>>
  /**
   * More details {@link BeforeSearch}
   */
  beforeSearch: SingleOrArray<BeforeSearch<T>>
  /**
   * More details {@link AfterSearch}
   */
  afterSearch: SingleOrArray<AfterSearch<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeInsertMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterInsertMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeRemoveMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterRemoveMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeUpdateMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterUpdateMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeUpsertMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterUpsertMultiple: SingleOrArray<MultipleCallbackComponent<T>>
  /**
   * More details {@link AfterCreate}
   */
  afterCreate: SingleOrArray<AfterCreate<T>>
}

export interface ArrayCallbackComponents<T extends AnyOrama> {
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeInsert: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterInsert: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeRemove: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterRemove: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeUpdate: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterUpdate: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  beforeUpsert: SingleCallbackComponent<T>[]
  /**
   * More details {@link SingleCallbackComponent}
   */
  afterUpsert: SingleCallbackComponent<T>[]
  /**
   * More details {@link BeforeSearch}
   */
  beforeSearch: BeforeSearch<T>[]
  /**
   * More details {@link AfterSearch}
   */
  afterSearch: AfterSearch<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeInsertMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterInsertMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeRemoveMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterRemoveMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeUpdateMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterUpdateMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  beforeUpsertMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link MultipleCallbackComponent}
   */
  afterUpsertMultiple: MultipleCallbackComponent<T>[]
  /**
   * More details {@link AfterCreate}
   */
  afterCreate: AfterCreate<T>[]
}

export type Components<T extends AnyOrama, TSchema, TIndex, TDocumentStore, TSorter> = Partial<
  ObjectComponents<TIndex, TDocumentStore, TSorter> & FunctionComponents<TSchema> & SingleOrArrayCallbackComponents<T>
>

export const kInsertions = Symbol('orama.insertions')
export const kRemovals = Symbol('orama.removals')

export type PickIfExtends<T, TExtends, TDefault> = T extends TExtends ? T : TDefault

type Internals<
  TSchema,
  TIndex extends AnyIndexStore,
  TDocumentStore extends AnyDocumentStore,
  TSorter extends AnySorterStore
> = {
  version: string
  schema: TSchema
  typeSchema: Schema<TSchema>
  tokenizer: Tokenizer
  index: IIndex<TIndex>
  documentsStore: IDocumentsStore<TDocumentStore>
  sorter: ISorter<TSorter>
  data: {
    index: TIndex
    docs: TDocumentStore
    sorting: TSorter
  }
  internalDocumentIDStore: InternalDocumentIDStore
  caches: Record<string, unknown>
  [kInsertions]: number | undefined
  [kRemovals]: number | undefined
}

type OramaID = {
  id: string
}

export type ExtractSchema<T> = T extends { schema: infer RawSchema } ? Schema<RawSchema> : never

export type AnyGeneric<T> = T[]
export type AnyGenericIndex<T> = T extends IIndex<infer TStore>
  ? TStore extends AnyIndexStore
    ? TStore
    : never
  : AnyIndexStore
export type AnyGenericDocumentStore<T> = T extends IDocumentsStore<infer TStore>
  ? TStore extends AnyDocumentStore
    ? TStore
    : never
  : AnyDocumentStore
export type AnyGenericSorter<T> = T extends ISorter<infer TSorter>
  ? TSorter extends AnySorterStore
    ? TSorter
    : never
  : AnySorterStore

export type PickInferGeneric<T, Default> = T extends AnyGeneric<infer Generic>
  ? Generic extends Default
    ? Generic
    : never
  : never

export type Orama<
  TSchema,
  TIndex = IIndex<Index>,
  TDocumentStore = IDocumentsStore<DocumentsStore>,
  TSorter = ISorter<Sorter>
> = FunctionComponents<TSchema> &
  Internals<TSchema, AnyGenericIndex<TIndex>, AnyGenericDocumentStore<TDocumentStore>, AnyGenericSorter<TSorter>> &
  ArrayCallbackComponents<any> &
  OramaID & { plugins: OramaPlugin[] }

export type AnyOrama<TSchema = any> = FunctionComponents<TSchema> &
  Internals<TSchema, AnyIndexStore, AnyDocumentStore, AnySorterStore> &
  ArrayCallbackComponents<any> &
  OramaID & { plugins: OramaPlugin[] }

export type OramaPluginSync<T = unknown> = {
  name: string
  extra?: T
  beforeInsert?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  afterInsert?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  beforeRemove?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  afterRemove?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  beforeUpdate?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  afterUpdate?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  beforeUpsert?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  afterUpsert?: <T extends AnyOrama>(orama: T, id: string, doc: AnyDocument) => SyncOrAsyncValue
  beforeSearch?: <T extends AnyOrama>(
    orama: T,
    params: SearchParams<T>,
    language: string | undefined
  ) => SyncOrAsyncValue
  afterSearch?: <T extends AnyOrama>(
    orama: T,
    params: SearchParams<T>,
    language: string | undefined,
    results: Results<TypedDocument<T>>
  ) => SyncOrAsyncValue
  beforeInsertMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  afterInsertMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  beforeRemoveMultiple?: <T extends AnyOrama>(orama: T, ids: string[]) => SyncOrAsyncValue
  afterRemoveMultiple?: <T extends AnyOrama>(orama: T, ids: string[]) => SyncOrAsyncValue
  beforeUpdateMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  afterUpdateMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  beforeUpsertMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  afterUpsertMultiple?: <T extends AnyOrama>(orama: T, docs: AnyDocument[]) => SyncOrAsyncValue
  afterCreate?: <T extends AnyOrama>(orama: T) => SyncOrAsyncValue
  getComponents?: <IndexStore extends AnyIndexStore, TDocumentStore, TSorter>(
    schema: AnySchema
  ) => SyncOrAsyncValue<Partial<ObjectComponents<IIndex<IndexStore>, TDocumentStore, TSorter>>>
}

export type OramaPluginAsync<T = unknown> = Promise<OramaPluginSync<T>>

export type OramaPlugin<T = unknown> = OramaPluginSync<T> | OramaPluginAsync<T>
