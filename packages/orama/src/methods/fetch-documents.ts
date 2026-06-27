import { InternalDocumentID, getDocumentIdFromInternalId } from '../components/internal-document-id-store.js'
import { getNested } from '../utils.js'
import type { AnyOrama, LiteralUnion, Result, SearchableValue, TypedDocument } from '../types.js'

export function fetchDocumentsWithDistinct<T extends AnyOrama, ResultDocument extends TypedDocument<T>>(
  orama: T,
  uniqueDocsArray: [InternalDocumentID, number][],
  offset: number,
  limit: number,
  distinctOn: LiteralUnion<T['schema']>
): Result<ResultDocument>[] {
  const docs = orama.data.docs

  // Keep track which values we already seen
  const values = new Map<SearchableValue, true>()

  // We cannot know how many results we will have in the end,
  // so we need cannot pre-allocate the array.
  const results: Result<ResultDocument>[] = []

  const resultIDs: Set<InternalDocumentID> = new Set()
  const uniqueDocsArrayLength = uniqueDocsArray.length
  let count = 0
  for (let i = 0; i < uniqueDocsArrayLength; i++) {
    const idAndScore = uniqueDocsArray[i]

    // If there are no more results, just break the loop
    if (typeof idAndScore === 'undefined') {
      continue
    }

    const [id, score] = idAndScore

    if (resultIDs.has(id)) {
      continue
    }

    const doc = orama.documentsStore.get(docs, id)
    const value = getNested(doc as object, distinctOn)
    if (typeof value === 'undefined' || values.has(value)) {
      continue
    }
    values.set(value, true)

    count++
    // We shouldn't consider the document if it's not in the offset range
    if (count <= offset) {
      continue
    }

    results.push({ id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, id), score, document: doc! })
    resultIDs.add(id)

    // reached the limit, break the loop
    if (count >= offset + limit) {
      break
    }
  }

  return results
}

export function fetchDocuments<T extends AnyOrama, ResultDocument extends TypedDocument<T>>(
  orama: T,
  uniqueDocsArray: [InternalDocumentID, number][],
  offset: number,
  limit: number
): Result<ResultDocument>[] {
  const docs = orama.data.docs

  const results: Result<ResultDocument>[] = Array.from({
    length: limit
  })

  const resultIDs: Set<InternalDocumentID> = new Set()

  // We already have the list of ALL the document IDs containing the search terms.
  // We loop over them starting from a positional value "offset" and ending at "offset + limit"
  // to provide pagination capabilities to the search.
  for (let i = offset; i < limit + offset; i++) {
    const idAndScore = uniqueDocsArray[i]

    // If there are no more results, just break the loop
    if (typeof idAndScore === 'undefined') {
      break
    }

    const [id, score] = idAndScore

    if (!resultIDs.has(id)) {
      // We retrieve the full document only AFTER making sure that we really want it.
      // We never retrieve the full document preventively.
      const fullDoc = orama.documentsStore.get(docs, id)
      results[i] = { id: getDocumentIdFromInternalId(orama.internalDocumentIDStore, id), score, document: fullDoc! }
      resultIDs.add(id)
    }
  }
  return results
}
