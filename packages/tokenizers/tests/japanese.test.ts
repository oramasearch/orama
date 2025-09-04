import t from 'tap'
import { create, insert, Results, search } from '@orama/orama'
import { createTokenizer } from '../src/japanese.js'

const db = create({
  schema: {
    name: 'string'
  },
  components: {
    tokenizer: createTokenizer()
  }
})

// @ts-ignore
function getHitsNames(hits) {
  // @ts-ignore
  return hits.map((hit) => hit.document.name)
}

t.test('Japanese tokenizer', async (t) => {
  await insert(db, { name: '東京' }) // Tokyo
  await insert(db, { name: '大阪' }) // Osaka
  await insert(db, { name: '京都' }) // Kyoto
  await insert(db, { name: '横浜' }) // Yokohama
  await insert(db, { name: '札幌' }) // Sapporo
  await insert(db, { name: '仙台' }) // Sendai
  await insert(db, { name: '広島' }) // Hiroshima
  await insert(db, { name: '東京大学' }) // University of Tokyo
  await insert(db, { name: '京都大学' }) // Kyoto University
  await insert(db, { name: '大阪大学' }) // Osaka University

  const resultsTokyo = await search(db, { term: '東京', threshold: 0 })

  t.equal(resultsTokyo.count, 2)
  t.equal(getHitsNames(resultsTokyo.hits).join(', '), '東京, 東京大学')

  const resultsOsaka = await search(db, { term: '大阪', threshold: 0 })

  t.equal(resultsOsaka.count, 2)
  t.equal(getHitsNames(resultsOsaka.hits).join(', '), '大阪, 大阪大学')

  const resultsKyoto = await search(db, { term: '京都', threshold: 0 })

  t.equal(resultsKyoto.count, 2)
  t.equal(getHitsNames(resultsKyoto.hits).join(', '), '京都, 京都大学')

  const resultsYokohama = await search(db, { term: '横浜', threshold: 0 })

  t.equal(resultsYokohama.count, 1)
  t.equal(getHitsNames(resultsYokohama.hits).join(', '), '横浜')

  const resultsSapporo = await search(db, { term: '札幌', threshold: 0 })

  t.equal(resultsSapporo.count, 1)
  t.equal(getHitsNames(resultsSapporo.hits).join(', '), '札幌')

  const resultsSendai = await search(db, { term: '仙台', threshold: 0 })

  t.equal(resultsSendai.count, 1)
  t.equal(getHitsNames(resultsSendai.hits).join(', '), '仙台')

  const resultsHiroshima = await search(db, { term: '広島', threshold: 0 })

  t.equal(resultsHiroshima.count, 1)
  t.equal(getHitsNames(resultsHiroshima.hits).join(', '), '広島')

  const resultsUniversity = await search(db, { term: '大学', threshold: 0 })

  t.equal(resultsUniversity.count, 3)
  t.equal(getHitsNames(resultsUniversity.hits).join(', '), '東京大学, 京都大学, 大阪大学')
})
