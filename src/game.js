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
const fr = (x, y, w, h, c) => { if (c) X.fillStyle = c; X.fillRect(x, y, w, h); }, fs = c => X.fillStyle = c, ga = a => X.globalAlpha = a, co = o => X.globalCompositeOperation = o;
const [LC, LX] = mk(W, H);
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
const ad = (c, px, py, r, a) => lt(LX, c, px, py, r, a);

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
  { n: 'BOSQUE DE HONGOS', r: '#1d1736', r2: '#2f2652', r3: '#110d20', e: '#52f59a', e2: '#1d6e55', a: '#ff4fd8', a2: '#4ff0ff', am: [98, 80, 140], k1: '#0b1324', k2: '#101c2e', b: 220 },
  { n: 'CAVERNAS DE CRISTAL', r: '#141a3e', r2: '#232c66', r3: '#0b0e24', e: '#6ee9ff', e2: '#3946c4', a: '#c46bff', a2: '#6ee9ff', am: [76, 90, 150], k1: '#0b0d28', k2: '#121842', b: 196 },
  { n: 'RUINAS MECANICAS', r: '#221d26', r2: '#3a3038', r3: '#131016', e: '#3fe0c8', e2: '#8a4a2a', a: '#ffb347', a2: '#3fe0c8', am: [70, 106, 118], k1: '#091719', k2: '#14201f', b: 175 }
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
  const r = [2, 3, 6][z], s = r * 2 + 11, o = s >> 1, [c, x] = mk(s, s), col = COL[ci][0];
  const li = mix(col, '#ffffff', .6), dk = mix(col, '#000000', .45), f = iv ? -1 : 1;
  const p = (a, b, cc, w = 1, h = 1) => { x.fillStyle = cc; x.fillRect(o + a, f > 0 ? o + b : o - b - h + 1, w, h); };
  const tri = (ax, ay, bx, by, qx, qy, cc) => {
    for (let yy = min(ay, by, qy); yy <= max(ay, by, qy); yy++) for (let xx = min(ax, bx, qx); xx <= max(ax, bx, qx); xx++) {
      const d1 = (xx - bx) * (ay - by) - (ax - bx) * (yy - by), d2 = (xx - qx) * (by - qy) - (bx - qx) * (yy - qy), d3 = (xx - ax) * (qy - ay) - (qx - ax) * (yy - ay);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) p(xx, yy, cc);
    }
  };
  const ball = (rx, ry, top) => {
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (a * a / (rx * rx) + b * b / (ry * ry) <= 1.15 && (!top || b <= 1))
      p(a, b, a + b < -r * .5 ? li : a + b > r * .6 ? dk : col);
  };
  const eye = () => { if (r < 3) p(1, -1, '#ffffff'); else { const e = r > 4 ? 2 : 1; p(r - e - 1, -e - 1, '#ffb347', e + 1, e + 1); p(r - e, -e, '#ffffff', e, e); } };
  const wl = max(2, r * .8 | 0);
  if (sh == 1) { // polilla
    if (fr) { tri(0, 0, -r - 3, -r - 3, r - 1, -r - 2, li); tri(0, 0, -r - 2, r, -1, r + 1, dk); }
    else { tri(0, -1, -r - 4, 0, -r - 1, r + 2, li); tri(0, 0, -r - 2, -r - 1, 0, -r, dk); }
    ball(r * .75, r, 0); p(r - 1, -r - 1, li); p(r, -r - 2, li); eye();
  } else if (sh == 2) { // medusa
    ball(r, r, 1);
    for (let q = -r + 1; q < r; q += max(1, r >> 1)) for (let k = 2; k < r + 3 + (fr ? 1 : 0); k++) p(q + ((k + fr + q) % 3 == 0 ? (fr ? 1 : -1) : 0), k, k % 2 ? li : col);
    p(-1, -r + 1, '#ffffff'); if (r > 2) p(r - 2, -1, '#ffffff');
  } else { // chispa
    for (let q = 1; q <= wl; q++) {
      const dx = fr ? -1 : -.5, dy = fr ? .35 : -1;
      p(round(-1 + dx * q), round(-r + 1 + dy * q), li); if (r > 2) p(round(dx * q), round(-r + 1 + dy * q), li);
    }
    ball(r, r, 0); eye();
  }
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
  f = f || pk(['PPIINNCCCVVLLMDU', 'PPIINSSSOOKKGGDU', 'PPINNWWWOOOMDUL'][b]);
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
      for (let q = a + 1; q <= z; q += 3) zone('s', mm - 8, q, 9);
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
  c.tr.unshift(c.x, c.y); if (c.tr.length > 28) c.tr.length = 28;
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
const bgL = () => {
  for (let ly = 0; ly < 2; ly++) {
    const f = ly ? .5 : .22, sw_ = ly ? 52 : 84, x0 = cam * f;
    for (let k = floor(x0 / sw_) - 1; k <= floor((x0 + W) / sw_) + 1; k++) {
      const h = hs(k, ly + 30), h2 = hs(k, ly + 40), x = round(k * sw_ - x0 + h * sw_ * .6 + sx * f), b = bA(floor((cam + x) / T)), B = BI[b];
      fs(ly ? B.k2 : B.k1);
      const sc = ly ? 1 : .7;
      if (b == 0) {
        const cy = round(30 + h2 * 80), cw = round((14 + h * 18) * sc), ch = round(cw * .45);
        fr(x - 2 - ly * 2, cy, 4 + ly * 4, H - cy);
        X.beginPath(); X.ellipse(x, cy + 2, cw, ch, 0, PI, 0); X.fill();
        fr(x - cw, cy + 1, cw * 2, 2, mix(B.k2, B.a2, .25));
        ad(B.a2, x, cy + 4, cw * 1.4, .12);
      } else if (b == 1) {
        const top = h2 < .4, hh = round((40 + h * 90) * sc), bw = round(6 + h2 * 12);
        X.beginPath();
        if (top) { X.moveTo(x - bw, 0); X.lineTo(x + bw, 0); X.lineTo(x + h * 8 - 4, hh); }
        else { X.moveTo(x - bw, H); X.lineTo(x + bw, H); X.lineTo(x + h * 8 - 4, H - hh); }
        X.fill(); ad(B.a, x, top ? hh * .7 : H - hh * .7, 20, .1);
      } else {
        if (h2 < .5) {
          const gy = round(40 + h * 90), gr = round((12 + h2 * 30) * sc);
          X.beginPath();
          for (let q = 0; q < 24; q++) { const an = q * PI / 12 + t * .1 * (k % 2 ? 1 : -1), rd = q % 2 ? gr : gr + 3; X.lineTo(x + cos(an) * rd, gy + sin(an) * rd); }
          X.fill(); fs('#05080a'); X.beginPath(); X.arc(x, gy, gr * .35, 0, 7); X.fill();
        } else {
          const pw = round(6 + h * 8), ph2 = round(50 + h2 * 80);
          fr(x - pw, H - ph2, pw * 2, ph2); fr(x - pw - 2, H - ph2, pw * 2 + 4, 4);
          ad(B.a, x, H - ph2 - 4, 14, .15);
        }
      }
    }
  }
};

