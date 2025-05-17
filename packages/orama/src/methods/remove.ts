import type { AnyOrama } from '../types.js'
import { runMultipleHook, runSingleHook } from '../components/hooks.js'
import {
  DocumentID,
  getDocumentIdFromInternalId,
  getInternalDocumentId
} from '../components/internal-document-id-store.js'
import { isAsyncFunction } from '../utils.js'

export function remove<T extends AnyOrama>(
  orama: T,
  id: DocumentID,
  language?: string,
  skipHooks?: boolean
): Promise<boolean> | boolean {
  const asyncNeeded =
    isAsyncFunction(orama.index.beforeRemove) ||
    isAsyncFunction(orama.index.remove) ||
    isAsyncFunction(orama.index.afterRemove)

  if (asyncNeeded) {
    return removeAsync(orama, id, language, skipHooks)
  }

  return removeSync(orama, id, language, skipHooks)
}

async function removeAsync<T extends AnyOrama>(
  orama: T,
  id: DocumentID,
  language?: string,
  skipHooks?: boolean
): Promise<boolean> {
  let result = true
  const { index, docs } = orama.data

  const doc = orama.documentsStore.get(docs, id)
  if (!doc) {
    return false
  }

  const internalId = getInternalDocumentId(orama.internalDocumentIDStore, id)
  const docId = getDocumentIdFromInternalId(orama.internalDocumentIDStore, internalId)
  const docsCount = orama.documentsStore.count(docs)

  if (!skipHooks) {
    await runSingleHook(orama.beforeRemove, orama, docId)
  }

  const indexableProperties = orama.index.getSearchableProperties(index)
  const indexablePropertiesWithTypes = orama.index.getSearchablePropertiesWithTypes(index)
  const values = orama.getDocumentProperties(doc, indexableProperties)

  for (const prop of indexableProperties) {
    const value = values[prop]
    if (typeof value === 'undefined') {
      continue
    }

    const schemaType = indexablePropertiesWithTypes[prop]

    await orama.index.beforeRemove?.(
      orama.data.index,
      prop,
      docId,
      value,
      schemaType,
      language,
      orama.tokenizer,
      docsCount
    )

    if (
      !(await orama.index.remove(
        orama.index,
        orama.data.index,
        prop,
        id,
        internalId,
        value,
        schemaType,
        language,
        orama.tokenizer,
        docsCount
      ))
    ) {
      result = false
    }

    await orama.index.afterRemove?.(
      orama.data.index,
      prop,
      docId,
      value,
      schemaType,
      language,
      orama.tokenizer,
      docsCount
    )
  }

  const sortableProperties = await orama.sorter.getSortableProperties(orama.data.sorting)
  const sortableValues = await orama.getDocumentProperties(doc, sortableProperties)
  for (const prop of sortableProperties) {
    if (typeof sortableValues[prop] === 'undefined') {
      continue
    }

    orama.sorter.remove(orama.data.sorting, prop, id)
  }

  if (!skipHooks) {
    await runSingleHook(orama.afterRemove, orama, docId)
  }

  orama.documentsStore.remove(orama.data.docs, id, internalId)

  return result
}

