import path from 'node:path'
import fs from 'node:fs'
import childProcess from 'node:child_process'

if (process.env.BUILD_TOKENIZERS !== '1') {
  console.log('Skipping build for custom tokenizers.')
  process.exit(0)
}

const isWasmPackInstalled = await checkWasmPackInstalled()

const languages = ['mandarin', 
  //'japanese'
  ]

const outdirBaseURL = new URL('../build', import.meta.url).pathname

if (fs.existsSync(outdirBaseURL)) {
  fs.rmdirSync(outdirBaseURL, { recursive: true })
}

fs.mkdirSync(outdirBaseURL)

for (const language of languages) {
  if (!isWasmPackInstalled) {
    console.warn('!! WARNING')
    console.warn(`!! Compilation of the **${language}** tokenizer requires wasm-pack to be installed.`)
    console.warn('!! No wasm-pack installation found. Skipping build.')
    process.exit(1)
  }

  const tokenizersBaseURL = new URL('../src', import.meta.url).pathname

  const tokenizerPath = path.join(tokenizersBaseURL, `tokenizer-${language}`)
  const tokenizerWasmPath = path.join(tokenizerPath, 'pkg')
  const tokenizerDistPath = path.join(tokenizersBaseURL, `../build/tokenizer-${language}`)
  const tokenizerWrapperPath = path.join(tokenizersBaseURL, `tokenizer-${language}/src/tokenizer.ts`)
  const tokenizerWrapperDistPath = path.join(tokenizerDistPath, 'tokenizer.ts')

  childProcess.execSync(`cd ${tokenizerPath} && wasm-pack build --target web`)

  fs.cpSync(tokenizerWrapperPath, tokenizerWrapperDistPath, {
    recursive: true
  })

  fs.cpSync(tokenizerWasmPath, tokenizerDistPath, {
    recursive: true
  })

  fs.rmSync(path.join(tokenizerDistPath, '.gitignore'))

  const r = fs.readFileSync(`./build/tokenizer-${language}/tokenizer_${language}_bg.wasm`)
  const b = new Uint8Array(r)
  const rr = `export const wasm = new Uint8Array([${b.join(',')}]);`
  fs.writeFileSync(`./build/tokenizer-${language}/tokenizer_${language}_bg_wasm_arr.js`, rr)

  childProcess.execSync(`cd ${tokenizerDistPath} && npx tsup --format cjs,esm,iife --outDir . tokenizer.ts`)
}

async function checkWasmPackInstalled() {
  return new Promise((resolve) => {
    childProcess.exec('wasm-pack --version', (err) => {
      if (err) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}