const drawTile = (v, i, j, px, py, B, b) => {
  if (v == 5) {
    const w = round(sin(t * 2 + i + j * .7) * 1);
    fr(px + 2 + w, py, 2, T, '#2fbf5a');
    fs('#7dff8a'); if ((i + j) % 2) fr(px + 4 + w, py + 2, 2, 1); else fr(px + w, py + 3, 2, 1);
    if (tl(i, j + 1) != 5) { fr(px + 1 + w, py + T - 2, 4, 3, '#c6ff6a'); ad('#7dff8a', px + 3, py + T, 8, .5); }
    return;
  }
  if (v == 6) { fr(px + 2, py, 2, T, '#c9c2e0'); fr(px + 3, py, 1, T, '#7a6f9a'); return; }
  const up = !sol(tl(i, j - 1)), dn = !sol(tl(i, j + 1)), lf = !sol(tl(i - 1, j)), rt = !sol(tl(i + 1, j));
  if (v == 2) {
    fr(px, py, T, T, '#25297a');
    fs((i + j) % 2 ? '#4f6cff' : '#7d4fd8');
    for (let k = 0; k < T; k++) if ((k + i * 3 + j) % 4 < 2) fr(px + k, py + T - 1 - k, 1, 1);
    if (hs(i, j) < .3) { fr(px + 2, py + 2, 1, 1, '#e8fbff'); }
    if (up || dn || lf || rt) ad(hs(i, j) < .5 ? '#6ee9ff' : '#c46bff', px + 3, py + 3, 12, .22);
    return;
  }
  if (v == 4) {
    fr(px, py, T, T - 2, B.a);
    fs(mix(B.a, '#ffffff', .5)); if (up) fr(px, py, T, 1); if ((i + j) % 2) fr(px + 2, py + 2, 2, 1);
    fr(px, py + T - 2, T, 2, '#7a1f6a');
    fs(mix(B.a, '#ffffff', .3)); for (let k = 0; k < T; k += 2) fr(px + k, py + T - 2, 1, 2);
    ad(B.a, px + 3, py + 4, 16, .3);
    return;
  }
  const edge = up || dn || lf || rt;
  const deep = !edge && sol(tl(i, j - 2)) && sol(tl(i, j + 2)) && sol(tl(i - 2, j)) && sol(tl(i + 2, j));
  fr(px, py, T, T, edge ? B.r2 : deep ? B.r3 : B.r);
  const h = hs(i, j);
  if (h < .45) { fr(px + (h * 9 | 0) % 5, py + (h * 31 | 0) % 5, 2, 1, edge ? mix(B.r2, '#ffffff', .1) : B.r2); }
  if (v == 3) {
    const sp = up ? 1 : dn ? -1 : 0;
    if (sp) for (let q = 0; q < 2; q++) for (let k = 0; k < 4; k++) {
      fs(k < 2 ? '#e8fbff' : '#6ee9ff');
      const w = k >> 1 ? 3 : 1, yy = sp > 0 ? py - 3 + k : py + T + 2 - k;
      fr(px + q * 3 + 1 - (w >> 1), yy, w, 1);
    }
    ad('#6ee9ff', px + 3, py + 3 - sp * 3, 10, .35);
  }
  if (up) { fr(px, py, T, 2, B.e2); if (b != 1 && h > .4) { fr(px + (h * 13 | 0) % 6, py - 1 - (h * 3 | 0), 1, 1 + (h * 3 | 0), B.e); } }
  if (dn) { fr(px, py + T - 1, T, 1, B.e2); if (h > .7) { fr(px + (h * 17 | 0) % 6, py + T, 1, (h * 9 | 0) % 4 + 1, B.e2); } }
  if (lf) { fr(px, py, 1, T, B.e2); }
  if (rt) { fr(px + T - 1, py, 1, T, B.e2); }
};

