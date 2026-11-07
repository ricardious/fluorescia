// FLUORESCIA — juego arcade de enjambre bioluminiscente. Todo dibujado y sonado con código.
(() => {
'use strict';
const W = 320, H = 180, T = 6, R = 30, MAXS = 150;
const { floor, min, max, abs, sin, cos, hypot, PI, random: rnd, round } = Math, D = document;
const cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k;
const rr = (a, b) => a + rnd() * (b - a), ri = (a, b) => floor(rr(a, b + 1)), pk = a => a[floor(rnd() * a.length)];
const hs = (i, j) => { let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
let seed = 1;
const n1 = x => { const i = floor(x), f = x - i; return lp(hs(i, seed), hs(i + 1, seed), f * f * (3 - 2 * f)) * 2 - 1; };
const mk = (w, h) => { const c = D.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const cv = D.getElementById('c'), X = cv.getContext('2d');
cv.width = W; cv.height = H; X.imageSmoothingEnabled = false;
let C = X;
const fr = (x, y, w, h, c) => { if (c) C.fillStyle = c; C.fillRect(x, y, w, h); }, fs = c => C.fillStyle = c, ga = a => C.globalAlpha = a, co = o => C.globalCompositeOperation = o;
const [LC, LX] = mk(W, H), [GLC, GX] = mk(W, H);
const rsz = () => { const s = min(innerWidth / W, innerHeight / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; };
onresize = rsz; rsz();
const hx = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const mix = (a, b, k) => { a = hx(a); b = hx(b); return '#' + a.map((v, i) => (round(lp(v, b[i], k)) | 256).toString(16).slice(1)).join(''); };

// ---------- luz ----------
const GC = {};
const glow = c => GC[c] || (GC[c] = (() => {
  const [k, x] = mk(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, c); g.addColorStop(.3, c + '70'); g.addColorStop(1, c + '00');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return k;
})());
const lt = (x, c, px, py, r, a = 1) => { x.globalAlpha = a; x.drawImage(glow(c), px - r, py - r, r * 2, r * 2); };
const ad = (c, px, py, r, a) => { lt(LX, c, px, py, r, a); lt(GX, c, px, py, r, a); };

// ---------- fuente pixel 3x5 ----------
const FC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :.%+-/!?><x,';
const FG = '25755 65656 34443 65556 74647 74644 34553 55755 72227 11152 55655 44447 hrlhh hpljh 25552 65644 25573 65655 34216 72222 55557 55552 hhlrh 55255 55222 71247 75557 26227 61247 61216 55711 74616 34757 71122 75757 75716 00000 02020 00002 51245 02720 00700 11244 22202 61202 42124 12421 05250 00024'.split(' ');
const gw = g => /[89a-v]/.test(FG[g]) ? 5 : 3;
const gi = ch => { const g = FC.indexOf(ch); return g < 0 ? FC.indexOf(ch.toUpperCase()) : g; };
const tx = (s, x, y, c, sc = 1, al = 0) => {
  s = '' + s; let w = -sc;
  for (const ch of s) { const g = gi(ch); if (g >= 0) w += (gw(g) + 1) * sc; }
  x = round(al == 1 ? x - w / 2 : al == 2 ? x - w : x); y = round(y);
  X.fillStyle = c;
  for (const ch of s) {
    const g = gi(ch); if (g < 0) continue;
    const n = gw(g);
    for (let r = 0; r < 5; r++) { const b = parseInt(FG[g][r], 32); for (let q = 0; q < n; q++) if (b >> n - 1 - q & 1) X.fillRect(x + q * sc, y + r * sc, sc, sc); }
    x += (n + 1) * sc;
  }
  return w;
};
const txs = (s, x, y, c, sc = 1, al = 0) => { tx(s, x, y + sc, '#000000', sc, al); return tx(s, x, y, c, sc, al); };

// ---------- guardado ----------
const S = { s: 0, b: 0, h: 0, u: [0, 0, 0, 0, 0, 0], c: 0, f: 0, o: 1, p: 1, m: 0 };
try { Object.assign(S, JSON.parse(localStorage.fluorescia || '{}')); } catch (e) { }
const save = () => { try { localStorage.fluorescia = JSON.stringify(S); } catch (e) { } };

const UP = [
  ['CLONES INICIALES', 8, 'EMPIEZAS CON UN CLON MAS'],
  ['MUTACION DURADERA', 10, 'LAS MUTACIONES DURAN 15% MAS'],
  ['LIANAS DEBILES', 8, 'LAS LIANAS TE ATRAPAN 10% MENOS'],
  ['DESCENSO SERENO', 12, 'EL VACIO ACELERA MAS DESPACIO'],
  ['ALETEO SILENCIOSO', 10, 'LOS ACECHADORES OYEN MENOS'],
  ['IMAN DE ESQUIRLAS', 8, 'ATRAES ESQUIRLAS CERCANAS']
];
const COL = [['#5ff4ff', 0], ['#ff5fd2', 15], ['#8dff5a', 15], ['#ffc84a', 25], ['#eef2ff', 35], ['#b38cff', 45]];
const SHP = [['CHISPA', 0], ['POLILLA', 30], ['MEDUSA', 45]];
const ucost = k => UP[k][1] * (S.u[k] + 1);

// ---------- biomas ----------
const BI = [
  { n: 'BOSQUE DE HONGOS', r: '#2a2340', r2: '#3e3460', r3: '#0c0a16', e: '#52f59a', e2: '#1d6e55', a: '#ff4fd8', a2: '#4ff0ff', am: [80, 70, 125], f: '#1a2850', g: '#5fd8ff', b: 220 },
  { n: 'CAVERNAS DE CRISTAL', r: '#1c2352', r2: '#2d3a7c', r3: '#080a1c', e: '#6ee9ff', e2: '#3946c4', a: '#c46bff', a2: '#6ee9ff', am: [70, 80, 140], f: '#21185a', g: '#9a7bff', b: 196 },
  { n: 'RUINAS MECANICAS', r: '#2c262e', r2: '#463c46', r3: '#0b0a0d', e: '#3fe0c8', e2: '#8a4a2a', a: '#ffb347', a2: '#3fe0c8', am: [70, 100, 105], f: '#0b2c33', g: '#5fe0c8', b: 175 }
];
const bA = i => floor(max(0, i) / 420) % 3;

// ---------- audio ----------
let A, MG, DL, DR, NB;
const au = () => {
  if (!A) {
    try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    MG = A.createGain(); MG.gain.value = S.m ? 0 : .5; MG.connect(A.destination);
    DL = A.createDelay(); DL.delayTime.value = .36;
    const fb = A.createGain(); fb.gain.value = .4; DL.connect(fb); fb.connect(DL);
    const wt = A.createGain(); wt.gain.value = .6; DL.connect(wt); wt.connect(MG);
    DR = A.createBiquadFilter(); DR.frequency.value = 260;
    const g = A.createGain(); g.gain.value = .045; DR.connect(g); g.connect(MG);
    [55, 55.3, 82.4].forEach(f => { const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(DR); o.start(); });
    NB = A.createBuffer(1, A.sampleRate, A.sampleRate);
    const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
  }
  if (A.state[0] == 's') A.resume();
};
const tn = (f, d, ty, v, f2, dl, fx) => {
  if (!A) return;
  const t0 = A.currentTime + (dl || 0), o = A.createOscillator(), g = A.createGain();
  o.type = ty || 'sine'; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(MG); if (fx) g.connect(DL); o.start(t0); o.stop(t0 + d + .05);
};
const nz = (d, v, fq, dl) => {
  if (!A) return;
  const t0 = A.currentTime + (dl || 0), s = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain();
  s.buffer = NB; f.frequency.value = fq; g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(MG); s.start(t0, rnd() * .5); s.stop(t0 + d);
};
const sfxT = {};
const sfx = (k, gap = .08) => {
  if (!A || (sfxT[k] || 0) > A.currentTime - gap) return; sfxT[k] = A.currentTime;
  ({
    flap: () => { nz(.12, .05, 1400); tn(300, .08, 'sine', .03, 520); },
    clone: () => [660, 880, 1320].forEach((f, i) => tn(f, .25, 'triangle', .07, 0, i * .06, 1)),
    die: () => tn(rr(500, 800), .12, 'square', .03, 90),
    shard: () => { tn(1320, .18, 'triangle', .07, 0, 0, 1); tn(1980, .3, 'sine', .05, 0, .07, 1); },
    hit: () => nz(.05, .06, 500),
    boing: () => tn(180, .2, 'sine', .1, 520),
    big: () => tn(300, .5, 'sawtooth', .06, 70),
    small: () => tn(400, .35, 'square', .04, 1800),
    inv: () => { tn(500, .4, 'sine', .06, 250); tn(250, .4, 'sine', .06, 500, .1); },
    slow: () => tn(900, .9, 'triangle', .06, 120, 0, 1),
    stick: () => tn(140, .15, 'square', .04, 90),
    brk: () => { nz(.25, .12, 4000); tn(2200, .2, 'triangle', .05, 900); },
    chomp: () => { nz(.15, .15, 900); tn(120, .12, 'square', .07, 50); },
    growl: () => { tn(70, 1.4, 'sawtooth', .12, 38); nz(1.2, .1, 250); },
    quake: () => nz(2.5, .25, 120),
    wind: () => nz(2.5, .08, 900),
    buy: () => [523, 659, 784, 1046].forEach((f, i) => tn(f, .3, 'triangle', .07, 0, i * .07, 1)),
    no: () => tn(160, .2, 'square', .05, 110),
    over: () => [440, 349, 262, 196].forEach((f, i) => tn(f, .5, 'triangle', .08, 0, i * .18, 1)),
    sel: () => tn(880, .05, 'square', .03)
  })[k]();
};

// ---------- sprites de criaturas ----------
const SP = {}, CR = [2, 3.2, 6];
const spr = (sh, ci, z, fr, iv) => {
  const key = [sh, ci, z, fr, iv] + '';
  if (SP[key]) return SP[key];
  const r = [2, 4, 7][z], s = r * 4 + 8, o = s >> 1, col = COL[ci][0], f = iv ? -1 : 1, G = [], [c, x] = mk(s, s),
    li = mix(col, '#ffffff', .55), dk = mix(col, '#101030', .5), wg = mix(col, '#ffffff', .3), ol = mix(col, '#05030c', .85);
  const set = (a, b, v) => { a = round(a) + o; b = round(b * f) + o; if (a >= 0 && a < s && b >= 0 && b < s) G[b * s + a] = v; };
  const shade = (u, v) => { const d = -u * .55 - v * .8; return d > .5 ? li : d > -.3 ? col : dk; };
  const disc = (cx, cy, rx, ry, v, cut = 9) => {
    for (let b = -ry; b <= ry; b++) for (let a = -rx; a <= rx; a++) {
      const u = a / (rx + .4), w = b / (ry + .4);
      if (u * u + w * w <= 1 && b <= cut) set(cx + a, cy + b, v.call ? v(u, w) : v);
    }
  };
  const eye = (ex, ey, n) => {
    for (let b = -1; b <= n; b++) for (let a = -1; a <= n; a++) {
      const ea = a < 0 || a == n, eb = b < 0 || b == n;
      if (!(ea && eb)) set(ex + a, ey + b, ea || eb ? '#ffb347' : a + b ? '#fff2c4' : '#ffffff');
    }
  };
  if (sh == 1) { // polilla
    const wy = fr ? -r * 1.15 : r * .55, wr = max(1, r * .75 | 0), spot = (u, v) => u * u + v * v < .15 ? '#ffffff' : u * u + v * v < .4 ? dk : wg;
    disc(fr ? -r * .7 : -r * 1.2, fr ? wy : -r * .3, wr, max(1, wr * .7 | 0), spot);
    disc(fr ? r * .1 : -r * .7, fr ? wy * .8 : r * .2, max(1, wr * .7 | 0), max(1, wr * .5 | 0), spot);
    disc(-r * .3, 0, max(1, r * .9 | 0), max(1, r * .55 | 0), shade);
    for (let q = 1; q <= r * .5 + 1; q++) { set(r * .45 + q * .7, -r * .3 - q * .8, li); }
    eye(r * .35 | 0, -r * .3 | 0, z > 1 ? 2 : z);
  } else if (sh == 2) { // medusa
    const cut = r * .35 | 0;
    for (let q = -r * .7; q <= r * .75; q += max(1.5, r * .45))
      for (let k = 0; k <= r * 1.3; k++) set(q + round(sin(k * .9 + fr * 2.5 + q) * .8), cut + 1 + k, k % 2 ? li : wg);
    disc(0, 0, r, r, shade, cut);
    for (let a = -r + 1; a < r; a += 2) set(a, cut + 1, li);
    set(-r * .3, -r * .15, '#fff2c4'); set(r * .35, -r * .15, '#fff2c4');
    if (z > 1) { set(-r * .3, -r * .15 + 1, '#ffb347'); set(r * .35, -r * .15 + 1, '#ffb347'); }
  } else { // chispa
    const d = fr ? [-.45, -1] : [-1, -.3];
    for (let e = 0; e < 2; e++) for (let q = 0; q <= r * (.7 - e * .2) + 1; q++) {
      const v = q > r * .35 ? '#ffffff' : li;
      set(-r * .25 + e * r * .5 + d[0] * q, -r + .5 + d[1] * q, v); if (r > 4) set(-r * .25 + e * r * .5 + d[0] * q + 1, -r + .5 + d[1] * q, v);
    }
    set(-r - 1, fr ? 1 : 0, li); set(-r - 2, fr ? 2 : -1, li);
    disc(0, 0, r, r, shade);
    eye(r * .3 | 0, -r * .3 | 0, z > 1 ? 3 : z ? 2 : 0);
    if (r > 2) { set(-r * .5, -r * .55, '#ffffff'); set(-r * .5 + 1, -r * .55, '#ffffff'); }
  }
  for (let i = 0; i < s * s; i++) if (!G[i] && (G[i - 1] && i % s || G[i + 1] && (i + 1) % s || G[i - s] || G[i + s])) x.fillStyle = ol, x.fillRect(i % s, i / s | 0, 1, 1);
  for (let i = 0; i < s * s; i++) if (G[i]) x.fillStyle = G[i], x.fillRect(i % s, i / s | 0, 1, 1);
  return SP[key] = c;
};

// ---------- mundo ----------
let cols = new Map(), dec = new Map(), gc = 0, ents = [], sw = [], NW = [], P = [];
let cam = 0, t = 0, m = 0, spd = 36, score = 0, rsh = 0, mx = 0, noise = 0, slow = 0, ev = '', evT = 40, evL = 0, qd = 0;
let wx = 0, wy = 0, shake = 0, sx = 0, sy = 0, cb = -1, bn = { s: '', l: 0, c: '#fff' }, res = {}, ot = 0, st = 'nest', pz = 0, sel = 0, lh = 0, mn = 0, hint = 0;
const tl = (i, j) => { if (j < 0 || j >= R) return 1; const c = cols.get(i); return c ? c[j] : 1; };
const sol = v => v > 0 && v < 5;
const tb = i => { const c = cols.get(i); if (!c) return [12, 18]; let a = 0; while (a < R - 1 && sol(c[a])) a++; let z = R - 1; while (z > a && sol(c[z])) z--; return [a, z]; };
const XX = i => i * T + 3, YY = j => j * T + 3;
const add = o => ents.push(o);
const banner = (s, c = '#ffffff') => { bn = { s, l: 2.6, c }; };

const feat = (s, n, b, d, f) => {
  const mm = s + (n >> 1), [a, z] = tb(mm), md = (a + z) >> 1;
  const F = (i, j0, j1, v) => { const c = cols.get(i); if (c) for (let j = max(0, j0); j <= min(R - 1, j1); j++) c[j] = v; };
  const zone = (k, i, j, r) => add({ k: 'z', t: k, x: XX(i), y: YY(j), r: r || 10 });
  const rot = (i, j, r, o) => add({ k: 'o', x: XX(i), y: YY(j), cx: XX(i), cy: YY(j), r, a: 0, sp: rr(2, 4) * pk([-1, 1]), or: max(0, o), oa: rnd() * 7, os: rr(1, 2) * pk([-1, 1]), b });
  let hz = 0;
  f = f || pk(['PPIINNCCCVVLLMDUQQ', 'PPIINSSSOOKKGGDUQ', 'PPINNWWWOOOMDULQQ'][b]);
  if (d < .08 && 'UK'.includes(f)) f = 'N';
  switch (f) {
    case 'P': {
      const w = ri(2, 3), up = rnd() < .5, ln = z - a + 1 - ri(4, 6);
      if (ln > 1) for (let i = mm; i < mm + w; i++) up ? F(i, 0, a + ln - 1, 1) : F(i, z - ln + 1, R - 1, 1);
      hz = [XX(mm + 1), up ? YY(a + ln + 1) : YY(z - ln - 1)];
      break;
    }
    case 'I': {
      let r = ri(2, 4);
      while (r > 1 && (md - r - a < 3 || z - md - r < 3)) r--;
      if (r < 2) break;
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) if (i * i + j * j <= r * r + 1) F(mm + i, md + j, md + j, b == 1 ? 2 : 1);
      const up = rnd() < .5;
      add({ k: 'k', x: XX(mm), y: YY(up ? a + 1 : z - 1) });
      if (rnd() < .6) add({ k: 'm', x: XX(mm), y: YY(up ? z - 1 : a + 1), n: ri(2, 4) });
      break;
    }
    case 'N': {
      const ln = ri(3, 6), g = rnd() < .5 ? 1 : 2;
      for (let i = mm; i < mm + ln; i++) { F(i, 0, md - g - 1, 1); F(i, md + g + 1, R - 1, 1); F(i, md - g, md + g, 0); }
      add({ k: 'k', x: XX(mm + (ln >> 1)), y: YY(md) });
      if (rnd() < .6) add({ k: 'm', x: XX(mm - 6), y: YY(md), n: ri(3, 5) });
      break;
    }
    case 'C':
      for (let q = ri(1, 2); q--;) {
        const x = s + ri(3, n - 4), [a2, z2] = tb(x), h = ri(3, min(7, z2 - a2 - 4)), w = ri(1, 2), row = z2 - h;
        if (h < 3) continue;
        for (let i = x - w; i <= x + w; i++) F(i, row, row, 4);
        F(x, row + 1, z2, 6);
      }
      break;
    case 'V':
      for (let i = s + 2; i < s + n - 2; i += ri(2, 4)) { const [a2, z2] = tb(i); F(i, a2, a2 + ri(3, max(3, (z2 - a2) * .55 | 0)) - 1, 5); }
      break;
    case 'L': {
      const up = rnd() < .25;
      for (let i = mm - 1; i <= mm + 1; i++) up ? (F(i, 0, a - 1, 1), F(i, a, z, 0)) : (F(i, z + 1, R - 1, 1), F(i, a, z, 0));
      add({ k: 'p', x: XX(mm), y: up ? a * T : (z + 1) * T, u: up, s: 0, tm: 0 });
      hz = [XX(mm), up ? YY(a + 2) : YY(z - 2)];
      break;
    }
    case 'M':
      zone('l', mm - 9, md, 12);
      rot(mm + 1, md, ri(5, 8), 0);
      rot(mm + 8, md + ri(-2, 2), ri(5, 7), min(14, (z - a) * 3 - 16));
      hz = [XX(mm + 4), YY(md)];
      break;
    case 'D':
      for (let i = s + 2; i < s + n - 2; i += ri(3, 5)) { const [a2] = tb(i); if (tl(i, a2 - 1) == 1 && !tl(i, a2)) add({ k: 'd', x: XX(i), y: a2 * T, v: 0, f: 0 }); }
      break;
    case 'U': {
      const j = ri(a + 2, z - 2);
      for (let i = mm; i < mm + 2; i++) { F(i, 0, R - 1, 1); F(i, j, j, 0); }
      for (let q = a + 1; q <= z; q += 3) zone('s', mm - 8, q, 9), q > a + 1 && (ents[ents.length - 1].nl = 1);
      add({ k: 'k', x: XX(mm + 4), y: YY(j) });
      break;
    }
    case 'S': {
      const fl = rnd() < .6;
      for (let i = s + 1; i < s + n - 1; i++) { const [a2, z2] = tb(i); if (z2 - a2 > 6) fl ? F(i, z2 + 1, z2 + 1, 3) : F(i, a2 - 1, a2 - 1, 3); }
      hz = [XX(mm), YY(fl ? z - 1 : a + 1)];
      break;
    }
    case 'O': {
      const r = ri(5, 9);
      rot(mm, md, r, rnd() < .5 ? min(ri(8, 16), (z - a) * 3 - r - 10) : 0);
      hz = [XX(mm), YY(md) + (rnd() < .5 ? -1 : 1) * (r + 6)];
      break;
    }
    case 'K': {
      const j = ri(a + 1, z - 2);
      for (let i = mm; i < mm + 2; i++) { F(i, 0, R - 1, 2); F(i, j, j + 1, 0); }
      zone('g', mm - 10, md, 12);
      add({ k: 'k', x: XX(mm + 4), y: YY(md) });
      break;
    }
    case 'G':
      zone('i', mm - 4, md, 11);
      feat(mm + 2, n - (n >> 1) - 2, b, d, 'D');
      hz = [XX(mm + 3), YY(a + 1)];
      break;
    case 'Q': {
      const w = ri(3, 6), dp = ri(2, 3);
      for (let i = mm - w; i <= mm + w; i++) { const c = cols.get(i); if (!c) continue; for (let j = z; j > a && sol(c[j]); j--) c[j] = 0; F(i, z + 1, z + dp, 7); F(i, z + dp + 1, R - 1, 1); }
      if (rnd() < .5) add({ k: 'k', x: XX(mm), y: YY(z + dp) });
      break;
    }
    case 'W': {
      const h = ri(3, 5);
      add({ k: 'w', x: s * T, y: YY(md) - h * 3, w: n * T, h: h * T });
      break;
    }
  }
  if (rnd() < .5 - d * .2) { const i = s + ri(1, n - 2), [a2, z2] = tb(i), j = ri(a2 + 2, z2 - 2); if (!tl(i, j)) add({ k: 'm', x: XX(i), y: YY(j), n: ri(2, 4) }); }
  if (hz && rnd() < .75) add({ k: 'k', x: hz[0], y: hz[1] });
  if (rnd() < .14) { const i = s + ri(1, n - 2), [a2, z2] = tb(i); zone(pk(['gsl', 'gsli', 'sli'][b]), i, (a2 + z2) >> 1); }
};

const gen = () => {
  const s = gc, n = ri(18, 30), b = bA(s), d = min(1, s / 4200);
  for (let i = s; i < s + n; i++) {
    const c = new Uint8Array(R);
    let ce = R / 2 + n1(i * .022) * 7 + n1(i * .09 + 500) * 2, h = lp(10.5, 6, d) + n1(i * .05 + 900) * 2;
    if (i < 70) { ce = R / 2; h = 10; }
    const a = cl(round(ce - h), 1, R - 9), z = cl(round(ce + h), a + 6, R - 2);
    for (let j = 0; j < R; j++) c[j] = j < a || j > z ? 1 : 0;
    cols.set(i, c);
  }
  if (s >= 70) feat(s, n, b, d);
  if (s > 30 && rnd() < .7) { const i = s + ri(2, n - 3), [a, z] = tb(i); if (z - a > 9 && !tl(i, z)) add({ k: 'B', x: XX(i), y: (z + 1) * T + (b > 1 ? 6 : 0), h: rr(20, min(64, (z - a) * T - 16)), w: rr(9, 18), c: pk([BI[b].a2, BI[b].a]), b, ph: rnd() * 6 }); }
  for (let i = s; i < s + n; i++) {
    const [a, z] = tb(i), l = [];
    if (hs(i, 11) < .5) l.push([z, 0, hs(i, 12)]);
    if (hs(i, 13) < .32) l.push([a, 1, hs(i, 14)]);
    dec.set(i, l);
  }
  gc += n;
};
const genTo = () => {
  const c0 = floor(cam / T);
  while (gc < c0 + 110) gen();
  for (const k of cols.keys()) if (k < c0 - 12) { cols.delete(k); dec.delete(k); }
};
const reset = sd => { seed = sd; cols.clear(); dec.clear(); ents = []; P.length = 0; sw = []; NW = []; gc = 0; cam = 0; genTo(); };

// ---------- partículas ----------
const pa = (x, y, vx, vy, l, c, s = 1, g = 0) => { if (P.length < 700) P.push({ x, y, vx, vy, l, m: l, c, s, g }); };
const burst = (x, y, c, n, v, g = 0) => { for (let k = 0; k < n; k++) { const a = rnd() * 7, s = rnd() * v; pa(x, y, cos(a) * s, sin(a) * s, rr(.3, .9), c, rnd() < .3 ? 2 : 1, g); } };
const upP = dt => {
  for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= .98; p.l -= dt; }
  for (let i = P.length; i--;) if (P[i].l <= 0) P.splice(i, 1);
};

// ---------- criaturas ----------
const mkC = (x, y, vx, vy) => ({ x, y, vx, vy, z: 1, mt: 0, iv: 0, st: 0, si: 0, th: rr(.88, 1.12), ph: rnd() * 9, tr: [], dead: 0 });
const ccol = () => COL[S.c][0];
const dur = () => 7 * (1 + S.u[1] * .15);
const kill = c => {
  if (c.dead) return; c.dead = 1;
  burst(c.x, c.y, ccol(), 12, 70); burst(c.x, c.y, '#ffffff', 4, 30); sfx('die', .04);
};
const brk = (i, j) => {
  const c = cols.get(i); if (!c) return; c[j] = 0;
  burst(XX(i), YY(j), pk(['#6ee9ff', '#c46bff', '#ffffff']), 8, 80, 200);
  noise += 4; sfx('brk', .06);
  if (rnd() < .06) add({ k: 'k', x: XX(i), y: YY(j) });
};
let hold = 0, ph = 0;
const collide = c => {
  const r = CR[c.z], i0 = floor((c.x - r) / T), i1 = floor((c.x + r) / T), j0 = floor((c.y - r) / T), j1 = floor((c.y + r) / T);
  let hit = 0;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const v = tl(i, j);
    if (v == 7) { c.vy = c.vy * .93 - 6; c.vx *= .985; if (rnd() < .03) pa(c.x, c.y, rr(-9, 9), -25, .5, '#aef6ff'); continue; }
    if (!v || v == 6) continue;
    if (v == 5) { if (c.si <= 0 && c.st <= 0 && c.z < 2) { c.st = 1.6 * (1 - S.u[2] * .1); sfx('stick'); } continue; }
    const nx = cl(c.x, i * T, i * T + T), ny = cl(c.y, j * T, j * T + T);
    let dx = c.x - nx, dy = c.y - ny, d = hypot(dx, dy);
    if (d >= r) continue;
    if (c.z == 2 && (v == 2 || v == 3) && j >= 0 && j < R) { brk(i, j); continue; }
    if (v == 3) { kill(c); return; }
    if (d < .01) { dx = -c.vx; dy = -c.vy; d = hypot(dx, dy); if (d < .01) { dx = 0; dy = -1; d = 1; } }
    const ux = dx / d, uy = dy / d, pen = r - min(d, r - .01), vn = c.vx * ux + c.vy * uy;
    c.x += ux * pen; c.y += uy * pen;
    if (vn < 0) {
      const e = v == 4 ? 1 : .2;
      c.vx -= (1 + e) * vn * ux; c.vy -= (1 + e) * vn * uy;
      if (v == 4) { if (uy < -.5) c.vy = min(c.vy, -160); if (uy > .5) c.vy = max(c.vy, 160); sfx('boing', .1); burst(c.x, c.y + r, '#ff4fd8', 3, 30); }
      else hit = max(hit, -vn);
    }
  }
  if (hit > 45) { noise += (hit - 45) * .012 / (1 + S.u[4] * .2); if (hit > 70) sfx('hit', .07); }
};
const upC = (c, dt) => {
  const z = c.z, inv = c.iv > 0 ? -1 : 1;
  if (c.mt > 0 && (c.mt -= dt) <= 0) c.z = 1;
  if (c.iv > 0) c.iv -= dt;
  if (c.si > 0) c.si -= dt;
  if (c.st > 0) {
    c.st -= dt; c.vx = spd * .55; c.vy = sin(t * 6 + c.ph) * 10;
    if (c.st <= 0) c.si = .9;
    if (rnd() < .1) pa(c.x, c.y, 0, 15, .5, '#52f59a');
  } else {
    c.vy += 230 * (z == 2 ? 1.6 : z ? 1 : .85) * inv * dt;
    if (hold) { c.vy -= 520 * c.th * (z == 2 ? .85 : z ? 1 : 1.05) * inv * dt; c.vx += (spd * 1.45 - c.vx) * 2.5 * dt; }
    else c.vx += (spd * .8 - c.vx) * 1.2 * dt;
    const wk = z == 2 ? .35 : z ? 1 : 2.2;
    c.vx += wx * wk * dt; c.vy += wy * wk * dt;
    c.vy *= 1 - .5 * dt;
    const mf = z == 2 ? 270 : 185; c.vy = cl(c.vy, -mf, mf);
  }
  const ns = min(5, 1 + floor(hypot(c.vx, c.vy) * dt / 2.2));
  for (let k = 0; k < ns && !c.dead; k++) { c.x += c.vx * dt / ns; c.y += c.vy * dt / ns; collide(c); }
  const rx = cam + W - 5 - CR[c.z];
  if (c.x > rx) { c.x = rx; if (c.vx > spd) c.vx = spd; }
  c.tr.unshift(c.x, c.y); if (c.tr.length > 40) c.tr.length = 40;
};
const sep = () => {
  const n = sw.length;
  for (let a = 0; a < n; a++) {
    const p = sw[a];
    for (let b = a + 1; b < n; b++) {
      const q = sw[b], dx = q.x - p.x, dy = q.y - p.y, rq = (CR[p.z] + CR[q.z]) * 1.05;
      if (abs(dx) < rq && abs(dy) < rq) {
        const d = hypot(dx, dy) || .1;
        if (d < rq) { const o = (rq - d) / d * .35; p.x -= dx * o; p.y -= dy * o; q.x += dx * o; q.y += dy * o; }
      }
    }
  }
};
const near = (c, e, r) => { const dx = c.x - e.x, dy = c.y - e.y, q = r + CR[c.z]; return !c.dead && dx * dx + dy * dy < q * q; };
const vEdge = y => 17 + sin(y * .07 + t * 2.3) * 4 + sin(y * .21 - t * 4) * 2;

// ---------- entidades ----------
const ZC = { g: '#ff8a3d', s: '#a6ff4d', l: '#9ab8ff', i: '#b05cff' }, ZN = { g: 'GIGANTE', s: 'MINI', l: 'LENTO', i: 'INVERSO' };
const upE = dt => {
  for (const e of ents) {
    if (e.x < cam - 80) { e.dead = 1; continue; }
    if (e.x > cam + W + 60) continue;
    switch (e.k) {
      case 'm':
        for (const c of sw) if (near(c, e, 5)) {
          e.dead = 1;
          for (let q = 0; q < e.n && sw.length + NW.length < MAXS; q++) NW.push(mkC(e.x + rr(-3, 3), e.y + rr(-3, 3), c.vx + rr(-30, 50), c.vy + rr(-70, 70)));
          burst(e.x, e.y, '#ff4fd8', 20, 90); add({ k: 't', s: '+' + e.n, x: e.x, y: e.y - 6, l: 1, c: '#ff9de8' }); sfx('clone');
          break;
        }
        break;
      case 'k': {
        const mr = 6 + S.u[5] * 8;
        for (const c of sw) {
          if (c.dead) continue;
          const dx = c.x - e.x, dy = c.y - e.y, d = hypot(dx, dy) || 1;
          if (d < CR[c.z] + 4) { e.dead = 1; rsh++; burst(e.x, e.y, '#ffd75e', 14, 60); sfx('shard'); break; }
          if (S.u[5] && d < mr + CR[c.z]) { e.x += dx / d * 100 * dt; e.y += dy / d * 100 * dt; }
        }
        break;
      }
      case 'z':
        for (const c of sw) if (near(c, e, e.r)) {
          if (e.t == 'g') { if (c.z != 2) { c.z = 2; sfx('big', .2); } c.mt = dur(); }
          else if (e.t == 's') { if (c.z) { c.z = 0; sfx('small', .2); } c.mt = dur(); }
          else if (e.t == 'i') { if (c.iv <= 0) sfx('inv', .2); c.iv = dur() * .75; }
          else { if (slow <= 0) { sfx('slow'); banner('CAMARA LENTA', '#9ab8ff'); } slow = 3.5 * (1 + S.u[1] * .15); }
        }
        break;
      case 'w':
        for (const c of sw) if (c.x > e.x && c.x < e.x + e.w && c.y > e.y && c.y < e.y + e.h) {
          c.vx = min(c.vx + 700 * (c.z == 2 ? .5 : c.z ? 1 : 1.7) * dt, spd + 240); c.vy *= 1 - 3 * dt;
          if (rnd() < .2) pa(c.x, c.y, -40, 0, .4, '#7ff0ff');
        }
        break;
      case 'o':
        e.a += e.sp * dt;
        if (e.or) { e.oa += e.os * dt; e.x = e.cx + cos(e.oa) * e.or; e.y = e.cy + sin(e.oa) * e.or; }
        for (const c of sw) if (near(c, e, e.r * .85)) {
          if (e.b < 2 && c.z == 2) { e.dead = 1; burst(e.x, e.y, e.b ? '#6ee9ff' : '#ff4fd8', 40, 120, 150); add({ k: 'k', x: e.x, y: e.y }); sfx('brk'); noise += 12; break; }
          kill(c);
        }
        break;
      case 'p': {
        const s = e.u ? -1 : 1, inJaw = (c, h) => abs(c.x - e.x) < 9 + CR[c.z] && (e.y - c.y) * s > -2 && (e.y - c.y) * s < h;
        if (!e.s) { if (sw.some(c => inJaw(c, 24))) { e.s = 1; e.tm = .3; } }
        else if (e.s == 1) {
          if ((e.tm -= dt) <= 0) { e.s = 2; e.tm = 1.4; sfx('chomp'); noise += 5; for (const c of sw) if (c.z < 2 && inJaw(c, 17)) kill(c); }
        } else if ((e.tm -= dt) <= 0) e.s = 0;
        break;
      }
      case 'd': case 'r':
        if (!e.f) { if (sw.some(c => c.x > e.x - 36 && c.x < e.x + 4 && c.y > e.y)) { e.f = 1; nz(.3, .06, 300); } }
        else {
          e.v += 420 * dt; e.y += e.v * dt;
          const tip = e.y + (e.k == 'd' ? 10 : 3);
          for (const c of sw) if (!c.dead && abs(c.x - e.x) < CR[c.z] + 3 && c.y + CR[c.z] > tip - 10 && c.y - CR[c.z] < tip) kill(c);
          if (sol(tl(floor(e.x / T), floor(tip / T))) && e.v > 60 || e.y > H) {
            e.dead = 1; burst(e.x, tip, e.k == 'd' ? '#6ee9ff' : '#9a8cc0', 10, 60, 200); nz(.15, .08, 700);
          }
        }
        break;
      case 'S': {
        e.l -= dt;
        let tg = null, bd = 1e9;
        for (const c of sw) { const d = hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; tg = c; } }
        if (e.l > 0 && tg) { const d = bd || 1; e.vx += (tg.x - e.x) / d * 480 * dt; e.vy += (tg.y - e.y) / d * 480 * dt; }
        else { e.vx -= 400 * dt; e.vy *= .95; }
        const sp = hypot(e.vx, e.vy), mxs = spd + 100;
        if (sp > mxs) { e.vx *= mxs / sp; e.vy *= mxs / sp; }
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.l > 0) for (const c of sw) if (near(c, e, 8)) kill(c);
        if (e.l < -4) e.dead = 1;
        break;
      }
      case 't': e.y -= 14 * dt; if ((e.l -= dt) < 0) e.dead = 1;
    }
  }
  ents = ents.filter(e => !e.dead);
};

