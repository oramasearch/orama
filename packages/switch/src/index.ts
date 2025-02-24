/* @ts-self-types="./index.d.ts" */
import type {
  AnyOrama,
  Results,
  SearchParams,
  Nullable,
  IAnswerSessionConfig as OSSAnswerSessionConfig
} from '@orama/orama'
import { search, AnswerSession as OSSAnswerSession } from '@orama/orama'
import {
  OramaClient,
  ClientSearchParams,
  AnswerSessionParams as CloudAnswerSessionConfig,
  AnswerSession as CloudAnswerSession
} from '@oramacloud/client'

export type OramaSwitchClient = AnyOrama | OramaClient

export type ClientType = 'oss' | 'cloud'

export type SearchConfig = {
  abortController?: AbortController
  fresh?: boolean
  debounce?: number
}

function isOramaClient(client: any): client is OramaClient {
  return client && typeof client === 'object' && 'api_key' in client && 'endpoint' in client
}

export class Switch<T = OramaSwitchClient> {
  private invalidClientError = 'Invalid client. Expected either an OramaClient or an Orama OSS database.'
  client: OramaSwitchClient
  clientType: ClientType
  isCloud: boolean = false
  isOSS: boolean = false

  constructor(client: OramaSwitchClient) {
    this.client = client

    if (isOramaClient(client)) {
      this.clientType = 'cloud'
      this.isCloud = true
    } else if (typeof client === 'object' && 'id' in client && 'tokenizer' in client) {
      this.clientType = 'oss'
      this.isOSS = true
    } else {
      throw new Error(this.invalidClientError)
    }
  }

  async search<R = unknown>(
    params: T extends OramaClient ? ClientSearchParams : SearchParams<AnyOrama>,
    config?: SearchConfig
  ): Promise<Nullable<Results<R>>> {
    if (this.isCloud) {
      return (this.client as OramaClient).search(params as T extends OramaClient ? ClientSearchParams : never, config)
    } else {
      return search(this.client as AnyOrama, params as SearchParams<AnyOrama>) as Promise<Nullable<Results<R>>>
    }
  }

  createAnswerSession(
    params: T extends OramaClient ? CloudAnswerSessionConfig : OSSAnswerSessionConfig
  ): T extends OramaClient ? CloudAnswerSession<true> : OSSAnswerSession {
    if (this.isCloud) {
      const p = params as CloudAnswerSessionConfig
      return (this.client as OramaClient).createAnswerSession(p) as unknown as T extends OramaClient
        ? CloudAnswerSession<true>
        : OSSAnswerSession
    }

    if (this.isOSS) {
      const p = params as OSSAnswerSessionConfig
      return new OSSAnswerSession(this.client as AnyOrama, {
        conversationID: p.conversationID,
        initialMessages: p.initialMessages,
        events: p.events,
        userContext: p.userContext,
        systemPrompt: p.systemPrompt
      }) as unknown as T extends OramaClient ? CloudAnswerSession<true> : OSSAnswerSession
    }

    throw new Error(this.invalidClientError)
  }
}
