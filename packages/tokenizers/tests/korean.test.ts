import t from 'tap'
import { create, insert, search } from '@orama/orama'
import { createTokenizer } from '../src/korean.js'

const db = create({
  schema: {
    name: 'string'
  },
  components: {
    tokenizer: createTokenizer()
  }
})

function getHitsNames(hits) {
  return hits.map((hit) => hit.document.name)
}

t.test('Korean tokenizer', async (t) => {
  await insert(db, { name: '서울' }) // Seoul
  await insert(db, { name: '부산' }) // Busan
  await insert(db, { name: '대구' }) // Daegu
  await insert(db, { name: '인천' }) // Incheon
  await insert(db, { name: '광주' }) // Gwangju
  await insert(db, { name: '수원' }) // Suwon
  await insert(db, { name: '포항' }) // Pohang
  await insert(db, { name: '서울대학교' }) // Seoul National University
  await insert(db, { name: '부산대학교' }) // Pusan National University
  await insert(db, { name: '포항공과대학교' }) // Pohang University of Science and Technology

  const resultsSeoul = await search(db, { term: '서울', threshold: 0 })

  t.equal(resultsSeoul.count, 2)
  t.equal(getHitsNames(resultsSeoul.hits).join(', '), '서울, 서울대학교')

  const resultsBusan = await search(db, { term: '부산', threshold: 0 })

  t.equal(resultsBusan.count, 2)
  t.equal(getHitsNames(resultsBusan.hits).join(', '), '부산, 부산대학교')

  const resultsGwangju = await search(db, { term: '광주', threshold: 0 })

  t.equal(resultsGwangju.count, 1)
  t.equal(getHitsNames(resultsGwangju.hits).join(', '), '광주')

  const resultsIncheon = await search(db, { term: '인천', threshold: 0 })

  t.equal(resultsIncheon.count, 1)
  t.equal(getHitsNames(resultsIncheon.hits).join(', '), '인천')

  const resultsPohang = await search(db, { term: '포항', threshold: 0 })

  t.equal(resultsPohang.count, 2)
  t.equal(getHitsNames(resultsPohang.hits).join(', '), '포항, 포항공과대학교')
})
