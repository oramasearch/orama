import { AnyOrama } from '@orama/orama'

export enum DeployType {
  SNAPSHOT_ONLY = 'snapshot-only',
  DEFAULT = 'default'
}

export type CloudConfig = {
  deploy?: DeployType
  indexId: string
  apiKey: string
}

export type OramaPlugins = {
  analytics?: Analytics
}

export type PluginOptions = {
  plugins?: OramaPlugins
  cloud?: CloudConfig
  searchbox?: Record<string, any>
  searchButton?: Record<string, any>
}

export type IndexConfig = {
  endpoint: string
  api_key: string
}

export interface OramaDoc {
  title: string
  content: string
  path: string
  section: string
  category: string
  version: string
}

export interface Analytics {
  enabled: boolean
  apiKey: string
  indexId: string
}

export interface GenericOramaData {
  searchbox?: Record<string, any>
  searchButton?: Record<string, any>
  plugins?: OramaPlugins
  docsInstances?: string[]
  id?: string
}

export type OramaCloudData = {
  oramaMode: 'cloud'
  indexConfig: IndexConfig
} & GenericOramaData

export type OramaOSSData = {
  oramaMode: 'oss'
  oramaDocs?: OramaDoc[]
} & GenericOramaData

export type OramaData = OramaCloudData | OramaOSSData
