import fs from 'fs'
import t from 'tap'
import { create, insert, search } from '@orama/orama'
import { createTokenizer } from '../src/mandarin.js'

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

t.test('Mandarin tokenizer', async (t) => {
  await insert(db, { name: '北京' }) // Beijing
  await insert(db, { name: '上海' }) // Shanghai
  await insert(db, { name: '广州' }) // Guangzhou
  await insert(db, { name: '深圳' }) // Shenzhen
  await insert(db, { name: '成都' }) // Chengdu
  await insert(db, { name: '杭州' }) // Hangzhou
  await insert(db, { name: '南京' }) // Nanjing
  await insert(db, { name: '北京大学' }) // Peking University
  await insert(db, { name: '上海交通大学' }) // Shanghai Jiao Tong University
  await insert(db, { name: '广州中医药大学' }) // Guangzhou University of Chinese Medicine

  const resultsBeijing = await search(db, { term: '北京', threshold: 0 })

  t.equal(resultsBeijing.count, 2)
  t.equal(getHitsNames(resultsBeijing.hits).join(', '), '北京, 北京大学')

  const resultsShanghai = await search(db, { term: '上海', threshold: 0 })

  t.equal(resultsShanghai.count, 2)
  t.equal(getHitsNames(resultsShanghai.hits).join(', '), '上海, 上海交通大学')

  const resultsGuangzhou = await search(db, { term: '广州', threshold: 0 })

  t.equal(resultsGuangzhou.count, 2)
  t.equal(getHitsNames(resultsGuangzhou.hits).join(', '), '广州, 广州中医药大学')

  const resultsShenzhen = await search(db, { term: '深圳', threshold: 0 })

  t.equal(resultsShenzhen.count, 1)
  t.equal(getHitsNames(resultsShenzhen.hits).join(', '), '深圳')

  const resultsChengdu = await search(db, { term: '成都', threshold: 0 })

  t.equal(resultsChengdu.count, 1)
  t.equal(getHitsNames(resultsChengdu.hits).join(', '), '成都')

  const resultsNan = await search(db, { term: '南', threshold: 0 })

  t.equal(resultsNan.count, 1)
  t.equal(getHitsNames(resultsNan.hits).join(', '), '南京')

  const resultsHangzhou = await search(db, { term: '杭州', threshold: 0 })

  t.equal(resultsHangzhou.count, 1)
  t.equal(getHitsNames(resultsHangzhou.hits).join(', '), '杭州')

  const resultsUniversity = await search(db, { term: '大学', threshold: 0 })

  t.equal(resultsUniversity.count, 3)
})