function removeSync<T extends AnyOrama>(orama: T, id: DocumentID, language?: string, skipHooks?: boolean): boolean {
  let result = true
  const { index, docs } = orama.data

  const doc = orama.documentsStore.get(docs, id)
  if (!doc) {
    return false
  }

  const internalId = getInternalDocumentId(orama.internalDocumentIDStore, id)
  const docId = getDocumentIdFromInternalId(orama.internalDocumentIDStore, internalId)
  const docsCount = orama.documentsStore.count(docs)

  if (!skipHooks) {
    runSingleHook(orama.beforeRemove, orama, docId)
  }

  const indexableProperties = orama.index.getSearchableProperties(index)
  const indexablePropertiesWithTypes = orama.index.getSearchablePropertiesWithTypes(index)
  const values = orama.getDocumentProperties(doc, indexableProperties)

  for (const prop of indexableProperties) {
    const value = values[prop]
    if (typeof value === 'undefined') {
      continue
    }

    const schemaType = indexablePropertiesWithTypes[prop]

    orama.index.beforeRemove?.(orama.data.index, prop, docId, value, schemaType, language, orama.tokenizer, docsCount)

    if (
      !orama.index.remove(
        orama.index,
        orama.data.index,
        prop,
        id,
        internalId,
        value,
        schemaType,
        language,
        orama.tokenizer,
        docsCount
      )
    ) {
      result = false
    }

    orama.index.afterRemove?.(orama.data.index, prop, docId, value, schemaType, language, orama.tokenizer, docsCount)
  }

  const sortableProperties = orama.sorter.getSortableProperties(orama.data.sorting)
  const sortableValues = orama.getDocumentProperties(doc, sortableProperties)
  for (const prop of sortableProperties) {
    if (typeof sortableValues[prop] === 'undefined') {
      continue
    }

    orama.sorter.remove(orama.data.sorting, prop, id)
  }

  if (!skipHooks) {
    runSingleHook(orama.afterRemove, orama, docId)
  }

  orama.documentsStore.remove(orama.data.docs, id, internalId)

  return result
}

export function removeMultiple<T extends AnyOrama>(
  orama: T,
  ids: DocumentID[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): Promise<number> | number {
  const asyncNeeded =
    isAsyncFunction(orama.index.beforeRemove) ||
    isAsyncFunction(orama.index.remove) ||
    isAsyncFunction(orama.index.afterRemove) ||
    isAsyncFunction(orama.beforeRemoveMultiple) ||
    isAsyncFunction(orama.afterRemoveMultiple)

  if (asyncNeeded) {
    return removeMultipleAsync(orama, ids, batchSize, language, skipHooks)
  }

  return removeMultipleSync(orama, ids, batchSize, language, skipHooks)
}

async function removeMultipleAsync<T extends AnyOrama>(
  orama: T,
  ids: DocumentID[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): Promise<number> {
  let result = 0

  if (!batchSize) {
    batchSize = 1000
  }

  const docIdsForHooks = skipHooks
    ? []
    : ids.map((id) =>
        getDocumentIdFromInternalId(
          orama.internalDocumentIDStore,
          getInternalDocumentId(orama.internalDocumentIDStore, id)
        )
      )

  if (!skipHooks) {
    await runMultipleHook(orama.beforeRemoveMultiple, orama, docIdsForHooks)
  }

  await new Promise<void>((resolve, reject) => {
    let i = 0
    async function _removeMultiple() {
      const batch = ids.slice(i * batchSize!, ++i * batchSize!)

      if (!batch.length) {
        return resolve()
      }

      for (const doc of batch) {
        try {
          if (await remove(orama, doc, language, skipHooks)) {
            result++
          }
        } catch (err) {
          reject(err)
        }
      }

      setTimeout(_removeMultiple, 0)
    }

    setTimeout(_removeMultiple, 0)
  })

  if (!skipHooks) {
    await runMultipleHook(orama.afterRemoveMultiple, orama, docIdsForHooks)
  }

  return result
}

function removeMultipleSync<T extends AnyOrama>(
  orama: T,
  ids: DocumentID[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): number {
  let result = 0

  if (!batchSize) {
    batchSize = 1000
  }

  const docIdsForHooks = skipHooks
    ? []
    : ids.map((id) =>
        getDocumentIdFromInternalId(
          orama.internalDocumentIDStore,
          getInternalDocumentId(orama.internalDocumentIDStore, id)
        )
      )

  if (!skipHooks) {
    runMultipleHook(orama.beforeRemoveMultiple, orama, docIdsForHooks)
  }

  let i = 0
  function _removeMultipleSync() {
    const batch = ids.slice(i * batchSize!, ++i * batchSize!)

    if (!batch.length) return

    for (const doc of batch) {
      if (remove(orama, doc, language, skipHooks)) {
        result++
      }
    }

    setTimeout(_removeMultipleSync, 0)
  }

  _removeMultipleSync()

  if (!skipHooks) {
    runMultipleHook(orama.afterRemoveMultiple, orama, docIdsForHooks)
  }

  return result
}
