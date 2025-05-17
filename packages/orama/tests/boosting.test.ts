import t from 'tap'
import { create, insert, search } from '../src/index.js'

t.test('boosting', async (t) => {
  t.test('field boosting', async (t) => {
    const db = await create({
      schema: {
        id: 'string',
        title: 'string',
        description: 'string'
      } as const
    })

    await insert(db, {
      id: '1',
      title: 'Powerful computer with 16GB RAM',
      description: 'A powerful computer with 16GB RAM and a 1TB SSD, perfect for gaming and video editing.'
    })

    await insert(db, {
      id: '2',
      title: 'PC with 8GB RAM. Good for gaming and browsing the web.',
      description:
        'A personal computer with 8GB RAM and a 500GB SSD, perfect for browsing the web and watching movies. This computer is also great for kids.'
    })

    const { hits: hits1 } = await search(db, {
      term: 'computer for browsing and movies'
    })

    const { hits: hits2 } = await search(db, {
      term: 'computer for browsing and movies',
      boost: {
        title: 2.5
      }
    })

    try {
      await search(db, {
        term: 'computer for browsing and movies',
        boost: {
          title: 0
        }
      })
    } catch (err) {
      t.same(err.message, `Boost value must be a number greater than, or less than 0.`)
    }

    t.equal(hits1[0].score < hits2[0].score, true)
  })
})
