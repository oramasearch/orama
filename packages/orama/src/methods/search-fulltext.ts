import { getFacets } from '../components/facets.js'
import { getGroups } from '../components/groups.js'
import { runAfterSearch, runBeforeSearch } from '../components/hooks.js'
import { getInternalDocumentId } from '../components/internal-document-id-store.js'
import { searchByGeoWhereClause } from '../components/index.js'
import { Language } from '../components/tokenizer/languages.js'
import { createError } from '../errors.js'
import { replaceDiacritics } from '../components/tokenizer/diacritics.js'
import type {
  AnyOrama,
  BM25Params,
  CustomSorterFunctionItem,
  ElapsedTime,
  Results,
  SearchParamsFullText,
  TokenScore,
  TypedDocument
} from '../types.js'
import { getNanosecondsTime, getNested, removeVectorsFromHits, sortTokenScorePredicate } from '../utils.js'
import { count } from './docs.js'
import { fetchDocuments, fetchDocumentsWithDistinct } from './search.js'

export function innerFullTextSearch<T extends AnyOrama>(
  orama: T,
  params: Pick<
    SearchParamsFullText<T>,
    'term' | 'properties' | 'where' | 'exact' | 'tolerance' | 'boost' | 'relevance' | 'threshold'
  >,
  language: Language | undefined
) {
  const { term, properties } = params

  const index = orama.data.index
  // Get searchable string properties
  let propertiesToSearch = orama.caches['propertiesToSearch'] as string[]
  if (!propertiesToSearch) {
    const propertiesToSearchWithTypes = orama.index.getSearchablePropertiesWithTypes(index)

    propertiesToSearch = orama.index.getSearchableProperties(index)
    propertiesToSearch = propertiesToSearch.filter((prop: string) =>
      propertiesToSearchWithTypes[prop].startsWith('string')
    )

    orama.caches['propertiesToSearch'] = propertiesToSearch
  }

  if (properties && properties !== '*') {
    for (const prop of properties) {
      if (!propertiesToSearch.includes(prop as string)) {
        throw createError('UNKNOWN_INDEX', prop as string, propertiesToSearch.join(', '))
      }
    }

    propertiesToSearch = propertiesToSearch.filter((prop: string) => (properties as string[]).includes(prop))
  }

  // If filters are enabled, we need to get the IDs of the documents that match the filters.
  const hasFilters = Object.keys(params.where ?? {}).length > 0
  let whereFiltersIDs: Set<number> | undefined
  if (hasFilters) {
    whereFiltersIDs = orama.index.searchByWhereClause(index, orama.tokenizer, params.where!, language)
  }

  let uniqueDocsIDs: TokenScore[]
  // We need to perform the search if:
  // - we have a search term
  // - or we have properties to search
  //   in this case, we need to return all the documents that contains at least one of the given properties
  const threshold = params.threshold !== undefined && params.threshold !== null ? params.threshold : 1

  if (term || properties) {
    const docsCount = count(orama)
    uniqueDocsIDs = orama.index.search(
      index,
      term || '',
      orama.tokenizer,
      language,
      propertiesToSearch,
      params.exact || false,
      params.tolerance || 0,
      params.boost || {},
      applyDefault(params.relevance),
      docsCount,
      whereFiltersIDs,
      threshold
    )
  } else {
    // Check if this is a geosearch-only query first
    if (hasFilters) {
      const geoResults = searchByGeoWhereClause(index, params.where!)
      if (geoResults) {
        // This is a geosearch-only query with distance scoring
        uniqueDocsIDs = geoResults
      } else {
        // Regular filter query without search term
        const docIds = whereFiltersIDs ? Array.from(whereFiltersIDs) : []
        uniqueDocsIDs = docIds.map((k) => [+k, 0] as TokenScore)
      }
    } else {
      // No search term and no filters - return all documents
      const docIds = Object.keys(orama.documentsStore.getAll(orama.data.docs))
      uniqueDocsIDs = docIds.map((k) => [+k, 0] as TokenScore)
    }
  }

  if (params.exact && term) {
    const normalizedTerm = normalizeForExactMatch(term)
    if (normalizedTerm) {
      const propertiesForExact = properties && properties !== '*' ? (properties as string[]) : propertiesToSearch

      if (propertiesForExact.length === 0) {
        uniqueDocsIDs = []
      } else {
        const docsStore = orama.documentsStore
        const docsData = orama.data.docs
        uniqueDocsIDs = uniqueDocsIDs.filter(([internalDocId]) => {
          const doc = docsStore.get(docsData, internalDocId)
          if (!doc) {
            return false
          }
          return hasExactMatchInProperties(doc as Record<string, unknown>, propertiesForExact, normalizedTerm)
        })
      }
    }
  }

  return uniqueDocsIDs
}

