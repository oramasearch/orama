import type { Ser, Des } from 'seqproto'
import type { RawData, AnyOrama } from '@orama/orama'
import { save } from '@orama/orama'
import { createSer, createDes } from 'seqproto'

// Type identifiers for our generic value serialization
const TYPE_NULL = 0
const TYPE_STRING = 1
const TYPE_NUMBER = 2
const TYPE_BOOLEAN = 3
const TYPE_OBJECT = 4
const TYPE_ARRAY = 5
const TYPE_UNDEFINED = 6

type JSONLike = null | string | number | boolean | undefined | JSONLike[] | { [k: string]: JSONLike }

function serializeValue(ser: Ser, value: JSONLike): void {
  if (value === null) {
    ser.serializeUInt32(TYPE_NULL)
    return
  }
  const t = typeof value
  switch (t) {
    case 'string':
      ser.serializeUInt32(TYPE_STRING)
      ser.serializeString(value as string)
      return
    case 'number':
      ser.serializeUInt32(TYPE_NUMBER)
      ser.serializeNumber(value as number)
      return
    case 'boolean':
      ser.serializeUInt32(TYPE_BOOLEAN)
      ser.serializeBoolean(value as boolean)
      return
    case 'undefined':
      ser.serializeUInt32(TYPE_UNDEFINED)
      return
    case 'object': {
      if (Array.isArray(value)) {
        ser.serializeUInt32(TYPE_ARRAY)
        ser.serializeUInt32(value.length)
        for (let i = 0; i < value.length; i++) {
          serializeValue(ser, value[i] as JSONLike)
        }
        return
      }
      ser.serializeUInt32(TYPE_OBJECT)
      const keys = Object.keys(value as Record<string, JSONLike>)
      ser.serializeUInt32(keys.length)
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        ser.serializeString(k)
        serializeValue(ser, (value as Record<string, JSONLike>)[k])
      }
      return
    }
    default:
      // Fallback – should not reach here
      ser.serializeUInt32(TYPE_UNDEFINED)
  }
}

function deserializeValue(des: Des): JSONLike {
  const type = des.deserializeUInt32()
  switch (type) {
    case TYPE_NULL:
      return null
    case TYPE_STRING:
      return des.deserializeString()
    case TYPE_NUMBER:
      return des.deserializeNumber()
    case TYPE_BOOLEAN:
      return des.deserializeBoolean()
    case TYPE_UNDEFINED:
      return undefined
    case TYPE_ARRAY: {
      const len = des.deserializeUInt32()
      const arr = new Array<JSONLike>(len)
      for (let i = 0; i < len; i++) {
        arr[i] = deserializeValue(des)
      }
      return arr
    }
    case TYPE_OBJECT: {
      const len = des.deserializeUInt32()
      const obj: Record<string, JSONLike> = {}
      for (let i = 0; i < len; i++) {
        const key = des.deserializeString()
        obj[key] = deserializeValue(des)
      }
      return obj
    }
    default:
      throw new Error(`Unknown serialized type code: ${type}`)
  }
}

/**
 * Serialize an Orama instance using seqproto returning an ArrayBuffer.
 * It reuses Orama's save() to obtain a JSON-friendly snapshot and then
 * encodes it in a compact binary format with basic type tagging.
 */
export function serializeOramaInstance<T extends AnyOrama>(db: T): ArrayBuffer {
  const raw = save(db) as unknown as RawData
  const ser = createSer()
  ser.serializeUInt32(1) // format version
  serializeValue(ser, raw as unknown as JSONLike)
  return ser.getBuffer()
}

/**
 * Deserialize a previously serialized snapshot (serializeOramaInstance)
 * into the provided Orama instance. The instance must be created with a
 * compatible schema to the one originally saved.
 */
export function deserializeOramaInstance(buffer: ArrayBuffer): RawData {
  const des = createDes(buffer as any)
  const version = des.deserializeUInt32()
  if (version !== 1) {
    throw new Error(`Unsupported seqproto Orama serialization version: ${version}`)
  }
  const raw = deserializeValue(des) as unknown as RawData
  return raw
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
