import type { Optional } from '../types.js'
import { AnyDocument, AnyDocumentStore, AnyOrama, IDocumentsStore, TypedDocument } from '../types.js'
import {
  DocumentID,
  InternalDocumentID,
  InternalDocumentIDStore,
  getInternalDocumentId
} from './internal-document-id-store.js'

export interface DocumentsStore extends AnyDocumentStore {
  sharedInternalDocumentStore: InternalDocumentIDStore
  docs: Record<InternalDocumentID, AnyDocument>
  count: number
}

export function create<T extends AnyOrama>(_: T, sharedInternalDocumentStore: InternalDocumentIDStore): DocumentsStore {
  return {
    sharedInternalDocumentStore,
    docs: {},
    count: 0
  }
}

export function get<T extends AnyOrama, ResultDocument extends TypedDocument<T>>(
  store: DocumentsStore,
  id: DocumentID
): Optional<ResultDocument> {
  const internalId = getInternalDocumentId(store.sharedInternalDocumentStore, id)

  return store.docs[internalId]
}

export function getMultiple<T extends AnyOrama, ResultDocument extends TypedDocument<T>>(
  store: DocumentsStore,
  ids: DocumentID[]
): Optional<ResultDocument>[] {
  const idsLength = ids.length
  const found: (ResultDocument | undefined)[] = Array.from({ length: idsLength })

  for (let i = 0; i < idsLength; i++) {
    const internalId = getInternalDocumentId(store.sharedInternalDocumentStore, ids[i])
    found[i] = store.docs[internalId]
  }

  return found
}

export function getAll<T extends AnyOrama, ResultDocument extends TypedDocument<T>>(
  store: DocumentsStore
): Record<InternalDocumentID, ResultDocument> {
  return store.docs
}

export function store(
  store: DocumentsStore,
  id: DocumentID,
  internalId: InternalDocumentID,
  doc: AnyDocument
): boolean {
  if (typeof store.docs[internalId] !== 'undefined') {
    return false
  }

  store.docs[internalId] = doc
  store.count++

  return true
}

export function remove(store: DocumentsStore, id: DocumentID): boolean {
  const internalId = getInternalDocumentId(store.sharedInternalDocumentStore, id)

  if (typeof store.docs[internalId] === 'undefined') {
    return false
  }

  delete store.docs[internalId]
  store.count--

  return true
}

export function count(store: DocumentsStore): number {
  return store.count
}

export function load<R = unknown>(sharedInternalDocumentStore: InternalDocumentIDStore, raw: R): DocumentsStore {
  const rawDocument = raw as DocumentsStore

  return {
    docs: rawDocument.docs,
    count: rawDocument.count,
    sharedInternalDocumentStore
  }
}

export function save<R = unknown>(store: DocumentsStore): R {
  return {
    docs: store.docs,
    count: store.count
  } as R
}

export function createDocumentsStore(): IDocumentsStore<DocumentsStore> {
  return {
    create,
    get,
    getMultiple,
    getAll,
    store,
    remove,
    count,
    load,
    save
  }
}
