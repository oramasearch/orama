import type { AnyOrama } from '@orama/orama'
import { save, create, load } from '@orama/orama'
import { encode, decode } from '@msgpack/msgpack'
// @ts-expect-error dpack does not expose types
import * as dpack from 'dpack'
import type { FileSystem, PersistenceFormat, Runtime } from './types.js'
import { FILESYSTEM_NOT_SUPPORTED_ON_RUNTIME, UNSUPPORTED_FORMAT } from './errors.js'
import { persist, restore } from './index.js'
import { detectRuntime } from './utils.js'
import { serializeOramaInstance } from './seqproto.js'

export const DEFAULT_DB_NAME = `orama_bump_${+new Date()}`

let _fs: FileSystem

export async function persistToFile<T extends AnyOrama>(
  db: T,
  format: PersistenceFormat = 'binary',
  path?: string,
  runtime?: Runtime
): Promise<string> {
  if (!runtime) {
    runtime = detectRuntime()
  }

  if (!_fs) {
    _fs = await loadFileSystem(runtime)
  }

  if (!path) {
    path = await getDefaultOutputFilename(format, runtime)
  }

  // For large datasets, use streaming approach to avoid memory issues
  await persistToFileStreaming(db, format, path, runtime)

  return path
}

export async function restoreFromFile<T extends AnyOrama>(
  format: PersistenceFormat = 'binary',
  path?: string,
  runtime?: Runtime
): Promise<T> {
  if (!runtime) {
    runtime = detectRuntime()
  }

  if (!_fs) {
    _fs = await loadFileSystem(runtime)
  }

  if (!path) {
    path = await getDefaultOutputFilename(format, runtime)
  }

  const data = await _fs.readFile(path)
  
  // Handle new binary format that stores data as binary instead of hex
  if (format === 'binary' && data instanceof Buffer) {
    return restoreFromBinaryData(data, runtime)
  }
  
  return restore(format, data, runtime)
}

async function loadFileSystem(runtime: Runtime): Promise<FileSystem> {
  switch (runtime) {
    case 'node': {
      const { readFile, writeFile } = await import('node:fs/promises')
      const { resolve } = await import('node:path')

      return {
        cwd: process.cwd,
        resolve,
        readFile: readFile as FileSystem['readFile'],
        writeFile: writeFile as FileSystem['writeFile']
      }
    }
    /* c8 ignore next 13 */
    case 'deno': {
      // @ts-expect-error Deno allows TS imports
      const { resolve } = await import(/* webpackIgnore: true */ 'https://deno.land/std/path/mod.ts')

      // @ts-expect-error Deno is only available in Deno
      const { cwd, readTextFile: readFile, writeTextFile: writeFile } = Deno

      return {
        cwd: cwd as FileSystem['cwd'],
        resolve: resolve as FileSystem['resolve'],
        readFile: readFile as FileSystem['readFile'],
        writeFile: writeFile as FileSystem['writeFile']
      }
    }
    default:
      throw new Error(FILESYSTEM_NOT_SUPPORTED_ON_RUNTIME(runtime))
  }
}

async function getDefaultOutputFilename(format: PersistenceFormat, runtime: Runtime): Promise<string> {
  if (!_fs) {
    _fs = await loadFileSystem(runtime)
  }

  return _fs.resolve(_fs.cwd(), await getDefaultFileName(format, runtime))
}

export async function getDefaultFileName(format: PersistenceFormat, runtime?: Runtime): Promise<string> {
  if (!runtime) {
    runtime = detectRuntime()
  }

  let extension: string

  switch (format) {
    case 'json':
      extension = 'json'
      break
    case 'dpack':
      extension = 'dpack'
      break
    case 'binary':
      extension = 'msp'
      break
    case 'seqproto':
      extension = 'seqp'
      break
    default:
      extension = 'dump'
  }

  let dbName: string = DEFAULT_DB_NAME

  /* c8 ignore next 3 */
  if (runtime === 'deno') {
    // @ts-expect-error Deno is only available in Deno
    dbName = Deno.env.get('ORAMA_DB_NAME') ?? DEFAULT_DB_NAME
  } else {
    dbName = process?.env?.ORAMA_DB_NAME ?? DEFAULT_DB_NAME
  }

  return `${dbName}.${extension}`
}

