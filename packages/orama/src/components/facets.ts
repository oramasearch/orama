import type {
  AnyOrama,
  FacetResult,
  FacetSorting,
  FacetsParams,
  NumberFacetDefinition,
  SearchableValue,
  StringFacetDefinition,
  TokenScore
} from '../types.js'
import { createError } from '../errors.js'
import { getNested } from '../utils.js'

type FacetValue = string | boolean | number

function sortAsc(a: [string, number], b: [string, number]) {
  return a[1] - b[1]
}

function sortDesc(a: [string, number], b: [string, number]) {
  return b[1] - a[1]
}

function sortingPredicateBuilder(order: FacetSorting = 'desc') {
  return order.toLowerCase() === 'asc' ? sortAsc : sortDesc
}

export function getFacets<T extends AnyOrama>(
  orama: T,
  results: TokenScore[],
  facetsConfig: FacetsParams<T>
): FacetResult {
  const facets: FacetResult = {}
  const allIDs = results.map(([id]) => id)
  const allDocs = orama.documentsStore.getMultiple(orama.data.docs, allIDs)
  const facetKeys = Object.keys(facetsConfig!)

  const properties = orama.index.getSearchablePropertiesWithTypes(orama.data.index)

  for (const facet of facetKeys) {
    let values

    // Hack to guarantee the same order of ranges as specified by the user
    // TODO: Revisit this once components land
    if (properties[facet] === 'number') {
      const { ranges } = facetsConfig[facet] as NumberFacetDefinition
      const rangesLength = ranges.length
      const tmp: [string, number][] = Array.from({ length: rangesLength })
      for (let i = 0; i < rangesLength; i++) {
        const range = ranges[i]
        tmp[i] = [`${range.from}-${range.to}`, 0]
      }
      values = Object.fromEntries(tmp)
    }

    facets[facet] = {
      count: 0,
      values: values ?? {}
    }
  }

  const allDocsLength = allDocs.length
  for (let i = 0; i < allDocsLength; i++) {
    const doc = allDocs[i]

    for (const facet of facetKeys) {
      const facetValue = facet.includes('.') ? getNested<string>(doc!, facet)! : (doc![facet] as SearchableValue)

      const propertyType = properties[facet]
      const facetValues = facets[facet].values
      switch (propertyType) {
        case 'number': {
          const ranges = (facetsConfig[facet] as NumberFacetDefinition).ranges
          calculateNumberFacetBuilder(ranges, facetValues)(facetValue as number)
          break
        }
        case 'number[]': {
          const alreadyInsertedValues = new Set<string>()
          const ranges = (facetsConfig[facet] as NumberFacetDefinition).ranges
          const calculateNumberFacet = calculateNumberFacetBuilder(ranges, facetValues, alreadyInsertedValues)
          for (const v of facetValue as Array<number>) {
            calculateNumberFacet(v)
          }
          break
        }
        case 'boolean':
        case 'enum':
        case 'string': {
          calculateBooleanStringOrEnumFacetBuilder(facetValues, propertyType)(facetValue as FacetValue)
          break
        }
        case 'boolean[]':
        case 'enum[]':
        case 'string[]': {
          const alreadyInsertedValues = new Set<string>()
          const innerType = propertyType === 'boolean[]' ? 'boolean' : 'string'
          const calculateBooleanStringOrEnumFacet = calculateBooleanStringOrEnumFacetBuilder(
            facetValues,
            innerType,
            alreadyInsertedValues
          )
          for (const v of facetValue as Array<FacetValue>) {
            calculateBooleanStringOrEnumFacet(v)
          }
          break
        }
        default:
          throw createError('FACET_NOT_SUPPORTED', propertyType)
      }
    }
  }

  // TODO: We are looping again with the same previous keys, should we creat a single loop instead?
  for (const facet of facetKeys) {
    const currentFacet = facets[facet]
    // Count the number of values for each facet
    currentFacet.count = Object.keys(currentFacet.values).length
    // Sort only string-based facets
    if (properties[facet] === 'string') {
      const stringFacetDefinition = facetsConfig[facet] as StringFacetDefinition
      const sortingPredicate = sortingPredicateBuilder(stringFacetDefinition.sort)

      currentFacet.values = Object.fromEntries(
        Object.entries(currentFacet.values)
          .sort(sortingPredicate)
          .slice(stringFacetDefinition.offset ?? 0, stringFacetDefinition.limit ?? 10)
      )
    }
  }

  return facets
}

function calculateNumberFacetBuilder(
  ranges: NumberFacetDefinition['ranges'],
  values: Record<string, number>,
  alreadyInsertedValues?: Set<string>
) {
  return (facetValue: number) => {
    for (const range of ranges) {
      const value = `${range.from}-${range.to}`
      if (alreadyInsertedValues?.has(value)) {
        continue
      }

      if (facetValue >= range.from && facetValue <= range.to) {
        values[value] = (values[value] ?? 0) + 1

        // A document is counted once per range, even if several of its array values fall in the same range
        alreadyInsertedValues?.add(value)
      }
    }
  }
}

function calculateBooleanStringOrEnumFacetBuilder(
  values: Record<string, number>,
  propertyType: 'string' | 'boolean' | 'enum',
  alreadyInsertedValues?: Set<string>
) {
  const defaultValue = propertyType === 'boolean' ? 'false' : ''
  return (facetValue: FacetValue) => {
    // String or boolean based facets
    const value = facetValue?.toString() ?? defaultValue
    if (alreadyInsertedValues?.has(value)) {
      return
    }
    values[value] = (values[value] ?? 0) + 1
    alreadyInsertedValues?.add(value)
  }
}
