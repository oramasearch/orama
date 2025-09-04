export type Runtime = 'deno' | 'node' | 'bun' | 'browser' | 'unknown'

export type PersistenceFormat = 'json' | 'dpack' | 'binary' | 'seqproto'

export interface FileSystem {
  cwd: () => string
  resolve: (...paths: string[]) => string
  readFile: (path: string, encoding?: string) => Promise<Buffer | string>
  writeFile: (path: string, contents: Buffer | string, encoding?: string) => Promise<unknown>
}
