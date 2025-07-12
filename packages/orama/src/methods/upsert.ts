import type { AnyOrama, PartialSchemaDeep, TypedDocument } from '../types.js'
import { runMultipleHook, runSingleHook } from '../components/hooks.js'
import { createError } from '../errors.js'
import { insert, innerInsertMultiple, type InsertOptions } from './insert.js'
import { update, updateMultiple } from './update.js'
import { isAsyncFunction } from '../utils.js'

export function upsert<T extends AnyOrama>(
  orama: T,
  doc: PartialSchemaDeep<TypedDocument<T>>,
  language?: string,
  skipHooks?: boolean,
  options?: InsertOptions
): Promise<string> | string {
  const asyncNeeded =
    isAsyncFunction(orama.afterInsert) ||
    isAsyncFunction(orama.beforeInsert) ||
    isAsyncFunction(orama.afterRemove) ||
    isAsyncFunction(orama.beforeRemove) ||
    isAsyncFunction(orama.beforeUpdate) ||
    isAsyncFunction(orama.afterUpdate) ||
    isAsyncFunction(orama.beforeUpsert) ||
    isAsyncFunction(orama.afterUpsert) ||
    isAsyncFunction(orama.index.beforeInsert) ||
    isAsyncFunction(orama.index.insert) ||
    isAsyncFunction(orama.index.afterInsert)

  if (asyncNeeded) {
    return upsertAsync(orama, doc, language, skipHooks, options)
  }

  return upsertSync(orama, doc, language, skipHooks, options)
}

async function upsertAsync<T extends AnyOrama>(
  orama: T,
  doc: PartialSchemaDeep<TypedDocument<T>>,
  language?: string,
  skipHooks?: boolean,
  options?: InsertOptions
): Promise<string> {
  const id = orama.getDocumentIndexId(doc)

  if (typeof id !== 'string') {
    throw createError('DOCUMENT_ID_MUST_BE_STRING', typeof id)
  }

  if (!skipHooks && orama.beforeUpsert) {
    await runSingleHook(orama.beforeUpsert, orama, id, doc as TypedDocument<T>)
  }

  // Check if document exists
  const existingDoc = orama.documentsStore.get(orama.data.docs, id)
  let resultId: string

  if (existingDoc) {
    // Document exists, update it
    resultId = await update(orama, id, doc, language, skipHooks)
  } else {
    // Document doesn't exist, insert it
    resultId = await insert(orama, doc, language, skipHooks, options)
  }

  if (!skipHooks && orama.afterUpsert) {
    await runSingleHook(orama.afterUpsert, orama, resultId, doc as TypedDocument<T>)
  }

  return resultId
}

function upsertSync<T extends AnyOrama>(
  orama: T,
  doc: PartialSchemaDeep<TypedDocument<T>>,
  language?: string,
  skipHooks?: boolean,
  options?: InsertOptions
): string {
  const id = orama.getDocumentIndexId(doc)

  if (typeof id !== 'string') {
    throw createError('DOCUMENT_ID_MUST_BE_STRING', typeof id)
  }

  if (!skipHooks && orama.beforeUpsert) {
    runSingleHook(orama.beforeUpsert, orama, id, doc as TypedDocument<T>)
  }

  // Check if document exists
  const existingDoc = orama.documentsStore.get(orama.data.docs, id)
  let resultId: string

  if (existingDoc) {
    // Document exists, update it
    resultId = update(orama, id, doc, language, skipHooks) as string
  } else {
    // Document doesn't exist, insert it
    resultId = insert(orama, doc, language, skipHooks, options) as string
  }

  if (!skipHooks && orama.afterUpsert) {
    runSingleHook(orama.afterUpsert, orama, resultId, doc as TypedDocument<T>)
  }

  return resultId
}

