import type { AnswerSession as OramaCoreAnswerSession } from '@orama/core'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OramaClient } from '@oramacloud/client'
import { pluginSecureProxy } from '@orama/plugin-secure-proxy'
import { AnswerSession, create, insertMultiple } from '@orama/orama'
import { Switch } from '../src/index.js'
import { CollectionManager } from '@orama/core'

const CLOUD_URL = process.env.ORAMA_CLOUD_E2E_URL
const CLOUD_API_KEY = process.env.ORAMA_CLOUD_E2E_API_KEY
const SECURE_PROXY_API_KEY = process.env.ORAMA_SECURE_PROXY_API_KEY

const ORAMACORE_URL = process.env.ORAMACORE_E2E_URL
const ORAMACORE_COLLECTION_ID = process.env.ORAMACORE_E2E_COLLECTION_ID
const ORAMACORE_READ_API_KEY = process.env.ORAMACORE_E2E_READ_API_KEY

if (!CLOUD_URL || !CLOUD_API_KEY) {
  console.log(
    'Skipping Orama Switch remote client test since ORAMA_CLOUD_E2E_URL and ORAMA_CLOUD_E2E_API_KEY are not set'
  )
  process.exit(0)
}

if (!ORAMACORE_URL || !ORAMACORE_COLLECTION_ID || !ORAMACORE_READ_API_KEY) {
  console.log(
    'Skipping Orama Switch remote client test since ORAMACORE_E2E_URL, ORAMACORE_E2E_COLLECTION_ID and ORAMACORE_E2E_READ_API_KEY are not set'
  )
  process.exit(0)
}

test('local client', async () => {
  const db = create({
    schema: {
      name: 'string',
      age: 'number',
      embeddings: 'vector[384]'
    } as const,
    plugins: [
      pluginSecureProxy({
        apiKey: SECURE_PROXY_API_KEY!,
        chat: {
          model: 'openai/gpt-4'
        },
        embeddings: {
          defaultProperty: 'embeddings',
          model: 'openai/text-embedding-3-small'
        }
      })
    ]
  })

  await insertMultiple(db, [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 40 },
    { name: 'Charlie', age: 50 }
  ])

  const answerSession = new Switch(db).createAnswerSession({
    systemPrompt: `You're an AI agent used to greet people. You will receive a name and will have to proceed generating a greeting message for that name. Use your fantasy.`
  })

  await (answerSession as AnswerSession).ask({
    term: 'Bob',
    where: { age: { eq: 40 } }
  })

  const state = answerSession.state

  assert(state.length === 1)
  assert(state[0].query === 'Bob')
})

test('Orama Cloud client', async () => {
  const cloudClient = new OramaClient({
    api_key: CLOUD_API_KEY,
    endpoint: CLOUD_URL
  })

  const answerSession = new Switch(cloudClient).createAnswerSession({})
  await (answerSession as AnswerSession).ask({ term: 'What is Orama?' })

  const state = answerSession.state

  assert(state.length === 1)
  assert(state[0].query === 'What is Orama?')
})

test('OramaCore client', async () => {
  const coreClient = new CollectionManager({
    url: ORAMACORE_URL,
    readAPIKey: ORAMACORE_READ_API_KEY,
    collectionID: ORAMACORE_COLLECTION_ID
  })

  const answerSession = new Switch(coreClient).createAnswerSession({})
  await (answerSession as OramaCoreAnswerSession).answer({
    query: 'What is Orama?',
    interactionID: '1',
    sessionID: '1',
    visitorID: '1'
  })

  const state = answerSession.state

  assert(state.length === 1)
  assert(state[0].query === 'What is Orama?')
})
