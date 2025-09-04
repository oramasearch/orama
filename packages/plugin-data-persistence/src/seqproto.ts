import type { Ser, Des } from 'seqproto'
import type { RawData, AnyOrama } from '@orama/orama'
import { save } from '@orama/orama'
import { createSer, createDes } from 'seqproto'

type JSONLike = null | string | number | boolean | undefined | JSONLike[] | { [k: string]: JSONLike }

// Fast serializers for known Orama structures
function serializeStringArray(ser: Ser, arr: string[]): void {
  ser.serializeUInt32(arr.length)
  for (let i = 0; i < arr.length; i++) {
    ser.serializeString(arr[i])
  }
}

function deserializeStringArray(des: Des): string[] {
  const len = des.deserializeUInt32()
  const arr = new Array<string>(len)
  for (let i = 0; i < len; i++) {
    arr[i] = des.deserializeString()
  }
  return arr
}

function serializeNumberArray(ser: Ser, arr: number[]): void {
  ser.serializeUInt32(arr.length)
  for (let i = 0; i < arr.length; i++) {
    ser.serializeNumber(arr[i])
  }
}

function deserializeNumberArray(des: Des): number[] {
  const len = des.deserializeUInt32()
  const arr = new Array<number>(len)
  for (let i = 0; i < len; i++) {
    arr[i] = des.deserializeNumber()
  }
  return arr
}

function serializeIndexNode(ser: Ser, type: string, node: any): void {
  if (type === 'Radix') {
    ser.serializeUInt32(1) // Radix marker
    ser.serializeString(node.w || '')
    ser.serializeString(node.s || '')
    ser.serializeBoolean(node.e || false)
    ser.serializeString(node.k || '')

    // Serialize array d
    if (Array.isArray(node.d)) {
      ser.serializeUInt32(node.d.length)
      for (let i = 0; i < node.d.length; i++) {
        ser.serializeNumber(node.d[i])
      }
    } else {
      ser.serializeUInt32(0)
    }

    // Serialize children c
    if (Array.isArray(node.c)) {
      ser.serializeUInt32(node.c.length)
      for (let i = 0; i < node.c.length; i++) {
        const [key, child] = node.c[i]
        ser.serializeString(key)
        serializeIndexNode(ser, 'Radix', child)
      }
    } else {
      ser.serializeUInt32(0)
    }
  } else if (type === 'Flat') {
    ser.serializeUInt32(2) // Flat marker
    // Serialize Flat tree structure
    if (node.numberToDocumentId && Array.isArray(node.numberToDocumentId)) {
      ser.serializeUInt32(node.numberToDocumentId.length)
      for (let i = 0; i < node.numberToDocumentId.length; i++) {
        const [key, ids] = node.numberToDocumentId[i]
        ser.serializeString(String(key))
        // Ensure ids are strings
        const stringIds = Array.isArray(ids) ? ids.map((id) => String(id)) : []
        serializeStringArray(ser, stringIds)
      }
    } else {
      ser.serializeUInt32(0)
    }
  } else {
    // Unknown type, serialize as generic object
    ser.serializeUInt32(0)
    serializeValue(ser, node)
  }
}

function deserializeIndexNode(des: Des): any {
  const nodeType = des.deserializeUInt32()

  if (nodeType === 1) {
    // Radix node
    const w = des.deserializeString()
    const s = des.deserializeString()
    const e = des.deserializeBoolean()
    const k = des.deserializeString()
    const d = deserializeNumberArray(des)

    const childrenLen = des.deserializeUInt32()
    const c = []
    for (let i = 0; i < childrenLen; i++) {
      const key = des.deserializeString()
      const child = deserializeIndexNode(des)
      c.push([key, child])
    }

    return { w: w || '', s: s || '', e, k: k || '', d, c }
  } else if (nodeType === 2) {
    // Flat node
    const numberToDocumentIdLen = des.deserializeUInt32()
    const numberToDocumentId = []
    for (let i = 0; i < numberToDocumentIdLen; i++) {
      const key = des.deserializeString()
      const ids = deserializeStringArray(des)
      numberToDocumentId.push([key, ids])
    }
    return { numberToDocumentId }
  } else {
    // Generic fallback
    return deserializeValue(des)
  }
}

