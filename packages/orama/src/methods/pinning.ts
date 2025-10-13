import type { AnyOrama } from '../types.js'
import type { PinRule } from '../components/pinning.js'

/**
 * Insert a new pinning rule into the database.
 * Pinning rules allow you to promote specific documents to specific positions in search results
 * based on conditional matching of the search term.
 *
 * @example
 * ```typescript
 * import { create, insert, insertPin } from '@orama/orama'
 *
 * const db = await create({
 *   schema: {
 *     title: 'string',
 *     description: 'string'
 *   }
 * })
 *
 * await insert(db, { id: '1', title: 'Product A' })
 * await insert(db, { id: '2', title: 'Product B' })
 *
 * // When searching for "featured", pin Product B to position 0
 * insertPin(db, {
 *   id: 'featured-products',
 *   conditions: [
 *     { anchoring: 'contains', pattern: 'featured' }
 *   ],
 *   consequence: {
 *     promote: [
 *       { doc_id: '2', position: 0 }
 *     ]
 *   }
 * })
 * ```
 */
export function insertPin<T extends AnyOrama>(orama: T, rule: PinRule): void {
  ;(orama as any).pinning.addRule((orama as any).data.pinning, rule)
}

/**
 * Remove a pinning rule from the database by its ID.
 *
 * @example
 * ```typescript
 * deletePin(db, 'featured-products')
 * ```
 */
export function deletePin<T extends AnyOrama>(orama: T, ruleId: string): boolean {
  return (orama as any).pinning.removeRule((orama as any).data.pinning, ruleId)
}

/**
 * Get a specific pinning rule by its ID.
 *
 * @example
 * ```typescript
 * const rule = getPin(db, 'featured-products')
 * console.log(rule)
 * ```
 */
export function getPin<T extends AnyOrama>(orama: T, ruleId: string): PinRule | undefined {
  return (orama as any).pinning.getRule((orama as any).data.pinning, ruleId)
}

/**
 * Get all pinning rules in the database.
 *
 * @example
 * ```typescript
 * const allRules = getAllPins(db)
 * console.log(`Total rules: ${allRules.length}`)
 * ```
 */
export function getAllPins<T extends AnyOrama>(orama: T): PinRule[] {
  return (orama as any).pinning.getAllRules((orama as any).data.pinning)
}
