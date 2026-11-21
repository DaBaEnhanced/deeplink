// Procedural low-poly mesh library: primitives, the light-body avatar (3 Drift stages), enemies, boss parts, Juno,
// layer props. Flat-shaded unless noted (Gouraud spheres). Local +z is forward, +y up.
import { norm, cross, sub, add, scale, TAU } from '../core/math.js';
import { rng } from '../core/rng.js';

export class MB {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.lines = false; }
  v(p, n, c) { this.pos.push(p[0], p[1], p[2]); this.nrm.push(n[0], n[1], n[2]); this.col.push(c[0], c[1], c[2]); }
  tri(a, b, c, col = [1, 1, 1], smooth = null) {
    const n = norm(cross(sub(b, a), sub(c, a)));
    if (smooth) { this.v(a, smooth[0], col); this.v(b, smooth[1], col); this.v(c, smooth[2], col); } else { this.v(a, n, col); this.v(b, n, col); this.v(c, n, col); }
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  line(a, b, col = [1, 1, 1]) { this.lines = true; const n = [0, 1, 0]; this.v(a, n, col); this.v(b, n, col); }
  poly(pts, col) { for (let i = 0; i < pts.length; i++) this.line(pts[i], pts[(i + 1) % pts.length], col); }
  done(radius = 1) { return { pos: this.pos, nrm: this.nrm, col: this.col, lines: this.lines, radius }; }
}
const W = [1, 1, 1];

