import { create as createOramaDB, load as loadOramaDB, Schema, search } from '@orama/orama'
import assert from 'node:assert'
import { exec, ExecException } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { chdir } from 'node:process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

interface Execution {
  code: number
  stdout: string
  stderr: string
  error?: Error
}

const sandboxSource = fileURLToPath(new URL('./sandbox', import.meta.url))
const sandbox = process.env.KEEP_SANDBOX_ASTRO
  ? '/tmp/orama-astro-sandbox'
  : resolve(tmpdir(), `orama-plugin-astro-${Date.now()}`)

async function cleanup(): Promise<void> {
  await rm(sandbox, { force: true, recursive: true })
}

async function execute(command: string, cwd?: string): Promise<Execution> {
  const { HOME, PATH } = process.env
  const env = cwd ? { HOME, PATH } : process.env

  return new Promise((resolve: (execution: Execution) => void, reject: (error: Error) => void) => {
    exec(command, { cwd, env }, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        if (process.env.NODE_DEBUG?.includes('test')) {
          console.error('COMMAND ERRORED', error)
        }

        reject(error)
        return
      }

      if (process.env.NODE_DEBUG?.includes('test')) {
        console.error(`--- STDOUT [${command}] ---\n${stdout.trim()}\n\n`)
        console.error(`--- STDERR [${command}] ---\n${stderr.trim()}\n\n`)
      }
      resolve({ code: 0, stdout, stderr })
    })
  })
}

await cleanup()

await test('plugin is able to generate orama DB at build time', async () => {
  // Obtain general information
  const pluginInfo: Record<string, string> = JSON.parse(
    await readFile(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
  )
  const rootDir = dirname(fileURLToPath(new URL(`../..`, import.meta.url)))
  const version = pluginInfo.version

  // Prepare the sandbox
  const packageJsonPath = resolve(sandbox, 'package.json')
  await cp(sandboxSource, sandbox, { recursive: true })
  chdir(sandbox)
  console.log(`Sandbox created in ${sandbox}`)

  // Update dependencies location
  const packageJson = await readFile(packageJsonPath, 'utf-8')
  await writeFile(packageJsonPath, packageJson.replace(/@ROOT@/g, rootDir).replace(/@VERSION@/g, version), 'utf-8')

  // Install dependencies
  const installResult = await execute('pnpm install', sandbox)
  assert.equal(installResult.code, 0)

  // astro build is successful
  const buildResult = await execute('./node_modules/.bin/astro build', sandbox)
  assert.equal(buildResult.code, 0)

  // The Orama DBs have been generated
  assert.ok(existsSync(resolve(sandbox, 'dist', 'assets', 'oramaDB_animals.json')))
  assert.ok(existsSync(resolve(sandbox, 'dist', 'assets', 'oramaDB_games.json')))
  assert.ok(existsSync(resolve(sandbox, 'dist', 'assets', 'oramaDB_dynamic.json')))
  assert.ok(existsSync(resolve(sandbox, 'dist', 'assets', 'oramaDB_leadingSlash.json')))
})

await test('generated DBs have indexed pages content', async () => {
  // Loading "animals DB"
  const rawAnimalsData = await readFile(resolve(sandbox, 'dist/assets/oramaDB_animals.json'), 'utf8')
  const animalsData = JSON.parse(rawAnimalsData)
  const animalsDB = await createOramaDB({ schema: { _: 'string' } })
  await loadOramaDB(animalsDB, animalsData as any)

  // Loading "games DB"
  const rawGamesData = await readFile(resolve(sandbox, 'dist/assets/oramaDB_games.json'), 'utf8')
  const gamesData = JSON.parse(rawGamesData)
  const gamesDB = await createOramaDB({ schema: { _: 'string' } })
  await loadOramaDB(gamesDB, gamesData as any)

  // Loading "dynamic DB"
  const rawDynamicData = await readFile(resolve(sandbox, 'dist/assets/oramaDB_dynamic.json'), 'utf8')
  const dynamicData = JSON.parse(rawDynamicData)
  const dynamicDB = await createOramaDB({ schema: { _: 'string' } })
  await loadOramaDB(dynamicDB, dynamicData as any)

  // Loading "allSite DB"
  const rawAllSiteData = await readFile(resolve(sandbox, 'dist/assets/oramaDB_allSite.json'), 'utf8')
  const allSiteData = JSON.parse(rawAllSiteData)
  const allSiteDB = await createOramaDB({ schema: { _: 'string' } })
  await loadOramaDB(allSiteDB, allSiteData as any)

  // Loading "leadingSlash DB"
  const rawLeadingSlashData = await readFile(resolve(sandbox, 'dist/assets/oramaDB_leadingSlash.json'), 'utf8')
  const leadingSlashData = JSON.parse(rawLeadingSlashData)
  const leadingSlashDB = await createOramaDB({ schema: { _: 'string' } })
  await loadOramaDB(leadingSlashDB, leadingSlashData as any)

  // Search results seem reasonable
  const catSearchResult = await search(animalsDB, { term: 'cat' })
  assert.ok(catSearchResult.count === 1)
  assert.ok((catSearchResult.hits[0].document as unknown as { path: string }).path === '/animals_cat/')

  const dogSearchResult = await search(animalsDB, { term: 'dog' })
  assert.ok(dogSearchResult.count === 1)
  assert.ok((dogSearchResult.hits[0].document as unknown as { path: string }).path === '/animals_dog/')

  const domesticSearchResult = await search(animalsDB, { term: 'domestic' })
  assert.ok(domesticSearchResult.count === 2)

  // We do not have content about turtles
  const turtleSearchResult = await search(animalsDB, { term: 'turtle' })
  assert.ok(turtleSearchResult.count === 0)

  // Dynamic pages are indexed
  const dynamicTestSearchResult = await search(dynamicDB, { term: 'thiswasjustatest' })
  assert.ok(dynamicTestSearchResult.count === 1)

  // pathMatcher works on dynamic pages
  const dynamicTestMissingSearchResult = await search(dynamicDB, { term: 'ninja' })
  assert.ok(dynamicTestMissingSearchResult.count === 0)

  // The leading-slash-anchored matcher (/^\/animals_cat\//) matches because since
  // Astro 5 the plugin tests pathMatcher against `/${pathname}`. Only the
  // /animals_cat/ page is collected into this DB.
  const leadingSlashCatResult = await search(leadingSlashDB, { term: 'cat' })
  assert.ok(leadingSlashCatResult.count === 1)
  assert.ok((leadingSlashCatResult.hits[0].document as unknown as { path: string }).path === '/animals_cat/')

  // No other page is indexed by the anchored matcher
  const leadingSlashDogResult = await search(leadingSlashDB, { term: 'dog' })
  assert.ok(leadingSlashDogResult.count === 0)
})

if (!process.env.KEEP_SANDBOX_ASTRO) {
  await cleanup()
}
