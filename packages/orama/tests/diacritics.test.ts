import t from 'tap'
import { replaceDiacritics } from '../src/components/tokenizer/diacritics.js'
import { create, insert, search } from '../src/index.js'

t.test('Diacritics Replacer', async (t) => {
  t.test('should replace diacritics', async (t) => {
    const I1 = 'áàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ'
    const I2 = 'áaauioèaíïóiuubnÁoiÃotytÓhygÚnÑ'
    const I3 = 'aaaaeeeiiooooucnAAAAEEIIOOOOUCN'

    const O1 = replaceDiacritics(I1)
    const O2 = replaceDiacritics(I2)
    const O3 = replaceDiacritics(I3)

    t.equal(O1, 'aaaaeeeiiooooucnAAAAEEIIOOOOUCN')
    t.equal(O2, `aaauioeaiioiuubnAoiAotytOhygUnN`)
    t.equal(O3, `aaaaeeeiiooooucnAAAAEEIIOOOOUCN`)
  })
})

t.test('Diacritics Replacer with long strings', async (t) => {
  t.test('should replace diacritics in a string of 500000 characters', async (t) => {
    const length = 500_000
    // A pattern of 3 characters does not align with the chunk boundaries
    const input = 'aéü'.repeat(Math.ceil(length / 3)).slice(0, length)
    const expected = 'aeu'.repeat(Math.ceil(length / 3)).slice(0, length)

    const output = replaceDiacritics(input)

    t.equal(output.length, length)
    t.ok(output === expected, 'every character is replaced')
  })

  t.test('should handle strings around the chunk size', async (t) => {
    for (const length of [0, 1, 8191, 8192, 8193, 16384, 16385]) {
      t.equal(replaceDiacritics('é'.repeat(length)), 'e'.repeat(length), `length ${length}`)
    }
  })

  t.test('should leave a long string without diacritics unchanged', async (t) => {
    const input = 'x'.repeat(150_000)
    t.ok(replaceDiacritics(input) === input)
  })

  t.test('should be able to index and find a document with a very long token', async (t) => {
    const db = create({ schema: { text: 'string' } as const })
    const token = 'x'.repeat(200_000)

    await insert(db, { text: token })
    const results = await search(db, { term: token })

    t.equal(results.count, 1)
  })
})
