import { build } from 'esbuild';

const entryPoints = [
  'index',
  'internals',
  'components',
  'trees'
];

const promises = entryPoints.map(async entryPoint => {  
  await build({
    entryPoints: [`./dist/esm/${entryPoint}.js`],
    outfile: `./dist/bundle/${entryPoint}.js`,
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    minify: true,
    sourcemap: true,
  });
});

await Promise.all(promises);
