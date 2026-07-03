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
  czech: 'cs',
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
  lithuanian: 'lt',
  nepali: 'np',
  norwegian: 'no',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'rs',
  slovenian: 'sl',
  spanish: 'es',
  swedish: 'se',
  tamil: 'ta',
  turkish: 'tr',
  ukrainian: 'uk',
  vietnamese: 'vi',
  sanskrit: 'sk'
}

const languageDisplayNames = {
  arabic: 'Arabic',
  armenian: 'Armenian',
  bulgarian: 'Bulgarian',
  czech: 'Czech',
  danish: 'Danish',
  dutch: 'Dutch',
  english: 'English',
  finnish: 'Finnish',
  french: 'French',
  german: 'German',
  greek: 'Greek',
  hungarian: 'Hungarian',
  indian: 'Hindi',
  indonesian: 'Indonesian',
  irish: 'Irish',
  italian: 'Italian',
  japanese: 'Japanese',
  lithuanian: 'Lithuanian',
  mandarin: 'Chinese (Mandarin)',
  nepali: 'Nepali',
  norwegian: 'Norwegian',
  portuguese: 'Portuguese',
  romanian: 'Romanian',
  russian: 'Russian',
  sanskrit: 'Sanskrit',
  serbian: 'Serbian',
  slovenian: 'Slovenian',
  spanish: 'Spanish',
  swedish: 'Swedish',
  tamil: 'Tamil',
  turkish: 'Turkish',
  ukrainian: 'Ukrainian',
  vietnamese: 'Vietnamese'
}

// Regenerates the language list in README.md (between the LANGUAGES markers) from the stemmers map
async function updateReadmeLanguageList() {
  const readmePath = resolve(rootDir, 'README.md')
  const startMarker = '<!-- LANGUAGES:START -->'
  const endMarker = '<!-- LANGUAGES:END -->'

  const readme = await readFile(readmePath, 'utf-8')
  const startIndex = readme.indexOf(startMarker)
  const endIndex = readme.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Missing ${startMarker} / ${endMarker} markers in ${readmePath}`)
  }

  const names = Object.keys(stemmers)
    .map((key) => languageDisplayNames[key] ?? key.charAt(0).toUpperCase() + key.slice(1))
    .sort((a, b) => a.localeCompare(b, 'en'))

  const block = [
    startMarker,
    `Right now, Orama supports ${names.length} languages and stemmers out of the box:`,
    '',
    ...names.map((name) => `- ${name}`),
    endMarker
  ].join('\n')

  const updated = readme.slice(0, startIndex) + block + readme.slice(endIndex + endMarker.length)
  await writeFile(readmePath, updated, 'utf-8')
}

async function compile(lang, fullLang, jsExtension, tsExtension, moduleType) {
  const content = await readFile(resolve(sourceDir, `${lang}.js`), 'utf-8')
  const language = `\nexport const language = '${fullLang}'`
  const compiled = await transform(content + language, {
    module: { type: moduleType },
    jsc: { target: 'es2022' }
  })

  const minified = await minify(compiled.code, { sourceMap: true, module: moduleType !== 'commonjs' })

  await writeFile(resolve(destinationDir, `${lang}.${jsExtension}`), minified.code, 'utf-8')
  await writeFile(resolve(destinationDir, `${lang}.${jsExtension}.map`), minified.map, 'utf-8')

  // Create the definition file
  await writeFile(
    resolve(destinationDir, `${lang}.d.${tsExtension}`),
    'export declare function stemmer(word: string): string;\n export const language: string;',
    'utf-8'
  )
}

async function main() {
  // Remove and recreate destination directory
  await rm(destinationDir, { recursive: true, force: true })
  await mkdir(destinationDir)

  const exports = {}

  // Copy all relevant files
  for (const [long, short] of Object.entries(stemmers)) {
    await compile(short, long, 'js', 'ts', 'nodenext')
    await compile(short, long, 'cjs', 'cts', 'commonjs')

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

  // Copy the English stemmer to the Orama package
  const englishStemmer = await readFile(resolve(rootDir, 'lib/en.js'), 'utf-8')
  await writeFile(
    resolve(rootDir, '../orama/src/components/tokenizer/english-stemmer.ts'),
    `// eslint-disable-next-line @typescript-eslint/ban-ts-comment\n// @ts-nocheck\n\n${englishStemmer}`,
    'utf-8'
  )

  // Keep the README language list in sync with the stemmers map
  await updateReadmeLanguageList()
}

await main()
