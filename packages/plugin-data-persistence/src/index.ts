import { decode, encode } from '@msgpack/msgpack'
import type { AnyOrama } from '@orama/orama'
import { create, load, save } from '@orama/orama'
import type { PersistenceFormat, Runtime } from './types.js'
// @ts-expect-error dpack does not expose types
import * as dpack from 'dpack'
import { METHOD_MOVED, UNSUPPORTED_FORMAT } from './errors.js'
import { detectRuntime } from './utils.js'
import { serializeOramaInstance, deserializeOramaInstance } from './seqproto.js'

const hexFromMap: Record<string, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15
}
const hexToMap = Object.keys(hexFromMap)

/* c8 ignore next 13 */
function slowHexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2))

  hex = hex.toLowerCase()
  for (let i = 0; i < hex.length; i++) {
    const a = hexFromMap[hex[i * 2]]
    const b = hexFromMap[hex[i * 2 + 1]]
    if (a === undefined || b === undefined) {
      break
    }
    bytes[i] = (a << 4) | b
  }
  return bytes
}

/* c8 ignore next 5 */
function slowHexToString(bytes: Uint8Array): string {
  return Array.from(bytes || [])
    .map((b) => hexToMap[b >> 4] + hexToMap[b & 15])
    .join('')
}

export async function persist<T extends AnyOrama>(
  db: T,
  format: PersistenceFormat = 'binary',
  runtime?: Runtime
): Promise<string | Buffer | ArrayBuffer> {
  if (!runtime) {
    runtime = detectRuntime()
  }

  const dbExport = await save(db)
  let serialized: string | Buffer | ArrayBuffer

  switch (format) {
    case 'json':
      serialized = JSON.stringify(dbExport)
      break
    case 'dpack':
      serialized = dpack.serialize(dbExport)
      break
    case 'binary': {
      const msgpack = encode(dbExport)
      if (runtime === 'node') {
        serialized = Buffer.from(msgpack.buffer, msgpack.byteOffset, msgpack.byteLength)
        serialized = serialized.toString('hex')
        /* c8 ignore next 3 */
      } else {
        serialized = slowHexToString(msgpack)
      }
      break
    }
    case 'seqproto':
      serialized = serializeOramaInstance(db)
      break
    default:
      throw new Error(UNSUPPORTED_FORMAT(format))
  }

  return serialized
}

export async function restore<T extends AnyOrama>(
  format: PersistenceFormat,
  data: string | Buffer | ArrayBuffer,
  runtime?: Runtime
): Promise<T> {
  if (!runtime) {
    runtime = detectRuntime()
  }

  const db = create({
    schema: {
      __placeholder: 'string'
    }
  })
  let deserialized: any

  switch (format) {
    case 'json':
      deserialized = JSON.parse((data as any).toString())
      break
    case 'dpack':
      deserialized = dpack.parse(data)
      break
    case 'binary': {
      if (runtime === 'node') {
        data = Buffer.from((data as any).toString(), 'hex')
        /* c8 ignore next 3 */
      } else {
        // @ts-ignore
        data = slowHexToBuffer(data as string) as Buffer
      }
      deserialized = decode(data)
      break
    }
    case 'seqproto':
      {
        let ab: ArrayBuffer
        if (data instanceof ArrayBuffer) {
          ab = data
        } else if (ArrayBuffer.isView(data)) {
          const view = data as unknown as Uint8Array
          const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
          const copy = new Uint8Array(view.byteLength)
          copy.set(new Uint8Array(slice))
          ab = copy.buffer
        } else if (typeof (data as any) === 'string') {
          // If somehow a base64 or hex string is passed (should not happen in current flow)
          const buf = Buffer.from(data as string, 'binary')
          const slice = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          const copy = new Uint8Array(buf.byteLength)
          copy.set(new Uint8Array(slice))
          ab = copy.buffer
        } else {
          throw new Error('Unsupported data type for seqproto restore')
        }
        deserialized = deserializeOramaInstance(ab)
      }
      break
    default:
      throw new Error(UNSUPPORTED_FORMAT(format))
  }

  load(db, deserialized)

  return db as unknown as T
}

export async function persistToFile<T extends AnyOrama>(
  db: T,
  format: PersistenceFormat = 'json',
  path?: string,
  runtime?: Runtime
): Promise<never> {
  throw new Error(METHOD_MOVED('persistToFile'))
}

export async function restoreFromFile<T extends AnyOrama>(
  format: PersistenceFormat = 'json',
  path?: string,
  runtime?: Runtime
): Promise<never> {
  throw new Error(METHOD_MOVED('restoreFromFile'))
}