function serializeStringToNumberMap(ser: Ser, map: Record<string, number>): void {
  const keys = Object.keys(map)
  ser.serializeUInt32(keys.length)
  const keysLength = keys.length
  for (let i = 0; i < keysLength; i++) {
    const key = keys[i]
    ser.serializeString(key)
    ser.serializeNumber(map[key])
  }
}

function deserializeStringToNumberMap(des: Des): Record<string, number> {
  const len = des.deserializeUInt32()
  const map: Record<string, number> = {}
  for (let i = 0; i < len; i++) {
    const key = des.deserializeString()
    map[key] = des.deserializeNumber()
  }
  return map
}

// Serialization for frequencies: field -> docId -> token -> number
function serializeFrequencies(ser: Ser, frequencies: any): void {
  const fieldKeys = Object.keys(frequencies)
  const fieldKeysLength = fieldKeys.length
  ser.serializeUInt32(fieldKeysLength)
  for (let i = 0; i < fieldKeysLength; i++) {
    const field = fieldKeys[i]
    ser.serializeString(field)
    const docFreqs = frequencies[field] || {}
    const docIds = Object.keys(docFreqs)
    ser.serializeUInt32(docIds.length)
    for (let j = 0; j < docIds.length; j++) {
      const docId = docIds[j]
      ser.serializeString(docId)
      serializeStringToNumberMap(ser, docFreqs[docId] || {})
    }
  }
}

function deserializeFrequencies(des: Des): any {
  const fieldCount = des.deserializeUInt32()
  const frequencies: any = {}
  for (let i = 0; i < fieldCount; i++) {
    const field = des.deserializeString()
    const docCount = des.deserializeUInt32()
    const docFreqs: any = {}
    for (let j = 0; j < docCount; j++) {
      const docId = des.deserializeString()
      docFreqs[docId] = deserializeStringToNumberMap(des)
    }
    frequencies[field] = docFreqs
  }
  return frequencies
}

// Serialization for tokenOccurrences: field -> token -> number
function serializeTokenOccurrences(ser: Ser, tokenOccurrences: any): void {
  const fieldKeys = Object.keys(tokenOccurrences)
  ser.serializeUInt32(fieldKeys.length)
  for (let i = 0; i < fieldKeys.length; i++) {
    const field = fieldKeys[i]
    ser.serializeString(field)
    serializeStringToNumberMap(ser, tokenOccurrences[field] || {})
  }
}

function deserializeTokenOccurrences(des: Des): any {
  const fieldCount = des.deserializeUInt32()
  const tokenOccurrences: any = {}
  for (let i = 0; i < fieldCount; i++) {
    const field = des.deserializeString()
    tokenOccurrences[field] = deserializeStringToNumberMap(des)
  }
  return tokenOccurrences
}

// Fallback for version 1 compatibility
function serializeValue(ser: Ser, value: JSONLike): void {
  if (value === null) {
    ser.serializeUInt32(0)
    return
  }
  if (value === undefined) {
    ser.serializeUInt32(1)
    return
  }

  const t = typeof value
  if (t === 'string') {
    ser.serializeUInt32(2)
    ser.serializeString(value as string)
    return
  }
  if (t === 'number') {
    ser.serializeUInt32(3)
    ser.serializeNumber(value as number)
    return
  }
  if (t === 'boolean') {
    ser.serializeUInt32(4)
    ser.serializeBoolean(value as boolean)
    return
  }
  if (Array.isArray(value)) {
    ser.serializeUInt32(5)
    ser.serializeUInt32(value.length)
    for (let i = 0; i < value.length; i++) {
      serializeValue(ser, value[i] as JSONLike)
    }
    return
  }

  // Object
  ser.serializeUInt32(6)
  const obj = value as Record<string, JSONLike>
  const keys = Object.keys(obj)
  const keysLength = keys.length
  ser.serializeUInt32(keysLength)
  for (let i = 0; i < keysLength; i++) {
    const key = keys[i]
    ser.serializeString(key)
    serializeValue(ser, obj[key])
  }
}