// ---------- dibujo ----------
const [WC, WX] = mk(W, H), [MC, MX] = mk(W, H);
// textura de piedras (adoquines redondeados) por bioma
const PAT = BI.map(B => {
  const [c, q] = mk(48, 48), hl = mix(B.r2, '#ffffff', .14);
  q.fillStyle = B.r3; q.fillRect(0, 0, 48, 48);
  for (let k = 0; k < 75; k++) {
    const cx = rnd() * 48, cy = rnd() * 48, rx = rr(2.2, 5.5), ry = rr(1.6, 3.6), dm = rnd() * .45;
    for (let b = -5; b <= 5; b++) for (let a = -7; a <= 7; a++) {
      const u = a / rx, v = b / ry, e = u * u + v * v, d = -u * .55 - v * .8;
      if (e > 1.5) continue;
      q.fillStyle = e > 1 ? B.r3 : mix(d > .45 ? hl : d > -.35 ? B.r2 : B.r, B.r3, dm);
      q.fillRect((cx + a + 48) % 48 | 0, (cy + b + 48) % 48 | 0, 1, 1);
    }
  }
  return X.createPattern(c, 'repeat');
});

// capas de fondo horneadas: 0 cielo/niebla, 1-3 siluetas con parallax, 4 primer plano
const BK = BI.map((B, bi) => [0, 1, 2, 3, 4].map(k => {
  const [c, q] = mk(640, H), w3 = fn => [-640, 0, 640].forEach(fn), s = [1, .6, .85, 1.1, 1][k];
  const dk = k > 3 ? '#030208' : mix(B.f, '#030208', [0, .35, .6, .8][k]), rim = mix(dk, B.g, k > 3 ? .3 : .5);
  const L = (cc, x, y, r, a) => { q.globalCompositeOperation = 'lighter'; lt(q, cc, x, y, r, a); q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; };
  const poly = (pts, cc) => { q.fillStyle = cc; q.beginPath(); for (let i = 0; i < pts.length; i += 2) q.lineTo(pts[i], pts[i + 1]); q.fill(); };
  if (!k) {
    const g = q.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#030208'); g.addColorStop(.5, B.f); g.addColorStop(1, '#040309');
    q.fillStyle = g; q.fillRect(0, 0, 640, H);
    for (let n = 0; n < 10; n++) { const x = rnd() * 640, y = rr(30, 150), r = rr(40, 110), cc = pk([B.a, B.a2, B.e]), a = rr(.1, .22); w3(o => L(cc, x + o, y, r, a)); }
    for (let n = 0; n < 6; n++) {
      const x = rnd() * 640, w = rr(6, 22), sl = rr(30, 90);
      w3(o => { const g2 = q.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, B.a2 + '2a'); g2.addColorStop(1, B.a2 + '00'); q.globalCompositeOperation = 'lighter'; poly([x + o, 0, x + o + w, 0, x + o + w + sl, H, x + o + sl, H], g2); q.globalCompositeOperation = 'source-over'; });
    }
    for (let n = 0; n < 160; n++) { q.globalAlpha = rnd() * .7; q.fillStyle = pk([B.a, B.a2, B.e, '#ffffff']); q.fillRect(rnd() * 640 | 0, rnd() * H | 0, 1, 1); }
    q.globalAlpha = 1;
    return c;
  }
  // masa de suelo y techo (cuevas lejanas)
  if (k < 4) for (const top of [0, 1]) {
    q.fillStyle = dk; q.beginPath(); q.moveTo(0, top ? 0 : H);
    for (let x = 0; x <= 640; x += 4) q.lineTo(x, (top ? 0 : H) + (top ? 1 : -1) * (6 + 5 * sin(x * PI / 320 * (2 + k) + k + top * 3) + 4 * sin(x * PI / 320 * (7 + k * 2))) * s * (top ? 1.6 : 2.2));
    q.lineTo(640, top ? 0 : H); q.fill();
  }
  const N = [0, 8, 7, 6, 11][k];
  for (let n = 0; n < N; n++) {
    const x0 = rnd() * 640, h = rnd(), hh = rnd(), gc_ = hh < .5 ? B.a2 : B.a;
    w3(o => {
      const x = x0 + o;
      if (k > 3) { // primer plano: rocas y plantas casi negras en los bordes
        const top = h < .45, sz = rr(9, 24), y = top ? -sz * .35 : H + sz * .35;
        for (let m = 0; m < 3; m++) { q.fillStyle = rim; q.beginPath(); q.arc(x + m * sz * .8, y + (top ? 1 : -1), sz * (1 - m * .25), 0, 7); q.fill(); }
        for (let m = 0; m < 3; m++) { q.fillStyle = dk; q.beginPath(); q.arc(x + m * sz * .8 + 1, y + (top ? -1 : 1) * 0 + (top ? 0 : 1), sz * (1 - m * .25), 0, 7); q.fill(); }
        q.fillStyle = dk;
        for (let m = 0; m < 6; m++) { const bx = x + rr(-sz, sz * 2), ln = rr(6, 22); for (let p = 0; p < ln; p++) q.fillRect(round(bx + sin(p * .25 + m) * 2 * (p / ln)), top ? p : H - p, 1, 1); }
      } else if (bi == 0) { // hongos gigantes lejanos
        const sh = (50 + h * 90) * s, cy = H - sh, cw = (12 + hh * 18) * s, sw = max(2, cw * .2);
        for (let y = cy; y < H; y++) { const of = sin((y - cy) / sh * 2.5 + h * 6) * 3 * s; q.fillStyle = dk; q.fillRect(x - sw / 2 + of, y, sw, 1); q.fillStyle = rim; q.fillRect(x - sw / 2 + of, y, 1, 1); }
        const cx = x + sin(h * 6) * 3 * s;
        q.fillStyle = dk; q.beginPath(); q.ellipse(cx, cy, cw, cw * .5, 0, PI, 0); q.fill();
        q.strokeStyle = rim; q.lineWidth = 1; q.beginPath(); q.ellipse(cx, cy, cw - .5, cw * .5 - .5, 0, PI * 1.08, PI * 1.6); q.stroke();
        q.fillStyle = mix(dk, gc_, .55); q.fillRect(cx - cw, cy - 1, cw * 2, 2);
        q.fillStyle = mix(dk, gc_, .3); for (let m = 0; m < 5; m++) q.fillRect(cx + cos(m * 2.1 + h * 9) * cw * .6, cy - cw * .25 - sin(m * 1.3) * cw * .12, 1 + k / 2, 1);
        L(gc_, cx, cy + 4, cw * 1.8, .3 - k * .05);
      } else if (bi == 1) { // agujas de cristal
        const up = h < .45, b = up ? 0 : H, d = up ? 1 : -1, ln = (40 + hh * 100) * s, w = (5 + h * 9) * s, tl_ = (hh - .5) * 24;
        poly([x - w, b, x - w * .8 + tl_ * .8, b + d * ln * .85, x + tl_, b + d * ln, x + w * .8 + tl_ * .8, b + d * ln * .85, x + w, b], dk);
        poly([x + tl_ * .2, b, x + tl_, b + d * ln, x + w * .8 + tl_ * .8, b + d * ln * .85, x + w, b], mix(dk, B.g, .18));
        q.strokeStyle = rim; q.lineWidth = 1; q.beginPath(); q.moveTo(x - w, b); q.lineTo(x - w * .8 + tl_ * .8, b + d * ln * .85); q.lineTo(x + tl_, b + d * ln); q.stroke();
        L(pk([B.e, B.a]), x + tl_, b + d * ln * .8, w * 2.5, .25 - k * .04);
      } else { // ruinas: engranajes y pilares
        if (h < .4) {
          const y = rr(25, H - 25), R2 = (14 + hh * 26) * s, pts = [];
          for (let m = 0; m < 32; m++) { const a = m * PI / 16, rd = (m >> 1) % 2 ? R2 : R2 + 3 * s; pts.push(x + cos(a) * rd, y + sin(a) * rd); }
          poly(pts, dk); q.strokeStyle = rim; q.beginPath(); q.arc(x, y, R2 * .75, PI, PI * 1.6); q.stroke();
          q.fillStyle = mix(dk, '#000000', .5); q.beginPath(); q.arc(x, y, R2 * .3, 0, 7); q.fill();
        } else {
          const w = (6 + hh * 8) * s, ph = (60 + h * 80) * s;
          q.fillStyle = dk; q.fillRect(x - w, H - ph, w * 2, ph); q.fillRect(x - w - 3, H - ph, w * 2 + 6, 4 * s);
          q.fillStyle = rim; q.fillRect(x - w, H - ph + 4, 1, ph);
          for (let m = 0; m < 3; m++) if (rnd() < .6) { const wy = H - ph + 12 + m * 18 * s; q.fillStyle = B.a; q.fillRect(x - 1, wy, 2, 3); L(B.a, x, wy + 1, 10, .3); }
        }
      }
      if (k == 3 && h > .6) { // lianas colgantes
        const ln = rr(15, 60); q.fillStyle = dk;
        for (let p = 0; p < ln; p++) { const vx = round(x + 20 + sin(p * .15 + h * 9) * 2); q.fillRect(vx, p, 1, 1); if (p % 5 == 0) q.fillRect(vx + (p % 10 ? 1 : -2), p, 2, 1); }
        q.fillStyle = B.e; q.fillRect(round(x + 20 + sin(ln * .15 + h * 9) * 2), ln, 1, 2);
      }
    });
  }
  if (k < 3) { q.globalCompositeOperation = 'source-atop'; q.globalAlpha = [0, .35, .18][k]; q.fillStyle = B.f; q.fillRect(0, 0, 640, H); }
  return c;
}));
const back = (b, a) => {
  for (let k = 0; k < 4; k++) {
    const f = [.04, .16, .36, .62][k], x0 = -((cam * f % 640) + 640) % 640;
    ga(a); X.drawImage(BK[b][k], round(x0 + sx * f), round(sy * f)); X.drawImage(BK[b][k], round(x0 + 640 + sx * f), round(sy * f));
  }
};

