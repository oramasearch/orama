#!/usr/bin/env node

import 'dotenv/config'
import { create, insert, search } from '@orama/orama'
import { pluginPgvector } from '../dist/index.js'

// For production, you would use real embeddings from:
// - OpenAI: https://platform.openai.com/docs/guides/embeddings
// - Cohere: https://docs.cohere.com/docs/embeddings
// - Hugging Face: https://huggingface.co/docs/api-inference/detailed_parameters#feature-extraction-task
// - Or the @orama/plugin-embeddings with proper TensorFlow setup

// Mock embedding function (replace with real API calls)
function generateEmbeddings(text) {
// you would call an external API here to get real embeddings
  const words = text.split(' ')
  const vector = new Array(384).fill(0)
  words.forEach((word, i) => {
    vector[i % 384] += word.charCodeAt(0)
  })
  return vector
}

// Configuration
const CONNECTION_STRING = process.env.NEON_CONNECTION_STRING
const DIMENSION = 384 // Mock embedding dimension

if (!CONNECTION_STRING) {
  console.error('❌ Please set NEON_CONNECTION_STRING environment variable')
  console.log('Example: export NEON_CONNECTION_STRING="postgresql://user:pass@host/db"')
  process.exit(1)
}

// Sample data
const documents = [
  {
    id: 'doc_1',
    title: 'Machine Learning Basics',
    content: 'Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.',
    embedding: generateEmbeddings('Machine Learning Basics Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.')
  },
  {
    id: 'doc_2',
    title: 'Deep Learning',
    content: 'Deep learning uses neural networks with multiple layers to process data and make predictions.',
    embedding: generateEmbeddings('Deep Learning Deep learning uses neural networks with multiple layers to process data and make predictions.')
  },
  {
    id: 'doc_3',
    title: 'Natural Language Processing',
    content: 'NLP combines linguistics with machine learning to help computers understand and generate human language.',
    embedding: generateEmbeddings('Natural Language Processing NLP combines linguistics with machine learning to help computers understand and generate human language.')
  },
  {
    id: 'doc_4',
    title: 'Computer Vision',
    content: 'Computer vision enables machines to interpret and understand visual information from the world.',
    embedding: generateEmbeddings('Computer Vision Computer vision enables machines to interpret and understand visual information from the world.')
  },
  {
    id: 'doc_5',
    title: 'Reinforcement Learning',
    content: 'Reinforcement learning is a type of machine learning where agents learn by interacting with their environment.',
    embedding: generateEmbeddings('Reinforcement Learning Reinforcement learning is a type of machine learning where agents learn by interacting with their environment.')
  },
  {
    id: 'doc_6',
    title: 'Neural Networks',
    content: 'Neural networks are computing systems inspired by biological neural networks in animal brains.',
    embedding: generateEmbeddings('Neural Networks Neural networks are computing systems inspired by biological neural networks in animal brains.')
  },
  {
    id: 'doc_7',
    title: 'Supervised Learning',
    content: 'Supervised learning uses labeled training data to teach algorithms to predict outcomes.',
    embedding: generateEmbeddings('Supervised Learning Supervised learning uses labeled training data to teach algorithms to predict outcomes.')
  },
  {
    id: 'doc_8',
    title: 'Unsupervised Learning',
    content: 'Unsupervised learning finds hidden patterns in data without labeled training examples.',
    embedding: generateEmbeddings('Unsupervised Learning Unsupervised learning finds hidden patterns in data without labeled training examples.')
  },
  {
    id: 'doc_9',
    title: 'Data Science',
    content: 'Data science combines statistics, programming, and domain expertise to extract insights from data.',
    embedding: generateEmbeddings('Data Science Data science combines statistics, programming, and domain expertise to extract insights from data.')
  },
  {
    id: 'doc_10',
    title: 'Artificial Intelligence Ethics',
    content: 'AI ethics addresses the moral implications of artificial intelligence development and deployment.',
    embedding: generateEmbeddings('Artificial Intelligence Ethics AI ethics addresses the moral implications of artificial intelligence development and deployment.')
  }
]

async function runQuickTest() {
  console.log('🚀 Quick test of @orama/plugin-pgvector')
  console.log('=' .repeat(50))

  try {
    // 1. Setup database
    console.log('🔧 Setting up database...')
    const db = await create({
      schema: {
        id: 'string',
        title: 'string',
        content: 'string',
        embedding: `vector[${DIMENSION}]`
      },
      plugins: [
        pluginPgvector({
          connectionString: CONNECTION_STRING,
          dimension: DIMENSION,
          memoryLimit: '50MB',
          lazyLoad: true
        })
      ]
    })
    console.log('🔌 Plugins registered:', db.plugins?.length || 0)
    console.log('🔌 afterInsert hooks:', db.afterInsert?.length || 0)
    console.log('✅ Database connected!')

    // 2. Insert documents
    console.log('\n📥 Inserting documents...')
    for (const doc of documents) {
      console.log(`  → Inserting: ${doc.title}`)
      await insert(db, doc)
      console.log(`  ✓ Inserted: ${doc.title}`)
    }

    // Add a small delay to ensure writes are committed
    console.log('\n⏳ Waiting for database writes to commit...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 3. Perform vector search
    console.log('\n🎯 Performing vector search...')
    const searchQuery = 'neural networks and deep learning algorithms'
    const queryEmbedding = generateEmbeddings(searchQuery)

    const results = await search(db, {
      mode: 'vector',
      vector: {
        property: 'embedding',
        value: queryEmbedding
      },
      similarity: 0.6,  // Lower threshold to get more results
      limit: 5
    })

    console.log(`\n📊 Search results for "${searchQuery}":`)
    console.log(`Found ${results.hits.length} matches:`)

    results.hits.forEach((hit, index) => {
      console.log(`\n${index + 1}. ${hit.document.title}`)
      console.log(`   Score: ${hit.score.toFixed(3)}`)
      console.log(`   Content: ${hit.document.content.substring(0, 80)}...`)
    })

    // 4. Perform another search to demonstrate different queries
    console.log('\n🎯 Performing second vector search...')
    const searchQuery2 = 'machine learning training data and algorithms'
    const queryEmbedding2 = generateEmbeddings(searchQuery2)

    const results2 = await search(db, {
      mode: 'vector',
      vector: {
        property: 'embedding',
        value: queryEmbedding2
      },
      similarity: 0.6,
      limit: 4
    })

    console.log(`\n📊 Search results for "${searchQuery2}":`)
    console.log(`Found ${results2.hits.length} matches:`)

    results2.hits.forEach((hit, index) => {
      console.log(`\n${index + 1}. ${hit.document.title}`)
      console.log(`   Score: ${hit.score.toFixed(3)}`)
      console.log(`   Content: ${hit.document.content.substring(0, 80)}...`)
    })

    console.log('\n' + '=' .repeat(50))
    console.log('🎉 Test completed successfully!')
    console.log('Your pgvector plugin is working! 🚀')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    if (error.message.includes('connect')) {
      console.log('\n💡 Check your NEON_CONNECTION_STRING:')
      console.log('   - Make sure the database exists')
      console.log('   - Verify your credentials')
      console.log('   - Ensure pgvector extension is installed')
    }
    process.exit(1)
  }
}

// Run the test
runQuickTest()