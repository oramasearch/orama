import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { inc, valid } from 'semver'
import { simpleGit } from 'simple-git'
import { fileURLToPath } from 'url'

const oramaPackage = JSON.parse(readFileSync('../packages/orama/package.json', 'utf-8'))

const dryRun = process.env.DRY_RUN === 'true'
const skipGit = process.env.SKIP_GIT === 'true'
const skip = (process.env.SKIP ?? '').split(/\s*,\s*/).map(s => s.trim())

const packages = [
  'orama',
  'plugin-astro',
  'plugin-data-persistence',
  'plugin-docusaurus',
  'plugin-docusaurus-v3',
  'plugin-match-highlight',
  'plugin-nextra',
  'plugin-parsedoc',
  'stemmers',
  'stopwords',
].filter(p => !skip.includes(p))

async function updatePackage(path, version) {
  const packageJson = JSON.parse(await readFile(path))
  const jsrJson = JSON.parse(await readFile(path.replace('package.json', 'jsr.json')).catch(() => '{}'))

  if (packageJson.version !== jsrJson.version) {
    throw new Error(`Version mismatch between package.json and jsr.json in ${path}`)
  }

  console.log(
    `\x1b[32mUpdating package \x1b[1m${packageJson.name}\x1b[22m from \x1b[1m${packageJson.version}\x1b[22m to version \x1b[1m${version}\x1b[22m ...\x1b[0m`,
  )

  packageJson.version = version

  if (!dryRun) {
    await writeFile(path, JSON.stringify(packageJson, null, 2), 'utf-8')

    // if there aren't jsr version it's mean there are no jsr support
    if (jsrJson.version) {
      jsrJson.version = version
      await writeFile(path.replace('package.json', 'jsr.json'), JSON.stringify(jsrJson, null, 2), 'utf-8')
    }
  }
}

if (!process.argv[2]) {
  console.error('\x1b[33mUsage: node version.mjs [VERSION | CHANGE [PRERELEASE]]\x1b[0m')
  process.exit(1)
}

// Check if the new version is absolute, otherwise we take it from @orama/orama and increase
let version = process.argv[2]

if (!valid(version)) {
  version = inc(oramaPackage.version, version, process.argv[3])
}

if (!valid(version)) {
  console.error(
    `\x1b[31mCannot increase version \x1b[1m${oramaPackage.version}\x1b[22m using operator \x1b[1m${process.argv[2]}\x1b[22m.\x1b[0m`,
  )
  process.exit(1)
}

// Update the main package.json
await updatePackage(fileURLToPath(new URL(`../package.json`, import.meta.url)), version)

// Perform the update
for (const pkg of packages) {
  await updatePackage(fileURLToPath(new URL(`../packages/${pkg}/package.json`, import.meta.url)), version)
}

// Make the commit, including the tag
if (!dryRun && !skipGit) {
  const git = simpleGit({ baseDir: fileURLToPath(new URL('..', import.meta.url)) })
  console.log(`\x1b[32mCommitting changes and creating a tag (pushing is left to you) ...\x1b[0m`)
  await git.commit(
    'chore: Version bump',
    packages.map(p => `packages/${p}/package.json`),
    { '--no-verify': true },
  )

  await git.addTag(`v${version}`)
}