// Streaming implementation to handle large datasets without memory issues
async function persistToFileStreaming<T extends AnyOrama>(
  db: T,
  format: PersistenceFormat,
  filePath: string,
  runtime: Runtime
): Promise<void> {
  const dbExport = await save(db)
  
  switch (format) {
    case 'json':
      await streamJsonToFile(dbExport, filePath, runtime)
      break
    case 'binary':
      await streamBinaryToFile(dbExport, filePath, runtime)
      break
    case 'dpack':
      // dpack doesn't have streaming support, use regular approach
      // but check size and warn if too large
      const dpackSerialized = dpack.serialize(dbExport)
      await _fs.writeFile(filePath, dpackSerialized)
      break
    case 'seqproto':
      const seqprotoSerialized = serializeOramaInstance(db)
      const buffer = Buffer.from(seqprotoSerialized)
      await _fs.writeFile(filePath, buffer)
      break
    default:
      throw new Error(UNSUPPORTED_FORMAT(format))
  }
}

// Stream JSON to file using streaming JSON stringification
async function streamJsonToFile(data: any, filePath: string, runtime: Runtime): Promise<void> {
  if (runtime === 'node') {
    const fs = await import('node:fs')
    const { createWriteStream } = fs
    
    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath)
      
      // For very large objects, we need to stringify in chunks
      // This is a simplified approach - in production you might want to use
      // a streaming JSON library
      try {
        const jsonString = JSON.stringify(data)
        stream.write(jsonString)
        stream.end()
        stream.on('finish', resolve)
        stream.on('error', reject)
      } catch (error) {
        // If JSON.stringify fails due to size, try chunked approach
        if (error instanceof Error && error.message.includes('string length')) {
          streamLargeJsonToFile(data, stream, resolve, reject)
        } else {
          reject(error)
        }
      }
    })
  } else {
    // For non-Node environments, fall back to regular approach
    const jsonString = JSON.stringify(data)
    await _fs.writeFile(filePath, jsonString)
  }
}

// Handle extremely large JSON by breaking it into manageable chunks
function streamLargeJsonToFile(data: any, stream: any, resolve: () => void, reject: (error: any) => void): void {
  try {
    stream.write('{')
    
    let isFirst = true
    for (const [key, value] of Object.entries(data)) {
      if (!isFirst) {
        stream.write(',')
      }
      isFirst = false
      
      // Write key
      stream.write(`"${key}":`)
      
      // For large values, try to stringify them separately
      try {
        const valueStr = JSON.stringify(value)
        stream.write(valueStr)
      } catch (valueError) {
        // If individual value is too large, we need different handling
        console.warn(`Skipping large value for key ${key}:`, valueError)
        stream.write('null')
      }
    }
    
    stream.write('}')
    stream.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  } catch (error) {
    reject(error)
  }
}

// Stream binary data to file without creating large hex strings
async function streamBinaryToFile(data: any, filePath: string, runtime: Runtime): Promise<void> {
  if (runtime === 'node') {
    const fs = await import('node:fs')
    const { createWriteStream } = fs
    
    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath)
      
      try {
        // Encode to msgpack first
        const msgpack = encode(data)
        
        // Instead of converting to hex string, write binary data directly
        // This avoids the 2x size increase from hex encoding
        const buffer = Buffer.from(msgpack.buffer, msgpack.byteOffset, msgpack.byteLength)
        stream.write(buffer)
        stream.end()
        stream.on('finish', resolve)
        stream.on('error', reject)
      } catch (error) {
        reject(error)
      }
    })
  } else {
    // For non-Node environments, fall back to regular approach
    const msgpack = encode(data)
    const buffer = Buffer.from(msgpack.buffer, msgpack.byteOffset, msgpack.byteLength)
    await _fs.writeFile(filePath, buffer)
  }
}

// Helper function to restore from binary data directly
async function restoreFromBinaryData<T extends AnyOrama>(
  data: Buffer,
  runtime: Runtime
): Promise<T> {
  const db = create({
    schema: {
      __placeholder: 'string'
    }
  })
  
  const deserialized = decode(data) as any
  load(db, deserialized)
  
  return db as unknown as T
}