export function fullTextSearch<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: SearchParamsFullText<T, ResultDocument>,
  language?: string
): Results<ResultDocument> | Promise<Results<ResultDocument>> {
  const timeStart = getNanosecondsTime()

  function performSearchLogic(): Results<ResultDocument> {
    const vectorProperties = Object.keys(orama.data.index.vectorIndexes)
    const shouldCalculateFacets = params.facets && Object.keys(params.facets).length > 0
    const { limit = 10, offset = 0, distinctOn, includeVectors = false } = params
    const isPreflight = params.preflight === true

    let uniqueDocsArray = innerFullTextSearch(orama, params, language)

    if (params.sortBy) {
      if (typeof params.sortBy === 'function') {
        const ids = uniqueDocsArray.map(([id]) => id)
        const docs = orama.documentsStore.getMultiple(orama.data.docs, ids)
        const docsWithIdAndScore: CustomSorterFunctionItem<ResultDocument>[] = docs.map((d, i) => [
          uniqueDocsArray[i][0],
          uniqueDocsArray[i][1],
          d!
        ])
        docsWithIdAndScore.sort(params.sortBy)
        uniqueDocsArray = docsWithIdAndScore.map(([id, score]) => [id, score])
      } else {
        uniqueDocsArray = orama.sorter
          .sortBy(orama.data.sorting, uniqueDocsArray, params.sortBy)
          .map(([id, score]) => [getInternalDocumentId(orama.internalDocumentIDStore, id), score])
      }
    } else {
      uniqueDocsArray = uniqueDocsArray.sort(sortTokenScorePredicate)
    }

    let results
    if (!isPreflight) {
      results = distinctOn
        ? fetchDocumentsWithDistinct(orama, uniqueDocsArray, offset, limit, distinctOn)
        : fetchDocuments(orama, uniqueDocsArray, offset, limit)
    }

    const searchResult: Results<ResultDocument> = {
      elapsed: {
        formatted: '',
        raw: 0
      },
      hits: [],
      count: uniqueDocsArray.length
    }

    if (typeof results !== 'undefined') {
      searchResult.hits = results.filter(Boolean)
      if (!includeVectors) {
        removeVectorsFromHits(searchResult, vectorProperties)
      }
    }

    if (shouldCalculateFacets) {
      const facets = getFacets(orama, uniqueDocsArray, params.facets!)
      searchResult.facets = facets
    }

    if (params.groupBy) {
      searchResult.groups = getGroups<T, ResultDocument>(orama, uniqueDocsArray, params.groupBy)
    }

    searchResult.elapsed = orama.formatElapsedTime(getNanosecondsTime() - timeStart) as ElapsedTime

    return searchResult
  }

  async function executeSearchAsync() {
    if (orama.beforeSearch) {
      await runBeforeSearch(orama.beforeSearch, orama, params, language)
    }

    const searchResult = performSearchLogic()

    if (orama.afterSearch) {
      await runAfterSearch(orama.afterSearch, orama, params, language, searchResult)
    }

    return searchResult
  }

  const asyncNeeded = orama.beforeSearch?.length || orama.afterSearch?.length
  if (asyncNeeded) {
    return executeSearchAsync()
  }

  return performSearchLogic()
}

const EXACT_WHITESPACE_REGEX = /\s+/g

function normalizeForExactMatch(value: string): string {
  return replaceDiacritics(value.toLowerCase().trim().replace(EXACT_WHITESPACE_REGEX, ' '))
}

function hasExactMatchInProperties(
  doc: Record<string, unknown>,
  properties: readonly string[],
  normalizedTerm: string
): boolean {
  for (const prop of properties) {
    const value = getNested(doc, prop)
    if (typeof value === 'string') {
      if (normalizeForExactMatch(value) === normalizedTerm) {
        return true
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && normalizeForExactMatch(item) === normalizedTerm) {
          return true
        }
      }
    }
  }
  return false
}

export const defaultBM25Params: BM25Params = {
  k: 1.2,
  b: 0.75,
  d: 0.5
}
function applyDefault(bm25Relevance?: BM25Params): Required<BM25Params> {
  const r = bm25Relevance ?? {}
  r.k = r.k ?? defaultBM25Params.k
  r.b = r.b ?? defaultBM25Params.b
  r.d = r.d ?? defaultBM25Params.d
  return r as Required<BM25Params>
}
