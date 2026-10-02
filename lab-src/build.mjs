// Bundles the three.js stage into docs/js/stage.js (tree-shaken, minified).
// Usage:  cd lab-src && npm install && node build.mjs
import { build } from 'esbuild';
await build({
  entryPoints: ['stage3d.js'],
  bundle: true, format: 'esm', minify: true, target: 'es2020',
  legalComments: 'eof', outfile: '../docs/js/stage.js',
});
console.log('built docs/js/stage.js');