// objetos grandes del plano medio (hongos gigantes, cristales, engranajes)
const prop = e => {
  const x = round(e.x - cam + sx), y = round(e.y + sy), B = BI[e.b];
  if (x < -60 || x > W + 60) return;
  if (!e.b) {
    for (let q = 0; q < e.h; q++) { const of = round(sin(q / e.h * 2.2 + e.ph) * 3); fr(x - 2 + of, y - q, 5, 1, '#2c2640'); fr(x - 2 + of, y - q, 1, 1, '#7a72a8'); fr(x + 2 + of, y - q, 1, 1, '#16121f'); }
    const cx = x + round(sin(2.2 + e.ph) * 3), cy = round(y - e.h);
    fs(mix(e.c, '#05030c', .55)); C.beginPath(); C.ellipse(cx, cy, e.w, e.w * .55, 0, PI, 0); C.fill();
    fs(mix(e.c, '#05030c', .3)); C.beginPath(); C.ellipse(cx - e.w * .15, cy - e.w * .1, e.w * .7, e.w * .38, 0, PI, 0); C.fill();
    fr(cx - e.w, cy - 1, e.w * 2, 2, e.c); fs('#ffffff');
    for (let q = 0; q < 5; q++) fr(round(cx + cos(q * 1.9 + e.ph) * e.w * .55), round(cy - e.w * .2 - abs(sin(q * 2.3)) * e.w * .25), 1 + (q & 1), 1);
    ad(e.c, cx, cy + 3, e.w * 2.6, .7);
  } else if (e.b == 1) {
    for (let q = -1; q <= 1; q++) {
      const h = e.h * (1 - abs(q) * .35), w = e.w * .35, bx = x + q * w * 1.6, tt = q * 4;
      fs(mix(e.c, '#05030c', .55)); C.beginPath(); C.moveTo(bx - w, y); C.lineTo(bx - w + tt, y - h * .8); C.lineTo(bx + tt, y - h); C.lineTo(bx + w + tt, y - h * .8); C.lineTo(bx + w, y); C.fill();
      fs(mix(e.c, '#05030c', .2)); C.beginPath(); C.moveTo(bx, y); C.lineTo(bx + tt, y - h); C.lineTo(bx + w + tt, y - h * .8); C.lineTo(bx + w, y); C.fill();
      fr(round(bx + tt), round(y - h), 1, 2, '#ffffff');
    }
    ad(e.c, x, y - e.h * .6, e.w * 3, .6);
  } else {
    fs('#2a1e1c'); C.beginPath();
    for (let q = 0; q < 24; q++) { const a = q * PI / 12 + e.ph, rd = (q >> 1) % 2 ? e.w : e.w + 3; C.lineTo(x + cos(a) * rd, y + sin(a) * rd); }
    C.fill(); fs('#4a3226'); C.beginPath(); C.arc(x, y, e.w * .7, 0, 7); C.fill(); fs('#120c0c'); C.beginPath(); C.arc(x, y, e.w * .28, 0, 7); C.fill();
    for (let q = -e.w; q < e.w; q += 2) fr(x + q, round(y - sqrtE(e.w * e.w - q * q) - 1), 2, 2 + (q & 3), B.e2);
    fr(x - 1, y - e.w - 6, 2, 3, B.a); ad(B.a, x, y - e.w - 5, 22, .7);
  }
};
const sqrtE = v => Math.sqrt(max(0, v));

