import {
  AnyDocument,
  AnyOrama,
  Language,
  RawData,
  Result,
  Results,
  SearchParamsFullText,
  TypedDocument,
  load,
  save,
  search
} from '@orama/orama'
import { boundedLevenshtein } from '@orama/orama/internals'

export interface Position {
  start: number
  length: number
}

export type OramaWithHighlight<T extends AnyOrama> = T & {
  data: { positions: Record<string, Record<string, Record<string, Position[]>>> }
}

export type ResultWithPositions<ResultDocument> = Result<ResultDocument> & {
  positions: Record<string, Record<string, Position[]>>
}

export type SearchResultWithHighlight<ResultDocument> = Omit<Results<ResultDocument>, 'hits'> & {
  hits: ResultWithPositions<ResultDocument>[]
}

export type RawDataWithPositions = RawData & {
  positions: Record<string, Record<string, Record<string, Position[]>>>
}

export async function afterInsert<T extends AnyOrama>(orama: T, id: string): Promise<void> {
  if (!('positions' in orama.data)) {
    Object.assign(orama.data, { positions: {} })
  }

  await recursivePositionInsertion(
    orama as OramaWithHighlight<T>,
    (await orama.documentsStore.get(orama.data.docs, id))!,
    id
  )
}

const wordRegEx = /[\p{L}0-9_'-]+/gimu

async function recursivePositionInsertion<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: OramaWithHighlight<T>,
  doc: ResultDocument,
  id: string,
  prefix = '',
  schema: T['schema'] = orama.schema
): Promise<void> {
  orama.data.positions[id] = Object.create(null)
  for (const key of Object.keys(doc as object) as Array<keyof ResultDocument>) {
    const isNested = typeof doc[key] === 'object'
    const isSchemaNested = typeof schema[key] === 'object'
    const propName = `${prefix}${String(key)}`
    if (isNested && key in schema && isSchemaNested) {
      recursivePositionInsertion(orama, doc[key], id, propName + '.', schema[key])
    }
    if (!(typeof doc[key] === 'string' && key in schema && !isSchemaNested)) {
      continue
    }
    orama.data.positions[id][propName] = Object.create(null)
    const text = doc[key] as string
    let regExResult: RegExpExecArray | null
    while ((regExResult = wordRegEx.exec(text)) !== null) {
      const word = regExResult[0].toLowerCase()
      const key = `${orama.tokenizer.language}:${word}`
      let token: string
      if (orama.tokenizer.normalizationCache.has(key)) {
        token = orama.tokenizer.normalizationCache.get(key)!
      } else {
        ;[token] = orama.tokenizer.tokenize(word)
        orama.tokenizer.normalizationCache.set(key, token)
      }
      if (!Array.isArray(orama.data.positions[id][propName][token])) {
        orama.data.positions[id][propName][token] = []
      }
      const start = regExResult.index
      const length = regExResult[0].length
      orama.data.positions[id][propName][token].push({ start, length })
    }
  }
}

export async function searchWithHighlight<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: SearchParamsFullText<T, ResultDocument>,
  language?: Language
): Promise<SearchResultWithHighlight<ResultDocument>> {
  const result = await search(orama, params, language)
  const queryTokens: string[] = orama.tokenizer.tokenize(params.term ?? '', language)

  const hitsWithPosition: SearchResultWithHighlight<ResultDocument>['hits'] = []
  for (const hit of result.hits) {
    const hitPositions = Object.entries<any>((orama as OramaWithHighlight<T>).data.positions[hit.id])

    const hits: AnyDocument[] = []
    for (const [propName, tokens] of hitPositions) {
      const matchWithSearchTokens: [string, unknown][] = []

      const tokenEntries = Object.entries(tokens)
      for (const tokenEntry of tokenEntries) {
        const [token] = tokenEntry

        for (const queryToken of queryTokens) {
          if (params.tolerance) {
            const distance = boundedLevenshtein(token, queryToken, params.tolerance)
            if (distance.isBounded) {
              matchWithSearchTokens.push(tokenEntry)
              break
            }
          } else if (token.startsWith(queryToken)) {
            matchWithSearchTokens.push(tokenEntry)
            break
          }
        }
      }
      hits.push([propName, Object.fromEntries(matchWithSearchTokens)])
    }

    hitsWithPosition.push(Object.assign(hit, { positions: Object.fromEntries(hits) }))
  }

  result.hits = hitsWithPosition

  return result as SearchResultWithHighlight<ResultDocument>
}

export function saveWithHighlight<T extends AnyOrama>(orama: T): RawDataWithPositions {
  const data = save(orama)

  return {
    ...data,
    positions: (orama as OramaWithHighlight<T>).data.positions
  }
}

export function loadWithHighlight<T extends AnyOrama>(orama: T, raw: RawDataWithPositions): void {
  load(orama, raw)
  ;(orama as OramaWithHighlight<T>).data.positions = raw.positions
}
