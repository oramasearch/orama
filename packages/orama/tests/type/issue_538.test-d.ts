/* eslint-disable @typescript-eslint/no-unused-vars */
// https://github.com/oramasearch/orama/issues/538
import { expectAssignable } from 'tsd'
import { create, search } from '../../src/index.ts'

const movieSchema = {
  title: 'string'
} as const
const db = await create({ schema: movieSchema })

interface Movie {
  title: string
  year: number
}

const r = await search<typeof db, Movie>(db, { term: '' })
expectAssignable<string>(r.hits[0].document.title)
expectAssignable<number>(r.hits[0].document.year)
