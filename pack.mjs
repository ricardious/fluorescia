// Compresor LZ77 propio (sin librerías) con parseo óptimo y salida en texto ASCII.
// Formato de bits: 0 + 7 bits = literal | 1 + gamma(len-2) + offset(bitlen(pos) bits)
// Cada 2 caracteres del alfabeto (92 símbolos imprimibles, sin " < \) codifican 13 bits.
export function pack(src) {
  for (const ch of src) if (ch.charCodeAt(0) > 126) throw new Error('No ASCII: ' + ch);
  const n = src.length, MAXL = 1 << 12;
  const bl = v => v.toString(2).length, gb = v => 2 * bl(v) - 1;
  // longitud máxima de coincidencia por posición (cadenas hash de 3 chars)
  const ml = new Int32Array(n), heads = new Map(), prev = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const key = src.substr(i, 3);
    let best = 0, tries = 0;
    for (let j = heads.has(key) ? heads.get(key) : -1; j >= 0 && tries < 4000; j = prev[j], tries++) {
      let l = 0; while (i + l < n && l < MAXL && src[j + l] === src[i + l]) l++;
      if (l > best) { best = l; ml[i] = l; ml[i] |= 0; matchOff[i] = i - j; if (l >= MAXL) break; }
    }
    if (key.length == 3) { prev[i] = heads.has(key) ? heads.get(key) : -1; heads.set(key, i); }
  }
  // parseo óptimo (programación dinámica de atrás hacia adelante)
  const cost = new Float64Array(n + 1), ch = new Int32Array(n);
  for (let i = n - 1; i >= 0; i--) {
    cost[i] = 8 + cost[i + 1]; ch[i] = 0;
    const ob = i ? bl(i) : 0;
    for (let l = 3; l <= ml[i]; l++) { const c = 1 + gb(l - 2) + ob + cost[i + l]; if (c < cost[i]) { cost[i] = c; ch[i] = l; } }
  }
  const bits = [];
  const put = (v, k) => { while (k--) bits.push(v >> k & 1); };
  const gam = v => { const k = bl(v) - 1; put(0, k); put(1, 1); put(v & ((1 << k) - 1), k); };
  for (let i = 0; i < n;) {
    if (ch[i]) { put(1, 1); gam(ch[i] - 2); put(matchOff[i], bl(i)); i += ch[i]; }
    else { put(0, 1); put(src.charCodeAt(i), 7); i++; }
  }
  while (bits.length % 13) bits.push(0);
  const sym = []; for (let u = 0; u < 95; u++) if (u != 2 && u != 28 && u != 60) sym.push(String.fromCharCode(u + 32));
  let out = '';
  for (let i = 0; i < bits.length; i += 13) {
    let v = 0; for (let k = 0; k < 13; k++) v = v * 2 + bits[i + k];
    out += sym[(v / 92) | 0] + sym[v % 92];
  }
  // descompresor (escrito a mano, minificado)
  const dec = `let s="${out}",p=0,q=0,b=0,o="",c=i=>(i=s.charCodeAt(i)-32)-(i>2)-(i>28)-(i>60),r=k=>{let v=0;for(;k--;)b||(q=c(p)*92+c(p+1),p+=2,b=13),v=v*2+(q>>--b&1);return v},g=()=>{let z=0;for(;!r(1);)z++;return 1<<z|r(z)};for(;o.length<${n};)if(r(1))for(let l=g()+2,d=r(o.length.toString(2).length);l--;)o+=o[o.length-d];else o+=String.fromCharCode(r(7));eval(o)`;
  return dec;
}
let matchOff = new Int32Array(1 << 17);