const drawDeco = (i, dd, px, oy) => {
  const [j, u, h] = dd, b = bA(i), B = BI[b], k = hs(i, j + 77), x = px + (h * 4 | 0) + 1;
  if (!u) {
    if (!sol(tl(i, j + 1)) || sol(tl(i, j))) return;
    const y = (j + 1) * T + oy;
    if (b == 0) {
      if (h < .45) { const c = k < .5 ? B.a2 : B.a, sh = 2 + (k * 3 | 0); fr(x, y - sh, 1, sh, '#c9c2e0'); fr(x - 1, y - sh - 1, 3, 1, c); fr(x - 2, y - sh, 5, 1); ad(c, x, y - sh, 10, .5); }
      else if (h < .85) { fr(x, y - 3, 1, 3, B.e); fr(x - 2, y - 2, 1, 2); fr(x + 2, y - 4, 1, 4); }
      else { const sh = 6 + (k * 8 | 0), c = k < .5 ? B.a2 : B.a; fr(x, y - sh, 2, sh, '#d8d2ee'); fr(x - 3, y - sh - 2, 8, 2, c); fr(x - 2, y - sh - 3, 6, 1); fr(x - 1, y - sh - 3, 1, 1, '#ffffff'); ad(c, x + 1, y - sh, 26, .6); }
    } else if (b == 1) {
      for (let q = 0; q < 1 + (k * 3 | 0); q++) {
        const hh = 3 + (hs(i, q) * 7 | 0), xx = x + q * 2 - 2, c = (q + i) % 2 ? B.a : B.e;
        fr(xx, y - hh, 2, hh, c); fr(xx, y - hh, 1, 1, '#ffffff');
      }
      ad(k < .5 ? B.e : B.a, x, y - 4, 16, .5);
    } else {
      if (h < .5) { fs(B.e); for (let q = 0; q < 4; q++) fr(x + round(sin(t * 2 + q + i) * .8), y - 1 - q, 1, 1); ad(B.e, x, y - 3, 10, .4); }
      else { fr(x - 1, y - 6, 4, 6, '#3a3036'); fr(x, y - 8, 2, 2, B.a); ad(B.a, x + 1, y - 8, 18, .55); }
    }
  } else {
    if (!sol(tl(i, j - 1)) || sol(tl(i, j))) return;
    const y = j * T + oy;
    if (b == 0) {
      if (h < .6) { const ln = 2 + (k * 6 | 0); fr(x, y, 1, ln, '#4a3a5a'); fr(x - 1, y + ln, 3, 2, '#ffb347'); fr(x, y + ln, 1, 1, '#fff2c0'); ad('#ffb347', x, y + ln + 1, 18, .6); }
      else { fs(B.e2); for (let q = 0; q < 3; q++) fr(x + q, y, 1, 2 + (hs(i, q + 5) * 5 | 0)); }
    } else if (b == 1) {
      const hh = 3 + (k * 6 | 0); fr(x, y, 2, hh, B.e); fr(x, y + hh - 1, 1, 1, '#ffffff'); ad(B.e, x, y + hh, 12, .4);
    } else {
      fs('#5a4a40'); const ln = 3 + (k * 10 | 0); for (let q = 0; q < ln; q += 2) fr(x, y + q, 1, 1);
      if (k > .5) { fr(x - 1, y + ln, 3, 2, B.e); ad(B.e, x, y + ln, 12, .4); }
    }
  }
};