export function box(sx = 1, sy = 1, sz = 1, col = W, open = false) {
  const m = new MB(); const x = sx / 2, y = sy / 2, z = sz / 2;
  const P = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  const F = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [7, 6, 2, 3], [0, 1, 5, 4]];
  F.forEach((f, i) => { if (open && i < 2) return; m.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]], col); });
  return m.done(Math.hypot(x, y, z));
}
// box with the bottom at y=0 (towers)
export function tower(sx, sy, sz, col = W) {
  const d = box(sx, sy, sz, col); for (let i = 1; i < d.pos.length; i += 3) d.pos[i] += sy / 2; return d;
}
export function wireBox(sx = 1, sy = 1, sz = 1, col = W) {
  const m = new MB(); const x = sx / 2, y = sy / 2, z = sz / 2;
  const P = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => m.line(P[a], P[b], col));
  return m.done(Math.hypot(x, y, z));
}
const OCT = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const OCTF = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
export function octa(r = 1, col = W, sy = 1) {
  const m = new MB(); const P = OCT.map(p => [p[0] * r, p[1] * r * sy, p[2] * r]);
  OCTF.forEach(f => m.tri(P[f[0]], P[f[1]], P[f[2]], col)); return m.done(r);
}
export function wireOcta(r = 1, col = W) {
  const m = new MB(); const P = OCT.map(p => scale(p, r));
  [[0, 2], [2, 1], [1, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5]].forEach(([a, b]) => m.line(P[a], P[b], col));
  return m.done(r);
}
export function tetra(r = 1, col = W) {
  const m = new MB(); const P = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map(p => scale(p, r / 1.732));
  m.tri(P[0], P[1], P[2], col); m.tri(P[0], P[3], P[1], col); m.tri(P[0], P[2], P[3], col); m.tri(P[1], P[3], P[2], col); return m.done(r);
}
// icosphere; smooth = Gouraud normals
export function ico(r = 1, sub1 = 1, col = W, smooth = false, jitter = 0, seed = 1) {
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  let Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < sub1; s++) {
    const cache = new Map(); const nf = [];
    const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); V.push(norm(scale(add(V[a], V[b]), 0.5))); cache.set(k, V.length - 1); return V.length - 1; };
    for (const [a, b, c] of Fc) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    Fc = nf;
  }
  const R = rng(seed);
  const P = V.map(v => scale(v, r * (1 + (jitter ? (R() - 0.5) * jitter : 0))));
  const m = new MB();
  for (const [a, b, c] of Fc) m.tri(P[a], P[b], P[c], col, smooth ? [V[a], V[b], V[c]] : null);
  return m.done(r);
}
export function wireIco(r = 1, col = W) {
  const d = ico(r, 0, col); const m = new MB();
  for (let i = 0; i < d.pos.length; i += 9) {
    const a = d.pos.slice(i, i + 3), b = d.pos.slice(i + 3, i + 6), c = d.pos.slice(i + 6, i + 9);
    m.line(a, b, col); m.line(b, c, col); m.line(c, a, col);
  }
  return m.done(r);
}
export function cylinder(r = 1, h = 1, seg = 8, col = W, cap = true, r2 = r) {
  const m = new MB();
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
    const p = (a, rr, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
    m.quad(p(a0, r, 0), p(a0, r2, h), p(a1, r2, h), p(a1, r, 0), col);
    if (cap) { m.tri([0, h, 0], p(a1, r2, h), p(a0, r2, h), col); m.tri([0, 0, 0], p(a0, r, 0), p(a1, r, 0), col); }
  }
  return m.done(Math.max(r, h));
}
export function pyramid(w = 1, h = 1, col = W, sides = 4) {
  const m = new MB(); const ps = [];
  for (let i = 0; i < sides; i++) { const a = (i / sides) * TAU + Math.PI / sides; ps.push([Math.cos(a) * w, 0, Math.sin(a) * w]); }
  for (let i = 0; i < sides; i++) { m.tri(ps[(i + 1) % sides], ps[i], [0, h, 0], col); m.tri(ps[i], ps[(i + 1) % sides], [0, 0, 0], col); }
  return m.done(Math.max(w, h));
}
// ring in the XY plane facing +z (gates)
export function ring(r = 1, thick = 0.15, seg = 16, col = W, depth = 0.2) {
  const m = new MB();
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
    const P = (a, rr, z) => [Math.cos(a) * rr, Math.sin(a) * rr, z];
    const ri = r - thick, ro = r + thick;
    m.quad(P(a0, ri, depth), P(a0, ro, depth), P(a1, ro, depth), P(a1, ri, depth), col);
    m.quad(P(a0, ro, -depth), P(a0, ri, -depth), P(a1, ri, -depth), P(a1, ro, -depth), col);
    m.quad(P(a0, ro, depth), P(a0, ro, -depth), P(a1, ro, -depth), P(a1, ro, depth), col);
    m.quad(P(a0, ri, -depth), P(a0, ri, depth), P(a1, ri, depth), P(a1, ri, -depth), col);
  }
  return m.done(r + thick);
}
export function wireRing(r = 1, seg = 24, col = W) {
  const m = new MB(); const ps = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * TAU; ps.push([Math.cos(a) * r, Math.sin(a) * r, 0]); }
  m.poly(ps, col); return m.done(r);
}
export function quad(col = W) { // billboard / flat card in XY, -1..1
  const m = new MB(); m.quad([-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], col); return m.done(1.42);
}
export function plane(w, d, col = W) { // XZ plane, facing up
  const m = new MB(); m.quad([-w / 2, 0, d / 2], [w / 2, 0, d / 2], [w / 2, 0, -d / 2], [-w / 2, 0, -d / 2], col); return m.done(Math.max(w, d));
}
// subdivided XZ grid (for the chrome sea waves)
export function gridPlane(w, d, nx, nz, col = W) {
  const m = new MB();
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = -w / 2 + (w * i) / nx, x1 = x0 + w / nx, z0 = -d / 2 + (d * j) / nz, z1 = z0 + d / nz;
    m.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], col);
  }
  return m.done(Math.max(w, d));
}
export function gridLines(w, d, nx, nz, col = W) { // XZ line grid
  const m = new MB();
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + (w * i) / nx; m.line([x, 0, -d / 2], [x, 0, d / 2], col); }
  for (let j = 0; j <= nz; j++) { const z = -d / 2 + (d * j) / nz; m.line([-w / 2, 0, z], [w / 2, 0, z], col); }
  return m.done(Math.max(w, d));
}
export function dart(len = 1.2, w = 0.35, col = W) { // tracer: wireframe arrow, nose +z
  const m = new MB(); const n = [0, 0, len], a = [w, 0, -len * 0.5], b = [-w, 0, -len * 0.5], c = [0, w * 0.7, -len * 0.35], d = [0, -w * 0.7, -len * 0.35];
  m.line(n, a); m.line(n, b); m.line(n, c); m.line(n, d); m.line(a, c); m.line(c, b); m.line(b, d); m.line(d, a); return m.done(len);
}
export function kite(s = 1, col = W) { // chrome triangle, faces +z
  const m = new MB(); const t = [0, s, 0], l = [-s * 0.9, -s * 0.6, 0], r = [s * 0.9, -s * 0.6, 0], back = [0, 0, -s * 0.3];
  m.tri(l, r, t, col); m.tri(r, l, back, col); m.tri(t, r, back, col); m.tri(l, t, back, col); return m.done(s);
}
export function shutterPanel(w = 1, h = 1, col = W) { return box(w, h, 0.12, col); }
// segmented sphere chain link (worm)
export function flower(petals = 6, r = 1, col = W) {
  const m = new MB();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU, a0 = a - 0.32, a1 = a + 0.32;
    const tip = [Math.cos(a) * r, Math.sin(a) * r, 0.35 * r];
    const l = [Math.cos(a0) * r * 0.45, Math.sin(a0) * r * 0.45, 0.12 * r], rr = [Math.cos(a1) * r * 0.45, Math.sin(a1) * r * 0.45, 0.12 * r];
    m.tri([0, 0, 0], l, tip, col); m.tri([0, 0, 0], tip, rr, col); m.tri(l, rr, tip, col);
  }
  return m.done(r);
}
// a simple low-poly mask face (Gatekeeper, faces in the sky, the Librarian outline), facing +z
export function face(s = 1, col = W, mouthOpen = 0) {
  const m = new MB();
  const rows = 7, cols = 6;
  const pt = (i, j) => {
    const u = (i / cols) * 2 - 1, v = (j / rows) * 2 - 1;
    const ex = Math.sqrt(Math.max(0, 1 - v * v * 0.7)) * 0.8;
    const x = u * ex * s, y = v * s * 1.15;
    let z = Math.sqrt(Math.max(0, 1 - u * u * 0.6 - v * v * 0.35)) * s * 0.55;
    if (Math.abs(u) < 0.25 && v > -0.2 && v < 0.3) z += s * 0.18 * (1 - Math.abs(u) * 4); // nose
    if (Math.abs(Math.abs(u) - 0.42) < 0.2 && Math.abs(v - 0.3) < 0.15) z -= s * 0.12; // eye sockets
    return [x, y, z];
  };
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const u = ((i + 0.5) / cols) * 2 - 1, v = ((j + 0.5) / rows) * 2 - 1;
    if (mouthOpen > 0 && Math.abs(u) < 0.45 && v > -0.75 && v < -0.35) continue;
    m.quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), col);
  }
  return m.done(s * 1.2);
}
// ------------------------------------------------------------------------------------------------ humanoids
// diver pose: head forward (+z), arms swept back. stage 0..2 = Drift stage (human -> abstract -> geometry)
const J = {
  head: [0, 0.12, 0.95], neck: [0, 0.05, 0.72], chest: [0, 0, 0.45], pelvis: [0, 0, 0], lsh: [-0.24, 0.02, 0.62], rsh: [0.24, 0.02, 0.62],
  lel: [-0.42, -0.02, 0.28], rel: [0.42, -0.02, 0.28], lha: [-0.36, -0.06, -0.12], rha: [0.36, -0.06, -0.12],
  lhi: [-0.12, 0, -0.05], rhi: [0.12, 0, -0.05], lkn: [-0.16, -0.04, -0.52], rkn: [0.16, -0.04, -0.52], lft: [-0.12, 0.06, -0.98], rft: [0.12, 0.06, -0.98],
};
const BONES = [['head', 'neck'], ['neck', 'chest'], ['chest', 'pelvis'], ['lsh', 'rsh'], ['lsh', 'lel'], ['lel', 'lha'], ['rsh', 'rel'], ['rel', 'rha'],
  ['lhi', 'rhi'], ['lhi', 'lkn'], ['lkn', 'lft'], ['rhi', 'rkn'], ['rkn', 'rft'], ['neck', 'lsh'], ['neck', 'rsh'], ['pelvis', 'lhi'], ['pelvis', 'rhi']];
