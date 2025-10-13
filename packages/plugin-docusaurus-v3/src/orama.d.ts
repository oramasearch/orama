declare module '../plugin-analytics/src' {
  export function pluginAnalytics(options: {
    apiKey: string
    indexId: string
    enabled: boolean
  }): any
}
