import { AnyIndexStore, AnyOrama, SearchableType, Tokenizer } from "@orama/orama"
import { avl, bkd, flat, radix, bool, vector } from '@orama/orama/trees'
import {
  getVectorSize, index as Index, internalDocumentIDStore, isVectorType } from '@orama/orama/components'

type InternalDocumentID = internalDocumentIDStore.InternalDocumentID;

export interface QPSIndex extends AnyIndexStore {
  indexes: Record<string, Index.Tree>
  searchableProperties: string[]
  searchablePropertiesWithTypes: Record<string, SearchableType>
  stats: Record<string, {
    tokenQuantums: Record<InternalDocumentID, Record<string, number>>
    tokensLength: Map<InternalDocumentID, number>
  }>
}

export function recursiveCreate<T extends AnyOrama>(indexDatastore: QPSIndex, schema: T['schema'], prefix: string) {
  for (const entry of Object.entries<SearchableType>(schema)) {
    const prop = entry[0]
    const type = entry[1]
    const path = `${prefix}${prefix ? '.' : ''}${prop}`

    if (typeof type === 'object' && !Array.isArray(type)) {
      // Nested
      recursiveCreate(indexDatastore, type, path)
      continue
    }

    if (isVectorType(type)) {
      indexDatastore.searchableProperties.push(path)
      indexDatastore.searchablePropertiesWithTypes[path] = type
      indexDatastore.vectorIndexes[path] = {
        type: 'Vector',
        node: new vector.VectorIndex(getVectorSize(type)),
        isArray: false,
      }
    } else {
      const isArray = /\[/.test(type as string)
      switch (type) {
        case 'boolean':
        case 'boolean[]':
          indexDatastore.indexes[path] = { type: 'Bool', node: new bool.BoolNode(), isArray }
          break
        case 'number':
        case 'number[]':
          indexDatastore.indexes[path] = { type: 'AVL', node: new avl.AVLTree<number, InternalDocumentID>(0, []), isArray }
          break
        case 'string':
        case 'string[]':
          indexDatastore.indexes[path] = { type: 'Radix', node: new radix.RadixTree(), isArray }
          break
        case 'enum':
        case 'enum[]':
          indexDatastore.indexes[path] = { type: 'Flat', node: new flat.FlatTree(), isArray }
          break
        case 'geopoint':
          indexDatastore.indexes[path] = { type: 'BKD', node: new bkd.BKDTree(), isArray }
          break
        default:
          throw new Error('INVALID_SCHEMA_TYPE: ' + path)
      }

      indexDatastore.searchableProperties.push(path)
      indexDatastore.searchablePropertiesWithTypes[path] = type
    }
  }
}
  
  
const BIT_MASK_20 = 0b11111111111111111111
  
export function calculateTokenQuantum(prevValue: number, bit: number) {
  // if (prevValue < 0) {
  //   throw new Error("Overflow")
  // }
  // if (bit < 0 || bit > 20) {
  //   throw new Error("Invalid bit")
  // }

  const currentCount = count(prevValue)
  const currentSentenceMask = bitmask_20(prevValue)
  const newSentenceMask = currentSentenceMask | (1 << bit)
  return ((currentCount + 1) << 20) | newSentenceMask
}
  
export function insertString(
  value: string,
  radixTree: radix.RadixTree,
  stats: QPSIndex['stats'][string],
  prop: string,
  internalId: InternalDocumentID,
  language: string | undefined,
  tokenizer: Tokenizer,
) {
  const sentences = value.split(/\.|\?|!/)

  let quantumIndex = 0
  let tokenNumber = 0
  for (const sentence of sentences) {
    const tokens = tokenizer.tokenize(sentence, language, prop)

    for (const token of tokens) {
      tokenNumber++

      if (!stats[token]) {
        stats[token] = 0
      }

      const tokenBitIndex = Math.min(
        quantumIndex,
        20
      )

      stats.tokenQuantums[internalId][token] = calculateTokenQuantum(
        stats.tokenQuantums[internalId][token],
        tokenBitIndex
      )

      radixTree.insert(token, internalId)
    }

    // Don't increment the quantum index if the sentence is too short
    if (tokens.length > 1) {
      quantumIndex++
    }
  }

  stats.tokensLength.set(internalId, tokenNumber)
}

export function searchString(prop: {
  tokens: string[],
  radixNode: radix.RadixNode,
  exact: boolean,
  tolerance: number,
  stats: {
    tokensLength: Map<number, number>,
    tokenQuantums: Record<number, Record<string, number>>,
  },
  boostPerProp: number,
  resultMap: Map<number, [number, number]>,
  whereFiltersIDs: Set<number> | undefined,
}) {
  const tokens = prop.tokens
  const radixNode = prop.radixNode
  const exact = prop.exact
  const tolerance = prop.tolerance
  const stats = prop.stats
  const boostPerProp = prop.boostPerProp
  const resultMap = prop.resultMap
  const whereFiltersIDs = prop.whereFiltersIDs
  const tokensLength = prop.stats.tokensLength
  const tokenQuantums = prop.stats.tokenQuantums

  const findParam = {
    term: '',
    exact,
    tolerance,
  }

  let foundWords = {} as Record<string, number[]>
  const tokenLength = tokens.length
  for (let i = 0; i < tokenLength; i++) {
    const term = tokens[i]
    findParam.term = term
    const results = radixNode.find(findParam)
    foundWords = {
      ...foundWords,
      ...results
    }
  }

  const foundKeys = Object.keys(foundWords)
  const foundKeysLength = foundKeys.length
  for (let i = 0; i < foundKeysLength; i++) {
    const key = foundKeys[i]
    const matchedDocs = foundWords[key]
    const matchedDocsLength = matchedDocs.length
    const isExactMatch = tokens.includes(key)

    for (let j = 0; j < matchedDocsLength; j++) {
      const docId = matchedDocs[j]

      if (whereFiltersIDs && !whereFiltersIDs.has(docId)) {
        continue
      }

      const numberOfQuantums = tokensLength.get(docId)!
      const tokenQuantumDescriptor = tokenQuantums[docId][key]

      const occurrence = count(tokenQuantumDescriptor)
      const bitMask = bitmask_20(tokenQuantumDescriptor)
      const score = (occurrence * occurrence / numberOfQuantums + (isExactMatch ? 1 : 0)) * boostPerProp

      if (!resultMap.has(docId)) {
        resultMap.set(docId, [score, bitMask])
        continue
      }

      const current = resultMap.get(docId)!

      const totalScore = current[0]
        + numberOfOnes(current[1] & bitMask) * 2
        + score

      current[0] = totalScore
      current[1] = current[1] | bitMask
    }
  }
}

export function bitmask_20(n: number) {
  return n & BIT_MASK_20
}
export function count(n: number) {
  return n >> 20
}

export function numberOfOnes(n: number) {
  let i = 0;
  do {
      if (n&1) { ++i }
  // eslint-disable-next-line no-cond-assign
  } while (n>>=1)
  return i
}

export function removeString(
  value: string,
  radixTree: radix.RadixTree,
  prop: string,
  internalId: InternalDocumentID,
  tokenizer: Tokenizer,
  language: string | undefined,
  stats: {
    tokensLength: Map<number, number>,
    tokenQuantums: Record<number, Record<string, number>>,
  },
) {
  const tokensLength = stats.tokensLength
  const tokenQuantums = stats.tokenQuantums

  const tokens = tokenizer.tokenize(value, language, prop)

  for (const token of tokens) {
    radixTree.removeDocumentByWord(token, internalId, true)
  }

  tokensLength.delete(internalId)
  delete tokenQuantums[internalId]
}