const drawEnt = (e, ps) => {
  const x = round(e.x - cam + sx), y = round(e.y + sy);
  if (x < -40 - (e.w || 0) || x > W + 40) return;
  if (!ps) { // antes de la luz (sólidos)
    if (e.k == 'o' && e.b == 2) {
      fs('#6a4630'); X.beginPath();
      for (let q = 0; q < 24; q++) { const an = e.a + q * PI / 12, rd = (q >> 1) % 2 ? e.r - 1 : e.r + 2; X.lineTo(x + cos(an) * rd, y + sin(an) * rd); }
      X.fill(); fs('#9a6a3a'); X.beginPath(); X.arc(x, y, e.r * .6, 0, 7); X.fill();
      fs('#1a1214'); X.beginPath(); X.arc(x, y, e.r * .3, 0, 7); X.fill();
      ad('#ffb347', x, y, e.r * 2, .2);
    } else if (e.k == 'p') {
      const s = e.u ? -1 : 1, an = e.s == 0 ? .8 + sin(t * 3 + e.x) * .12 : e.s == 1 ? .8 * e.tm / .3 : .06;
      fr(x - 1, e.u ? y : y - 4, 2, 4, '#2a7a4a');
      for (const sd of [-1, 1]) {
        X.save(); X.translate(x, y - 4 * s); X.scale(sd, s); X.rotate(-an);
        fr(-5, -14, 5, 14, '#c2309a'); fr(-4, -13, 2, 11, '#ff6fe0');
        fs('#ffffff'); for (let q = -12; q < 0; q += 3) fr(0, q, 2, 1);
        X.restore();
      }
      fr(x - 1, y - 20 * s - 1, 2, 2, '#fff27a'); ad('#ffe14a', x, y - 20 * s, 14, .6); ad('#ff4fd8', x, y - 8 * s, 18, .3);
    } else if (e.k == 'd') {
      const wg = !e.f && sw.some(c => c.x > e.x - 60 && c.x < e.x) ? round(sin(t * 40)) : 0;
      fs('#2c2648'); X.beginPath(); X.moveTo(x - 3 + wg, y); X.lineTo(x + 3 + wg, y); X.lineTo(x + wg, y + 11); X.fill();
      fr(x + wg, y + 8, 1, 2, '#6ee9ff'); ad('#6ee9ff', x, y + 9, 8, .4);
    } else if (e.k == 'r') { fr(x - 3, y - 3, 6, 6, '#3a3150'); fr(x - 3, y - 3, 6, 1, '#5a4f78'); }
    else if (e.k == 'm') ad('#ff4fd8', x, y, 30, .7);
    else if (e.k == 'k') ad('#ffd75e', x, y, 16, .6);
    else if (e.k == 'z') ad(ZC[e.t], x, y, e.r * 3, .5);
    else if (e.k == 'o') ad(e.b ? '#6ee9ff' : '#ff4fd8', x, y, e.r * 3, .5);
    else if (e.k == 'w') for (let q = 0; q < e.w; q += 24) ad('#3fd6ff', x + q, y + e.h / 2, e.h, .25);
    return;
  }
  ga(1);
  switch (e.k) {
    case 'm': {
      const r = 5 + sin(t * 6) * 1;
      lt(X, '#ff4fd8', x, y, 16, .55); ga(1);
      fs('#ff4fd8');
      for (let q = 0; q < 8; q++) { const an = q * PI / 4 + t * 1.5; fr(round(x + cos(an) * r), round(y + sin(an) * r), 1, 1); }
      fr(x - 2, y - 2, 4, 4, '#ff9de8'); fr(x - 1, y - 1, 2, 2, '#ffffff');
      break;
    }
    case 'k': {
      const tw = (t * 4 + e.y) % 3 < 1.5;
      lt(X, '#ffd75e', x, y, 8, .5); ga(1);
      fr(x, y - 3, 1, 7, '#ffd75e'); fr(x - 3, y, 7, 1);
      fr(x - 1, y - 1, 3, 3, tw ? '#ffffff' : '#fff2a0');
      break;
    }
    case 'z': {
      const c = ZC[e.t];
      lt(X, c, x, y, e.r * 1.6, .3); ga(1); fs(c);
      for (let q = 0; q < 6; q++) { const an = q * 1.047 + t * (e.t == 'l' ? .6 : 1.8), rd = e.r * (.55 + .25 * sin(t * 2 + q)); fr(round(x + cos(an) * rd), round(y + sin(an) * rd), e.t == 'g' ? 2 : 1, e.t == 'g' ? 2 : 1); }
      if (e.t == 'g') { fr(x - 2, y - 2, 5, 5); fr(x - 1, y - 1, 1, 1, '#7a3a10'); fr(x + 1, y + 1, 1, 1); }
      else if (e.t == 's') { fr(x, y - 2, 1, 1); fr(x - 1, y - 1, 3, 3); fr(x - 1, y - 1, 1, 1, '#ffffff'); }
      else if (e.t == 'i') { fr(x, y - 3, 1, 7); fr(x - 1, y - 2, 3, 5); fr(x - 2, y - 1, 5, 3); fr(x, y - 1, 1, 1, '#ffffff'); }
      else { co('lighter'); for (let q = 0; q < 5; q++) lt(X, c, x + sin(t + q * 2) * 6, y + cos(t * .7 + q) * 5, 7, .35); co('source-over'); ga(1); }
      if (m < 600 || st == 'nest') { ga(.75); tx(ZN[e.t], x, y - e.r - 7, c, 1, 1); ga(1); }
      break;
    }
    case 'w': {
      ga(.1); fr(x, y, e.w, e.h, '#3fd6ff'); ga(.6); fs('#9ff4ff');
      for (let q = 0; q < e.w * e.h / 90; q++) fr(x + round((hs(q, e.cx | 0) * e.w + t * 150 * (.6 + hs(q, 3) * .6)) % e.w), y + round(hs(q, 9) * e.h), 4, 1);
      ga(1);
      break;
    }
    case 'o':
      if (e.b < 2) {
        lt(X, e.b ? '#6ee9ff' : '#ff4fd8', x, y, e.r * 2, .4); ga(1);
        fs(e.b ? '#2a3392' : '#5a1a52'); X.beginPath();
        for (let q = 0; q < 20; q++) { const an = e.a + q * PI / 10, rd = q % 2 ? e.r * .7 : e.r + 3; X.lineTo(x + cos(an) * rd, y + sin(an) * rd); }
        X.fill(); fs(e.b ? '#6ee9ff' : '#ff4fd8'); X.beginPath(); X.arc(x, y, e.r * .5, 0, 7); X.fill();
        fr(x - 1, y - 1, 2, 2, '#ffffff');
      }
      break;
    case 'S': {
      lt(X, '#7a1040', x, y, 30, .35); ga(1); fs('#030206');
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
  const B = BI[max(cb, 0)], blk = ev == 'b' && evL > 0 ? .3 : 1;
  sx = shake > 0 ? round((rnd() - .5) * shake * 2) : 0; sy = shake > 0 ? round((rnd() - .5) * shake * 2) : 0;
  const cx = floor(cam), i0 = floor(cx / T), ox = -cx + sx;
  LX.globalCompositeOperation = 'source-over'; LX.globalAlpha = 1;
  LX.fillStyle = `rgb(${B.am.map(v => v * blk | 0)})`; LX.fillRect(0, 0, W, H);
  LX.globalCompositeOperation = 'lighter';
  ga(1); co('source-over');
  fr(0, 0, W, H, '#07060e');
  bgL();
  for (let i = i0; i <= i0 + W / T + 1; i++) {
    const c = cols.get(i); if (!c) continue;
    const b = bA(i), px = i * T + ox;
    for (let j = 0; j < R; j++) if (c[j]) drawTile(c[j], i, j, px, j * T + sy, BI[b], b);
    for (const d of dec.get(i) || []) drawDeco(i, d, px, sy);
  }
  for (const e of ents) drawEnt(e, 0);
  const na = min(.85, 3.5 / Math.sqrt(sw.length + 1));
  for (const c of sw) ad(ccol(), c.x - cx + sx, c.y + sy, [30, 48, 70][c.z], na);
  // luz multiplicativa
  ga(1); co('multiply'); X.drawImage(LC, 0, 0);
  co('lighter');
  // motas flotantes
  for (let k = 0; k < 46; k++) {
    const f = .2 + hs(k, 6) * .6, xx = ((hs(k, 5) * 900 - cam * f + t * 5) % (W + 20) + W + 20) % (W + 20) - 10, yy = hs(k, 7) * H + sin(t * .7 + k) * 6;
    ga(.25 + .35 * sin(t * 2 + k * 3) ** 2); fr(round(xx), round(yy), 1, 1, k % 3 ? B.e : B.a);
  }
  // bordes luminosos (musgo)
  ga(.55);
  for (let i = i0; i <= i0 + W / T + 1; i++) {
    const c = cols.get(i); if (!c) continue;
    const BB = BI[bA(i)], px = i * T + ox;
    for (let j = 1; j < R; j++) if (c[j] == 1 && !sol(c[j - 1]) && c[j - 1] != 6) { fr(px, j * T + sy, T, 1, BB.e); }
  }
  ga(1);
  for (const e of ents) if (e.k != 'S') drawEnt(e, 1);
  co('lighter');
  for (const p of P) { ga(cl(p.l / p.m, 0, 1)); fr(round(p.x - cx + sx), round(p.y + sy), p.s, p.s, p.c); }
  // enjambre
  const col = ccol();
  fs(col);
  for (const c of sw) {
    for (let k = 2; k < c.tr.length; k += 2) { ga((1 - k / 28) * .45); fr(round(c.tr[k] - cx + sx), round(c.tr[k + 1] + sy), 1, 1); }
  }
  for (const c of sw) lt(X, col, c.x - cx + sx, c.y + sy, CR[c.z] * 4, .35);
  ga(1); co('source-over');
  for (const c of sw) {
    const fm = (hold && st == 'play' ? t * 14 : t * 4) + c.ph & 1, im = spr(S.f, S.c, c.z, fm, c.iv > 0 ? 1 : 0);
    X.drawImage(im, round(c.x - cx + sx - im.width / 2), round(c.y + sy - im.height / 2));
    if (c.st > 0) { fr(round(c.x - cx + sx), round(c.y + sy - CR[c.z] - 2), 1, 1, '#52f59a'); }
  }
  for (const e of ents) if (e.k == 'S') drawEnt(e, 1);
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
{ const g = vix.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62); g.addColorStop(0, '#00000000'); g.addColorStop(1, '#000000a0'); vix.fillStyle = g; vix.fillRect(0, 0, W, H); }

// ---------- HUD ----------
const star = (x, y, c) => { fr(x + 2, y, 1, 5, c); fr(x, y + 2, 5, 1); fr(x + 1, y + 1, 3, 3); fr(x + 2, y + 2, 1, 1, '#ffffff'); };
const hud = () => {
  const im = spr(S.f, S.c, 1, (t * 6 | 0) & 1, 0);
  X.drawImage(im, 1, 1);
  txs('x' + sw.length, 16, 4, '#ffffff', 2);
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
  X.drawImage(im, px - im.width, py - im.height, im.width * 2, im.height * 2);
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
