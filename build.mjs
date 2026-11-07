// Construye index.html (un solo archivo) minificando src/game.js con terser.
// Uso: node build.mjs   (requiere `npm i` para terser, sólo en desarrollo)
import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';

const js = readFileSync('src/game.js', 'utf8');
const html = readFileSync('src/index.html', 'utf8');
const out = await minify(js, {
  ecma: 2020, toplevel: true,
  compress: { passes: 3, unsafe: true, unsafe_arrows: true, pure_getters: true },
  mangle: { toplevel: true },
  format: { comments: false }
});
const page = html
  .replace(/\n\s*/g, '')
  .replace('/*GAME*/', () => out.code);
writeFileSync('index.html', page);
const size = Buffer.byteLength(page);
console.log(`index.html: ${size} bytes (${(size / 1024).toFixed(2)} KB) de 32768 permitidos`);
if (size > 32768) { console.error('¡Excede el límite de 32 KB!'); process.exit(1); }