export function upsertMultiple<T extends AnyOrama>(
  orama: T,
  docs: PartialSchemaDeep<TypedDocument<T>>[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): Promise<string[]> | string[] {
  const asyncNeeded =
    isAsyncFunction(orama.afterInsert) ||
    isAsyncFunction(orama.beforeInsert) ||
    isAsyncFunction(orama.afterRemove) ||
    isAsyncFunction(orama.beforeRemove) ||
    isAsyncFunction(orama.beforeUpdate) ||
    isAsyncFunction(orama.afterUpdate) ||
    isAsyncFunction(orama.beforeUpsert) ||
    isAsyncFunction(orama.afterUpsert) ||
    isAsyncFunction(orama.beforeUpsertMultiple) ||
    isAsyncFunction(orama.afterUpsertMultiple) ||
    isAsyncFunction(orama.beforeInsertMultiple) ||
    isAsyncFunction(orama.afterInsertMultiple) ||
    isAsyncFunction(orama.beforeUpdateMultiple) ||
    isAsyncFunction(orama.afterUpdateMultiple) ||
    isAsyncFunction(orama.beforeRemoveMultiple) ||
    isAsyncFunction(orama.afterRemoveMultiple) ||
    isAsyncFunction(orama.index.beforeInsert) ||
    isAsyncFunction(orama.index.insert) ||
    isAsyncFunction(orama.index.afterInsert)

  if (asyncNeeded) {
    return upsertMultipleAsync(orama, docs, batchSize, language, skipHooks)
  }

  return upsertMultipleSync(orama, docs, batchSize, language, skipHooks)
}

async function upsertMultipleAsync<T extends AnyOrama>(
  orama: T,
  docs: PartialSchemaDeep<TypedDocument<T>>[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): Promise<string[]> {
  if (!skipHooks && orama.beforeUpsertMultiple) {
    await runMultipleHook(orama.beforeUpsertMultiple, orama, docs as TypedDocument<T>[])
  }

  // Validate all documents first
  const docsLength = docs.length
  for (let i = 0; i < docsLength; i++) {
    const errorProperty = orama.validateSchema(docs[i], orama.schema)
    if (errorProperty) {
      throw createError('SCHEMA_VALIDATION_FAILURE', errorProperty)
    }
  }

  // Separate documents into insert and update arrays
  const docsToInsert: PartialSchemaDeep<TypedDocument<T>>[] = []
  const docsToUpdate: PartialSchemaDeep<TypedDocument<T>>[] = []
  const idsToUpdate: string[] = []

  for (const doc of docs) {
    const id = orama.getDocumentIndexId(doc)

    if (typeof id !== 'string') {
      throw createError('DOCUMENT_ID_MUST_BE_STRING', typeof id)
    }

    const existingDoc = orama.documentsStore.get(orama.data.docs, id)

    if (existingDoc) {
      docsToUpdate.push(doc)
      idsToUpdate.push(id)
    } else {
      docsToInsert.push(doc)
    }
  }

  // Perform bulk operations
  const results: string[] = []

  if (docsToUpdate.length > 0) {
    const updateResults = await updateMultiple(orama, idsToUpdate, docsToUpdate, batchSize, language, skipHooks)
    results.push(...updateResults)
  }

  if (docsToInsert.length > 0) {
    const insertResults = await innerInsertMultiple(orama, docsToInsert, batchSize, language, skipHooks)
    results.push(...insertResults)
  }

  if (!skipHooks && orama.afterUpsertMultiple) {
    await runMultipleHook(orama.afterUpsertMultiple, orama, results)
  }

  return results
}

function upsertMultipleSync<T extends AnyOrama>(
  orama: T,
  docs: PartialSchemaDeep<TypedDocument<T>>[],
  batchSize?: number,
  language?: string,
  skipHooks?: boolean
): string[] {
  if (!skipHooks && orama.beforeUpsertMultiple) {
    runMultipleHook(orama.beforeUpsertMultiple, orama, docs as TypedDocument<T>[])
  }

  // Validate all documents first
  const docsLength = docs.length
  for (let i = 0; i < docsLength; i++) {
    const errorProperty = orama.validateSchema(docs[i], orama.schema)
    if (errorProperty) {
      throw createError('SCHEMA_VALIDATION_FAILURE', errorProperty)
    }
  }

  // Separate documents into insert and update arrays
  const docsToInsert: PartialSchemaDeep<TypedDocument<T>>[] = []
  const docsToUpdate: PartialSchemaDeep<TypedDocument<T>>[] = []
  const idsToUpdate: string[] = []

  for (const doc of docs) {
    const id = orama.getDocumentIndexId(doc)

    if (typeof id !== 'string') {
      throw createError('DOCUMENT_ID_MUST_BE_STRING', typeof id)
    }

    const existingDoc = orama.documentsStore.get(orama.data.docs, id)

    if (existingDoc) {
      docsToUpdate.push(doc)
      idsToUpdate.push(id)
    } else {
      docsToInsert.push(doc)
    }
  }

  // Perform bulk operations
  const results: string[] = []

  if (docsToUpdate.length > 0) {
    const updateResults = updateMultiple(orama, idsToUpdate, docsToUpdate, batchSize, language, skipHooks) as string[]
    results.push(...updateResults)
  }

  if (docsToInsert.length > 0) {
    const insertResults = innerInsertMultiple(orama, docsToInsert, batchSize, language, skipHooks) as string[]
    results.push(...insertResults)
  }

  if (!skipHooks && orama.afterUpsertMultiple) {
    runMultipleHook(orama.afterUpsertMultiple, orama, results)
  }

  return results
}
