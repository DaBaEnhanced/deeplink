// Storyboard page player (bible §15): black-and-white European comic pages, shown one page at a time with a panel-by-panel
// reveal and subtle camera pans. Pages are rows of panels justified to the page width, so any panel aspect (3:2, 16:9,
// 21:9, 2:3, 1:1) fits. Balloons and captions are lettered by the engine (never in the image). As Drift grows, the
// network intrudes into the ink: perspective grid lines, pixel-stepped borders, glitches (bible §12.1, §15.1).
// Art: assets/panels/<id>.png (drift variant <id>_D.png). Missing art shows a hatched placeholder with the prompt.
import { clamp, lerp } from '../core/math.js';
import { listing } from '../audio/audio.js';

export const LETTER = '"Comic Neue", "Comic Sans MS", "Patrick Hand", sans-serif';
export const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
export const TYPE = '"Special Elite", "Courier New", monospace';
const PAPER = '#f2efe6', INK = '#0b0b0b';

const IMG = new Map();
export function panelImage(id) {
  let e = IMG.get(id); if (e) return e;
  e = { img: null, tried: false }; IMG.set(id, e);
  (async () => {
    const ls = await listing('assets/panels');
    for (const ext of ['png', 'jpg', 'webp']) {
      const n = `${id}.${ext}`;
      if (ls && !ls.has(n)) continue;
      const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `assets/panels/${n}`; });
      if (im) { e.img = im; break; }
      if (ls) break;
    }
    e.tried = true;
  })();
  return e;
}
export function aspectOf(a) { const [w, h] = String(a || '3:2').split(':').map(Number); return w / h; }
// Hand-placed lettering (tools/panel_studio "Bubbles"): data/balloons.json = { panelId: { textIndex: {x, y, tx, ty, tail} } }
// x/y = balloon centre (caption: top-left), tx/ty = tail tip, all as fractions of the panel frame. Absent = automatic.
let BALLOONS = {};
export function getBalloons(id) { return BALLOONS[id]; }
export function setBalloons(o) { BALLOONS = o || {}; }
export function loadBalloons(base = '') { return fetch(base + 'data/balloons.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(setBalloons).catch(() => {}); }
// rows of panels justified to the page (shared with the studio so its preview has the in-game size)
export function layoutPage(page, defs, W, H) {
  const margin = Math.min(W, H) * 0.03;
  const pw = W - margin * 2, ph = H - margin * 2 - Math.min(W, H) * 0.03;
  const px = (W - pw) / 2, py = margin;
  const gut = Math.max(6, pw * 0.009), pad = gut * 1.6;
  const rows = page.rows, avW = pw - pad * 2, avH = ph - pad * 2;
  const layout = rows.map(r => { const sa = r.reduce((a, p) => a + aspectOf(defs[p.id]?.aspect), 0); const h = (avW - gut * (r.length - 1)) / sa; return { r, h, sa }; });
  const tot = layout.reduce((a, l) => a + l.h, 0) + gut * (rows.length - 1);
  const k = Math.min(1, avH / tot);
  let y = py + pad + (avH - tot * k) / 2, idx = 0;
  const rects = [];
  for (const l of layout) {
    const h = l.h * k, rowW = (avW - gut * (l.r.length - 1)) * k + gut * (l.r.length - 1);
    let x = px + pad + (avW - rowW) / 2;
    for (const p of l.r) { const w = aspectOf(defs[p.id]?.aspect) * h; rects.push({ p, x, y, w, h, i: idx++ }); x += w + gut; }
    y += h + gut;
  }
  return { rects, margin, px, py, pw, ph };
}
// Letter one panel: captions top-left, balloons (speech / whisper / radio / screen) with tails. `shown(k, order)` decides
// which balloons are visible (the player reveals them one by one); `boxes` (optional array) receives every box drawn,
// for the studio's editor: {kind, k, x, y, w, h, cx, cy, tip}.
export function letterPanel(g, def, variant, x, y, w, h, o = {}) {
  const fs = Math.max(11, Math.min(w * 0.042, h * 0.07, 30));
  const lay = o.layout || BALLOONS[def.id] || {};
  const all = (def.text || []).map((t, k) => ({ t, k }));
  const lines = variant ? all.filter(e => !e.t.variant || e.t.variant === variant) : all;
  const balloons = lines.filter(e => e.t.kind !== 'caption' && e.t.kind !== 'diary');
  const caps = lines.filter(e => e.t.kind === 'caption' || e.t.kind === 'diary');
  let cy = y + fs * 0.4;
  for (const e of caps) {
    const L = lay[e.k];
    const bx = L && L.x !== undefined ? x + L.x * w : x + fs * 0.4, by = L && L.y !== undefined ? y + L.y * h : cy;
    const b = drawCaption(g, e.t, bx, by, w * 0.66, fs);
    if (o.boxes) o.boxes.push({ kind: 'caption', k: e.k, ...b });
    if (!(L && L.y !== undefined)) cy = b.y + b.h + fs * 0.3;
  }
  const n = balloons.length;
  const posAuto = [[[0.5, 0.15]], [[0.3, 0.14], [0.7, 0.27]], [[0.26, 0.13], [0.72, 0.22], [0.36, 0.36]]][Math.min(n, 3) - 1] || [];
  balloons.forEach((e, j) => {
    if (o.shown && !o.shown(j)) return;
    const L = lay[e.k];
    let bx, by;
    if (L && L.x !== undefined) { bx = x + L.x * w; by = y + L.y * h; }
    else { const pos = posAuto[j] || [0.5, 0.2 + j * 0.12]; bx = x + pos[0] * w; by = Math.max(pos[1] * h + y, cy + fs * 1.4); }
    const b = drawBalloon(g, e.t, bx, by, w, h, x, y, fs, L);
    if (o.boxes) o.boxes.push({ kind: 'balloon', k: e.k, ...b });
  });
  return fs;
}
function drawCaption(g, c, x, y, maxW, fs) {
  const diary = c.kind === 'diary';
  g.font = diary ? `italic ${fs * 1.05}px ${HAND}` : `${fs}px ${HAND}`;
  const text = diary ? c.text : c.text.toUpperCase();
  const ls = wrap(g, text, maxW - fs);
  const lh = fs * 1.15, bw = Math.max(...ls.map(l => g.measureText(l).width)) + fs, bh = ls.length * lh + fs * 0.5;
  g.fillStyle = diary ? '#fffef4' : '#ffffff'; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, fs * 0.09);
  g.fillRect(x, y, bw, bh); g.strokeRect(x, y, bw, bh);
  g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'top';
  ls.forEach((l, i) => g.fillText(l, x + fs * 0.5, y + fs * 0.3 + i * lh));
  return { x, y, w: bw, h: bh, cx: x + bw / 2, cy: y + bh / 2 };
}
function drawBalloon(g, b, cx, cy, w, h, px, py, fs, L) {
  const style = b.kind;
  const screenish = style === 'screen' || style === 'screen_voice';
  g.font = screenish ? `${fs * 0.95}px ${TYPE}` : style === 'whisper' ? `italic ${fs * 0.92}px ${LETTER}` : `bold ${fs}px ${LETTER}`;
  const text = screenish ? b.text : b.text.toUpperCase();
  const ls = wrap(g, text, Math.max(w * 0.28, Math.min(w * 0.44, fs * 13)));
  const lh = fs * 1.12, tw = Math.max(...ls.map(l => g.measureText(l).width)), th = ls.length * lh;
  const bw = tw + fs * 1.5, bh = th + fs * 1.0;
  cx = clamp(cx, px + bw / 2 + 4, px + w - bw / 2 - 4); cy = clamp(cy, py + bh / 2 + 4, py + h - bh / 2 - 4);
  const lw = Math.max(1.5, fs * 0.09);
  g.lineWidth = lw; g.strokeStyle = INK;
  let tip = null;
  if (screenish) {
    g.fillStyle = style === 'screen_voice' ? '#000' : '#fff'; g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh); g.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
    g.fillStyle = style === 'screen_voice' ? '#fff' : INK;
  } else {
    const rx = bw * 0.6, ry = bh * 0.66;
    const shape = () => { g.beginPath(); if (style === 'radio') jagged(g, cx, cy, bw, bh); else g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
    // the tail: toward a hand-placed tip, or (automatic) down toward the lower half of the panel
    let tail = null;
    if (!(L && L.tail === false)) {
      const side = cx < px + w / 2 ? 1 : -1;
      const tipX = L && L.tx !== undefined ? px + L.tx * w : cx + side * bw * 0.15 + side * fs * 0.8;
      const tipY = L && L.ty !== undefined ? py + L.ty * h : cy + bh * 0.6 + fs * 1.2;
      const a = Math.atan2(tipY - cy, tipX - cx);
      const bxp = cx + Math.cos(a) * rx * 0.8, byp = cy + Math.sin(a) * ry * 0.8;   // base, just inside the balloon
      const nx = -Math.sin(a), ny = Math.cos(a), half = fs * 0.42;
      tail = [[bxp + nx * half, byp + ny * half], [tipX, tipY], [bxp - nx * half, byp - ny * half]];
      tip = [tipX, tipY];
    }
    const tri = () => { g.beginPath(); g.moveTo(...tail[0]); g.lineTo(...tail[1]); g.lineTo(...tail[2]); g.closePath(); };
    g.fillStyle = '#ffffff';
    if (style === 'whisper') g.setLineDash([fs * 0.35, fs * 0.25]);
    // strokes first, fills over them: the outline runs around balloon + tail as one shape
    g.lineWidth = lw * 2;
    if (tail) { tri(); g.stroke(); }
    shape(); g.stroke();
    g.setLineDash([]);
    if (tail) { tri(); g.fill(); }
    shape(); g.fill();
    g.fillStyle = INK;
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ls.forEach((l, i) => g.fillText(l, cx, cy - th / 2 + lh / 2 + i * lh));
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, cx, cy, tip };
}

export class PanelPlayer {
  constructor(audio, panels) { this.audio = audio; this.panels = panels; this.active = false; this.auto = false; loadBalloons(); }
  // seq: { title?, pages: [{ rows: [[{id, img, variant}]] }] } ; opts: { drift, onDone }
  play(seq, opts = {}) {
    this.seq = seq; this.opts = opts; this.page = 0; this.panel = 0; this.t = 0; this.active = true;
    this.drift = opts.drift || 0; this.flat = [];
    for (const pg of seq.pages) for (const row of pg.rows) for (const p of row) { const im = this.imgId(p); panelImage(im); }
    this.enterPage(0);
  }
  imgId(p) {
    const base = p.img || p.id;
    if (this.drift >= 50 && this.panels[p.id]?.drift) { const d = panelImage(base + '_D'); if (d.img || !d.tried) return base + '_D'; }
    return base;
  }
  enterPage(k) {
    this.page = k; this.panel = 0; this.reveal = [0]; this.pageT = 0;
    this.list = this.seq.pages[k].rows.flat();
    if (k > 0 && this.audio) this.audio.play('panel');
  }
  next() {
    if (!this.active) return;
    if ((this.reveal[this.panel] ?? 0) < 0.35) { this.reveal[this.panel] = 0.35; return; }
    if (this.panel < this.list.length - 1) { this.panel++; this.reveal[this.panel] = 0; return; }
    if (this.page < this.seq.pages.length - 1) { this.enterPage(this.page + 1); return; }
    this.finish();
  }
  back() { if (this.panel > 0) this.panel--; else if (this.page > 0) { this.enterPage(this.page - 1); this.panel = this.list.length - 1; this.reveal = this.list.map(() => 9); } }
  skip() { this.finish(); }
  finish() { if (!this.active) return; this.active = false; if (this.opts.onDone) this.opts.onDone(); }
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.pageT += dt;
    for (let i = 0; i <= this.panel; i++) this.reveal[i] = (this.reveal[i] || 0) + dt;
    if (this.auto) {
      const p = this.list[this.panel]; const def = this.panels[p.id] || {};
      const len = (def.text || []).reduce((a, t) => a + t.text.length, 0);
      if (this.reveal[this.panel] > 2.2 + len * 0.05) this.next();
    }
  }
  // ---------------------------------------------------------------------------------------------- draw
  draw(g, W, H) {
    if (!this.active) return;
    g.save();
    g.fillStyle = '#121212'; g.fillRect(0, 0, W, H);
    // page: paper, centred, with margins; rows of panels justified to the page width
    const { rects, margin, px, py, pw, ph } = layoutPage(this.seq.pages[this.page], this.panels, W, H);
    g.fillStyle = PAPER; g.fillRect(px, py, pw, ph);
    for (const R of rects) if (R.i <= this.panel) this.drawPanel(g, R, W, H);
    // network intrusions over the whole page at high Drift
    if (this.drift > 30) this.intrusion(g, px, py, pw, ph, (this.drift - 30) / 70);
    g.font = `${Math.round(Math.max(11, H * 0.018))}px ${TYPE}`; g.fillStyle = 'rgba(255,255,255,0.45)'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillText(`${this.auto ? 'AUTO · ' : ''}click / space ▸   A auto   ESC skip   ${this.page + 1}/${this.seq.pages.length}`, W - margin, H - margin * 0.35);
    g.restore();
  }
  drawPanel(g, R, W, H) {
    const { p, x, y, w, h, i } = R;
    const age = this.reveal[i] || 0, a = clamp(age / 0.35, 0, 1);
    const def = this.panels[p.id] || { text: [], prompt: '' };
    g.save(); g.globalAlpha = a;
    g.translate(0, (1 - a) * h * 0.03);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const id = this.imgId(p), im = panelImage(id);
    if (im.img) {
      const z = 1.07 + clamp(age / 9, 0, 1) * 0.05;
      const s = Math.max(w / im.img.width, h / im.img.height) * z;
      const dw = im.img.width * s, dh = im.img.height * s;
      const drift = (i % 2 ? 1 : -1) * clamp(age / 9, 0, 1) * (dw - w) * 0.4;
      g.drawImage(im.img, x + (w - dw) / 2 + drift, y + (h - dh) / 2, dw, dh);
    } else this.placeholder(g, def, id, x, y, w, h);
    if (this.drift > 15) this.panelIntrusion(g, x, y, w, h, (this.drift - 15) / 85, i);
    g.restore();
    // border (pixel-stepped at high Drift)
    g.strokeStyle = INK; g.lineWidth = Math.max(2, w * 0.006);
    if (this.drift >= 55) { const st = 6; g.beginPath(); for (let xx = x; xx < x + w; xx += st) { g.rect(xx, y + ((xx / st) % 3 === 0 ? -2 : 0), st, 0.1); } g.stroke(); g.strokeRect(x, y, w, h); }
    else g.strokeRect(x, y, w, h);
    // lettering
    const ta = clamp((age - 0.3) / 0.25, 0, 1);
    if (ta > 0) { g.globalAlpha = a * ta; this.letter(g, def, p, x, y, w, h, age); }
    g.restore();
  }
  letter(g, def, p, x, y, w, h, age) {
    letterPanel(g, def, p.variant, x, y, w, h, { shown: j => age >= 0.45 + j * 0.4 || this.reveal[this.panel] > 5 });
  }
  placeholder(g, def, id, x, y, w, h) {
    g.fillStyle = '#dcd8cc'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let k = -h; k < w; k += 9) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); }
    const fs = Math.max(9, Math.min(w, h * 1.5) * 0.028);
    g.font = `${fs}px ${TYPE}`; g.fillStyle = 'rgba(0,0,0,0.65)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(`[ ${id} ]`, x + fs, y + h - fs * 8);
    wrap(g, def.prompt || '', w - fs * 2).slice(0, 6).forEach((l, i) => g.fillText(l, x + fs, y + h - fs * 6.6 + i * fs * 1.1));
  }
  panelIntrusion(g, x, y, w, h, k, i) {
    g.save(); g.globalAlpha = clamp(k, 0, 1) * 0.55; g.strokeStyle = '#000'; g.lineWidth = 1;
    const vx = x + w * (0.5 + 0.3 * Math.sin(i * 2.1)), vy = y + h * 0.45;
    for (let n = 0; n < 14; n++) { const a = (n / 14) * Math.PI * 2 + i; g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + Math.cos(a) * w, vy + Math.sin(a) * w); g.stroke(); }
    for (let n = 1; n < 6; n++) { const yy = vy + (h * 0.6) * Math.pow(n / 6, 2); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    if (k > 0.5 && Math.random() < 0.05 * k) { const sy = y + Math.random() * h; try { g.drawImage(g.canvas, x, sy, w, 6, x + (Math.random() - 0.5) * 20, sy, w, 6); } catch (e) { /* */ } }
    g.restore();
  }
  intrusion(g, x, y, w, h, k) {
    g.save(); g.globalAlpha = clamp(k, 0, 1) * 0.25; g.fillStyle = '#000';
    for (let n = 0; n < 30 * k; n++) { const px = x + ((n * 97.3 + Math.floor(this.t * 3) * 13) % w), py = y + ((n * 51.7) % h); g.fillRect(Math.floor(px / 4) * 4, Math.floor(py / 4) * 4, 4, 4); }
    g.restore();
  }
}
export function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/); const out = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = wd; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function jagged(g, cx, cy, w, h) { const n = 22; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = i % 2 ? 0.86 : 1; const px = cx + Math.cos(a) * w * 0.62 * r, py = cy + Math.sin(a) * h * 0.7 * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); }
