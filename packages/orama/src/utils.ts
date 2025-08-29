import type { AnyDocument, GeosearchDistanceUnit, Optional, Results, SearchableValue, TokenScore } from './types.js'
import { createError } from './errors.js'

const baseId = Date.now().toString().slice(5)
let lastId = 0

const k = 1024
const nano = BigInt(1e3)
const milli = BigInt(1e6)
const second = BigInt(1e9)

export const isServer = typeof window === 'undefined'

/**
 * This value can be increased up to 100_000
 * But i don't know if this value change from nodejs to nodejs
 * So I will keep a safer value here.
 */
export const MAX_ARGUMENT_FOR_STACK = 65535

/**
 * This method is needed to used because of issues like: https://github.com/oramasearch/orama/issues/301
 * that issue is caused because the array that is pushed is huge (>100k)
 *
 * @example
 * ```ts
 * safeArrayPush(myArray, [1, 2])
 * ```
 */
export function safeArrayPush<T>(arr: T[], newArr: T[]): void {
  if (newArr.length < MAX_ARGUMENT_FOR_STACK) {
    Array.prototype.push.apply(arr, newArr)
  } else {
    const newArrLength = newArr.length
    for (let i = 0; i < newArrLength; i += MAX_ARGUMENT_FOR_STACK) {
      Array.prototype.push.apply(arr, newArr.slice(i, i + MAX_ARGUMENT_FOR_STACK))
    }
  }
}