export function avatar(stage = 0, col = W) {
  const m = new MB();
  if (stage < 2) {
    for (const [a, b] of BONES) m.line(J[a], J[b], col);
    const h = J.head, r = 0.11;
    const hp = OCT.map(p => add(h, scale(p, r)));
    [[0, 2], [2, 1], [1, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5]].forEach(([a, b]) => m.line(hp[a], hp[b], col));
    // torso box outline
    m.poly([J.lsh, J.rsh, J.rhi, J.lhi], col);
    if (stage === 1) { // more lines: ribcage, halo rings, light fins
      for (let k = 0; k < 4; k++) { const z = 0.55 - k * 0.14, w = 0.22 - k * 0.03; m.poly([[-w, 0.08, z], [0, 0.14, z], [w, 0.08, z], [w * 0.8, -0.08, z], [-w * 0.8, -0.08, z]], col); }
      const ps = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ps.push([Math.cos(a) * 0.3, Math.sin(a) * 0.3 + 0.1, 1.0]); } m.poly(ps, col);
      m.line(J.lha, [-0.9, 0.1, -0.6], col); m.line(J.rha, [0.9, 0.1, -0.6], col); m.line(J.lel, [-0.9, 0.1, -0.6], col); m.line(J.rel, [0.9, 0.1, -0.6], col);
    }
  } else { // almost pure geometry: nested polyhedra with radiating wings of light
    const d = wireIco(0.45, col); m.pos.push(...d.pos); m.nrm.push(...d.nrm); m.col.push(...d.col); m.lines = true;
    const o = wireOcta(0.8, col); m.pos.push(...o.pos); m.nrm.push(...o.nrm); m.col.push(...o.col);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; m.line([0, 0, 0.6], [Math.cos(a) * 1.3, Math.sin(a) * 0.5, -0.9], col); }
    m.line([0, 0, 1.4], [0, 0, -1.6], col);
  }
  return m.done(1.2);
}
// solid humanoid (Weyl's agents, HOLLIS-9): chrome angular figure standing (y up), faces +z
export function humanoidSolid(s = 1, col = W, bulky = 0) {
  const m = new MB();
  const add2 = (d, ox, oy, oz) => { for (let i = 0; i < d.pos.length; i += 3) { m.pos.push(d.pos[i] * s + ox * s, d.pos[i + 1] * s + oy * s, d.pos[i + 2] * s + oz * s); } m.nrm.push(...d.nrm); m.col.push(...d.col); };
  add2(octa(0.18, col, 1.3), 0, 1.72, 0);
  add2(box(0.55 + bulky * 0.4, 0.62, 0.3 + bulky * 0.2, col), 0, 1.25, 0);
  add2(box(0.4 + bulky * 0.2, 0.3, 0.26, col), 0, 0.82, 0);
  for (const sx of [-1, 1]) {
    add2(box(0.15 + bulky * 0.1, 0.62, 0.15 + bulky * 0.1, col), sx * (0.38 + bulky * 0.2), 1.2, 0);
    add2(box(0.17, 0.8, 0.18, col), sx * 0.13, 0.3, 0);
    if (bulky) add2(pyramid(0.25, 0.4, col, 4), sx * 0.45, 1.55, 0);
  }
  return m.done(1.9 * s);
}
// Juno in the Deep: a tall luminous figure drawn in light lines, hair of flowing lines (standing, faces +z)
export function junoFigure(col = W, seed = 3) {
  const m = new MB(); const R = rng(seed);
  const P = { head: [0, 1.72, 0], neck: [0, 1.5, 0], ch: [0, 1.25, 0.02], wa: [0, 0.95, 0], hip: [0, 0.82, 0], lsh: [-0.22, 1.45, 0], rsh: [0.22, 1.45, 0],
    lel: [-0.5, 1.2, 0.1], rel: [0.5, 1.2, 0.1], lha: [-0.8, 1.05, 0.2], rha: [0.8, 1.05, 0.2], lkn: [-0.1, 0.42, 0.05], rkn: [0.1, 0.42, 0.05], lft: [-0.08, 0, 0], rft: [0.08, 0, 0] };
  [['head', 'neck'], ['neck', 'ch'], ['ch', 'wa'], ['wa', 'hip'], ['lsh', 'rsh'], ['lsh', 'lel'], ['lel', 'lha'], ['rsh', 'rel'], ['rel', 'rha'], ['hip', 'lkn'], ['lkn', 'lft'], ['hip', 'rkn'], ['rkn', 'rft']].forEach(([a, b]) => m.line(P[a], P[b], col));
  const hr = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; hr.push([Math.cos(a) * 0.12, 1.74 + Math.sin(a) * 0.15, Math.sin(a) * 0.04]); } m.poly(hr, col);
  // dress / body volume as flowing curves
  for (let k = 0; k < 7; k++) { const a = ((k / 6) - 0.5) * 1.6; let p = [Math.sin(a) * 0.15, 1.2, 0]; for (let s = 1; s <= 6; s++) { const q = [Math.sin(a) * (0.15 + s * 0.08), 1.2 - s * 0.2, Math.cos(a) * 0.05 * s]; m.line(p, q, col); p = q; } }
  // hair: long flowing lines
  for (let k = 0; k < 16; k++) {
    let p = [(R() - 0.5) * 0.2, 1.8 + R() * 0.05, -0.05]; const dir = [(R() - 0.5) * 0.6, 0.15 + R() * 0.3, -0.5 - R() * 0.4];
    for (let s = 0; s < 8; s++) { const q = [p[0] + dir[0] * 0.25 + Math.sin(s + k) * 0.05, p[1] + dir[1] * 0.25 - s * 0.03, p[2] + dir[2] * 0.25]; m.line(p, q, col); p = q; }
  }
  return m.done(2);
}
// glyphs of code (Glyph Swarm): seven-segment-ish strokes
const SEG = { a: [[0, 2], [1, 2]], b: [[1, 2], [1, 1]], c: [[1, 1], [1, 0]], d: [[0, 0], [1, 0]], e: [[0, 0], [0, 1]], f: [[0, 1], [0, 2]], g: [[0, 1], [1, 1]], x: [[0, 0], [1, 2]], y: [[0, 2], [1, 0]] };
const GL = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'xy', 'afgbce', 'abcdefx', 'fgbcxa'];
export function glyphMesh(i, col = W) {
  const m = new MB();
  for (const s of GL[i % GL.length]) { const [p, q] = SEG[s]; m.line([p[0] * 0.5 - 0.25, p[1] * 0.5 - 0.5, 0], [q[0] * 0.5 - 0.25, q[1] * 0.5 - 0.5, 0], col); }
  return m.done(0.6);
}
// fractal branch (Bloom, the Seed): recursive tetra branches
export function branch(depth = 3, col = W, seed = 5) {
  const m = new MB(); const R = rng(seed);
  const rec = (o, dir, l, d) => {
    const e = add(o, scale(dir, l));
    m.line(o, e, col);
    if (d <= 0) return;
    for (let k = 0; k < 3; k++) {
      const nd = norm(add(dir, [(R() - 0.5) * 1.6, (R() - 0.5) * 1.6, (R() - 0.5) * 1.6]));
      rec(e, nd, l * 0.62, d - 1);
    }
  };
  rec([0, 0, 0], [0, 1, 0], 1, depth);
  return m.done(2.6);
}
// floating glass file (Archive): a thin slab with a tab
export function fileSlab(col = W) {
  const m = new MB(); const d = box(0.9, 1.2, 0.05, col); m.pos.push(...d.pos); m.nrm.push(...d.nrm); m.col.push(...d.col);
  const t = box(0.3, 0.12, 0.05, col); for (let i = 0; i < t.pos.length; i += 3) m.pos.push(t.pos[i] - 0.25, t.pos[i + 1] + 0.66, t.pos[i + 2]); m.nrm.push(...t.nrm); m.col.push(...t.col);
  return m.done(0.8);
}
// a canyon wall strip: a long rough slab along z, displaced (used as instanced segments)
export function rockSlab(seed = 1, col = W) {
  const m = new MB(); const R = rng(seed);
  const nz = 4, ny = 5; const P = [];
  for (let j = 0; j <= ny; j++) { P.push([]); for (let i = 0; i <= nz; i++) P[j].push([(R() - 0.5) * 0.5 + (j % 2) * 0.2, j / ny, i / nz - 0.5]); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) m.quad(P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i], col);
  return m.done(1);
}
// mesh merge (same topology type)
export function merge(...ds) {
  const m = new MB(); for (const d of ds) { m.pos.push(...d.pos); m.nrm.push(...d.nrm); m.col.push(...d.col); m.lines = d.lines; } return m.done(Math.max(...ds.map(d => d.radius || 1)));
}
export function transformed(d, f) { // apply f([x,y,z]) to positions
  const o = { ...d, pos: d.pos.slice() };
  for (let i = 0; i < o.pos.length; i += 3) { const p = f([o.pos[i], o.pos[i + 1], o.pos[i + 2]]); o.pos[i] = p[0]; o.pos[i + 1] = p[1]; o.pos[i + 2] = p[2]; }
  return o;
}

