// Procedural meshes for the bosses and the ICE (v4 gfx pass): chamfered plates, lathed bodies, tubes, petals, ribbed
// segments and articulated parts. Everything is built from code at load time; bosses are drawn as rigs of these parts
// (src/dive/creatures.js animates them). Local +z is forward / toward the viewer for faces, +y up.
import { MB, box, cylinder, ico, octa, ring, merge, pyramid } from './meshes.js';
import { norm, cross, sub, TAU } from '../core/math.js';
import { rng } from '../core/rng.js';

const W = [1, 1, 1];
// ------------------------------------------------------------------------------------------------ helpers
// outward-oriented triangle for convex-ish parts (relative to a centre)
function otri(m, a, b, c, col, ctr = [0, 0, 0]) {
  const n = cross(sub(b, a), sub(c, a));
  const g = [(a[0] + b[0] + c[0]) / 3 - ctr[0], (a[1] + b[1] + c[1]) / 3 - ctr[1], (a[2] + b[2] + c[2]) / 3 - ctr[2]];
  if (n[0] * g[0] + n[1] * g[1] + n[2] * g[2] < 0) m.tri(a, c, b, col); else m.tri(a, b, c, col);
}
function oquad(m, a, b, c, d, col, ctr) { otri(m, a, b, c, col, ctr); otri(m, a, c, d, col, ctr); }
// rotate (x, then y, then z), scale, translate a mesh; normals rotated too
function rotP(p, r) {
  let [x, y, z] = p;
  if (r[0]) { const c = Math.cos(r[0]), s = Math.sin(r[0]); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (r[1]) { const c = Math.cos(r[1]), s = Math.sin(r[1]); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (r[2]) { const c = Math.cos(r[2]), s = Math.sin(r[2]); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
export function xf(d, { t = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], col = null } = {}) {
  const o = { ...d, pos: d.pos.slice(), nrm: d.nrm.slice(), col: d.col.slice() };
  for (let i = 0; i < o.pos.length; i += 3) {
    const p = rotP([o.pos[i] * s[0], o.pos[i + 1] * s[1], o.pos[i + 2] * s[2]], r);
    o.pos[i] = p[0] + t[0]; o.pos[i + 1] = p[1] + t[1]; o.pos[i + 2] = p[2] + t[2];
    const n = norm(rotP([o.nrm[i] / s[0], o.nrm[i + 1] / s[1], o.nrm[i + 2] / s[2]], r));
    o.nrm[i] = n[0]; o.nrm[i + 1] = n[1]; o.nrm[i + 2] = n[2];
    if (col) { o.col[i] *= col[0]; o.col[i + 1] *= col[1]; o.col[i + 2] *= col[2]; }
  }
  return o;
}
const M2 = (...ds) => merge(...ds);
const cone = (r, h, seg = 6, col = W) => cylinder(r, h, seg, col, true, 0.0001);

/** chamfered box: flat faces, bevelled edges, cut corners */
export function chamfer(sx = 1, sy = 1, sz = 1, b = 0.15, col = W) {
  const m = new MB(); const x = sx / 2, y = sy / 2, z = sz / 2; b = Math.min(b, x * 0.9, y * 0.9, z * 0.9);
  const A = (i, j, k) => [i * x, j * (y - b), k * (z - b)], B = (i, j, k) => [i * (x - b), j * y, k * (z - b)], C = (i, j, k) => [i * (x - b), j * (y - b), k * z];
  for (const i of [-1, 1]) oquad(m, A(i, -1, -1), A(i, 1, -1), A(i, 1, 1), A(i, -1, 1), col);
  for (const j of [-1, 1]) oquad(m, B(-1, j, -1), B(1, j, -1), B(1, j, 1), B(-1, j, 1), col);
  for (const k of [-1, 1]) oquad(m, C(-1, -1, k), C(1, -1, k), C(1, 1, k), C(-1, 1, k), col);
  for (const i of [-1, 1]) for (const j of [-1, 1]) oquad(m, A(i, j, -1), A(i, j, 1), B(i, j, 1), B(i, j, -1), col);   // along z
  for (const j of [-1, 1]) for (const k of [-1, 1]) oquad(m, B(-1, j, k), B(1, j, k), C(1, j, k), C(-1, j, k), col);   // along x
  for (const i of [-1, 1]) for (const k of [-1, 1]) oquad(m, A(i, -1, k), A(i, 1, k), C(i, 1, k), C(i, -1, k), col);   // along y
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) otri(m, A(i, j, k), B(i, j, k), C(i, j, k), col);
  return m.done(Math.hypot(x, y, z));
}
/** surface of revolution around +y: profile [[r, y], ...] bottom → top; f(angle) modulates the radius (ribs) */
export function lathe(profile, seg = 12, col = W, f = null) {
  const m = new MB();
  const P = (i, k) => { const a = (k / seg) * TAU, [r, y] = profile[i], rr = r * (f ? f(a, i) : 1); return [Math.cos(a) * rr, y, Math.sin(a) * rr]; };
  for (let i = 0; i < profile.length - 1; i++) for (let k = 0; k < seg; k++) {
    const a = P(i, k), b = P(i, k + 1), c = P(i + 1, k + 1), d = P(i + 1, k), yc = (profile[i][1] + profile[i + 1][1]) / 2;
    oquad(m, a, b, c, d, col, [0, yc, 0]);
  }
  return m.done(Math.max(...profile.map(p => Math.hypot(p[0], p[1]))));
}
/** lathe along +z instead of +y */
export const latheZ = (profile, seg, col, f) => xf(lathe(profile, seg, col, f), { r: [Math.PI / 2, 0, 0] });
/** tube through points with radii (parallel transport frames) */
export function tube(pts, radii, seg = 6, col = W) {
  const m = new MB(); const rings = [];
  let n0 = null;
  for (let i = 0; i < pts.length; i++) {
    const t = norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
    if (!n0) { n0 = Math.abs(t[1]) < 0.9 ? norm(cross(t, [0, 1, 0])) : norm(cross(t, [1, 0, 0])); }
    else { const b = cross(t, n0); n0 = norm(cross(b, t)); }
    const b = cross(t, n0), r = typeof radii === 'function' ? radii(i / (pts.length - 1)) : radii[i];
    const rg = []; for (let k = 0; k < seg; k++) { const a = (k / seg) * TAU, c = Math.cos(a) * r, s = Math.sin(a) * r; rg.push([pts[i][0] + n0[0] * c + b[0] * s, pts[i][1] + n0[1] * c + b[1] * s, pts[i][2] + n0[2] * c + b[2] * s]); }
    rings.push(rg);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
    const ctr = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2, (pts[i][2] + pts[i + 1][2]) / 2];
    oquad(m, rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k], col, ctr);
  }
  return m.done(1);
}
/** extruded polygon in XY (convex or star-shaped around its centroid), depth along z */
export function extrude(poly, depth = 0.1, col = W) {
  const m = new MB(); const z = depth / 2; const c = [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    m.tri([c[0], c[1], z], [p[0], p[1], z], [q[0], q[1], z], col); m.tri([c[0], c[1], -z], [q[0], q[1], -z], [p[0], p[1], -z], col);
    oquad(m, [p[0], p[1], z], [q[0], q[1], z], [q[0], q[1], -z], [p[0], p[1], -z], col, [c[0], c[1], 0]);
  }
  return m.done(1);
}
/** a curved petal / blade along +y: width w, curl (bends back around x), cup (across) */
export function petal(len = 1, w = 0.35, curl = 0.6, cup = 0.15, col = W, nu = 10, nv = 6) {
  const m = new MB();
  const P = (u, v) => { const a = u * curl, wd = w * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)), 0.7); const x = v * wd; const zc = -cup * v * v * wd / Math.max(w, 1e-3);
    return [x, Math.sin(a) / Math.max(curl, 1e-3) * len * (curl ? 1 : 0) + (curl ? 0 : u * len), (curl ? (1 - Math.cos(a)) / curl * len : 0) + zc]; };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = i / nu, u1 = (i + 1) / nu, v0 = (j / nv) * 2 - 1, v1 = ((j + 1) / nv) * 2 - 1;
    m.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), col);
  }
  return m.done(len);
}
// ------------------------------------------------------------------------------------------------ shared parts
export function tickRing(r = 1, ticks = 48, col = W) { // a thin ring with ruler ticks (gyroscopes, armillaries)
  const parts = [ring(r, 0.02, 48, col, 0.03)];
  for (let i = 0; i < ticks; i++) { const a = (i / ticks) * TAU, l = i % 4 === 0 ? 0.12 : 0.05; parts.push(xf(box(0.015, l, 0.04, col), { t: [Math.cos(a) * (r + 0.03 + l / 2), Math.sin(a) * (r + 0.03 + l / 2), 0], r: [0, 0, a - Math.PI / 2] })); }
  return M2(...parts);
}
export function disc(r = 1, seg = 20, col = W) { return xf(cylinder(r, 0.02, seg, col), { r: [Math.PI / 2, 0, 0] }); } // in XY, facing z
export function shell(r = 1, a0 = 0, a1 = Math.PI / 2, seg = 14, col = W) { // spherical cap band around +y (eyelids, domes)
  const prof = []; for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * (i / 6); prof.push([Math.sin(a) * r, Math.cos(a) * r]); }
  return lathe(prof, seg, col);
}
// ------------------------------------------------------------------------------------------------ AUDITOR
export function auditBlock() { // one corner block of the shell: chamfered, with a recessed plate on its outer faces
  const d = 0.8;
  return M2(chamfer(1, 1, 1, 0.14), xf(chamfer(0.6, 0.6, 0.1, 0.05, [0.55, 0.55, 0.6]), { t: [0.12, 0.12, 0.5] }),
    xf(chamfer(0.6, 0.1, 0.6, 0.05, [0.55, 0.55, 0.6]), { t: [0.12, 0.5, 0.12] }), xf(chamfer(0.1, 0.6, 0.6, 0.05, [0.55, 0.55, 0.6]), { t: [0.5, 0.12, 0.12] }),
    xf(box(0.04, 0.04, d, [0.3, 0.3, 0.35]), { t: [0.36, 0.36, 0] }));
}
export function ledger() { // the audit panels: a slab with a raised frame and rivets
  const parts = [chamfer(1, 1, 0.08, 0.03, [0.35, 0.36, 0.42])];
  for (const [x, y, w, h] of [[0, 0.46, 1, 0.08], [0, -0.46, 1, 0.08], [0.46, 0, 0.08, 1], [-0.46, 0, 0.08, 1]]) parts.push(xf(chamfer(w, h, 0.06, 0.02), { t: [x, y, 0.05] }));
  for (const x of [-0.46, 0.46]) for (const y of [-0.46, 0.46]) parts.push(xf(octa(0.05), { t: [x, y, 0.09] }));
  parts.push(xf(cone(0.06, 0.25, 6, [0.5, 0.5, 0.55]), { t: [0, -0.5, -0.05], r: [Math.PI, 0, 0] }));
  return M2(...parts);
}
// ------------------------------------------------------------------------------------------------ LEVIATHAN
export function levSkull() { // upper head, nose +z, hinge at z=0
  const prof = [[0.05, 0], [0.75, 0.6], [0.95, 1.6], [0.9, 2.8], [0.7, 3.9], [0.42, 4.8], [0.15, 5.4], [0.02, 5.6]];
  const head = xf(latheZ(prof, 10, W, (a) => 1 + 0.12 * Math.cos(a * 2)), { s: [1, 0.55, 1], t: [0, 0.18, 0] });
  const parts = [head];
  for (let i = 0; i < 6; i++) parts.push(xf(cone(0.16 - i * 0.015, 0.9 - i * 0.08, 4, [0.8, 0.85, 0.9]), { t: [0, 0.62 - i * 0.03, 1 + i * 0.7], r: [-0.5, 0, 0] })); // crest
  for (const sx of [-1, 1]) {
    parts.push(xf(chamfer(0.5, 0.18, 1.4, 0.06, [0.6, 0.62, 0.7]), { t: [sx * 0.62, 0.42, 3.3], r: [0, sx * 0.25, sx * 0.3] }));                  // brow plate
    for (let k = 0; k < 7; k++) parts.push(xf(cone(0.07, 0.38, 4, [1.25, 1.25, 1.2]), { t: [sx * (0.62 - k * 0.07), 0.02, 1.4 + k * 0.55], r: [Math.PI, 0, 0] })); // teeth
    parts.push(xf(tube([[0, 0, 0], [sx * 0.4, -0.15, -0.8], [sx * 0.9, -0.1, -1.8], [sx * 1.0, 0.25, -2.9]], [0.12, 0.1, 0.07, 0.02], 5, [0.75, 0.8, 0.9]), { t: [sx * 0.55, 0.2, 4.2] })); // barbels
  }
  return M2(...parts);
}
export function levJaw() { // lower jaw, hinge at z=0, nose +z
  const prof = [[0.05, 0], [0.6, 0.6], [0.7, 2], [0.55, 3.6], [0.3, 4.6], [0.03, 5]];
  const parts = [xf(latheZ(prof, 8), { s: [1, 0.32, 1], t: [0, -0.15, 0] })];
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) parts.push(xf(cone(0.06, 0.3, 4, [1.25, 1.25, 1.2]), { t: [sx * (0.5 - k * 0.06), 0.05, 1.4 + k * 0.5] }));
  return M2(...parts);
}
export function levVert() { // a body segment along z (length ~2): ribbed barrel, dorsal fin, ventral spines
  const prof = []; for (let i = 0; i <= 8; i++) { const z = -1 + i * 0.25; prof.push([0.82 + (i % 2 ? 0.1 : -0.05) - Math.pow(Math.abs(z), 3) * 0.25, z]); }
  const fin = extrude([[0, 0], [-0.9, 0.2], [-1.2, 1.4], [0.4, 0.5]], 0.07, [0.85, 0.9, 1]);
  return M2(xf(latheZ(prof, 10, W, a => 1 + 0.08 * Math.cos(a * 5)), { s: [1, 0.85, 1] }), xf(fin, { t: [0, 0.6, 0.3], r: [0, -Math.PI / 2, 0] }),
    xf(cone(0.1, 0.5, 4, [0.8, 0.8, 0.85]), { t: [0, -0.7, 0], r: [Math.PI, 0, 0] }));
}
export function levFin() { // side fin, root at origin, sweeping out along +x and back along -z
  return extrude([[0, 0.25], [0.9, 0.1], [1.9, -0.6], [1.5, -0.9], [0.4, -0.5], [0, -0.25]], 0.06, [0.9, 0.95, 1]);
}
export function levTail() { // tail fan
  const parts = []; for (let i = -2; i <= 2; i++) parts.push(xf(petal(2.4, 0.35, 0.3, 0.1), { r: [-Math.PI / 2 + 0.2, 0, i * 0.32] }));
  return M2(...parts);
}
// ------------------------------------------------------------------------------------------------ WARDEN
export function brickWall(seed = 3) { // unit wall (-0.5..0.5) of bevelled bricks with varied depth and tone
  const R = rng(seed); const parts = []; const rows = 22, cols = 16, bw = 1 / cols, bh = 1 / rows;
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    const off = (j % 2) * bw * 0.5, x0 = -0.5 + i * bw + off, x1 = Math.min(0.5, x0 + bw), xa = Math.max(-0.5, x0); if (x1 - xa < bw * 0.2) continue;
    const t = 0.55 + R() * 0.45, dz = R() * 0.004;
    parts.push(xf(box(x1 - xa - 0.003, bh - 0.004, 0.01 + dz, [t, t * (0.85 + R() * 0.1), t * (0.8 + R() * 0.1)]), { t: [(xa + x1) / 2, -0.5 + (j + 0.5) * bh, dz / 2] }));
  }
  return M2(...parts);
}
export function brickSeams(seed = 3) { // the mortar lines (glow with heat)
  const m = new MB(); const rows = 22, cols = 16, bw = 1 / cols, bh = 1 / rows;
  for (let j = 0; j <= rows; j++) m.line([-0.5, -0.5 + j * bh, 0.002], [0.5, -0.5 + j * bh, 0.002]);
  for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) { const x = -0.5 + i * bw + (j % 2) * bw * 0.5; if (x > -0.5 && x < 0.5) m.line([x, -0.5 + j * bh, 0.002], [x, -0.5 + (j + 1) * bh, 0.002]); }
  return m.done(0.8);
}
export function wardenMask() { // the guardian's face: a sculpted mask with brow, cheek plates, crown and horns (faces +z)
  const parts = [];
  // carved face surface (like meshes.face but denser, with deep sockets and a ridge)
  const m = new MB(); const rows = 12, cols = 10;
  const pt = (i, j) => {
    const u = (i / cols) * 2 - 1, v = (j / rows) * 2 - 1; const ex = Math.sqrt(Math.max(0, 1 - v * v * 0.6)) * 0.8;
    const x = u * ex, y = v * 1.15; let z = Math.sqrt(Math.max(0, 1 - u * u * 0.6 - v * v * 0.35)) * 0.55;
    if (Math.abs(u) < 0.2 && v > -0.25 && v < 0.35) z += 0.2 * (1 - Math.abs(u) * 5);
    const eu = Math.abs(u) - 0.45, ev = v - 0.18; z -= 0.22 * Math.exp(-(eu * eu) / 0.02 - (ev * ev) / 0.012);
    if (v < -0.45 && Math.abs(u) < 0.5) z -= 0.15 * (1 - Math.abs(u) * 2);   // mouth cavity
    return [x, y, z];
  };
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) m.quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), [0.95, 0.9, 0.85]);
  parts.push(m.done(1.2));
  for (const sx of [-1, 1]) {
    parts.push(xf(chamfer(0.62, 0.14, 0.3, 0.05, [0.7, 0.65, 0.6]), { t: [sx * 0.42, 0.46, 0.42], r: [0.3, 0, sx * -0.28] }));           // brow
    parts.push(xf(chamfer(0.34, 0.5, 0.12, 0.04, [0.75, 0.7, 0.65]), { t: [sx * 0.62, -0.2, 0.32], r: [0, sx * 0.55, sx * 0.12] }));     // cheek plate
    const hp = []; for (let k = 0; k <= 7; k++) { const a = k / 7; hp.push([sx * (0.55 + a * 0.75 + a * a * 0.2), 0.8 + a * 0.9 - a * a * 0.4, -0.1 - a * 0.25]); }
    parts.push(tube(hp, a => 0.16 * (1 - a) + 0.01, 6, [0.9, 0.85, 0.75]));                                                              // horns
  }
  for (let k = 0; k < 9; k++) { const a = -0.9 + k * 0.225; parts.push(xf(cone(0.08, 0.5 + (k % 2) * 0.25 + (k === 4 ? 0.3 : 0), 4, [1, 0.9, 0.6]), { t: [Math.sin(a) * 0.7, 1.05 + Math.cos(a) * 0.12, -0.05], r: [0, 0, -a * 0.9] })); } // crown
  parts.push(xf(chamfer(0.12, 0.7, 0.22, 0.04, [0.8, 0.75, 0.7]), { t: [0, 0.75, 0.38], r: [0.25, 0, 0] }));                            // forehead ridge
  return M2(...parts);
}
export function wardenJaw() { // hinge at the top (y=0), teeth up, faces +z
  const parts = [xf(chamfer(0.9, 0.35, 0.45, 0.08, [0.9, 0.85, 0.8]), { t: [0, -0.17, 0] })];
  for (let k = 0; k < 8; k++) parts.push(xf(cone(0.045, 0.18, 4, [1.2, 1.15, 1.05]), { t: [-0.35 + k * 0.1, 0, 0.15] }));
  return M2(...parts);
}
export function flame() { // a flame tongue (additive), base at y=0
  return lathe([[0.0, 0], [0.45, 0.25], [0.5, 0.6], [0.32, 1.1], [0.12, 1.6], [0.0, 2]], 8, W, (a, i) => 1 + (i > 2 ? 0.25 * Math.sin(a * 3 + i) : 0));
}
// ------------------------------------------------------------------------------------------------ LIBRARIAN
export function book(seed = 1) { // closed book: covers + page block + spine bands; height along y
  const R = rng(seed); const t = 0.7 + R() * 0.3, c = [t, t * (0.6 + R() * 0.3), t * (0.4 + R() * 0.3)];
  return M2(xf(chamfer(0.7, 1, 0.05, 0.015, c), { t: [0, 0, 0.11] }), xf(chamfer(0.7, 1, 0.05, 0.015, c), { t: [0, 0, -0.11] }),
    xf(box(0.66, 0.94, 0.18, [1.3, 1.25, 1.1]), { t: [0.02, 0, 0] }), xf(chamfer(0.08, 1, 0.27, 0.03, c), { t: [-0.34, 0, 0] }),
    xf(box(0.09, 0.04, 0.28, [1.4, 1.2, 0.6]), { t: [-0.35, 0.3, 0] }), xf(box(0.09, 0.04, 0.28, [1.4, 1.2, 0.6]), { t: [-0.35, -0.3, 0] }));
}
export function tomeHalf() { // one half of the open tome: cover + page stack, spine at x=0, extends +x, faces +z
  return M2(chamfer(1, 1.3, 0.04, 0.015, [0.55, 0.25, 0.15]), xf(box(0.94, 1.22, 0.06, [1.3, 1.25, 1.1]), { t: [0, 0, 0.05] }), xf(box(0.02, 1.3, 0.1, [1.2, 1, 0.5]), { t: [-0.49, 0, 0.03] }));
}
export function sheet(seed = 1, lines = true) { // a curled page with lines of text (vertex colour), pivot at the left edge
  const m = new MB(); const R = rng(seed); const nx = 6, ny = 4, w = 1, h = 1.3;
  const P = (i, j) => { const u = i / nx, v = j / ny; return [u * w, (v - 0.5) * h, Math.sin(u * Math.PI) * 0.08 + u * u * 0.05]; };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) m.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), [1.25, 1.2, 1.05]);
  if (lines) for (let k = 0; k < 9; k++) {
    const y = -0.5 + 0.1 + k * 0.11, x0 = 0.1, x1 = 0.1 + 0.55 + R() * 0.25;
    const a = [x0 * w, y * h, 0], b = [x1 * w, y * h, 0];
    const zf = x => Math.sin(x * Math.PI) * 0.08 + x * x * 0.05 + 0.006;
    m.quad([a[0], a[1], zf(x0)], [b[0], b[1], zf(x1)], [b[0], b[1] + 0.025, zf(x1)], [a[0], a[1] + 0.025, zf(x0)], [0.15, 0.13, 0.12]);
  }
  return m.done(1.2);
}
export function armillary() { // three tick rings on crossed axes (static cage; the view also spins rings separately)
  return M2(tickRing(1, 36), xf(tickRing(0.92, 36), { r: [Math.PI / 2, 0, 0] }), xf(tickRing(0.84, 36), { r: [0, Math.PI / 2, 0] }));
}
export function lantern() { // the Librarian's core housing: a faceted lamp with caps and finials
  return M2(xf(cylinder(0.55, 0.12, 8, [0.9, 0.75, 0.45]), { t: [0, 0.8, 0] }), xf(cylinder(0.55, 0.12, 8, [0.9, 0.75, 0.45]), { t: [0, -0.92, 0] }),
    xf(cone(0.5, 0.6, 8, [0.85, 0.7, 0.4]), { t: [0, 0.92, 0] }), xf(cone(0.5, 0.5, 8, [0.85, 0.7, 0.4]), { t: [0, -0.92, 0], r: [Math.PI, 0, 0] }),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k / 8 * TAU; return xf(box(0.05, 1.6, 0.05, [0.8, 0.65, 0.35]), { t: [Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52] }); }));
}
// ------------------------------------------------------------------------------------------------ SEED
export function seedPod() { // ribbed teardrop seed, tip +y
  const prof = [[0.02, -1], [0.45, -0.85], [0.75, -0.45], [0.8, 0], [0.62, 0.5], [0.35, 0.9], [0.08, 1.25], [0.01, 1.35]];
  return lathe(prof, 16, W, (a) => 1 + 0.14 * Math.pow(Math.abs(Math.cos(a * 4)), 3));
}
export function vine(seed = 7, depth = 5) { // 3D L-system with curls (lines)
  const m = new MB(); const R = rng(seed);
  const grow = (p, d, len, n) => {
    let q = p, dir = d; const steps = 5;
    for (let s = 0; s < steps; s++) {
      const c = [Math.sin(s * 0.9 + n) * 0.25, Math.cos(s * 1.1 + n) * 0.25, 0];
      dir = norm([dir[0] + c[0] * 0.5, dir[1] + c[1] * 0.5, dir[2] + c[2] * 0.3]);
      const nq = [q[0] + dir[0] * len / steps, q[1] + dir[1] * len / steps, q[2] + dir[2] * len / steps]; m.line(q, nq); q = nq;
    }
    if (n <= 0) return;
    const kids = 2 + (R() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) grow(q, norm([dir[0] + (R() - 0.5) * 1.4, dir[1] + (R() - 0.5) * 1.4, dir[2] + (R() - 0.5) * 1.4]), len * (0.62 + R() * 0.1), n - 1);
  };
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; grow([0, 0, 0], norm([Math.cos(a), Math.sin(a), (R() - 0.5) * 0.6]), 0.45, depth - 1); }
  return m.done(1.5);
}
export function spore(seed = 2) { // seednode: a pollen ball with soft spikes and little petals
  const parts = [ico(0.5, 1, W, true)];
  const R = rng(seed);
  for (let i = 0; i < 14; i++) { const a = R() * TAU, b = Math.acos(R() * 2 - 1); parts.push(xf(cone(0.08, 0.5 + R() * 0.3, 4, [1.1, 1.1, 1.1]), { t: [0, 0, 0], r: [b, 0, a] })); }
  for (let k = 0; k < 5; k++) parts.push(xf(petal(0.9, 0.3, 0.9, 0.12, [0.9, 0.9, 1]), { r: [0.5, 0, k / 5 * TAU] }));
  return M2(...parts);
}
// ------------------------------------------------------------------------------------------------ HOLLIS-9 (articulated)
export const HOLLIS = {
  head: () => M2(chamfer(0.26, 0.32, 0.28, 0.07, [0.85, 0.85, 0.9]), xf(chamfer(0.28, 0.1, 0.1, 0.03, [0.3, 0.3, 0.35]), { t: [0, 0.03, 0.11] }), xf(box(0.06, 0.05, 0.12, [0.5, 0.5, 0.55]), { t: [0, -0.2, 0] })),
  visor: () => xf(box(0.24, 0.035, 0.02), { t: [0, 0.03, 0.165] }),
  torso: () => { const d = chamfer(0.62, 0.66, 0.3, 0.08, [0.9, 0.9, 0.95]); for (let i = 0; i < d.pos.length; i += 3) { const k = 0.75 + (d.pos[i + 1] + 0.33) * 0.4; d.pos[i] *= k; } // tapers to the waist
    return M2(d, xf(extrude([[0, 0.3], [0.09, 0.05], [0, -0.32], [-0.09, 0.05]], 0.02, [0.25, 0.05, 0.08]), { t: [0, -0.02, 0.16] }), // tie
      xf(extrude([[-0.02, 0.33], [0.12, 0.33], [0.04, -0.1]], 0.02, [0.55, 0.55, 0.6]), { t: [0.06, 0, 0.155] }), xf(extrude([[0.02, 0.33], [-0.12, 0.33], [-0.04, -0.1]], 0.02, [0.55, 0.55, 0.6]), { t: [-0.06, 0, 0.155] }),
      xf(chamfer(0.2, 0.08, 0.26, 0.03), { t: [0.34, 0.3, 0], r: [0, 0, -0.25] }), xf(chamfer(0.2, 0.08, 0.26, 0.03), { t: [-0.34, 0.3, 0], r: [0, 0, 0.25] })); },
  pelvis: () => chamfer(0.42, 0.22, 0.26, 0.06, [0.75, 0.75, 0.8]),
  limb: (l = 0.42, w = 0.13) => { const d = chamfer(w, l, w, w * 0.25, [0.88, 0.88, 0.92]); for (let i = 0; i < d.pos.length; i += 3) { d.pos[i + 1] -= l / 2; const k = 1 - (-d.pos[i + 1] / l) * 0.25; d.pos[i] *= k; d.pos[i + 2] *= k; } return M2(d, xf(ico(w * 0.55, 0), { t: [0, 0, 0] })); },
  hand: () => M2(chamfer(0.1, 0.14, 0.06, 0.02, [0.8, 0.8, 0.85]), ...[-0.03, 0, 0.03].map(x => xf(box(0.022, 0.08, 0.025), { t: [x, -0.1, 0.01] }))),
  coat: () => { const d = extrude([[-0.16, 0], [0.16, 0], [0.2, -0.7], [-0.12, -0.75]], 0.02, [0.55, 0.55, 0.6]); return d; },
};
// ------------------------------------------------------------------------------------------------ THE DEEP
export function tentSeg() { // tapered segment along +z, length 1, with a ridge of suckers
  const parts = [latheZ([[0.5, 0], [0.55, 0.3], [0.48, 0.7], [0.42, 1.02]], 8, W, a => 1 + 0.08 * Math.cos(a * 4))];
  parts.push(xf(ico(0.14, 0, [1.3, 1.1, 1.1]), { t: [0, -0.48, 0.5] }));
  return M2(...parts);
}
export function eyeball() { return ico(1, 2, W, true); }
export function iris() { return M2(xf(ring(0.62, 0.3, 32, [1, 1, 1], 0.02), {}), ...Array.from({ length: 24 }, (_, i) => { const a = i / 24 * TAU; return xf(box(0.03, 0.55, 0.02, [1.4, 1.1, 0.8]), { t: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.025], r: [0, 0, a - Math.PI / 2] }); })); }
export function band() { return cylinder(1, 0.1, 40, W, false); } // a short open cylinder (glyph halos)
// ------------------------------------------------------------------------------------------------ ICE (regular enemies)
export function pingerFins() { const parts = []; for (let k = 0; k < 4; k++) parts.push(xf(extrude([[0, 0], [0.9, 0.18], [1.1, 0], [0.9, -0.18]], 0.05), { r: [0, 0, k * Math.PI / 2 + Math.PI / 4] })); return M2(...parts); }
export function splitCube() { const parts = []; for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) parts.push(xf(chamfer(0.46, 0.46, 0.46, 0.08), { t: [i * 0.25, j * 0.25, k * 0.25] })); return M2(...parts); }
export function scannerHead() { return M2(ring(1, 0.16, 24, [0.6, 0.6, 0.65], 0.3), ...[0, 1, 2].map(k => { const a = k / 3 * TAU + Math.PI / 2; return xf(box(0.08, 0.8, 0.08, [0.5, 0.5, 0.55]), { t: [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], r: [0, 0, a - Math.PI / 2] }); }), xf(cylinder(0.3, 0.3, 10, [0.4, 0.4, 0.45]), { r: [Math.PI / 2, 0, 0], t: [0, 0, -0.15] })); }
export function wormHead() { return xf(lathe([[0.02, -1], [0.7, -0.7], [0.95, 0], [0.75, 0.6], [0.4, 0.95], [0.1, 1.05]], 10, W, a => 1 + 0.1 * Math.cos(a * 3)), { r: [Math.PI / 2, 0, 0] }); }
export function mandible() { const p = []; for (let k = 0; k <= 6; k++) { const a = k / 6; p.push([a * 0.3 + Math.sin(a * 2.6) * 0.25, 0, a * 1.1]); } return tube(p, a => 0.14 * (1 - a) + 0.015, 5); }
export function wormSeg() { return lathe([[0.05, -0.8], [0.7, -0.6], [0.95, -0.2], [0.8, 0], [0.95, 0.2], [0.7, 0.6], [0.05, 0.8]], 10, W, a => 1 + 0.12 * Math.pow(Math.abs(Math.cos(a * 3)), 4)); }
export function stealth() { // hunter: flying wing in XZ, nose +z, cockpit hump on top
  const wing = xf(extrude([[0, 1.3], [1.4, -0.6], [0.6, -0.4], [0, -0.75], [-0.6, -0.4], [-1.4, -0.6]], 0.12), { r: [Math.PI / 2, 0, 0] });
  return M2(wing, xf(chamfer(0.3, 0.16, 0.8, 0.06, [0.5, 0.5, 0.55]), { t: [0, 0.1, 0.2] }));
}
export function shutterFrame() { return M2(...[[0, 0.47, 1, 0.06], [0, -0.47, 1, 0.06], [0.47, 0, 0.06, 1], [-0.47, 0, 0.06, 1]].map(([x, y, w, h]) => xf(chamfer(w, h, 0.14, 0.03, [0.6, 0.6, 0.65]), { t: [x, y, 0] }))); }
export function slat() { return chamfer(0.9, 0.15, 0.05, 0.015); }
export { cone, chamfer as bevelBox };
// ------------------------------------------------------------------------------------------------ B-side scenery (v5)
export function jellyBell() { // a ruffled bell, open below (glass, additive)
  return lathe([[0.02, 1], [0.45, 0.94], [0.78, 0.72], [0.96, 0.4], [1.02, 0.12], [0.92, 0]], 16, W, (a, i) => 1 + (i >= 3 ? 0.07 * Math.sin(a * 8) : 0));
}
export function jellyTent(seed = 4) { // trailing tentacles and oral arms (lines)
  const m = new MB(); const R = rng(seed);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * TAU, r = 0.9; let p = [Math.cos(a) * r, 0, Math.sin(a) * r];
    for (let i = 0; i < 10; i++) { const q = [p[0] + Math.sin(i * 0.9 + k) * 0.08, p[1] - 0.32 - R() * 0.1, p[2] + Math.cos(i * 0.7 + k) * 0.08]; m.line(p, q); p = q; }
  }
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; let p = [Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2]; for (let i = 0; i < 7; i++) { const q = [p[0] + Math.cos(a + i) * 0.12, p[1] - 0.28, p[2] + Math.sin(a + i) * 0.12]; m.line(p, q); p = q; } }
  return m.done(3);
}
export function stairs(n = 12) { // a straight flight with stringers, centred
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(xf(chamfer(1.2, 0.22, 0.34, 0.03), { t: [0, i * 0.25 - n * 0.125, i * 0.3 - n * 0.15] }));
  const len = Math.hypot(n * 0.25, n * 0.3), ang = Math.atan2(n * 0.25, n * 0.3);
  for (const sx of [-0.66, 0.66]) parts.push(xf(box(0.1, 0.18, len), { t: [sx, -0.1, 0], r: [-ang, 0, 0] }));
  return M2(...parts);
}
export function doorway() { // a thick stone door frame (unit width, 0.72 high) with a lintel and plinths
  const T = 0.07, D = 0.12, Wd = 1, H = 0.72, c2 = [0.85, 0.84, 0.8];
  return M2(xf(chamfer(Wd + T * 2, T * 1.4, D, 0.02), { t: [0, H / 2 + T * 0.7, 0] }), xf(chamfer(Wd + T * 2, T, D, 0.02), { t: [0, -H / 2 - T / 2, 0] }),
    xf(chamfer(T, H, D, 0.02), { t: [-Wd / 2 - T / 2, 0, 0] }), xf(chamfer(T, H, D, 0.02), { t: [Wd / 2 + T / 2, 0, 0] }),
    xf(chamfer(Wd * 0.3, T * 0.8, D * 1.2, 0.02, c2), { t: [0, H / 2 + T * 1.6, 0] }),
    xf(chamfer(T * 1.6, T * 1.2, D * 1.3, 0.02, c2), { t: [-Wd / 2 - T / 2, -H / 2 + T * 0.6, 0] }), xf(chamfer(T * 1.6, T * 1.2, D * 1.3, 0.02, c2), { t: [Wd / 2 + T / 2, -H / 2 + T * 0.6, 0] }));
}
export function tribar() { // the impossible triangle's three beams
  const b = 0.12;
  return M2(xf(chamfer(1, b, b, 0.02), { t: [0, 0, 0] }), xf(chamfer(b, 1, b, 0.02), { t: [0.5 - b / 2, 0.5 - b / 2, 0] }), xf(chamfer(b, b, 1, 0.02), { t: [-0.5 + b / 2, 0, 0.5 - b / 2] }));
}
export function helix(n = 40) { // a spiral staircase around a column
  const parts = [cylinder(0.12, n * 0.09, 10, [0.8, 0.78, 0.75])];
  for (let i = 0; i < n; i++) { const a = i * 0.42; parts.push(xf(chamfer(0.75, 0.06, 0.22, 0.02), { t: [Math.cos(a) * 0.45, i * 0.09 - n * 0.045, Math.sin(a) * 0.45], r: [0, -a, 0] })); }
  return M2(...parts);
}