const depth = (i, j) => { for (let r = 1; r < 4; r++) if (!sol(tl(i - r, j)) || !sol(tl(i + r, j)) || !sol(tl(i, j - r)) || !sol(tl(i, j + r))) return r - 1; return 3; };

const drawTile = (v, i, j, px, py, B, b) => {
  if (v == 7) { if (tl(i, j - 1) != 7) ad('#3fd6ff', px + 3, py + 2, 18, .4); return; }
  if (v == 5) {
    const w = round(sin(t * 2 + i + j * .7));
    fr(px + 2 + w, py, 2, T, '#2a9a4a'); fr(px + 2 + w, py, 1, T, '#5fe07a');
    if ((i + j) % 2) fr(px + 4 + w, py + 2, 2, 1, '#7dff8a'); else fr(px + w, py + 3, 2, 1, '#7dff8a');
    if (tl(i, j + 1) != 5) { fr(px + 1 + w, py + T - 2, 4, 3, '#c6ff6a'); ad('#9dff6a', px + 3, py + T, 10, .6); }
    return;
  }
  if (v == 6) { fr(px + 1, py, 4, T, '#8a82b0'); fr(px + 1, py, 1, T, '#d8d2f0'); fr(px + 4, py, 1, T, '#3a3458'); return; }
  const up = !sol(tl(i, j - 1)), dn = !sol(tl(i, j + 1)), lf = !sol(tl(i - 1, j)), rt = !sol(tl(i + 1, j)), h = hs(i, j);
  if (v == 2) {
    fr(px, py, T, T, '#232884');
    fs((i + j) % 2 ? '#4f6cff' : '#8a5ae0');
    for (let k = 0; k < T; k++) if ((k + i * 3 + j) % 4 < 2) fr(px + k, py + T - 1 - k, 1, 1);
    if (up) fr(px, py, T, 1, '#bff6ff'); if (lf) fr(px, py, 1, T, '#7fd8ff');
    if (h < .3) fr(px + 2, py + 2, 1, 1, '#ffffff');
    if (up || dn || lf || rt) ad(h < .5 ? '#6ee9ff' : '#c46bff', px + 3, py + 3, 14, .28);
    return;
  }
  if (v == 4) {
    fr(px, py, T, T - 2, B.a); fs(mix(B.a, '#ffffff', .5)); if (up) fr(px, py, T, 1); if ((i + j) % 2) fr(px + 2, py + 2, 2, 1);
    fr(px, py + T - 2, T, 2, '#7a1f6a'); fs(mix(B.a, '#ffffff', .3)); for (let k = 0; k < T; k += 2) fr(px + k, py + T - 2, 1, 2);
    ad(B.a, px + 3, py + 4, 18, .35);
    return;
  }
  const d = depth(i, j);
  if (d) { ga([0, .35, .6, .8][d]); fr(px, py, T, T, '#020106'); ga(1); return; }
  if (v == 3) {
    const sp = up ? 1 : dn ? -1 : 0;
    if (sp) for (let q = 0; q < 2; q++) for (let k = 0; k < 4; k++) {
      const w = k >> 1 ? 3 : 1, yy = sp > 0 ? py - 3 + k : py + T + 2 - k;
      fr(px + q * 3 + 1 - (w >> 1), yy, w, 1, k < 2 ? '#e8fbff' : '#6ee9ff');
    }
    ad('#6ee9ff', px + 3, py + 3 - sp * 3, 12, .4);
  }
  if (lf) fr(px, py, 1, T, mix(B.r2, '#ffffff', .25));
  if (rt) fr(px + T - 1, py, 1, T, B.r3); if (dn) fr(px, py + T - 1, T, 1, B.r3);
  if (up) {
    if (b == 1) { fr(px, py, T, 1, '#bff6ff'); fr(px, py + 1, T, 1, '#4a6ad0'); if (h < .4) fr(px + (h * 15 | 0) % 5, py - 2, 1, 2, B.e); }
    else {
      fr(px, py, T, 2, B.e2); fr(px, py, T, 1, B.e);
      if (h > .45) fr(px + (h * 7 | 0) % 6, py + 2, 1, 1 + (h * 5 | 0) % 3, B.e2);
      if (h < .7) { fr(px + (h * 13 | 0) % 6, py - 2, 1, 2, B.e); fr(px + (h * 29 | 0) % 6, py - 1, 1, 1); }
      if (b == 2 && h < .25) fr(px + 1, py + 2, 3, 1, B.a);
    }
  }
  if (dn && h > .55) fr(px + (h * 17 | 0) % 6, py + T, 1, 1 + (h * 9 | 0) % 5, b == 1 ? B.e : B.e2);
  if (up && lf) { C.clearRect(px, py, 2, 1); C.clearRect(px, py + 1, 1, 1); }
  if (up && rt) { C.clearRect(px + T - 2, py, 2, 1); C.clearRect(px + T - 1, py + 1, 1, 1); }
  if (dn && lf) { C.clearRect(px, py + T - 1, 2, 1); C.clearRect(px, py + T - 2, 1, 1); }
  if (dn && rt) { C.clearRect(px + T - 2, py + T - 1, 2, 1); C.clearRect(px + T - 1, py + T - 2, 1, 1); }
};