// ------------------------------------------------------------------------------------------- set dressing (v2)
// rotate a point from +y-up local space so that +y points along dir
function alignY(p, dir) {
  const d = norm(dir); let a = Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
  const x = norm(cross(a, d)), z = cross(x, d);
  return [x[0] * p[0] + d[0] * p[1] + z[0] * p[2], x[1] * p[0] + d[1] * p[1] + z[1] * p[2], x[2] * p[0] + d[2] * p[1] + z[2] * p[2]];
}
function addInto(m, d, f = p => p, col) {
  for (let i = 0; i < d.pos.length; i += 3) { const p = f([d.pos[i], d.pos[i + 1], d.pos[i + 2]]); m.pos.push(p[0], p[1], p[2]); }
  for (let i = 0; i < d.nrm.length; i += 3) { const n = f([d.nrm[i], d.nrm[i + 1], d.nrm[i + 2]], true); m.nrm.push(n[0], n[1], n[2]); }
  if (col) for (let i = 0; i < d.pos.length; i += 3) m.col.push(col[0], col[1], col[2]); else m.col.push(...d.col);
  m.lines = d.lines;
}
// bookshelf module, open side +z, 6 x 10 x 1.6, books in vertex colours (warm leather tones)
export function bookshelf(seed = 1) {
  const m = new MB(); const R = rng(seed);
  const wood = [0.42, 0.27, 0.13];
  const slab = (x, y, z, sx, sy, sz, col) => addInto(m, box(sx, sy, sz), p => [p[0] + x, p[1] + y, p[2] + z], col);
  slab(0, 5, -0.75, 6, 10, 0.1, wood); slab(-3, 5, 0, 0.15, 10, 1.6, wood); slab(3, 5, 0, 0.15, 10, 1.6, wood);
  const tones = [[0.55, 0.12, 0.08], [0.18, 0.25, 0.42], [0.6, 0.45, 0.2], [0.15, 0.32, 0.18], [0.45, 0.35, 0.28], [0.7, 0.62, 0.42], [0.3, 0.12, 0.25]];
  for (let k = 0; k < 6; k++) {
    const y = k * 1.9 + 0.2; slab(0, y, 0, 6, 0.12, 1.6, wood);
    let x = -2.85;
    while (x < 2.7) { const w = 0.12 + R() * 0.22, h = 1.0 + R() * 0.55; if (R() < 0.08) { x += 0.3; continue; } const c = tones[Math.floor(R() * tones.length)], z = 0.6 + R() * 0.2, y0 = y + 0.06, y1 = y0 + h, x0 = x, x1 = x + w; m.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], c); m.quad([x0, y1, z], [x1, y1, z], [x1, y1, -0.5], [x0, y1, -0.5], c.map(v => v * 0.7)); x += w + 0.01; }
  }
  return m.done(6);
}
// radio mast: lattice lines with cross braces, base at y=0, height 1
export function mast(col = [1, 1, 1]) {
  const m = new MB(); const w = 0.04, n = 10;
  for (let i = 0; i < n; i++) {
    const y0 = i / n, y1 = (i + 1) / n, s0 = w * (1 - y0 * 0.6), s1 = w * (1 - y1 * 0.6);
    const c0 = [[-s0, y0, -s0], [s0, y0, -s0], [s0, y0, s0], [-s0, y0, s0]], c1 = [[-s1, y1, -s1], [s1, y1, -s1], [s1, y1, s1], [-s1, y1, s1]];
    for (let k = 0; k < 4; k++) { m.line(c0[k], c1[k], col); m.line(c0[k], c1[(k + 1) % 4], col); }
  }
  m.line([0, 1, 0], [0, 1.15, 0], col); m.line([-0.12, 0.85, 0], [0.12, 0.85, 0], col); m.line([0, 0.85, -0.12], [0, 0.85, 0.12], col);
  return m.done(1.2);
}
// spiked ICE fortress: a core polyhedron with a crown of spikes
export function spikeBall(seed = 2, col = W) {
  const m = new MB(); const R = rng(seed);
  addInto(m, ico(1, 0, col));
  const dirs = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  for (const d of dirs) {
    const len = 1.6 + R() * 2.2, wid = 0.25 + R() * 0.2;
    addInto(m, pyramid(wid, len, col, 4), (p, isN) => { const q = alignY(p, d); if (isN) return q; const dn = norm(d); return [q[0] + dn[0] * 0.8, q[1] + dn[1] * 0.8, q[2] + dn[2] * 0.8]; });
  }
  return m.done(4);
}
// partial ring / arch in the XY plane (a0..a1 radians), facing +z
export function arc(r = 1, thick = 0.1, a0 = 0, a1 = Math.PI, seg = 12, col = W, depth = 0.1) {
  const m = new MB();
  for (let i = 0; i < seg; i++) {
    const b0 = a0 + (a1 - a0) * (i / seg), b1 = a0 + (a1 - a0) * ((i + 1) / seg);
    const P = (a, rr, z) => [Math.cos(a) * rr, Math.sin(a) * rr, z];
    const ri = r - thick, ro = r + thick;
    m.quad(P(b0, ri, depth), P(b0, ro, depth), P(b1, ro, depth), P(b1, ri, depth), col);
    m.quad(P(b0, ro, -depth), P(b0, ri, -depth), P(b1, ri, -depth), P(b1, ro, -depth), col);
    m.quad(P(b0, ro, depth), P(b0, ro, -depth), P(b1, ro, -depth), P(b1, ro, depth), col);
    m.quad(P(b0, ri, -depth), P(b0, ri, depth), P(b1, ri, depth), P(b1, ri, -depth), col);
  }
  return m.done(r + thick);
}
// a wavy strand (kelp, vines, cables), base at y=0, height 1
export function strand(seed = 4, col = W) {
  const m = new MB(); const R = rng(seed); let p = [0, 0, 0];
  const ph = R() * 6;
  for (let i = 1; i <= 14; i++) { const q = [Math.sin(i * 0.6 + ph) * 0.06, i / 14, Math.cos(i * 0.5 + ph) * 0.05]; m.line(p, q, col); p = q; }
  return m.done(1);
}
// grass / data-weed tuft
export function tuft(seed = 5, col = W) {
  const m = new MB(); const R = rng(seed);
  for (let k = 0; k < 9; k++) { const a = R() * TAU, r = R() * 0.4; const b = [Math.cos(a) * r, 0, Math.sin(a) * r]; m.line(b, [b[0] + (R() - 0.5) * 0.5, 0.6 + R() * 0.8, b[2] + (R() - 0.5) * 0.5], col); }
  return m.done(1.4);
}
// half dome (mushroom cap, Gouraud), flat side down at y=0
export function dome(col = W) {
  const d = ico(1, 2, col, true); const m = new MB();
  for (let i = 0; i < d.pos.length; i += 9) {
    const ys = [d.pos[i + 1], d.pos[i + 4], d.pos[i + 7]];
    if (Math.min(...ys) < -0.05) continue;
    for (let k = 0; k < 3; k++) { m.pos.push(d.pos[i + k * 3], Math.max(0, d.pos[i + k * 3 + 1]) * 0.6, d.pos[i + k * 3 + 2]); m.nrm.push(d.nrm[i + k * 3], d.nrm[i + k * 3 + 1], d.nrm[i + k * 3 + 2]); m.col.push(...col); }
  }
  return m.done(1);
}
// calibration ruler: a long line with tick marks (along +z), length 1
export function ruler(col = W) {
  const m = new MB(); m.line([0, 0, 0], [0, 0, 1], col);
  for (let i = 0; i <= 20; i++) { const h = i % 5 === 0 ? 0.04 : 0.018; m.line([0, 0, i / 20], [0, h, i / 20], col); }
  return m.done(1);
}

// a 90s CRT monitor: body + tapered back, screen opening at +z (the screen itself is crtScreen, x/y in -1..1)
export function crt(col = [0.75, 0.74, 0.7]) {
  const back = transformed(box(1.9, 1.7, 1.3, col), p => [p[0], p[1] - 0.1, p[2] - 1.4]);
  const bezel = box(2.6, 2.2, 1.8, col);
  return merge(bezel, back);
}
export function crtScreen() { const m = new MB(); m.quad([-1, -0.8, 0.91], [1, -0.8, 0.91], [1, 0.8, 0.91], [-1, 0.8, 0.91], W); return m.done(1.3); }
