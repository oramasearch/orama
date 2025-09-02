import { createError } from '../errors.js'
import { TokenScore, BM25Params, BM25FParams } from '../types.js'
import { InternalDocumentID } from './internal-document-id-store.js'

export function prioritizeTokenScores(
  arrays: TokenScore[][],
  boost: number,
  threshold = 0,
  keywordsCount: number
): TokenScore[] {
  if (boost === 0) {
    throw createError('INVALID_BOOST_VALUE')
  }

  const tokenScoresMap = new Map<InternalDocumentID, [number, number]>()

  const mapsLength = arrays.length
  for (let i = 0; i < mapsLength; i++) {
    const arr = arrays[i]

    const entriesLength = arr.length
    for (let j = 0; j < entriesLength; j++) {
      const [token, score] = arr[j]
      const boostScore = score * boost
      const oldScore = tokenScoresMap.get(token)?.[0]

      if (oldScore !== undefined) {
        tokenScoresMap.set(token, [oldScore * 1.5 + boostScore, (tokenScoresMap?.get(token)?.[1] || 0) + 1])
      } else {
        tokenScoresMap.set(token, [boostScore, 1])
      }
    }
  }

  const tokenScores: TokenScore[] = []

  for (const tokenScoreEntry of tokenScoresMap.entries()) {
    tokenScores.push([tokenScoreEntry[0], tokenScoreEntry[1][0]])
  }

  const results = tokenScores.sort((a, b) => b[1] - a[1])

  // If threshold is 1, it means we will return all the results with at least one search term,
  // prioritizing the ones that contains more search terms (fuzzy match)
  if (threshold === 1) {
    return results
  }

  // For threshold = 0 when keywordsCount is 1 (single term search),
  // we return all matches since they automatically contain 100% of keywords
  if (threshold === 0 && keywordsCount === 1) {
    return results
  }

  // Prepare keywords count tracking for threshold handling
  const allResults = results.length
  const tokenScoreWithKeywordsCount: [InternalDocumentID, number, number][] = []

  for (const tokenScoreEntry of tokenScoresMap.entries()) {
    tokenScoreWithKeywordsCount.push([tokenScoreEntry[0], tokenScoreEntry[1][0], tokenScoreEntry[1][1]])
  }

  // Find the index of the last result with all keywords.
  // Order the documents by the number of keywords they contain, and then by the score.
  const keywordsPerToken = tokenScoreWithKeywordsCount.sort((a, b) => {
    // Compare by the third element, higher numbers first
    if (a[2] > b[2]) return -1
    if (a[2] < b[2]) return 1

    // If the third elements are equal, compare by the second element, higher numbers first
    if (a[1] > b[1]) return -1
    if (a[1] < b[1]) return 1

    // If both the second and third elements are equal, consider the elements equal
    return 0
  })

  let lastTokenWithAllKeywords: number | undefined = undefined
  for (let i = 0; i < allResults; i++) {
    if (keywordsPerToken[i][2] === keywordsCount) {
      lastTokenWithAllKeywords = i
    } else {
      break
    }
  }

  // If no results had all the keywords, either bail out earlier or normalize
  if (typeof lastTokenWithAllKeywords === 'undefined') {
    if (threshold === 0) {
      return []
    }

    lastTokenWithAllKeywords = 0
  }

  const keywordsPerTokenLength = keywordsPerToken.length
  const resultsWithIdAndScore: [number, number][] = new Array(keywordsPerTokenLength)
  for (let i = 0; i < keywordsPerTokenLength; i++) {
    resultsWithIdAndScore[i] = [keywordsPerToken[i][0], keywordsPerToken[i][1]]
  }

  // If threshold is 0, it means we will only return all the results that contains ALL the search terms (exact match)
  if (threshold === 0) {
    return resultsWithIdAndScore.slice(0, lastTokenWithAllKeywords + 1)
  }

  // If the threshold is between 0 and 1, we will return all the results that contains at least the threshold of search terms
  // For example, if threshold is 0.5, we will return all the results that contains at least 50% of the search terms
  // (fuzzy match with a minimum threshold)
  const thresholdLength =
    lastTokenWithAllKeywords + Math.ceil((threshold * 100 * (allResults - lastTokenWithAllKeywords)) / 100)

  return resultsWithIdAndScore.slice(0, Math.min(allResults, thresholdLength))
}

export function BM25(
  tf: number,
  matchingCount: number,
  docsCount: number,
  fieldLength: number,
  averageFieldLength: number,
  { k, b, d }: Required<BM25Params>
) {
  const idf = Math.log(1 + (docsCount - matchingCount + 0.5) / (matchingCount + 0.5))
  // Fixed BM25 formula - removed non-standard 'd' parameter for compatibility
  return idf * ((tf * (k + 1)) / (tf + k * (1 - b + (b * fieldLength) / averageFieldLength)))
}

export function BM25F(
  tf: number,
  matchingCount: number,
  docsCount: number,
  fieldLength: number,
  averageFieldLength: number,
  k: number,
  b: number
): number {
  const idf = Math.log(1 + (docsCount - matchingCount + 0.5) / (matchingCount + 0.5))
  const normalizedTF = (tf * (k + 1)) / (tf + k * (1 - b + (b * fieldLength) / averageFieldLength))
  return idf * normalizedTF
}

// Helper function to check if parameters are BM25F
export function isBM25F(params: BM25Params | BM25FParams): params is BM25FParams {
  return 'fields' in params && params.fields !== undefined
}

// Helper function to get field-specific parameters
export function getFieldParams(
  params: BM25Params | BM25FParams,
  fieldName: string,
  globalDefaults: Required<BM25Params>
): { k: number; b: number; weight: number } {
  if (isBM25F(params) && params.fields && params.fields[fieldName]) {
    const fieldParams = params.fields[fieldName]
    return {
      k: fieldParams.k ?? params.k ?? globalDefaults.k,
      b: fieldParams.b ?? params.b ?? globalDefaults.b,
      weight: fieldParams.weight ?? 1.0
    }
  }
  
  // Use global parameters for all fields in legacy BM25 mode
  return {
    k: params.k ?? globalDefaults.k,
    b: params.b ?? globalDefaults.b,
    weight: 1.0
  }
}
