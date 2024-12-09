import { create, insert, search } from '@orama/orama'
import { pluginEmbeddings } from './src/index.js'
import '@tensorflow/tfjs-node' // Or any other appropriate TensorflowJS backend

const plugin = await pluginEmbeddings({
  embeddings: {
    // Property used to store generated embeddings. Must be defined in the schema.
    defaultProperty: 'embeddings',
    onInsert: {
      // Generate embeddings at insert-time.
      // Turn off if you're inserting documents with embeddings already generated.
      generate: true,
      // Properties to use for generating embeddings at insert time.
      // These properties will be concatenated and used to generate embeddings.
      properties: ['description'],
      verbose: true,
    }
  }
})

const db = create({
  schema: {
    description: 'string',
    // Orama generates 512-dimensions vectors.
    // When using this plugin, use `vector[512]` as a type.
    embeddings: 'vector[512]'
  },
  plugins: [plugin]
})

// When using this plugin, document insertion becomes async
await insert(db, {
  description: 'Classroom Headphones Bulk 5 Pack, Student On Ear Color Varieties'
})

await insert(db, {
  description: 'Kids Wired Headphones for School Students K-12'
})

await insert(db, {
  description: 'Kids Headphones Bulk 5-Pack for K-12 School'
})

await insert(db, {
  description: 'Bose QuietComfort Bluetooth Headphones'
})

// When using this plugin, search becomes async
const results = await search(db, {
  term: 'Headphones for 12th grade students',
  mode: 'vector'
})

console.log(db.data.index.vectorIndexes)

console.log(results)