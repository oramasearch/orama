import type {
  AnyOrama,
  IAnswerSessionConfig as OSSAnswerSessionConfig,
  Nullable,
  Results,
  SearchParams,
} from "@orama/orama";
import { AnswerSession as OSSAnswerSession, search } from "@orama/orama";
import {
  AnswerSession as CloudAnswerSession,
  AnswerSessionParams as CloudAnswerSessionConfig,
  ClientSearchParams,
  OramaClient,
} from "@oramacloud/client";
import type {
  AnswerSession as OramaCoreAnswerSession,
  AnswerSessionConfig as OramaCoreAnswerSessionConfig,
  SearchParams as OramaCoreSearchParams,
} from "@orama/core";
import { CollectionManager } from "@orama/core";

export type OramaSwitchClient = AnyOrama | OramaClient | CollectionManager;

export type ClientType = "oss" | "cloud" | "core";

export type SearchConfig = {
  abortController?: AbortController;
  fresh?: boolean;
  debounce?: number;
};

function isOramaClient(client: any): client is OramaClient {
  return client && typeof client === "object" && "api_key" in client &&
    "endpoint" in client;
}

function isOramaCoreClient(client: any): client is CollectionManager {
  return client && (client instanceof CollectionManager || client.constructor.name === "CollectionManager");
}

function isOramaJSClient(client: any): client is AnyOrama {
  return client && typeof client === "object" && "id" in client &&
    "tokenizer" in client;
}

export class Switch<T = OramaSwitchClient> {
  private invalidClientError =
    "Invalid client. Expected either an OramaClient, CollectionManager, or an Orama JS database.";
  client: OramaSwitchClient;
  clientType: ClientType;
  isCloud: boolean = false;
  isJS: boolean = false;
  isCore: boolean = false;

  constructor(client: OramaSwitchClient) {
    this.client = client;

    switch (true) {
      case isOramaCoreClient(client):
        this.clientType = "core";
        this.isCore = true;
        break;
      case isOramaClient(client):
        this.clientType = "cloud";
        this.isCloud = true;
        break;
      case isOramaJSClient(client):
        this.clientType = "oss";
        this.isJS = true;
        break;
      default:
        throw new Error(this.invalidClientError);
    }
  }

  async search<R = unknown>(
    params: T extends OramaClient ? ClientSearchParams
      : T extends CollectionManager ? SearchParams<AnyOrama>
      : never,
    config?: SearchConfig,
  ): Promise<Nullable<Results<R>>> {
    switch (true) {
      // OramaCloud - Old client
      case this.isCloud:
        return (this.client as OramaClient).search(
          params as T extends OramaClient ? ClientSearchParams : never,
          config,
        );

      // OramaCore - New client
      case this.isCore: {
        const results = await (this.client as CollectionManager).search(
          params as T extends CollectionManager ? OramaCoreSearchParams : never,
        );

        return results as unknown as Nullable<Results<R>>;
      }

      // OramaJS - JavaScript client
      case this.isJS:
        return search(
          this.client as AnyOrama,
          params as SearchParams<AnyOrama>,
        ) as Promise<Nullable<Results<R>>>;
      default:
        throw new Error(this.invalidClientError);
    }
  }

  createAnswerSession(
    params: T extends OramaClient ? CloudAnswerSessionConfig
      : OSSAnswerSessionConfig,
  ): T extends OramaClient ? CloudAnswerSession<true>
    : T extends CollectionManager ? OramaCoreAnswerSession
    : OSSAnswerSession {
    switch (true) {
      // OramaCloud - Old client
      case this.isCloud: {
        const p = params as CloudAnswerSessionConfig;
        return (this.client as OramaClient).createAnswerSession(
          p,
        ) as unknown as T extends OramaClient ? CloudAnswerSession<true>
          : T extends CollectionManager ? OramaCoreAnswerSession
          : OSSAnswerSession;
      }

      // OramaCore - New client
      case this.isCore: {
        const p = params as OramaCoreAnswerSessionConfig;
        return (this.client as CollectionManager).createAnswerSession(
          p,
        ) as unknown as T extends OramaClient ? CloudAnswerSession<true>
          : T extends CollectionManager ? OramaCoreAnswerSession
          : OSSAnswerSession;
      }

      // OramaJS - JavaScript client
      case this.isJS: {
        const p = params as OSSAnswerSessionConfig;
        return new OSSAnswerSession(this.client as AnyOrama, {
          conversationID: p.conversationID,
          initialMessages: p.initialMessages,
          events: p.events,
          userContext: p.userContext,
          systemPrompt: p.systemPrompt,
        }) as unknown as T extends OramaClient ? CloudAnswerSession<true>
          : T extends CollectionManager ? OramaCoreAnswerSession
          : OSSAnswerSession;
      }

      default:
        throw new Error(this.invalidClientError);
    }
  }
}