const drawDeco = (i, dd, px, oy) => {
  const [j, u, h] = dd, b = bA(i), B = BI[b], k = hs(i, j + 77), x = px + (h * 4 | 0) + 1;
  if (!u) {
    if (!sol(tl(i, j + 1)) || tl(i, j)) return;
    const y = (j + 1) * T + oy;
    if (b == 0) {
      if (h < .4) { const c = k < .5 ? B.a2 : B.a, sh = 2 + (k * 3 | 0); fr(x, y - sh, 1, sh, '#c9c2e0'); fr(x - 1, y - sh - 1, 3, 1, c); fr(x - 2, y - sh, 5, 1); fr(x, y - sh - 1, 1, 1, '#ffffff'); ad(c, x, y - sh, 12, .6); }
      else if (h < .8) { fs(B.e); for (let q = -3; q <= 3; q++) fr(x + q, y - 1 - (3 - abs(q)) - (q & 1), 1, 2); fr(x, y - 6, 1, 2, '#c6ff6a'); ad(B.e, x, y - 3, 8, .3); }
      else { const sh = 6 + (k * 8 | 0), c = k < .5 ? B.a2 : B.a; fr(x, y - sh, 2, sh, '#d8d2ee'); fr(x - 3, y - sh - 2, 8, 2, mix(c, '#05030c', .3)); fr(x - 2, y - sh - 3, 6, 1, c); fr(x - 3, y - sh, 8, 1, c); fr(x - 1, y - sh - 3, 1, 1, '#ffffff'); ad(c, x + 1, y - sh, 28, .7); }
    } else if (b == 1) {
      for (let q = 0; q < 2 + (k * 3 | 0); q++) {
        const hh = 3 + (hs(i, q) * 8 | 0), xx = x + q * 2 - 2, c = (q + i) % 2 ? B.a : B.e;
        fr(xx - 1, y - hh, 1, hh, mix(c, '#05030c', .5)); fr(xx, y - hh, 2, hh, c); fr(xx, y - hh, 1, hh - 1, mix(c, '#ffffff', .4)); fr(xx, y - hh - 1, 1, 1, '#ffffff');
      }
      ad(k < .5 ? B.e : B.a, x, y - 4, 20, .6);
    } else {
      if (h < .5) { fs(B.e); for (let q = 0; q < 5; q++) fr(x + round(sin(t * 2 + q + i) * .8), y - 1 - q, 1, 1); fr(x + 2, y - 3, 1, 3); ad(B.e, x, y - 3, 12, .45); }
      else { fr(x - 1, y - 6, 4, 6, '#3a3036'); fr(x - 1, y - 6, 1, 6, '#5a4a50'); fr(x, y - 8, 2, 2, B.a); ad(B.a, x + 1, y - 8, 22, .65); }
    }
  } else {
    if (!sol(tl(i, j - 1)) || sol(tl(i, j))) return;
    const y = j * T + oy;
    if (b == 0) {
      if (h < .65) {
        for (let q = 0; q < 1 + (k * 3 | 0); q++) { const ln = 2 + (hs(i, q + 9) * 8 | 0), bx = x + q * 2 - 1; fr(bx, y, 1, ln, '#4a3a5a'); fr(bx - 1, y + ln, 3, 2, '#ffb347'); fr(bx, y + ln, 1, 1, '#fff2c0'); }
        ad('#ffb347', x, y + 6, 22, .7);
      } else { fs(B.e2); for (let q = 0; q < 4; q++) fr(x + q, y, 1, 2 + (hs(i, q + 5) * 7 | 0)); fr(x + 1, y + 6, 1, 1, B.e); }
    } else if (b == 1) {
      const hh = 3 + (k * 7 | 0); fr(x, y, 2, hh, B.e); fr(x + 1, y, 1, hh, mix(B.e, '#05030c', .4)); fr(x, y + hh - 1, 1, 1, '#ffffff'); ad(B.e, x, y + hh, 14, .45);
    } else {
      fs('#5a4a40'); const ln = 3 + (k * 12 | 0); for (let q = 0; q < ln; q += 2) fr(x, y + q, 1, 1);
      if (k > .5) { fr(x - 1, y + ln, 3, 2, B.e); ad(B.e, x, y + ln, 14, .5); }
    }
  }
};

