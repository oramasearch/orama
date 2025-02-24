import type { AnyOrama, Results, SearchParamsVector, TypedDocument, Result } from '../types.js'
import type { InternalDocumentID } from '../components/internal-document-id-store.js'
import { getNanosecondsTime, formatNanoseconds, sortTokenScorePredicate } from '../utils.js'
import { getFacets } from '../components/facets.js'
import { createError } from '../errors.js'
import { getGroups } from '../components/groups.js'
import { getDocumentIdFromInternalId } from '../components/internal-document-id-store.js'
import { Language } from '../index.js'
import { runBeforeSearch, runAfterSearch } from '../components/hooks.js'
import { DEFAULT_SIMILARITY } from '../trees/vector.js'

export function innerVectorSearch<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: Pick<SearchParamsVector<T, ResultDocument>, 'vector' | 'similarity' | 'where'>,
  language: Language | undefined
) {
  const vector = params.vector

  if (vector && (!('value' in vector) || !('property' in vector))) {
    throw createError('INVALID_VECTOR_INPUT', Object.keys(vector).join(', '))
  }

  const vectorIndex = orama.data.index.vectorIndexes[vector!.property]
  const vectorSize = vectorIndex.node.size

  if (vector?.value.length !== vectorSize) {
    if (vector?.property === undefined || vector?.value.length === undefined) {
      throw createError('INVALID_INPUT_VECTOR', 'undefined', vectorSize, 'undefined')
    }
    throw createError('INVALID_INPUT_VECTOR', vector.property, vectorSize, vector.value.length)
  }

  const index = orama.data.index
  let whereFiltersIDs: Set<InternalDocumentID> | undefined
  const hasFilters = Object.keys(params.where ?? {}).length > 0
  if (hasFilters) {
    whereFiltersIDs = orama.index.searchByWhereClause(index, orama.tokenizer, params.where!, language)
  }

  return vectorIndex.node.find(vector.value as Float32Array, params.similarity ?? DEFAULT_SIMILARITY, whereFiltersIDs)
}

export function searchVector<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: SearchParamsVector<T, ResultDocument>,
  language: Language = 'english'
): Results<ResultDocument> | Promise<Results<ResultDocument>> {
  const timeStart = getNanosecondsTime()

  function performSearchLogic(): Results<ResultDocument> {
    const results = innerVectorSearch(orama, params, language).sort(sortTokenScorePredicate)

    let facetsResults: any = []

    const shouldCalculateFacets = params.facets && Object.keys(params.facets).length > 0
    if (shouldCalculateFacets) {
      const facets = getFacets(orama, results, params.facets!)
      facetsResults = facets
    }

    const vectorProperty = params.vector!.property
    const includeVectors = params.includeVectors ?? false
    const limit = params.limit ?? 10
    const offset = params.offset ?? 0
    const docs: Result<ResultDocument>[] = Array.from({ length: limit })
    for (let i = 0; i < limit; i++) {
      const result = results[i + offset]
      if (!result) {
        break
      }

      const doc = orama.data.docs.docs[result[0]]

      if (doc) {
        if (!includeVectors) {
          doc[vectorProperty] = null
        }

        const newDoc: Result<ResultDocument> = {
          id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, result[0]),
          score: result[1],
          document: doc
        }
        docs[i] = newDoc
      }
    }

    let groups: any = []

    if (params.groupBy) {
      groups = getGroups<T, ResultDocument>(orama, results, params.groupBy)
    }

    const timeEnd = getNanosecondsTime()
    const elapsedTime = timeEnd - timeStart

    return {
      count: results.length,
      hits: docs.filter(Boolean),
      elapsed: {
        raw: Number(elapsedTime),
        formatted: formatNanoseconds(elapsedTime)
      },
      ...(facetsResults ? { facets: facetsResults } : {}),
      ...(groups ? { groups } : {})
    }
  }

  async function executeSearchAsync(): Promise<Results<ResultDocument>> {
    if (orama.beforeSearch) {
      await runBeforeSearch(orama.beforeSearch, orama, params, language)
    }

    const results = performSearchLogic()

    if (orama.afterSearch) {
      await runAfterSearch(orama.afterSearch, orama, params, language, results as any)
    }

    return results
  }

  const asyncNeeded = orama.beforeSearch?.length || orama.afterSearch?.length

  if (asyncNeeded) {
    return executeSearchAsync()
  }

  // Sync path
  return performSearchLogic()
}
