import type { AnyOrama, TokenScore } from '../types.js'
import { getInternalDocumentId, type InternalDocumentID } from './internal-document-id-store.js'
import type { PinRule, PinningStore } from './pinning.js'
import { getMatchingRules } from './pinning.js'

/**
 * Apply pinning rules to search results.
 * This function modifies the uniqueDocsArray by:
 * 1. Finding matching pin rules based on the search term
 * 2. Inserting pinned documents at their specified positions
 * 3. Assigning high scores to pinned documents to maintain their positions
 */
export function applyPinningRules<T extends AnyOrama>(
  orama: T,
  pinningStore: PinningStore,
  uniqueDocsArray: TokenScore[],
  searchTerm: string | undefined
): TokenScore[] {
  // Get all matching rules for the current search term
  const matchingRules = getMatchingRules(pinningStore, searchTerm)

  if (matchingRules.length === 0) {
    return uniqueDocsArray
  }

  // Collect all promotions from matching rules
  const allPromotions = matchingRules.flatMap((rule) => rule.consequence.promote)

  // Sort promotions by position (lower position = higher priority)
  allPromotions.sort((a, b) => a.position - b.position)

  // Create a Set of pinned internal document IDs for fast lookup
  const pinnedInternalIds = new Set<InternalDocumentID>()
  const promotionsMap = new Map<InternalDocumentID, number>() // Map internal ID to desired position
  const positionsTaken = new Set<number>() // Track which positions are already claimed

  for (const promotion of allPromotions) {
    const internalId = getInternalDocumentId(orama.internalDocumentIDStore, promotion.doc_id)

    // Skip if document doesn't exist in the database or if this position is already taken
    if (internalId === undefined) {
      continue
    }

    // If this document is already pinned to a different position, keep the first one (lower position)
    if (promotionsMap.has(internalId)) {
      const existingPosition = promotionsMap.get(internalId)!
      if (promotion.position < existingPosition) {
        promotionsMap.set(internalId, promotion.position)
      }
      continue
    }

    // If this position is already taken, skip this promotion (first wins)
    if (positionsTaken.has(promotion.position)) {
      continue
    }

    pinnedInternalIds.add(internalId)
    promotionsMap.set(internalId, promotion.position)
    positionsTaken.add(promotion.position)
  }

  // If no valid promotions were found, return original results
  if (promotionsMap.size === 0) {
    return uniqueDocsArray
  }

  // Remove pinned documents from the original results
  const unpinnedResults = uniqueDocsArray.filter(([id]) => !pinnedInternalIds.has(id))

  // Create pinned results with their scores
  // We assign a very high base score and subtract the position to maintain order
  const BASE_PIN_SCORE = 1000000
  const pinnedResults: TokenScore[] = []

  for (const [internalId, position] of promotionsMap.entries()) {
    // Check if the document exists in the original results
    const existingResult = uniqueDocsArray.find(([id]) => id === internalId)

    if (existingResult) {
      // Document was in original results, use its score but mark it as pinned
      pinnedResults.push([internalId, BASE_PIN_SCORE - position])
    } else {
      // Document was NOT in original results (promoted from outside the result set)
      // Verify the document actually exists in the database before promoting it
      const doc = orama.documentsStore.get(orama.data.docs, internalId)
      if (doc) {
        // Assign a score of 0 (as per PR #251 behavior)
        pinnedResults.push([internalId, 0])
      }
    }
  }

  // Sort pinned results by their assigned scores (which correspond to positions)
  pinnedResults.sort((a, b) => {
    const posA = promotionsMap.get(a[0]) ?? Infinity
    const posB = promotionsMap.get(b[0]) ?? Infinity
    return posA - posB
  })

  // Insert pinned results at their specified positions
  const finalResults: TokenScore[] = []
  const pinnedByPosition = new Map<number, TokenScore>()

  for (const pinnedResult of pinnedResults) {
    const position = promotionsMap.get(pinnedResult[0])!
    pinnedByPosition.set(position, pinnedResult)
  }

  let unpinnedIndex = 0
  let currentPosition = 0

  // Build the final results array by interleaving pinned and unpinned results
  while (currentPosition < unpinnedResults.length + pinnedResults.length) {
    if (pinnedByPosition.has(currentPosition)) {
      // Insert pinned document at this position
      finalResults.push(pinnedByPosition.get(currentPosition)!)
      currentPosition++
    } else if (unpinnedIndex < unpinnedResults.length) {
      // Insert next unpinned document
      finalResults.push(unpinnedResults[unpinnedIndex])
      unpinnedIndex++
      currentPosition++
    } else {
      // No more unpinned results, add remaining pinned results
      break
    }
  }

  // Add any remaining pinned results that have positions beyond the unpinned results length
  for (const [position, pinnedResult] of pinnedByPosition.entries()) {
    if (position >= finalResults.length) {
      finalResults.push(pinnedResult)
    }
  }

  return finalResults
}
