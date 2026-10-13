import t from 'tap'
import { create, insert, insertMultiple, remove, search } from '../src/index.js'

// With `allowDuplicates: true` a token can appear several times in a document.
// The number of documents containing a token must still be counted once per document, otherwise it can exceed
// the number of documents in the database and the BM25 score becomes negative.

const texts = ['apple banana', 'apple apple apple apple banana', 'cherry date', 'elder fig']

function createDB(allowDuplicates: boolean) {
  return create({
    schema: { text: 'string' } as const,
    components: { tokenizer: { language: 'english', allowDuplicates } }
  })
}

async function scores(allowDuplicates: boolean, term = 'apple') {
  const db = createDB(allowDuplicates)
  await insertMultiple(
    db,
    texts.map((text) => ({ text }))
  )
  const results = await search(db, { term })
  return Object.fromEntries(results.hits.map((hit) => [hit.document.text, hit.score]))
}

t.test('allowDuplicates', async (t) => {
  t.test('scores are positive when a term is repeated inside a document', async (t) => {
    const result = await scores(true)

    t.equal(Object.keys(result).length, 2)
    for (const [text, score] of Object.entries(result)) {
      t.ok(score > 0, `"${text}" has a positive score (${score})`)
    }
  })

  t.test('counts the documents containing a token, not its occurrences', async (t) => {
    const db = createDB(true)
    await insertMultiple(
      db,
      texts.map((text) => ({ text }))
    )

    const occurrences = db.data.index.tokenOccurrences['text']
    t.equal(occurrences['apple'], 2, 'two documents contain "apple"')
    t.equal(occurrences['banana'], 2)
    t.equal(occurrences['cherry'], 1)
  })

  t.test('scores without allowDuplicates are not affected', async (t) => {
    const db = createDB(false)
    await insertMultiple(
      db,
      texts.map((text) => ({ text }))
    )

    t.equal(db.data.index.tokenOccurrences['text']['apple'], 2)
    const result = await scores(false)
    t.ok(result['apple banana'] > 0)
    t.ok(result['apple apple apple apple banana'] > 0)
  })

  t.test('removing a document leaves the counts as if it had never been inserted', async (t) => {
    const db = createDB(true)
    await insertMultiple(
      db,
      texts.map((text) => ({ text }))
    )
    const before = (await search(db, { term: 'apple' })).hits.map((hit) => [hit.document.text, hit.score])
    const occurrencesBefore = { ...db.data.index.tokenOccurrences['text'] }

    const id = await insert(db, { text: 'apple apple pear pear pear' })
    t.equal(db.data.index.tokenOccurrences['text']['apple'], 3)
    t.equal(db.data.index.tokenOccurrences['text']['pear'], 1)

    await remove(db, id)

    t.equal(db.data.index.tokenOccurrences['text']['apple'], 2)
    t.equal(db.data.index.tokenOccurrences['text']['pear'], 0)
    t.strictSame(
      { ...db.data.index.tokenOccurrences['text'], pear: undefined },
      { ...occurrencesBefore, pear: undefined }
    )

    const after = (await search(db, { term: 'apple' })).hits.map((hit) => [hit.document.text, hit.score])
    t.strictSame(after, before)
  })
})