const drawEnt = (e, ps) => {
  const x = round(e.x - cam + sx), y = round(e.y + sy);
  if (x < -40 - (e.w || 0) || x > W + 40) return;
  if (!ps) { // capa del mundo (iluminada)
    if (e.k == 'o' && e.b == 2) {
      fs('#6a4630'); C.beginPath();
      for (let q = 0; q < 24; q++) { const an = e.a + q * PI / 12, rd = (q >> 1) % 2 ? e.r - 1 : e.r + 2; C.lineTo(x + cos(an) * rd, y + sin(an) * rd); }
      C.fill(); fs('#9a6a3a'); C.beginPath(); C.arc(x, y, e.r * .6, 0, 7); C.fill();
      fs('#1a1214'); C.beginPath(); C.arc(x, y, e.r * .3, 0, 7); C.fill();
      ad('#ffb347', x, y, e.r * 2, .25);
    } else if (e.k == 'p') {
      const s = e.u ? -1 : 1, an = e.s == 0 ? .8 + sin(t * 3 + e.x) * .12 : e.s == 1 ? .8 * e.tm / .3 : .06;
      fr(x - 1, e.u ? y : y - 4, 2, 4, '#2a7a4a');
      for (const sd of [-1, 1]) {
        C.save(); C.translate(x, y - 4 * s); C.scale(sd, s); C.rotate(-an);
        fr(-5, -14, 5, 14, '#c2309a'); fr(-4, -13, 2, 11, '#ff6fe0');
        fs('#ffffff'); for (let q = -12; q < 0; q += 3) fr(0, q, 2, 1);
        C.restore();
      }
      fr(x - 1, y - 20 * s - 1, 2, 2, '#fff27a'); ad('#ffe14a', x, y - 20 * s, 16, .7); ad('#ff4fd8', x, y - 8 * s, 20, .35);
    } else if (e.k == 'd') {
      const wg = !e.f && sw.some(c => c.x > e.x - 60 && c.x < e.x) ? round(sin(t * 40)) : 0;
      fs('#3a3260'); C.beginPath(); C.moveTo(x - 3 + wg, y); C.lineTo(x + 3 + wg, y); C.lineTo(x + wg, y + 11); C.fill();
      fr(x + wg, y + 8, 1, 2, '#6ee9ff'); ad('#6ee9ff', x, y + 9, 10, .45);
    } else if (e.k == 'r') { fr(x - 3, y - 3, 6, 6, '#3a3150'); fr(x - 3, y - 3, 6, 1, '#5a4f78'); }
    else if (e.k == 'm') ad('#ff4fd8', x, y, 34, .8);
    else if (e.k == 'k') ad('#ffd75e', x, y, 18, .7);
    else if (e.k == 'z') ad(ZC[e.t], x, y, e.r * 3, .55);
    else if (e.k == 'o') ad(e.b ? '#6ee9ff' : '#ff4fd8', x, y, e.r * 3, .55);
    else if (e.k == 'w') for (let q = 0; q < e.w; q += 24) ad('#3fd6ff', x + q, y + e.h / 2, e.h, .3);
    return;
  }
  ga(1);
  switch (e.k) {
    case 'm': {
      const r = 5 + sin(t * 6);
      fs('#ff4fd8');
      for (let q = 0; q < 8; q++) { const an = q * PI / 4 + t * 1.5; fr(round(x + cos(an) * r), round(y + sin(an) * r), 1, 1); }
      fr(x - 2, y - 2, 4, 4, '#ff9de8'); fr(x - 1, y - 1, 2, 2, '#ffffff');
      break;
    }
    case 'k': {
      fr(x, y - 3, 1, 7, '#ffd75e'); fr(x - 3, y, 7, 1);
      fr(x - 1, y - 1, 3, 3, (t * 4 + e.y) % 3 < 1.5 ? '#ffffff' : '#fff2a0');
      break;
    }
    case 'z': {
      const c = ZC[e.t]; fs(c);
      for (let q = 0; q < 6; q++) { const an = q * 1.047 + t * (e.t == 'l' ? .6 : 1.8), rd = e.r * (.55 + .25 * sin(t * 2 + q)); fr(round(x + cos(an) * rd), round(y + sin(an) * rd), e.t == 'g' ? 2 : 1, e.t == 'g' ? 2 : 1); }
      if (e.t == 'g') { fr(x - 2, y - 2, 5, 5); fr(x - 1, y - 1, 1, 1, '#7a3a10'); fr(x + 1, y + 1, 1, 1); }
      else if (e.t == 's') { fr(x, y - 2, 1, 1); fr(x - 1, y - 1, 3, 3); fr(x - 1, y - 1, 1, 1, '#ffffff'); }
      else if (e.t == 'i') { fr(x, y - 3, 1, 7); fr(x - 1, y - 2, 3, 5); fr(x - 2, y - 1, 5, 3); fr(x, y - 1, 1, 1, '#ffffff'); }
      else { co('lighter'); for (let q = 0; q < 5; q++) lt(X, c, x + sin(t + q * 2) * 6, y + cos(t * .7 + q) * 5, 7, .35); co('source-over'); ga(1); }
      if ((m < 600 || st == 'nest') && !e.nl) { ga(.8); tx(ZN[e.t], x, y - e.r - 7, c, 1, 1); ga(1); }
      break;
    }
    case 'w': {
      ga(.1); fr(x, y, e.w, e.h, '#3fd6ff'); ga(.6); fs('#9ff4ff');
      for (let q = 0; q < e.w * e.h / 90; q++) fr(x + round((hs(q, e.y | 0) * e.w + t * 150 * (.6 + hs(q, 3) * .6)) % e.w), y + round(hs(q, 9) * e.h), 4, 1);
      ga(1);
      break;
    }
    case 'o':
      if (e.b < 2) {
        fs(e.b ? '#2a3392' : '#5a1a52'); C.beginPath();
        for (let q = 0; q < 20; q++) { const an = e.a + q * PI / 10, rd = q % 2 ? e.r * .7 : e.r + 3; C.lineTo(x + cos(an) * rd, y + sin(an) * rd); }
        C.fill(); fs(e.b ? '#6ee9ff' : '#ff4fd8'); C.beginPath(); C.arc(x, y, e.r * .5, 0, 7); C.fill();
        fr(x - 1, y - 1, 2, 2, '#ffffff');
      }
      break;
    case 'S': {
      co('lighter'); lt(X, '#7a1040', x, y, 34, .4); co('source-over'); ga(1); fs('#030206');
      for (let q = 0; q < 9; q++) { const an = q * .7 + t * 3, rd = 5 + sin(t * 9 + q) * 2; fr(round(x + cos(an) * rd) - 4, round(y + sin(an) * rd * .7) - 3, 8, 6); }
      fr(x - 9, y - 6, 18, 12);
      fs('#e8e0ff'); for (let q = 0; q < 4; q++) fr(x - 6 + q * 4 + (e.vx > 0 ? 2 : -2), y - 3 + (q % 2), 1, 1);
      if (e.l > 0) { fs('#ffffff'); const op = (t * 10 | 0) % 2; for (let q = -5; q < 6; q += 2) { fr(x + q, y + 2, 1, 2); if (op) fr(x + q + 1, y + 5, 1, 2); } }
      break;
    }
    case 't': ga(min(1, e.l * 2)); txs(e.s, x, y, e.c, 1, 1); ga(1);
  }
};

