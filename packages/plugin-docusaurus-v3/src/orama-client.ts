import { CloudManager } from '@orama/core'
import { CloudManager as legacyCloudManager } from '@oramacloud/client'
import { fetchEndpointConfig } from './utils'

type Index = {
    insert: (documents: object[]) => Promise<boolean>
    deploy: () => Promise<Boolean>
    empty: () => Promise<Boolean>
}

type Transaction = {
    insertDocuments: (documents: object[]) => Promise<void>
    deleteAllDocuments: () => Promise<void>
    commit: () => Promise<Boolean>
}

export default class OramaClient {
    private legacy: boolean
    private apiKey: string
    private baseUrl: string
    private collectionId: string | undefined
    private client: CloudManager | legacyCloudManager
    private indexId: string | undefined
    private index: Index | null = null
    private transaction: Transaction | null = null

    constructor(apiKey: string, 
                baseUrl: string, 
                collectionId: string | undefined = undefined, 
                legacy: boolean = true) {

        this.legacy = legacy
        this.apiKey = apiKey
        this.baseUrl = baseUrl
        this.collectionId = collectionId

        console.log('this.legacy', this.legacy)

        if (!this.legacy) {
            if (!this.collectionId) {
                throw new Error('Collection id is mandatory')
            }
        }

        if (this.legacy) {
            this.client = this.getLegacyClient()
        } else {
            this.client = this.getClient()
        }
    }

    public async setIndex(indexId: string) {
        this.indexId = indexId

        if (this.client instanceof legacyCloudManager) {
            this.index = this.client.index(indexId)
        } else {
            if (await this.client.hasOpenTransaction()) {
                console.log('has open transaction')
                const openTransaction = await this.client.getOpenTransaction()

                console.log('rolling back transaction')
                await openTransaction.rollbackTransaction()
            }

            await this.client.setIndex(indexId)
        }
    }

    public async fetchEndpointConfig() {
        if (!this.indexId) {
            throw new Error('Index id is mandatory')
        }

        return await fetchEndpointConfig(this.baseUrl, this.apiKey, this.indexId, this.collectionId, this.legacy)
    }

    private getLegacyClient() {
        return new legacyCloudManager({
            api_key: this.apiKey,
            baseURL: this.baseUrl
          })
    }

    private getClient() {
        if (!this.collectionId) {
            throw new Error('Collection id is mandatory')
        }

        return new CloudManager({
            url: this.baseUrl,
            collectionID: this.collectionId,
            privateAPIKey: this.apiKey,
          })
    }

    async startTransaction() {
        if (this.client instanceof CloudManager) {
            this.transaction = await this.client.newTransaction() as unknown as Transaction
            return
        }

        this.transaction = null
    }

    async insertDocuments(documents: object[]) {
        if (this.client instanceof CloudManager && this.transaction) {
            await this.transaction.insertDocuments(documents)
            return
        }
        
        if (this.index) {
            await this.index.insert(documents)
        }   
    }

    async empty() {
        if (this.client instanceof legacyCloudManager && this.index) {
            await this.index.empty()
        }

        if (this.client instanceof CloudManager && this.transaction) {
            await this.transaction.deleteAllDocuments()
        }
    }

    async commit() {
        if (this.client instanceof legacyCloudManager && this.index) {
            await this.index.deploy()
        }

        if (this.client instanceof CloudManager && this.transaction) {
            await this.transaction.commit()
        }
    }

    isLegacy() {
        return this.legacy
    }
}