export function sprintf(template: string, ...args: Array<string | number>): string {
  return template.replace(
    /%(?:(?<position>\d+)\$)?(?<width>-?\d*\.?\d*)(?<type>[dfs])/g,
    function (...replaceArgs: Array<string | number | Record<string, string>>): string {
      const groups = replaceArgs[replaceArgs.length - 1] as Record<string, string>
      const { width: rawWidth, type, position } = groups

      const replacement = position ? args[Number.parseInt(position) - 1]! : args.shift()!
      const width = rawWidth === '' ? 0 : Number.parseInt(rawWidth)

      switch (type) {
        case 'd':
          return replacement.toString().padStart(width, '0')
        case 'f': {
          let value = replacement
          const [padding, precision] = rawWidth.split('.').map((w) => Number.parseFloat(w))

          if (typeof precision === 'number' && precision >= 0) {
            value = (value as number).toFixed(precision)
          }

          return typeof padding === 'number' && padding >= 0 ? value.toString().padStart(width, '0') : value.toString()
        }
        case 's':
          return width < 0
            ? (replacement as string).toString().padEnd(-width, ' ')
            : (replacement as string).toString().padStart(width, ' ')

        default:
          return replacement as string
      }
    }
  )
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function isInsideWebWorker(): boolean {
  // @ts-expect-error - WebWorker global scope
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
}

export function isInsideNode(): boolean {
  return typeof process !== 'undefined' && process.release && process.release.name === 'node'
}

export function getNanosecondTimeViaPerformance() {
  return BigInt(Math.floor(performance.now() * 1e6))
}

export function formatNanoseconds(value: number | bigint): string {
  if (typeof value === 'number') {
    value = BigInt(value)
  }

  if (value < nano) {
    return `${value}ns`
  } else if (value < milli) {
    return `${value / nano}μs`
  } else if (value < second) {
    return `${value / milli}ms`
  }

  return `${value / second}s`
}

export function getNanosecondsTime(): bigint {
  if (isInsideWebWorker()) {
    return getNanosecondTimeViaPerformance()
  }

  if (isInsideNode()) {
    return process.hrtime.bigint()
  }

  if (typeof process !== 'undefined' && typeof process?.hrtime?.bigint === 'function') {
    return process.hrtime.bigint()
  }

  if (typeof performance !== 'undefined') {
    return getNanosecondTimeViaPerformance()
  }

  // @todo: fallback to V8 native method to get microtime
  return BigInt(0)
}

export function uniqueId(): string {
  return `${baseId}-${lastId++}`
}

export function getOwnProperty<T = unknown>(object: Record<string, T>, property: string): T | undefined {
  // Checks if `hasOwn` method is defined avoiding errors with older Node.js versions
  if (Object.hasOwn === undefined) {
    return Object.prototype.hasOwnProperty.call(object, property) ? object[property] : undefined
  }

  return Object.hasOwn(object, property) ? object[property] : undefined
}

export function getTokenFrequency(token: string, tokens: string[]): number {
  let count = 0

  for (const t of tokens) {
    if (t === token) {
      count++
    }
  }

  return count
}

export function insertSortedValue(
  arr: TokenScore[],
  el: TokenScore,
  compareFn = sortTokenScorePredicate
): TokenScore[] {
  let low = 0
  let high = arr.length
  let mid

  while (low < high) {
    mid = (low + high) >>> 1
    if (compareFn(el, arr[mid]) < 0) {
      high = mid
    } else {
      low = mid + 1
    }
  }

  arr.splice(low, 0, el)

  return arr
}

export function sortTokenScorePredicate(a: TokenScore, b: TokenScore): number {
  if (b[1] === a[1]) {
    return a[0] - b[0]
  }

  return b[1] - a[1]
}

// Intersection function taken from https://github.com/lovasoa/fast_array_intersect.
// MIT Licensed at the time of writing.
export function intersect<T>(arrays: Array<readonly T[]>): T[] {
  if (arrays.length === 0) {
    return []
  } else if (arrays.length === 1) {
    return arrays[0] as T[]
  }

  for (let i = 1; i < arrays.length; i++) {
    if (arrays[i].length < arrays[0].length) {
      const tmp = arrays[0]
      arrays[0] = arrays[i]
      arrays[i] = tmp
    }
  }

  const set = new Map()
  for (const elem of arrays[0]) {
    set.set(elem, 1)
  }
  for (let i = 1; i < arrays.length; i++) {
    let found = 0
    for (const elem of arrays[i]) {
      const count = set.get(elem)
      if (count === i) {
        set.set(elem, count + 1)
        found++
      }
    }
    if (found === 0) return []
  }

  return arrays[0].filter((e) => {
    const count = set.get(e)
    if (count !== undefined) set.set(e, 0)
    return count === arrays.length
  })
}

export function getDocumentProperties(doc: AnyDocument, paths: string[]): Record<string, SearchableValue> {
  const properties: Record<string, SearchableValue> = {}

  const pathsLength = paths.length
  for (let i = 0; i < pathsLength; i++) {
    const path = paths[i]
    const pathTokens = path.split('.')

    let current: SearchableValue | AnyDocument | undefined = doc
    const pathTokensLength = pathTokens.length
    for (let j = 0; j < pathTokensLength; j++) {
      current = current[pathTokens[j]!]

      // We found an object but we were supposed to be done
      if (typeof current === 'object') {
        if (
          current !== null &&
          'lat' in current &&
          'lon' in current &&
          typeof current.lat === 'number' &&
          typeof current.lon === 'number'
        ) {
          current = properties[path] = current as SearchableValue
          break
        } else if (!Array.isArray(current) && current !== null && j === pathTokensLength - 1) {
          current = undefined
          break
        }
      } else if ((current === null || typeof current !== 'object') && j < pathTokensLength - 1) {
        // We can't recurse anymore but we were supposed to
        current = undefined
        break
      }
    }

    if (typeof current !== 'undefined') {
      properties[path] = current as SearchableValue
    }
  }

  return properties
}

export function getNested<T = SearchableValue>(obj: object, path: string): Optional<T> {
  const props = getDocumentProperties(obj as AnyDocument, [path])

  return props[path] as T | undefined
}

export function flattenObject(obj: object, prefix = ''): AnyDocument {
  const result: AnyDocument = {}

  for (const key in obj) {
    const prop = `${prefix}${key}`
    const objKey = (obj as AnyDocument)[key]

    if (typeof objKey === 'object' && objKey !== null) {
      Object.assign(result, flattenObject(objKey, `${prop}.`))
    } else {
      result[prop] = objKey
    }
  }
  return result
}

const mapDistanceToMeters = {
  cm: 0.01,
  m: 1,
  km: 1000,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344
}

export function convertDistanceToMeters(distance: number, unit: GeosearchDistanceUnit): number {
  const ratio = mapDistanceToMeters[unit]

  if (ratio === undefined) {
    throw new Error(createError('INVALID_DISTANCE_SUFFIX', distance).message)
  }

  return distance * ratio
}

export function removeVectorsFromHits(searchResult: Results<AnyDocument>, vectorProperties: string[]): void {
  searchResult.hits = searchResult.hits.map((result) => ({
    ...result,
    document: {
      ...result.document,
      // Remove embeddings from the result
      ...vectorProperties.reduce((acc, prop) => {
        const path = prop.split('.')
        const lastKey = path.pop()!
        let obj = acc
        for (const key of path) {
          obj[key] = obj[key] ?? {}
          obj = obj[key] as any
        }
        obj[lastKey] = null
        return acc
      }, result.document)
    }
  }))
}

export function isPromise(obj: any): obj is Promise<unknown> {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

/**
 * Checks if the provided input is an async function or if the input is an array
 * containing at least one async function.
 *
 * @param func - A single function or an array of functions to check.
 *               Non-function values are ignored.
 * @returns `true` if the input is an async function or an array containing at least
 *          one async function, otherwise `false`.
 */
export function isAsyncFunction(func: any): boolean {
  if (Array.isArray(func)) {
    return func.some((item) => isAsyncFunction(item))
  }

  return func?.constructor?.name === 'AsyncFunction'
}

const withIntersection = 'intersection' in new Set()

export function setIntersection<V>(...sets: Set<V>[]): Set<V> {
  // Fast path 1
  if (sets.length === 0) {
    return new Set()
  }
  // Fast path 2
  if (sets.length === 1) {
    return sets[0]
  }
  // Fast path 3
  if (sets.length === 2) {
    const set1 = sets[0]
    const set2 = sets[1]

    if (withIntersection) {
      return set1.intersection(set2)
    }
    const result = new Set<V>()
    const base = set1.size < set2.size ? set1 : set2
    const other = base === set1 ? set2 : set1
    for (const value of base) {
      if (other.has(value)) {
        result.add(value)
      }
    }
    return result
  }

  // Slow path
  // Find the smallest set
  const min = {
    index: 0,
    size: sets[0].size
  }
  for (let i = 1; i < sets.length; i++) {
    if (sets[i].size < min.size) {
      min.index = i
      min.size = sets[i].size
    }
  }

  if (withIntersection) {
    let base = sets[min.index]
    for (let i = 0; i < sets.length; i++) {
      if (i === min.index) {
        continue
      }
      base = base.intersection(sets[i])
    }

    return base
  }

  // manual implementation:
  // intersect all sets with the smallest set
  const base = sets[min.index]
  for (let i = 0; i < sets.length; i++) {
    if (i === min.index) {
      continue
    }
    const other = sets[i]
    for (const value of base) {
      if (!other.has(value)) {
        base.delete(value)
      }
    }
  }

  return base
}

const withUnion = 'union' in new Set()
export function setUnion<V>(set1: Set<V> | undefined, set2: Set<V>) {
  if (withUnion) {
    if (set1) {
      return set1.union(set2)
    }
    return set2
  }

  if (!set1) {
    return new Set(set2)
  }
  return new Set([...set1, ...set2])
}

export function setDifference<V>(set1: Set<V>, set2: Set<V>): Set<V> {
  const result = new Set<V>()
  for (const value of set1) {
    if (!set2.has(value)) {
      result.add(value)
    }
  }
  return result
}

// This code is taken from https://github.com/davidmarkclements/atomic-sleep, MIT licensed at the time of commit b8149d3ca276c84a54fa8fa1478f9cc79aabc15a.
// All credits go to the original author (David Mark Clements, https://github.com/davidmarkclements).
export function sleep(ms: number) {
  if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
    const nil = new Int32Array(new SharedArrayBuffer(4))
    const valid = ms > 0 && ms < Infinity
    if (valid === false) {
      if (typeof ms !== 'number' && typeof ms !== 'bigint') {
        throw TypeError('sleep: ms must be a number')
      }
      throw RangeError('sleep: ms must be a number that is greater than 0 but less than Infinity')
    }

    Atomics.wait(nil, 0, 0, Number(ms))
  } else {
    const valid = ms > 0 && ms < Infinity
    if (valid === false) {
      if (typeof ms !== 'number' && typeof ms !== 'bigint') {
        throw TypeError('sleep: ms must be a number')
      }
      throw RangeError('sleep: ms must be a number that is greater than 0 but less than Infinity')
    }
    const target = Date.now() + Number(ms)
    while (target > Date.now()) {
      /* empty */
    }
  }
}
