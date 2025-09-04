import type { AnyOrama } from '@orama/orama'
import type { FileSystem, PersistenceFormat, Runtime } from './types.js'
import { FILESYSTEM_NOT_SUPPORTED_ON_RUNTIME } from './errors.js'
import { persist, restore } from './index.js'
import { detectRuntime } from './utils.js'

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

  const serialized = await persist(db, format, runtime)
  let toWrite: any = serialized
  // Convert ArrayBuffer (seqproto) to Buffer/String for FS
  if (serialized instanceof ArrayBuffer) {
    toWrite = Buffer.from(serialized)
  }
  await _fs.writeFile(path, toWrite)

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
