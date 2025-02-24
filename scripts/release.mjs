import { spawn } from 'node:child_process'
import { relative, resolve } from 'node:path'

const rootDir = process.cwd()

const npm_packages = [
  'orama',
  'plugin-astro',
  'plugin-data-persistence',
  'plugin-docusaurus',
  'plugin-docusaurus-v3',
  'plugin-vitepress',
  'plugin-nextra',
  'plugin-parsedoc',
  'plugin-analytics',
  'plugin-secure-proxy',
  'plugin-embeddings',
  'plugin-match-highlight',
  'plugin-qps',
  'plugin-pt15',
  'stemmers',
  'stopwords',
  'tokenizers',
  'switch'
]

const jsr_packages = [
  'orama',
  'stemmers',
  'stopwords',
  "swtich",
  "tokenizers"
]
const jsr_packages_with_slow_types = [
  "tokenizers"
]

function step(message) {
  console.log(`\x1b[1m\x1b[32m--- ${message}\x1b[0m`)
}

async function execute(command, args, cwd) {
  if (!Array.isArray(args)) {
    args = [args]
  }

  let success, fail
  const promise = new Promise((resolve, reject) => {
    success = resolve
    fail = reject
  })

  if (cwd) {
    step(`Executing: ${command} ${args.join(' ')} (from folder ${relative(rootDir, cwd)}) ...`)
  } else {
    step(`Executing: ${command} ${args.join(' ')}  ...`)
  }

  const childProcess = spawn(command, args, { cwd, stdio: 'inherit' })

  childProcess.on('close', code => {
    if (code !== 0) {
      fail(new Error(`Process failed with status code ${code}.`))
    }

    success()
  })

  return promise
}


await execute('pnpm', 'build')
// await execute('pnpm', 'test')

for (const pkg of npm_packages) {
  const cwd = resolve(rootDir, 'packages', pkg)
  await execute('pnpm', ['publish'], cwd)

  if (jsr_packages.includes(pkg)) {
    const args = ['publish']

    if (jsr_packages_with_slow_types.includes(pkg)) {
      args.push('--slow-types')
    }

    await execute('jsr',args, cwd)
  }
}