const scene = () => {
  const blk = ev == 'b' && evL > 0 ? .3 : 1, ib = floor((cam + W / 2) / T), b = bA(ib), B = BI[b];
  sx = shake > 0 ? round((rnd() - .5) * shake * 2) : 0; sy = shake > 0 ? round((rnd() - .5) * shake * 2) : 0;
  const cx = floor(cam), i0 = floor(cx / T), ox = -cx + sx, fa = cl((ib % 420) * T / 260, 0, 1);
  // mapas de luz (multiplicativa para el mundo) y de bloom
  LX.globalCompositeOperation = GX.globalCompositeOperation = 'source-over'; LX.globalAlpha = 1;
  LX.fillStyle = `rgb(${B.am.map(v => v * blk | 0)})`; LX.fillRect(0, 0, W, H); GX.clearRect(0, 0, W, H);
  LX.globalCompositeOperation = GX.globalCompositeOperation = 'lighter';
  // fondo con parallax y transición entre biomas
  C = X; co('source-over'); ga(1);
  back(fa < 1 ? bA(ib - 420) : b, 1); if (fa < 1) back(b, fa);
  ga(1); for (const e of ents) if (e.k == 'B') prop(e);
  // capa del mundo
  C = WX; WX.clearRect(0, 0, W, H);
  for (let i = i0; i <= i0 + W / T + 1; i++) {
    const c = cols.get(i); if (!c) continue;
    const bi = bA(i), px = i * T + ox;
    WX.fillStyle = PAT[bi]; WX.save(); WX.translate(ox, sy);
    for (let j = 0, s = -1; j <= R; j++) { const q = j < R && (c[j] == 1 || c[j] == 3); if (q && s < 0) s = j; if (!q && s >= 0) { WX.fillRect(i * T, s * T, T, (j - s) * T); s = -1; } }
    WX.restore();
    for (let j = 0; j < R; j++) if (c[j]) drawTile(c[j], i, j, px, j * T + sy, BI[bi], bi);
    for (const d of dec.get(i) || []) drawDeco(i, d, px, sy);
  }
  for (const e of ents) if (e.k != 'B') drawEnt(e, 0);
  const na = min(.9, 2.6 / Math.sqrt(sw.length + 1)), col = ccol();
  for (const c of sw) { const lx = c.x - cx + sx, ly = c.y + sy, lr = [28, 46, 70][c.z]; lt(LX, col, lx, ly, lr, na); lt(GX, col, lx, ly, lr * .6, na * .7); }
  MX.clearRect(0, 0, W, H); MX.drawImage(WC, 0, 0);
  WX.globalCompositeOperation = 'multiply'; WX.drawImage(LC, 0, 0);
  WX.globalCompositeOperation = 'destination-in'; WX.drawImage(MC, 0, 0);
  WX.globalCompositeOperation = 'source-over';
  C = X; ga(1); X.drawImage(WC, 0, 0);
  // emisivos: musgo, agua
  co('lighter'); ga(.6);
  for (let i = i0; i <= i0 + W / T + 1; i++) {
    const c = cols.get(i); if (!c) continue;
    const BB = BI[bA(i)], px = i * T + ox;
    for (let j = 1; j < R; j++) if (c[j] == 1 && !sol(c[j - 1]) && c[j - 1] < 6) fr(px, j * T + sy, T, 1, BB.e);
  }
  co('source-over');
  for (let i = i0; i <= i0 + W / T + 1; i++) {
    const c = cols.get(i); if (!c) continue;
    const px = i * T + ox;
    for (let j = 0; j < R; j++) if (c[j] == 7) {
      const py = j * T + sy, top = c[j - 1] != 7;
      ga(.55); fr(px, py, T, T, top ? '#1590c0' : '#0c5a8a');
      if (top) { ga(.95); fr(px, py + round(sin(t * 3 + i) * .6), T, 1, '#aef6ff'); if ((i * 7 + (t * 6 | 0)) % 9 < 2) fr(px + 2, py + 2, 2, 1, '#ffffff'); }
    }
  }
  ga(1);
  // bloom
  co('lighter'); ga(.6); X.drawImage(GLC, 0, 0);
  // motas flotantes
  for (let k = 0; k < 50; k++) {
    const f = .2 + hs(k, 6) * .9, xx = ((hs(k, 5) * 900 - cam * f + t * 5) % (W + 20) + W + 20) % (W + 20) - 10, yy = hs(k, 7) * H + sin(t * .7 + k) * 6;
    ga(.25 + .45 * sin(t * 2 + k * 3) ** 2); fr(round(xx), round(yy), 1 + (f > 1), 1 + (f > 1), k % 3 ? B.e : B.a);
  }
  for (const e of ents) if (e.k != 'S' && e.k != 'B') drawEnt(e, 1);
  co('lighter');
  for (const p of P) { ga(cl(p.l / p.m, 0, 1)); fr(round(p.x - cx + sx), round(p.y + sy), p.s, p.s, p.c); }
  // colas de cometa
  X.lineCap = 'round';
  const many = sw.length > 24;
  for (const c of sw) {
    const tr = c.tr, n = tr.length; if (n < 6) continue;
    if (many) { X.strokeStyle = col; ga(.4); X.lineWidth = 1; X.beginPath(); for (let k = 0; k < n; k += 4) X.lineTo(tr[k] - cx + sx, tr[k + 1] + sy); X.stroke(); continue; }
    for (let k = 2; k < n; k += 2) {
      const u = 1 - k / n;
      X.beginPath(); X.moveTo(tr[k - 2] - cx + sx, tr[k - 1] + sy); X.lineTo(tr[k] - cx + sx, tr[k + 1] + sy);
      X.lineWidth = CR[c.z] * 1.7 * u + .6; X.strokeStyle = col; ga(.3 * u); X.stroke();
      X.lineWidth = X.lineWidth * .4; X.strokeStyle = '#ffffff'; ga(.85 * u); X.stroke();
    }
  }
  ga(1); co('source-over');
  for (const c of sw) {
    const fm = (hold && st == 'play' ? t * 14 : t * 4) + c.ph & 1, im = spr(S.f, S.c, c.z, fm, c.iv > 0 ? 1 : 0);
    X.drawImage(im, round(c.x - cx + sx - im.width / 2), round(c.y + sy - im.height / 2));
    if (c.st > 0) fr(round(c.x - cx + sx), round(c.y + sy - CR[c.z] - 3), 1, 1, '#52f59a');
  }
  for (const e of ents) if (e.k == 'S') drawEnt(e, 1);
  // primer plano
  const x0 = -((cam * 1.35 % 640) + 640) % 640;
  ga(1); X.drawImage(BK[b][4], round(x0 + sx), sy); X.drawImage(BK[b][4], round(x0 + 640 + sx), sy);
  // el vacío
  co('lighter');
  for (let y = 8; y < H; y += 24) lt(X, '#6a1a9a', vEdge(y), y + sin(t + y) * 4, 26, .3);
  co('source-over'); ga(1); fs('#000000');
  for (let y = 0; y < H; y += 2) fr(0, y, round(vEdge(y)), 2);
  for (let k = 0; k < 9; k++) { const yy = hs(k, 2) * H | 0; fr(round(vEdge(yy)) - 1, yy, max(0, round(5 + sin(t * 2 + k * 1.7) * 7)), 1); }
  co('lighter');
  for (let k = 0; k < 14; k++) { const yy = (hs(k, 1) * H + t * 20 * (k % 2 ? 1 : -1) + H * 4) % H; ga(.5); fr(round(vEdge(yy) + 1 + sin(t * 3 + k) * 2), round(yy), 1, 1, k % 3 ? '#6a2a9a' : '#c43a7a'); }
  co('source-over'); ga(1);
  X.drawImage(VG, 0, 0);
  X.drawImage(VIG, 0, 0);
};
const [VG, vgx] = mk(W, H);
{ const g = vgx.createLinearGradient(0, 0, 60, 0); g.addColorStop(0, '#000000ee'); g.addColorStop(.3, '#00000088'); g.addColorStop(1, '#00000000'); vgx.fillStyle = g; vgx.fillRect(0, 0, 60, H); }
const [VIG, vix] = mk(W, H);
{ const g = vix.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, W * .6); g.addColorStop(0, '#00000000'); g.addColorStop(1, '#000000b8'); vix.fillStyle = g; vix.fillRect(0, 0, W, H); }

// ---------- HUD ----------
const star = (x, y, c) => { fr(x + 2, y, 1, 5, c); fr(x, y + 2, 5, 1); fr(x + 1, y + 1, 3, 3); fr(x + 2, y + 2, 1, 1, '#ffffff'); };
const hud = () => {
  const im = spr(S.f, S.c, 1, (t * 6 | 0) & 1, 0);
  X.drawImage(im, 10 - im.width / 2, 9 - im.height / 2);
  txs('x' + sw.length, 19, 4, '#ffffff', 2);
  const thr = 100, nf = cl(noise / thr, 0, 1), fl = nf > .7 && (t * 8 | 0) % 2;
  fr(6, 17, 2, 3, '#ffe066'); fr(5, 19, 3, 1); fr(5, 20, 2, 3);
  fr(11, 17, 52, 6, '#000000'); fr(12, 18, 50, 4, '#3a2f6a');
  fr(12, 18, round(50 * nf), 4, fl ? '#ffffff' : mix('#ffe066', '#ff3050', nf));
  if (nf > .7) txs('ACECHADORES', 66, 18, fl ? '#ff3050' : '#ff8080');
  star(5, 26, '#ffd75e'); txs(rsh, 13, 26, '#ffd75e');
  txs(floor(m) + 'M', W - 4, 4, '#ffffff', 2, 2);
  txs(floor(score) + ' PTS', W - 4, 16, '#9adfff', 1, 2);
  if (sw.length > 1) txs('x' + sw.length + ' MULT', W - 4, 24, '#ff9de8', 1, 2);
  if (slow > 0) txs('LENTO', W / 2, 168, '#9ab8ff', 1, 1);
  if (bn.l > 0) { ga(min(1, bn.l)); txs(bn.s, W / 2, 50, bn.c, 2, 1); ga(1); }
  if (hint) { ga(min(1, hint)); txs(m < 14 ? 'MANTEN PULSADO PARA VOLAR' : 'ATRAVIESA ESPORAS MADRE PARA CLONARTE', W / 2, 70, '#e8e0ff', 1, 1); ga(1); }
};

