import t from 'tap'
import { create, insertMultiple, load, remove, save, search } from '@orama/orama'
import {pluginQPS} from '../src/index.js'

t.test('plugin-qps', async t => {
    const db = create({
        schema: {
            name: 'string',
            age: 'number',
            isCool: 'boolean',
            algo: 'string[]',
            preferredNumbers: 'number[]',
        } as const,
        plugins: [pluginQPS()]
    })

    await insertMultiple(db, [
        { id: '1', name: 'foo foo foo', age: 33, isCool: true, algo: ['algo1', 'algo2'], preferredNumbers: [20] },
        { id: '2', name: 'bar bar bar', age: 32, isCool: true, algo: ['algo3'], preferredNumbers: [55] },
        { id: '3', name: 'baz baz baz', age: 22, isCool: false, algo: ['algo4'], preferredNumbers: [22] }
    ])

    const result = await search(db, {
        term: 'b'
    })

    t.equal(result.count, 2)

    const dump = await save(db)
    const restored = JSON.parse(JSON.stringify(dump))

    const db2 = create({
        schema: {
            name: 'string',
            age: 'number',
            isCool: 'boolean',
            algo: 'string[]',
            preferredNumbers: 'number[]',
        } as const,
        plugins: [pluginQPS()]
    })
    await load(db2, restored)

    const result2 = await search(db, {
        term: 'b'
    })
    t.equal(result2.count, 2)

    await remove(db2, '2')

    const result3 = await search(db2, {
        term: 'b'
    })

    t.equal(result3.count, 1)
})

t.test('filter on string', async t => {
    const db = create({
        schema: {
            name: 'string',
            surname: 'string',
        } as const,
        plugins: [pluginQPS()]
    })

    await insertMultiple(db, [
        { id: '1', name: 'Tommaso', surname: 'Allevi' },
    ])

    const result1 = await search(db, {
        term: '',
        where: {
            name: 'Tommaso'
        }
    })

    t.equal(result1.count, 1)

    const result2 = await search(db, {
        term: '',
        where: {
            name: 'Tommaso',
            surname: 'Allevi'
        }
    })

    t.equal(result2.count, 1)

    const result3 = await search(db, {
        term: '',
        where: {
            name: 'Tommaso',
            surname: 'unknown'
        }
    })

    t.equal(result3.count, 0)
})

t.test('string[] is allowed by this plugin', {only: true}, async t => {
    const db = create({
        schema: {
            title: 'string',
            category: 'string',
        },
        // Without the plugin
        // plugins: [pluginQPS()],
    })

    await insertMultiple(db, [
        {
            title: `Harry Potter and the Philosopher's Stone`,
            category: 'movie',
        },
        {
            title: 'Harry Potter and the Chamber of Secrets',
            category: 'book',
        },
    ])

    const found = await search(db, {
        term: 'Harry',
        where: {
            category: ['movie', 'book'],
        },
    })

    const db2 = create({
        schema: {
            title: 'string',
            category: 'string',
        },
        plugins: [pluginQPS()],
    })

    await insertMultiple(db2, [
        {
            title: `Harry Potter and the Philosopher's Stone`,
            category: 'movie',
        },
        {
            title: 'Harry Potter and the Chamber of Secrets',
            category: 'book',
        },
    ])

    const found2 = await search(db2, {
        term: 'Harry',
        where: {
            category: ['movie', 'book'],
        },
    })

    t.equal(found.count, found2.count)
})