function deserializeValue(des: Des): JSONLike {
  const type = des.deserializeUInt32()
  if (type === 0) return null
  if (type === 1) return undefined
  if (type === 2) return des.deserializeString()
  if (type === 3) return des.deserializeNumber()
  if (type === 4) return des.deserializeBoolean()
  if (type === 5) {
    const len = des.deserializeUInt32()
    const arr = new Array<JSONLike>(len)
    for (let i = 0; i < len; i++) {
      arr[i] = deserializeValue(des)
    }
    return arr
  }
  if (type === 6) {
    const len = des.deserializeUInt32()
    const obj: Record<string, JSONLike> = {}
    for (let i = 0; i < len; i++) {
      const key = des.deserializeString()
      obj[key] = deserializeValue(des)
    }
    return obj
  }
  throw new Error(`Unknown type: ${type}`)
}

/**
 * Serialize an Orama instance using seqproto with schema-aware optimization.
 */
export function serializeOramaInstance<T extends AnyOrama>(db: T): ArrayBuffer {
  const raw = save(db) as any
  const ser = createSer()

  ser.serializeUInt32(2) // format version 2 for schema-aware

  // Serialize internalDocumentIDStore
  serializeStringArray(ser, raw.internalDocumentIDStore?.internalIdToId || [])

  // Serialize docs
  ser.serializeUInt32(raw.docs?.count || 0)
  if (raw.docs?.docs) {
    const docKeys = Object.keys(raw.docs.docs)
    const docKeysLength = docKeys.length
    ser.serializeUInt32(docKeysLength)
    for (let i = 0; i < docKeysLength; i++) {
      const docId = docKeys[i]
      const doc = raw.docs.docs[docId]
      ser.serializeString(docId)

      // Serialize document fields
      const docFields = Object.keys(doc)
      const docFieldsLength = docFields.length
      ser.serializeUInt32(docFieldsLength)
      for (let j = 0; j < docFieldsLength; j++) {
        const field = docFields[j]
        ser.serializeString(field)
        const value = doc[field]

        if (Array.isArray(value)) {
          ser.serializeUInt32(1) // array marker
          serializeStringArray(ser, value)
        } else {
          ser.serializeUInt32(0) // non-array marker
          ser.serializeString(String(value))
        }
      }
    }
  } else {
    ser.serializeUInt32(0)
  }

  // Serialize indexes
  if (raw.index?.indexes) {
    const indexKeys = Object.keys(raw.index.indexes)
    const indexKeysLength = indexKeys.length
    ser.serializeUInt32(indexKeysLength)
    for (let i = 0; i < indexKeysLength; i++) {
      const key = indexKeys[i]
      const index = raw.index.indexes[key]
      ser.serializeString(key)
      ser.serializeString(index.type || '')
      ser.serializeBoolean(index.isArray || false)
      serializeIndexNode(ser, index.type || 'Radix', index.node || {})
    }
  } else {
    ser.serializeUInt32(0)
  }

  // Serialize other index properties
  serializeStringArray(ser, raw.index?.searchableProperties || [])

  // Serialize searchablePropertiesWithTypes
  const propsWithTypes = raw.index?.searchablePropertiesWithTypes || {}
  const propsKeys = Object.keys(propsWithTypes)
  const propsKeysLength = propsKeys.length
  ser.serializeUInt32(propsKeysLength)
  for (let i = 0; i < propsKeysLength; i++) {
    const key = propsKeys[i]
    ser.serializeString(key)
    ser.serializeString(propsWithTypes[key])
  }

  // Serialize complex nested structures
  serializeFrequencies(ser, raw.index?.frequencies || {})
  serializeTokenOccurrences(ser, raw.index?.tokenOccurrences || {})
  serializeStringToNumberMap(ser, raw.index?.avgFieldLength || {})

  // Serialize fieldLengths (nested map structure)
  const fieldLengths = raw.index?.fieldLengths || {}
  const fieldKeys = Object.keys(fieldLengths)
  const fieldKeysLength = fieldKeys.length
  ser.serializeUInt32(fieldKeysLength)
  for (let i = 0; i < fieldKeysLength; i++) {
    const field = fieldKeys[i]
    ser.serializeString(field)
    serializeStringToNumberMap(ser, fieldLengths[field] || {})
  }

  // Serialize language
  ser.serializeString(raw.language || '')

  return ser.getBuffer()
}

