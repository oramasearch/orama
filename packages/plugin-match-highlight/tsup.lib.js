import { defineConfig } from 'tsup'

const entry = new URL('src/index.ts', import.meta.url).pathname
const outDir = new URL('dist', import.meta.url).pathname

export default defineConfig({
  entry: [entry],
  splitting: false,
  sourcemap: true,
  minify: true,
  format: ['cjs', 'esm', 'iife'],
  globalName: 'orama.plugin.matchHighlight',
  dts: true,
  clean: true,
  bundle: true,
  outDir
})
