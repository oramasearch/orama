import { minify, transform } from '@swc/core'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const rootDir = process.cwd()
const sourceDir = resolve(rootDir, 'lib')
const destinationDir = resolve(rootDir, 'dist')

const stemmers = {
  arabic: 'ar',
  armenian: 'am',
  bulgarian: 'bg',
  danish: 'dk',
  dutch: 'nl',
  english: 'en',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'gr',
  hungarian: 'hu',
  indian: 'in',
  indonesian: 'id',
  irish: 'ie',
  italian: 'it',
  japanese: 'ja',
  lithuanian: 'lt',
  mandarin: 'zh',
  nepali: 'np',
  norwegian: 'no',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'rs',
  slovenian: 'ru',
  spanish: 'es',
  swedish: 'se',
  tamil: 'ta',
  turkish: 'tr',
  ukrainian: 'uk',
  sanskrit: 'sk'
}

async function compile(lang, jsExtension, tsExtension, moduleType) {
  const content = await readFile(resolve(sourceDir, `${lang}.js`), 'utf-8')

  const compiled = await transform(content, {
    module: { type: moduleType },
    jsc: { target: 'es2022' }
  })

  const minified = await minify(compiled.code, { sourceMap: true, module: moduleType !== 'commonjs' })

  await writeFile(resolve(destinationDir, `${lang}.${jsExtension}`), minified.code, 'utf-8')
  await writeFile(resolve(destinationDir, `${lang}.${jsExtension}.map`), minified.map, 'utf-8')

  // Create the definition file
  await writeFile(resolve(destinationDir, `${lang}.d.${tsExtension}`), 'export const stopwords: string[]', 'utf-8')
}

async function main() {
  // Remove and recreate destination directory
  await rm(destinationDir, { recursive: true, force: true })
  await mkdir(destinationDir)

  const exports = {}

  // Copy all relevant files
  for (const [long, short] of Object.entries(stemmers)) {
    await compile(short, 'js', 'ts', 'nodenext')
    await compile(short, 'cjs', 'cts', 'commonjs')

    exports[`./${long}`] = {
      types: `./dist/${short}.d.ts`,
      import: `./dist/${short}.js`,
      require: `./dist/${short}.cjs`
    }
  }

  // Update package.json
  const packageJson = JSON.parse(await readFile(resolve(rootDir, 'package.json'), 'utf-8'))
  packageJson.exports = exports
  await writeFile(resolve(rootDir, 'package.json'), JSON.stringify(packageJson, null, 2))
}

await main()