// ---------- nido (menú) ----------
let btns = [];
const box = (x, y, w, h, c = '#3a2f6a') => { ga(.82); fr(x, y, w, h, '#0a0818'); ga(1); fr(x, y, w, 1, c); fr(x, y + h - 1, w, 1); fr(x, y, 1, h); fr(x + w - 1, y, 1, h); };
const act = b => {
  if (b.k == 'go') return start();
  if (b.k == 'u') {
    const k = b.i;
    if (S.u[k] < 5 && S.s >= ucost(k)) { S.s -= ucost(k); S.u[k]++; save(); sfx('buy'); } else sfx('no');
  } else {
    const L = b.k == 'c' ? COL : SHP, bit = 1 << b.i, own = b.k == 'c' ? 'o' : 'p', cur = b.k == 'c' ? 'c' : 'f';
    if (S[own] & bit) { S[cur] = b.i; sfx('sel'); }
    else if (S.s >= L[b.i][1]) { S.s -= L[b.i][1]; S[own] |= bit; S[cur] = b.i; sfx('buy'); }
    else sfx('no');
    save();
  }
};
const nest = () => {
  scene();
  ga(.5); fr(0, 0, W, H, '#05040c'); ga(1);
  btns = [{ k: 'go', x: 110, y: 147, w: 100, h: 17 }];
  const TT = 'FLUORESCIA', TC = ['#5ff4ff', '#ff5fd2', '#8dff5a', '#ffc84a', '#b38cff'];
  co('lighter'); lt(X, '#5ff4ff', W / 2 - 40, 16, 60, .25); lt(X, '#ff5fd2', W / 2 + 40, 16, 60, .25); co('source-over'); ga(1);
  for (let k = 0, x = W / 2 - 62; k < 10; k++) x += 3 + txs(TT[k], x, 6 + round(sin(t * 2 + k * .6) * 1.5), TC[k % 5], 3);
  tx('EL NIDO CENTRAL', W / 2, 25, '#8a80b0', 1, 1);
  txs(`RECORD ${S.b}M   MAX ${S.h} PTS`, W / 2, 34, '#9adfff', 1, 1);
  star(W - 26, 7, '#ffd75e'); txs(S.s, W - 4, 7, '#ffd75e', 1, 2);
  // mejoras
  box(5, 43, 154, 99); tx('MEJORAS', 9, 46, '#e8e0ff');
  UP.forEach((u, k) => {
    const y = 56 + k * 12, lv = S.u[k], c = ucost(k), b = { k: 'u', i: k, x: 7, y: y - 2, w: 150, h: 11 };
    btns.push(b);
    tx(u[0], 10, y, '#cfc8ef');
    for (let q = 0; q < 5; q++) { fr(108 + q * 5, y + 1, 4, 3, q < lv ? '#5ff4ff' : '#2a2448'); }
    if (lv < 5) { star(135, y, S.s >= c ? '#ffd75e' : '#5a5070'); tx(c, 155, y, S.s >= c ? '#ffd75e' : '#5a5070', 1, 2); } else tx('MAX', 155, y, '#5ff4ff', 1, 2);
  });
  // cosmética
  box(163, 43, 152, 99); tx('COLOR', 167, 46, '#e8e0ff');
  COL.forEach((c, k) => {
    const x = 168 + k * 24, b = { k: 'c', i: k, x, y: 54, w: 20, h: 11 }, own = S.o >> k & 1;
    btns.push(b); fr(x, 54, 20, 11, c[0]);
    if (!own) { ga(.7); fr(x, 54, 20, 11, '#000000'); ga(1); tx(c[1], x + 10, 57, '#ffd75e', 1, 1); }
    if (S.c == k) { fr(x, 66, 20, 1, '#ffffff'); }
  });
  tx('FORMA', 167, 71, '#e8e0ff');
  SHP.forEach((s, k) => {
    const x = 168 + k * 48, b = { k: 'f', i: k, x, y: 79, w: 44, h: 11 }, own = S.p >> k & 1;
    btns.push(b); fr(x, 79, 44, 11, S.f == k ? '#2a2458' : '#141030');
    tx(own ? s[0] : s[1] + ' ESQ', x + 22, 82, own ? (S.f == k ? '#ffffff' : '#9a90c0') : '#ffd75e', 1, 1);
  });
  // vista previa en el nido
  const px = 239, py = 118 + round(sin(t * 2) * 2), im = spr(S.f, S.c, 2, (t * 5 | 0) & 1, 0);
  co('lighter'); lt(X, COL[S.c][0], px, py, 34, .5); co('source-over'); ga(1);
  fr(px - 22, 131, 44, 4, '#3a2a1a'); fs('#5a4028'); for (let q = -20; q < 20; q += 3) fr(px + q, 129 + (q & 1), 4, 2);
  fr(px - 22, 130, 1, 1, '#ffb347'); fr(px + 18, 129, 1, 1);
  X.drawImage(im, px - im.width, py - im.height - 2, im.width * 2, im.height * 2);
  const sb = btns[sel] || btns[0];
  const pul = .6 + .4 * sin(t * 5);
  fr(110, 147, 100, 17, '#1a1040');
  ga(pul); fr(110, 147, 100, 1, '#5ff4ff'); fr(110, 163, 100, 1); ga(1);
  txs('DESCENDER', W / 2, 150, '#ffffff', 2, 1);
  ga(.5 + .5 * sin(t * 8)); fr(sb.x - 1, sb.y - 1, sb.w + 2, 1, '#ffffff'); fr(sb.x - 1, sb.y + sb.h, sb.w + 2, 1); fr(sb.x - 1, sb.y, 1, sb.h); fr(sb.x + sb.w, sb.y, 1, sb.h);
  ga(1);
  if (sb.k == 'u') tx(UP[sb.i][2], 82, 133, '#ffe066', 1, 1);
  tx('ESPACIO, CLIC O TOQUE PARA VOLAR   M SONIDO', W / 2, 171, '#6a6090', 1, 1);
};

// ---------- flujo de juego ----------
const start = () => {
  reset(rnd() * 1e5 | 0);
  st = 'play'; pz = 0; score = 0; rsh = 0; noise = 0; slow = 0; ev = ''; evL = 0; evT = rr(30, 45); wx = wy = 0; shake = 0; cb = -1; hint = 9; t = 0;
  for (let k = 0; k <= S.u[0]; k++) sw.push(mkC(70 + rr(-6, 6), 90 + rr(-8, 8), 40, rr(-20, 20)));
  mx = sw.length;
  add({ k: 'm', x: 300, y: 78, n: 3 });
  sfx('clone');
};
const over = () => {
  st = 'over'; ot = 0;
  res = { m: floor(m), s: floor(score), k: rsh, x: mx, r: floor(m) > S.b };
  S.b = max(S.b, floor(m)); S.h = max(S.h, floor(score)); S.s += rsh; save();
  sfx('over'); banner('');
};
const toNest = () => { st = 'nest'; sel = 0; reset(rnd() * 1e5 | 0); cam = 0; cb = 0; t = 0; };

const step = rdt => {
  if (slow > 0) slow -= rdt;
  const dt = rdt * (slow > 0 ? .45 : 1);
  t += dt;
  m = cam / 12;
  spd = 36 + min(56, m * .028 * (1 - S.u[3] * .08));
  cam += spd * dt; genTo();
  if (hold && !ph) { sfx('flap', .1); for (const c of sw) if (rnd() < .3) pa(c.x - 2, c.y + 2, -20, 25, .35, ccol()); }
  ph = hold;
  for (const c of sw) upC(c, dt);
  sep();
  upE(dt);
  for (const c of sw) if (!c.dead && c.x - cam < vEdge(c.y) - 1) { kill(c); burst(c.x, c.y, '#8a3aff', 6, 40); }
  sw = sw.filter(c => !c.dead).concat(NW); NW = [];
  mx = max(mx, sw.length);
  upP(dt);
  noise = max(0, noise - 16 * dt);
  if (noise > 100) {
    noise = 0;
    if (!ents.some(e => e.k == 'S')) { add({ k: 'S', x: cam - 10, y: rr(30, 150), vx: spd, vy: 0, l: 5.5 }); banner('ACECHADOR DESPIERTO!', '#ff5070'); sfx('growl'); shake = 4; }
  }
  if (m > 200) {
    evT -= dt;
    if (evT <= 0) {
      ev = pk('qwb'); evL = ev == 'w' ? 7 : ev == 'q' ? 6 : 8; evT = rr(28, 48);
      banner(ev == 'q' ? 'TERREMOTO!' : ev == 'w' ? 'VIENTO TERMICO!' : 'APAGON!', ev == 'q' ? '#ffb347' : ev == 'w' ? '#ff8a60' : '#9a90c0');
      if (ev == 'w') { wx = rr(-70, 25); wy = pk([-1, 1]) * rr(90, 150); sfx('wind'); }
      if (ev == 'q') sfx('quake');
    }
  }
  if (evL > 0) {
    evL -= dt;
    if (ev == 'q') {
      shake = max(shake, 2.5);
      if ((qd -= dt) < 0) {
        qd = .3;
        const i = floor((cam + rr(60, W)) / T), [a, z] = tb(i);
        add({ k: 'r', x: XX(i), y: a * T + 2, v: 0, f: 1 });
        if (z - a > 7) {
          const top = rnd() < .5, j = top ? a : z, c0 = floor((cam + W * .6) / T) + ri(0, 15);
          for (let q = c0; q < c0 + ri(2, 4); q++) { const c = cols.get(q); if (c && !c[j]) { c[j] = 1; burst(XX(q), YY(j), '#9a8cc0', 4, 30, 100); } }
        }
      }
    }
    if (ev == 'w' && rnd() < .5) pa(cam + rr(0, W), rr(0, H), wx * 3 + spd, wy * 1.5, .5, '#ffc0a0');
    if (evL <= 0) { wx = wy = 0; ev = ''; }
  }
  shake = max(0, shake - dt * 6);
  score += dt * sw.length * 10;
  const bb = bA(floor((cam + W * .6) / T));
  if (bb != cb) { cb = bb; banner(BI[bb].n, BI[bb].e); }
  if (bn.l > 0) bn.l -= rdt;
  if (hint > 0) hint -= rdt;
  if (A) DR.frequency.value = 220 + noise * 8;
  if (!sw.length) over();
};

const music = () => {
  if (!A || A.currentTime < mn) return;
  mn = A.currentTime + .42;
  if (rnd() < .55) tn(BI[max(0, cb)].b * pk([1, 1.2, 1.333, 1.5, 1.8, 2]) * pk([.5, 1, 1, 2]), 1.6, 'triangle', .022, 0, 0, 1);
};

// ---------- entrada ----------
const keys = new Set(), ptr = new Set();
const FK = ['Space', 'ArrowUp', 'KeyW'];
const mv = d => { sel = (sel + d + btns.length) % btns.length; sfx('sel', .03); };
onkeydown = e => {
  const k = e.code;
  if (k.startsWith('Arrow') || k == 'Space' || k == 'Enter') e.preventDefault();
  au();
  if (k == 'KeyM') { S.m = !S.m | 0; save(); if (MG) MG.gain.value = S.m ? 0 : .5; return; }
  if (e.repeat) return;
  if (st == 'play') {
    if (k == 'KeyP' || k == 'Escape') pz = !pz;
    else if (FK.includes(k)) keys.add(k);
  } else if (st == 'nest') {
    if (k == 'ArrowRight' || k == 'ArrowDown') mv(1);
    else if (k == 'ArrowLeft' || k == 'ArrowUp') mv(-1);
    else if (k == 'Space' || k == 'Enter') act(btns[sel] || btns[0]);
  } else if (ot > 1 && (k == 'Space' || k == 'Enter')) toNest();
};
onkeyup = e => keys.delete(e.code);
onpointerdown = e => {
  au();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (st == 'play') { if (pz) pz = 0; else ptr.add(e.pointerId); }
  else if (st == 'nest') btns.forEach((b, i) => { if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) { sel = i; act(b); } });
  else if (ot > 1) toNest();
};
onpointerup = onpointercancel = e => ptr.delete(e.pointerId);
onblur = () => { keys.clear(); ptr.clear(); if (st == 'play') pz = 1; };
D.oncontextmenu = e => e.preventDefault();

// ---------- bucle ----------
let last = 0;
const loop = now => {
  requestAnimationFrame(loop);
  const rdt = min(.05, (now - last) / 1000 || 0); last = now;
  hold = keys.size + ptr.size > 0;
  if (st == 'play') {
    if (!pz) step(rdt);
    scene(); hud();
    if (pz) { ga(.6); fr(0, 0, W, H, '#000000'); ga(1); txs('PAUSA', W / 2, 78, '#ffffff', 3, 1); tx('PULSA P O TOCA PARA SEGUIR', W / 2, 100, '#9a90c0', 1, 1); }
  } else if (st == 'over') {
    ot += rdt; t += rdt; cam += spd * rdt * .5; genTo(); upE(rdt); upP(rdt);
    scene();
    ga(min(.75, ot)); fr(0, 0, W, H, '#000000'); ga(min(1, ot * 1.5));
    txs('DEVORADO POR EL VACIO', W / 2, 34, '#ff5fd2', 2, 1);
    [['PROFUNDIDAD', res.m + 'M'], ['PUNTOS', res.s], ['ENJAMBRE MAXIMO', res.x], ['ESQUIRLAS', '+' + res.k]].forEach((l, k) => {
      tx(l[0], 92, 64 + k * 12, '#9a90c0'); txs(l[1], 228, 64 + k * 12, '#ffffff', 1, 2);
    });
    if (res.r && (t * 3 | 0) % 2) txs('NUEVO RECORD!', W / 2, 120, '#ffd75e', 2, 1);
    if (ot > 1) tx('PULSA PARA VOLVER AL NIDO', W / 2, 146, '#e8e0ff', 1, 1);
    ga(1);
  } else {
    t += rdt; cam += 12 * rdt; genTo(); upE(rdt); upP(rdt);
    nest();
  }
  music();
};
reset(7); cb = 0;
requestAnimationFrame(loop);
})();
