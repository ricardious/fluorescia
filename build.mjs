// Construye index.html (un solo archivo): minifica src/game.js con terser y lo empaqueta
// con el compresor LZ77 propio de pack.mjs (se autodescomprime al cargar).
// Uso: npm i && node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';
import { pack } from './pack.mjs';

const js = readFileSync('src/game.js', 'utf8');
const html = readFileSync('src/shell.html', 'utf8');
const out = await minify(js, {
  ecma: 2020, toplevel: true,
  compress: { passes: 3, unsafe: true, unsafe_arrows: true, pure_getters: true },
  mangle: { toplevel: true },
  format: { comments: false, ascii_only: true }
});
const packed = pack(out.code);
// verificación: el descompresor debe reproducir exactamente el código minificado
const check = new Function(packed.replace(/eval\(o\)$/, 'return o'))();
if (check !== out.code) { console.error('¡El empaquetado no reproduce el código!'); process.exit(1); }
const page = html.replace(/\n\s*/g, '').replace('/*GAME*/', () => packed);
writeFileSync('index.html', page);
const size = Buffer.byteLength(page);
console.log(`minificado: ${out.code.length} B · index.html: ${size} B (${(size / 1024).toFixed(2)} KB) de 32768`);
if (size > 32768) { console.error('¡Excede el límite de 32 KB!'); process.exit(1); }