/**
 * Deserialize a previously serialized snapshot with schema-aware deserialization.
 */
export function deserializeOramaInstance(buffer: ArrayBuffer): RawData {
  const des = createDes(buffer as any)
  const version = des.deserializeUInt32()

  if (version === 1) {
    // Fallback to old generic deserialization
    const raw = deserializeValue(des) as unknown as RawData
    return raw
  }

  if (version !== 2) {
    throw new Error(`Unsupported seqproto Orama serialization version: ${version}`)
  }

  // Schema-aware deserialization
  const raw: any = {}

  // Deserialize internalDocumentIDStore
  const internalIdToId = deserializeStringArray(des)
  raw.internalDocumentIDStore = { internalIdToId }

  // Deserialize docs
  const docCount = des.deserializeUInt32()
  const docsLength = des.deserializeUInt32()
  const docs: any = {}

  for (let i = 0; i < docsLength; i++) {
    const docId = des.deserializeString()
    const doc: any = {}

    const fieldCount = des.deserializeUInt32()
    for (let j = 0; j < fieldCount; j++) {
      const field = des.deserializeString()
      const isArray = des.deserializeUInt32()

      if (isArray) {
        doc[field] = deserializeStringArray(des)
      } else {
        doc[field] = des.deserializeString()
      }
    }
    docs[docId] = doc
  }

  raw.docs = { docs, count: docCount }

  // Deserialize indexes
  const indexCount = des.deserializeUInt32()
  const indexes: any = {}

  for (let i = 0; i < indexCount; i++) {
    const key = des.deserializeString()
    const type = des.deserializeString()
    const isArray = des.deserializeBoolean()
    const node = deserializeIndexNode(des)

    indexes[key] = { type, isArray, node }
  }

  // Deserialize other index properties
  const searchableProperties = deserializeStringArray(des)

  // Deserialize searchablePropertiesWithTypes
  const propsWithTypesLen = des.deserializeUInt32()
  const searchablePropertiesWithTypes: any = {}
  for (let i = 0; i < propsWithTypesLen; i++) {
    const key = des.deserializeString()
    const value = des.deserializeString()
    searchablePropertiesWithTypes[key] = value
  }

  // Deserialize complex nested structures
  const frequencies = deserializeFrequencies(des)
  const tokenOccurrences = deserializeTokenOccurrences(des)
  const avgFieldLength = deserializeStringToNumberMap(des)

  // Deserialize fieldLengths
  const fieldLengthsLen = des.deserializeUInt32()
  const fieldLengths: any = {}
  for (let i = 0; i < fieldLengthsLen; i++) {
    const field = des.deserializeString()
    fieldLengths[field] = deserializeStringToNumberMap(des)
  }

  raw.index = {
    indexes,
    vectorIndexes: {},
    searchableProperties,
    searchablePropertiesWithTypes,
    frequencies,
    tokenOccurrences,
    avgFieldLength,
    fieldLengths
  }

  // Deserialize language
  raw.language = des.deserializeString()

  // Set empty sorting - it will be reconstructed by Orama when needed
  raw.sorting = {}

  return raw as RawData
}

/**
 * Utility to deep-clone raw data using seqproto encode/decode cycle.
 */
export function cloneRawData(raw: RawData): RawData {
  const ser = createSer()
  ser.serializeUInt32(1)
  serializeValue(ser, raw as unknown as JSONLike)
  const des = createDes(ser.getBuffer() as any)
  des.deserializeUInt32() // version
  return deserializeValue(des) as unknown as RawData
}
