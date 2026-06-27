import { createError } from '../errors.js'
import type {
  AnyOrama,
  Results,
  SearchParams,
  SearchParamsFullText,
  SearchParamsHybrid,
  SearchParamsVector,
  TypedDocument
} from '../types.js'
import { MODE_FULLTEXT_SEARCH, MODE_HYBRID_SEARCH, MODE_VECTOR_SEARCH } from '../constants.js'
import { fullTextSearch } from './search-fulltext.js'
import { searchVector } from './search-vector.js'
import { hybridSearch } from './search-hybrid.js'

export function search<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: SearchParams<T, ResultDocument>,
  language?: string
): Results<ResultDocument> | Promise<Results<ResultDocument>> {
  const mode = params.mode ?? MODE_FULLTEXT_SEARCH

  if (mode === MODE_FULLTEXT_SEARCH) {
    return fullTextSearch(orama, params as SearchParamsFullText<T, ResultDocument>, language)
  }

  if (mode === MODE_VECTOR_SEARCH) {
    return searchVector(orama, params as SearchParamsVector<T, ResultDocument>)
  }

  if (mode === MODE_HYBRID_SEARCH) {
    return hybridSearch(orama, params as SearchParamsHybrid<T, ResultDocument>)
  }

  throw createError('INVALID_SEARCH_MODE', mode)
}
