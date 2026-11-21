// Bosses and ICE, drawn as procedural rigs (v4 gfx pass): every boss is a hierarchy of parts from
// src/render/creatures.js, animated in code from the sim state (armour, unfold, phase, hp, the last shot / telegraph,
// the beat kick) — jaws open on the shot, lids blink on the beat, shells unfold, tentacles wave, pages flip on the bar.
// The sim (hit boxes, patterns) is untouched: this is only how things look.
import { PASS } from '../render/renderer.js';
import { clamp, lerp } from '../core/math.js';

const M = new Float32Array(16);
const PI = Math.PI, TAU = PI * 2;
const ease = k => k * k * (3 - 2 * k);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function hsv(h, s = 0.7) { const f = n => { const k = (n + h * 6) % 6; return 1 - Math.max(0, Math.min(k, 4 - k, 1)) * s; }; return [f(5), f(3), f(1), 1]; }
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), a[3] ?? 1];
// rotation order matches creatures.xf: x, then y, then z
function rot(v, r) {
  let [x, y, z] = v;
  if (r[0]) { const c = Math.cos(r[0]), s = Math.sin(r[0]); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (r[1]) { const c = Math.cos(r[1]), s = Math.sin(r[1]); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (r[2]) { const c = Math.cos(r[2]), s = Math.sin(r[2]); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
// rotation that turns +z into the direction d
const aim = d => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [-Math.asin(clamp(d[1] / l, -1, 1)), Math.atan2(d[0], d[2]), 0]; };

export class CreatureView {
  constructor(view) { this.v = view; this.L = view.L; this.stack = []; this.B = new Float32Array(16); }
  // ------------------------------------------------------------------------------------------- rig
  base(s, x, y, k = 1, face = true, roll = 0, yaw = 0, pitch = 0) { this.B.set(this.v.put(s, x, y, k, k, k, roll, yaw, pitch, face)); this.stack.length = 0; }
  local(out, t, r, s) { // out = B * T(t) R(r) S(s)
    const B = this.B, ex = rot([s[0], 0, 0], r), ey = rot([0, s[1], 0], r), ez = rot([0, 0, s[2]], r);
    for (let i = 0; i < 3; i++) {
      out[i] = B[i] * ex[0] + B[4 + i] * ex[1] + B[8 + i] * ex[2];
      out[4 + i] = B[i] * ey[0] + B[4 + i] * ey[1] + B[8 + i] * ey[2];
      out[8 + i] = B[i] * ez[0] + B[4 + i] * ez[1] + B[8 + i] * ez[2];
      out[12 + i] = B[i] * t[0] + B[4 + i] * t[1] + B[8 + i] * t[2] + B[12 + i];
    }
    out[3] = out[7] = out[11] = 0; out[15] = 1;
    return out;
  }
  part(r, mesh, t, rr, s, col, p, pass) { if (typeof s === 'number') s = [s, s, s]; this.local(M, t, rr, s); r.draw(mesh, M, col, p, pass); }
  push(t, rr = [0, 0, 0], s = [1, 1, 1]) { if (typeof s === 'number') s = [s, s, s]; this.stack.push(this.B.slice()); const o = new Float32Array(16); this.local(o, t, rr, s); this.B.set(o); }
  pop() { this.B.set(this.stack.pop()); }
  glow(r, t, size, col, k = 2) { this.part(r, this.L.quad, t, [0, 0, 0], size, col, [1, k, 0, 9], PASS.ADD); }
  fire(e, sim, rate = 6) { return Math.exp(-Math.max(0, sim.t - (e.firedT ?? -99)) * rate); }
  // ------------------------------------------------------------------------------------------- bosses
  boss(r, e, sim, pal, time, kick) {
    const hit = e.flashT > 0; if (hit) e.flashT -= 1 / 60;
    const ec = [...pal.enemy, 1], acc = [...pal.palC, 1];
    const crit = e.critical ? (Math.floor(time * 8) % 2) : 0;
    const body = hit ? [1, 1, 1, 1] : crit ? [1, 0.3, 0.3, 1] : null;
    const fn = this[e.bossType];
    if (fn) fn.call(this, r, e, sim, { ec, acc, body, hit, crit, time, kick, pal });
  }
  auditor(r, e, sim, o) {
    const L = this.L, t = o.time, sp = e.spin || 0;
    e._u = lerp(e._u ?? 0, e.unfold || 0, 0.12);
    const u = e._u, f = this.fire(e, sim);
    this.base(e.s, e.x, e.y, 1, true);
    // gyroscope: three ruler rings on their own axes
    const rc = mixc(o.acc, [1, 1, 1, 1], 0.2);
    this.part(r, L.c_tickRing, [0, 0, 0], [t * 0.7, sp, 0], 11 + u * 2, rc, [1, 1.4 + o.kick, 0, 0]);
    this.part(r, L.c_tickRing, [0, 0, 0], [sp * 1.3, 0, t * 0.4], 12.5 + u * 2.5, rc, [1, 1.1 + o.kick, 0, 0]);
    this.part(r, L.c_tickRing, [0, 0, 0], [PI / 2, t * 0.5, sp], 9.6 + u * 1.5, rc, [1, 1.2, 0, 0]);
    // the eye inside
    const irisC = o.body || mixc(o.ec, [1, 0.25, 0.2, 1], 0.5);
    this.part(r, L.icoSmooth, [0, 0, 0], [t * 0.3, t * 0.2, 0], 3.1, irisC, [1, 0.9 + f * 3 + o.kick, 0, 0]);
    const closed = e.armored ? 1 : 0; e._lid = lerp(e._lid ?? 1, closed, 0.2);
    this.part(r, L.c_disc, [0, 0, 3.05], [0, 0, 0], [1.25 + f * 0.6, lerp(1.25, 0.15, e._lid) + f * 0.4, 1], [0.02, 0.02, 0.03, 1], [0, 0, 0, 0]);
    this.part(r, L.c_disc, [0, 0, 3.1], [0, 0, 0], [0.35, 0.35, 1], [1, 1, 1, 1], [1, 3, 0, 0]);
    this.glow(r, [0, 0, 3.4], 6 + f * 8, [1, 0.4, 0.3, 0.35 + f * 0.6]);
    // the shell: eight chamfered corner blocks that slide out along the diagonals
    this.push([0, 0, 0], [sp * 0.6, sp, 0]);
    const steel = o.body || (e.armored ? [0.78, 0.8, 0.9, 1] : mixc(o.ec, [0.85, 0.88, 0.95, 1], 0.5));
    for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) {
      const n = (i + 2) * 7 + (j + 2) * 3 + k, jit = o.crit ? (hash(n + Math.floor(t * 20)) - 0.5) * 0.8 : 0;
      const off = 1.55 + u * 3.6 + o.kick * 0.25 + jit;
      const pos = [i * off, j * off, k * off];
      this.part(r, L.c_auditBlock, pos, [0, 0, 0], [i * 2.9, j * 2.9, k * 2.9], steel, [2, 0.35, 0, 0]);
      this.part(r, L.wireBox, pos, [0, 0, 0], 3.05, [...o.acc.slice(0, 3), 0.5 + o.kick * 0.5], [1, 1.5, 0, 0], PASS.ADDLINE);
    }
    this.pop();
    // the ledger panels on their hinge arms (until they detach in phase 2)
    if (!e.detached) {
      const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      F.forEach((d, i) => {
        const dist = 8.5 + u * 8, a = sp + i, R = d[0] ? [0, d[0] * PI / 2, a * 0.3] : d[1] ? [-d[1] * PI / 2, 0, a * 0.3] : [0, d[2] > 0 ? 0 : PI, a * 0.3];
        this.part(r, L.beam, [d[0] * 2.5, d[1] * 2.5, d[2] * 2.5], aim(d), [0.35, 0.35, dist - 3], [0.4, 0.42, 0.5, 1], [2, 0.1, 0, 0]);
        this.part(r, L.c_ledger, [d[0] * dist, d[1] * dist, d[2] * dist], R, [11, 11, 11], o.body || [0.8, 0.85, 0.95, 1], [2, 0.3, 0, 0]);
        this.push([d[0] * dist, d[1] * dist, d[2] * dist], R); this.part(r, L.quad, [0, 0, 0.55], [0, 0, 0], [4.4, 4.4, 1], [...o.acc.slice(0, 3), 1], [5, 1.5 + o.kick * 2, 0, 0]); this.pop();
      });
    }
    if (o.crit) for (let k = 0; k < 4; k++) { const h = hash(k + Math.floor(t * 30)); this.glow(r, [(h - 0.5) * 16, (hash(h * 9) - 0.5) * 16, 4], 1.5 + h * 2, [1, 0.8, 0.4, 1], 4); }
  }
  leviathan(r, e, sim, o) {
    const L = this.L, t = o.time, tr = e.trail || [], f = this.fire(e, sim, 4);
    const a = tr[0] || [e.d, e.x, e.y], b = tr[6] || [e.d + 1, e.x, e.y];
    let mv = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; const ml = Math.hypot(...mv) || 1; mv = mv.map(v => v / ml);
    let tp = [-e.d, sim.px - e.x, sim.py - e.y]; const tl = Math.hypot(...tp) || 1; tp = tp.map(v => v / tl);
    const w = e.armored ? 0.1 : 0.55, dd = lerp(mv[0], tp[0], w), dx = lerp(mv[1], tp[1], w), dy = lerp(mv[2], tp[2], w);
    const yaw = Math.atan2(dx, dd), pitch = -Math.atan2(dy, Math.hypot(dd, dx));
    this.base(e.s, e.x, e.y, 3.2, false, Math.sin(t * 2) * 0.25, yaw, pitch);
    const chrome = o.body || mixc(o.ec, [0.9, 0.95, 1, 1], 0.6);
    this.part(r, L.c_levSkull, [0, 0, -2], [0, 0, 0], 1, chrome, [2, 0.1, 0, 0]);
    const jo = 0.1 + f * 0.55 + o.kick * 0.06;
    this.part(r, L.c_levJaw, [0, -0.05, -2], [jo, 0, 0], 1, chrome, [2, 0.1, 0, 0]);
    this.glow(r, [0, -0.1, 1.2], 1.4 + f * 2.5, [1, 0.5, 0.3, 0.3 + f * 0.7], 3);      // the throat lights before the volley
    const eye = e.armored ? [0.3, 0.3, 0.4, 1] : [1, 0.25, 0.2, 1];
    for (const sx of [-1, 1]) {
      this.part(r, L.icoSmooth, [sx * 0.72, 0.42, 0.9], [0, 0, 0], 0.22, eye, [1, 2 + o.kick * 2, 0, 0]);
      this.glow(r, [sx * 0.8, 0.45, 1.0], 0.8, [eye[0], eye[1], eye[2], 0.8], 3);
      this.part(r, L.c_levFin, [sx * 0.75, -0.15, -0.6], [0, 0, sx * (0.3 + Math.sin(t * 5) * 0.3)], [sx * 0.9, 0.9, 0.9], chrome, [2, 0.1, 0, 0]);
    }
  }
  levseg(r, e, sim, o) {
    const L = this.L, t = o.time, p = e.parent, tr = (p && p.trail) || [], i0 = Math.min(tr.length - 1, (e.idx + 1) * 7);
    const a = tr[Math.max(0, i0 - 3)] || [e.d, e.x, e.y], b = tr[Math.min(tr.length - 1, i0 + 3)] || [e.d + 1, e.x, e.y];
    const dd = a[0] - b[0] || -1, dx = a[1] - b[1], dy = a[2] - b[2];
    const yaw = Math.atan2(dx, dd), pitch = -Math.atan2(dy, Math.hypot(dd, dx)), k = 4.4 * (e.scaleK || 1);
    this.base(e.s, e.x, e.y, k, false, Math.sin(t * 2 - e.idx * 0.4) * 0.3, yaw, pitch);
    const chrome = o.hit ? [1, 1, 1, 1] : mixc(o.ec, [0.9, 0.95, 1, 1], 0.6);
    this.part(r, L.c_levVert, [0, 0, 0], [0, 0, 0], 1, chrome, [2, 0.1, 0, 0]);
    this.part(r, L.c_tickRingS, [0, 0, 0], [0, 0, t * 0.5 + e.idx], [0.98, 0.84, 1], [...o.acc.slice(0, 3), 1], [1, 1 + o.kick * 2, 0, 0]);
    if (e.idx % 3 === 1) for (const sx of [-1, 1]) this.part(r, L.c_levFin, [sx * 0.8, -0.2, 0.2], [0, 0, sx * (0.25 + Math.sin(t * 4 - e.idx * 0.6) * 0.35)], [sx, 1, 1], chrome, [2, 0.1, 0, 0]);
    if (e.idx === 11) this.part(r, L.c_levTail, [0, 0, -0.9], [0, Math.sin(t * 3) * 0.4, 0], 1.3, chrome, [2, 0.2, 0, 0]);
  }
  warden(r, e, sim, o) {
    const L = this.L, t = o.time, kick = o.kick;
    // the firewall gate behind: bricks, mortar glowing with the heat of the beat, embers rising
    this.base(e.s + 10, e.x, e.y, 1, true);
    this.part(r, L.c_brickWall, [0, 0, 0], [0, 0, 0], [170, 120, 60], [0.55, 0.2, 0.1, 1], [0, 0.15, 0, 0]);
    this.part(r, L.c_brickSeams, [0, 0, 0.7], [0, 0, 0], [170, 120, 60], [1, 0.35 + kick * 0.3, 0.05, 0.35 + kick * 0.5], [1, 2, 0, 0], PASS.ADDLINE);
    for (let k = 0; k < 26; k++) { const h = hash(k), y = ((t * (6 + h * 6) + h * 120) % 120) - 60; this.glow(r, [(h - 0.5) * 160 + Math.sin(t + k) * 3, y, 3], 0.6 + hash(k * 3) * 0.8, [1, 0.5 + h * 0.4, 0.1, 0.8 * (1 - (y + 60) / 120)], 3); }
    // the mask
    this.base(e.s + 4, e.x, e.y, 34, true);
    const stone = o.body || [1, 0.78, 0.45, 1];
    this.part(r, L.c_wardenMask, [0, 0, 0], [0, 0, 0], 1, stone, [2, 0.12, 0, 0]);
    const jo = 0.08 + kick * 0.12 + (e.armored ? 0 : 0.1);
    this.glow(r, [0, -0.62, 0.15], 0.5 + kick * 0.2, [1, 0.45, 0.1, 0.9], 3);
    this.part(r, L.c_wardenJaw, [0, -0.5, 0.25], [jo, 0, 0], 0.95, stone, [2, 0.12, 0, 0]);
    // the crown burns
    for (let k = 0; k < 9; k++) {
      const a = -0.9 + k * 0.225, n = Math.sin(t * 9 + k * 1.7) * 0.5 + Math.sin(t * 13 + k) * 0.3, h = 0.32 + (k % 2) * 0.1 + n * 0.08 + kick * 0.08;
      const p = [Math.sin(a) * 0.72, 1.32 + Math.cos(a) * 0.12 + (k % 2) * 0.1, -0.05];
      this.part(r, L.c_flame, p, [0, 0, -a * 0.9 + n * 0.15], [0.16, h, 0.16], [1, 0.42, 0.08, 0.7], [1, 2, 0, 0], PASS.ADD);
      this.part(r, L.c_flame, p, [0, 0, -a * 0.9 - n * 0.1], [0.08, h * 0.6, 0.08], [1, 0.9, 0.5, 0.9], [1, 2, 0, 0], PASS.ADD);
    }
  }
  wardeneye(r, e, sim, o) { // an eye on the mask: socket, ball, iris, two lids that open on the eye's beat
    const L = this.L, op = e.open || 0, f = this.fire(e, sim, 5);
    this.base(e.s - (e.idx < 2 ? 5 : 10), e.x, e.y, 4.6, true);   // sits on the mask's surface (the hit point stays where the sim has it)
    const px = clamp(-(sim.px - e.x) * 0.02, -0.35, 0.35), py = clamp((sim.py - e.y) * 0.02, -0.3, 0.3);
    this.part(r, L.ringThick, [0, 0, 0.1], [0, 0, 0], 1.25, [0.25, 0.12, 0.08, 1], [0, 0.1, 0, 0]);
    this.part(r, L.icoSmooth, [0, 0, 0], [0, 0, 0], 1, o.hit ? [1, 1, 1, 1] : [1, 0.85, 0.7, 1], [0, 0.5, 0, 0]);
    this.push([0, 0, 0], [py, -px, 0]);
    this.part(r, L.c_iris, [0, 0, 0.98], [0, 0, 0], 0.62, e.active ? [1, 0.25 + f * 0.5, 0.05, 1] : [0.4, 0.3, 0.3, 1], [1, e.active ? 2 + f * 3 : 0.3, 0, 0]);
    this.part(r, L.c_disc, [0, 0, 1.0], [0, 0, 0], [0.12, 0.42, 1], [0.02, 0.01, 0.01, 1], [0, 0, 0, 0]);
    this.pop();
    const phi = lerp(PI / 4 + 0.05, -0.75, ease(clamp(op, 0, 1)));
    const lid = o.hit ? [1, 1, 1, 1] : [0.85, 0.6, 0.45, 1];
    this.part(r, L.c_lid, [0, 0, 0], [phi, 0, 0], 1.08, lid, [0, 0.2, 0, 0]);
    this.part(r, L.c_lid, [0, 0, 0], [-phi, 0, 0], [1.08, -1.08, 1.08], lid, [0, 0.2, 0, 0]);
    if (op > 0.5 && e.active) this.glow(r, [0, 0, 1.4], 1.6 + f * 2, [1, 0.4, 0.1, 0.5 + f * 0.5], 3);
  }
  librarian(r, e, sim, o) {
    const L = this.L, t = o.time, kick = o.kick, arm = e.armored ? 1 : 0;
    e._arm = lerp(e._arm ?? 1, arm, 0.05);
    this.base(e.s, e.x, e.y, 1, true);
    const brass = o.body || [1, 0.78, 0.42, 1], lit = 1 - e._arm * 0.7;
    // the lamp at the heart
    this.part(r, L.icoSmooth, [0, 0, 0], [t, t * 0.7, 0], 2.3 + kick * 0.3, [1, 0.7, 0.35, 1], [1, 0.3 + lit * 1.1, 0, 0]);
    this.glow(r, [0, 0, 2], 4.5 + kick * 1.5, [1, 0.75, 0.4, 0.15 + lit * 0.3]);
    this.part(r, L.c_lantern, [0, 0, 0], [0, t * 0.4, 0], 3.4, brass, [2, 0.2, 0, 0]);
    // the armillary: spins free when open, the rings lock together when armoured
    const s1 = (1 - e._arm);
    this.part(r, L.c_tickRing, [0, 0, 0], [t * 0.6 * s1, 0, 0], 7.2, [...o.acc.slice(0, 3), 1], [1, 1 + kick, 0, 0]);
    this.part(r, L.c_tickRing, [0, 0, 0], [PI / 2 * s1, t * 0.45 * s1, 0], 8.1, brass, [2, 0.3, 0, 0]);
    this.part(r, L.c_tickRing, [0, 0, 0], [t * 0.3 * s1, PI / 2 * s1 + t * 0.2, 0], 9, [...o.acc.slice(0, 3), 1], [1, 1 + kick, 0, 0]);
    // the orbit of books
    for (let k = 0; k < 10; k++) {
      const a = t * 0.35 + k / 10 * TAU, bob = Math.sin(t * 1.3 + k) * 0.8;
      this.part(r, L['c_book' + (k % 4)], [Math.cos(a) * 13, Math.sin(a) * 6 + bob, Math.sin(a) * 4], [0.3, -a + PI / 2, Math.sin(t + k) * 0.3], 2.4, [1, 1, 1, 1], [0, 0.15, 0, 0]);
    }
    // the open tome below: a page turns on every bar
    this.push([0, -9, 2], [-0.9, 0, 0], 4.2);
    const cover = [0.95, 0.9, 0.85, 1];
    this.part(r, L.c_tomeHalf, [0.5, 0, 0], [0, 0.22, 0], 1, cover, [0, 0.2, 0, 0]);
    this.part(r, L.c_tomeHalf, [-0.5, 0, 0], [0, -0.22, 0], [-1, 1, 1], cover, [0, 0.2, 0, 0]);
    const bt = (sim.beatIndex + sim.beatPhase) / 4;
    for (let k = 0; k < 3; k++) {
      const ph = ((bt + k / 3) % 1), ang = PI * ease(clamp(ph * 1.4 - 0.2, 0, 1));
      this.part(r, L.c_sheetBlank, [0, 0, 0.09], [0, -ang - 0.22 * Math.cos(ang), 0], [0.92, 0.92, 1], [1, 0.95, 0.85, 1], [0, 0.3, 0, 0]);
    }
    this.glow(r, [0, 0.2, 0.6], 1.2, [1, 0.8, 0.45, 0.25 + kick * 0.2]);
    this.pop();
  }
  page(r, e, sim, o) {
    const L = this.L, t = o.time, sl = e.slot || 0;
    this.base(e.s, e.x, e.y, 3.1, true);
    const col = o.hit ? [1, 1, 1, 1] : [1, 0.96, 0.88, 1];
    this.part(r, L['c_sheet' + (sl % 3)], [-0.5, 0, 0], [Math.sin(t * 3 + sl) * 0.25, Math.sin(t * 2.2 + sl * 1.3) * 0.5, Math.sin(t * 1.3 + sl) * 0.2], 1, col, [0, 0.35, 0, 0]);
  }
  seed(r, e, sim, o) {
    const L = this.L, t = o.time, kick = o.kick, g = 1 + (e.grow || 0) * 0.35;
    e._open = lerp(e._open ?? 0, e.armored ? 0.15 : 1, 0.04);
    const op = e._open;
    this.base(e.s, e.x, e.y, 7 * g, true);
    // the vines: a recursive bloom of light, slowly turning
    for (let k = 0; k < 3; k++) this.part(r, L.c_vine, [0, 0, -0.3], [t * 0.05 + k, t * 0.07, t * 0.1 + k * 2.1], 2.4 + k * 0.25, mixc(hsv((t * 0.05 + k * 0.33) % 1), [0, 0, 0, 1], 0.45), [1, 0.6 + kick * 0.6, 0, 0], PASS.ADDLINE);
    // three whorls of petals
    for (let w = 0; w < 3; w++) for (let k = 0; k < 6; k++) {
      const tilt = lerp(0.15, 1.35 - w * 0.25, op) + Math.sin(t * 1.5 + k + w) * 0.05 + kick * 0.05;
      const c = o.body || hsv((0.78 + Math.sin(t * 0.1) * 0.08 + w * 0.06 + k * 0.01) % 1, 0.85 - w * 0.2);
      this.part(r, L.c_petal, [0, 0, -0.1 * w], [PI / 2 - tilt, 0, k / 6 * TAU + w * 0.52 + t * 0.05], [2.3 - w * 0.4, 2.3 - w * 0.4, 2.3 - w * 0.4], c, [0, 0.9, 0, 0]);
    }
    // the pod
    this.part(r, L.c_seedPod, [0, 0, 0.1], [PI / 2, t * 0.3, 0], 0.55 + kick * 0.04, o.body || (e.armored ? [0.5, 0.5, 0.55, 1] : o.ec), [0, e.armored ? 0.2 : 1.2, 0, 0]);
    this.glow(r, [0, 0, 0.9], 0.5 + kick * 0.2, [1, 1, 0.8, 0.25 + op * 0.4], 3);
  }
  seednode(r, e, sim, o) {
    const L = this.L, t = o.time;
    this.base(e.s, e.x, e.y, 2.6, true);
    this.part(r, L.c_spore, [0, 0, 0], [t * 0.7 + (e.a || 0), t * 0.5, 0], 1, o.hit ? [1, 1, 1, 1] : hsv(((e.a || 0) * 0.15 + t * 0.05) % 1), [0, 0.9 + o.kick, 0, 0]);
  }
  hollis9(r, e, sim, o) {
    const L = this.L, t = o.time, f = this.fire(e, sim, 3);
    // afterimage where he was
    if (e._px !== undefined && Math.hypot(e.x - e._px, e.y - e._py) > 3) e._ghost = { x: e._px, y: e._py, t };
    e._px = e.x; e._py = e.y;
    if (e._ghost && t - e._ghost.t < 0.35) this.hollisBody(r, e, sim, o, e._ghost.x, e._ghost.y, 1 - (t - e._ghost.t) / 0.35);
    if (e.blink) { for (let k = 0; k < 5; k++) { this.base(e.s, e.x + (hash(k + t) - 0.5) * 6, e.y + (hash(k * 3 + t) - 0.5) * 12, 1, true); this.part(r, L.box, [0, 0, 0], [0, 0, 0], [3 + hash(k) * 8, 0.4, 0.4], [1, 0.1, 0.1, 0.8], [1, 2, 0, 0], PASS.ADD); } return; }
    this.hollisBody(r, e, sim, o, e.x, e.y, 0, f);
  }
  hollisBody(r, e, sim, o, x, y, ghost, f = 0) {
    const L = this.L, t = o.time, k = 8.5;
    this.base(e.s, x, y - 8, k, true, Math.sin(t * 0.8) * 0.04);
    const add = ghost > 0, col = add ? [1, 0.15, 0.15, ghost * 0.6] : o.body || [0.82, 0.83, 0.88, 1];
    const p = add ? [1, 1, 0, 0] : [8, 0.6, 0, 0], pass = add ? PASS.ADD : PASS.OPAQUE;
    const P = (m, tt, rr, s) => this.part(r, m, tt, rr, s, col, p, pass);
    const lx = clamp(-(sim.px - x) * 0.012, -0.5, 0.5), ly = clamp((sim.py - y) * 0.01, -0.3, 0.3);
    const sway = Math.sin(t * 1.1) * 0.05;
    P(L.c_hPelvis, [0, 0.95, 0], [0, sway, 0], 1);
    this.push([0, 1.02, 0], [sway * 0.5, sway, 0]);
    P(L.c_hTorso, [0, 0.33, 0], [0, 0, 0], 1);
    // head tracks you; the visor flares before the burst
    this.push([0, 0.72, 0], [ly, lx, 0]);
    P(L.c_hHead, [0, 0.06, 0], [0, 0, 0], 1);
    if (!add) { this.part(r, L.c_hVisor, [0, 0.06, 0], [0, 0, 0], 1, [1, 0.12, 0.1, 1], [1, 2 + f * 4, 0, 0]); this.glow(r, [0, 0.09, 0.2], 0.18 + f * 0.5, [1, 0.2, 0.15, 0.7 + f * 0.3], 3); }
    this.pop();
    // arms: the right one comes up to aim when he fires, the left gestures
    for (const sx of [-1, 1]) {
      const aimK = sx > 0 ? clamp(f * 1.6, 0, 1) : 0;
      const up = lerp(0.12 + Math.sin(t * 1.4 + sx) * 0.06, PI / 2 - ly, aimK), out = sx * lerp(0.18, 0.02, aimK);
      this.push([sx * 0.36, 0.58, 0], [-up, -lx * aimK, out]);
      P(L.c_hLimb, [0, 0, 0], [0, 0, 0], 1);
      this.push([0, -0.42, 0], [-lerp(0.35, 0.05, aimK), 0, 0]);
      P(L.c_hLimbS, [0, 0, 0], [0, 0, 0], 1); P(L.c_hHand, [0, -0.4, 0], [0, 0, 0], 1);
      if (aimK > 0.5 && !add) this.glow(r, [0, -0.5, 0], 0.25 + f * 0.6, [1, 0.3, 0.2, f], 3);
      this.pop(); this.pop();
    }
    this.pop();
    // legs hang, slightly bent, drifting; the coat tails stream behind
    for (const sx of [-1, 1]) {
      this.push([sx * 0.12, 0.88, 0], [0.12 + Math.sin(t * 1.2 + sx) * 0.08, 0, sx * 0.04]);
      P(L.c_hLimb, [0, 0, 0], [0, 0, 0], [1.05, 1.1, 1.05]);
      this.push([0, -0.46, 0], [-0.25 - Math.sin(t * 1.2 + sx) * 0.08, 0, 0]);
      P(L.c_hLimbS, [0, 0, 0], [0, 0, 0], [1, 1.1, 1]);
      this.pop(); this.pop();
      P(L.c_hCoat, [sx * 0.1, 1.0, -0.09], [0.25 + Math.sin(t * 5 + sx * 2) * 0.12, 0, sx * 0.06], 1);
    }
  }
  deep(r, e, sim, o) {
    const L = this.L, t = o.time, kick = o.kick, k = 42;
    this.base(e.s, e.x, e.y, 1, true);
    this.part(r, L.blob, [0, 0, 0], [0, 0, t * 0.1], k, o.body || [1, 1, 1, 1], [2, 0.4, 0.4 + kick * 0.3, 1]);
    // tentacles: chains of segments, each bending on its own slow wave
    for (let n = 0; n < 10; n++) {
      const a0 = n / 10 * TAU + t * 0.05;
      let p = [Math.cos(a0) * k * 0.8, Math.sin(a0) * k * 0.8, k * 0.15];
      let d = [Math.cos(a0), Math.sin(a0), 0.55];
      for (let i = 0; i < 16; i++) {
        const w = Math.sin(t * 1.3 + i * 0.45 + n * 1.7) * 0.35, w2 = Math.cos(t * 0.9 + i * 0.35 + n) * 0.3;
        d = [d[0] + (-d[1]) * w * 0.4 + d[2] * w2 * 0.1, d[1] + d[0] * w * 0.4, d[2] + w2 * 0.15]; const l = Math.hypot(...d); d = d.map(v => v / l);
        const len = k * 0.13 * (1 - i / 20), wd = k * 0.11 * Math.pow(1 - i / 17, 0.8) + 0.6;
        this.part(r, L.c_tentSeg, p, aim(d), [wd, wd, len * 1.05], o.body || [0.5, 0.08, 0.15, 1], [8, 0.6 + kick, 0, 0]);
        p = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
      }
      this.glow(r, p, 3 + kick * 2, [1, 0.3, 0.4, 0.6], 3);
    }
    // glyph halos
    this.part(r, L.c_band, [0, 0, 0], [PI / 2 + 0.35, t * 0.15, 0], [k * 1.3, k * 0.5, k * 1.3], [...o.acc.slice(0, 3), 1], [5, 1.2 + kick, 0, 0]);
    this.part(r, L.c_band, [0, 0, 0], [PI / 2 - 0.5, -t * 0.1, 0.6], [k * 1.5, k * 0.35, k * 1.5], [...o.acc.slice(0, 3), 1], [5, 1, 0, 0]);
    for (let q = 0; q < 3; q++) this.part(r, L.wireRing, [0, 0, 0], [0, 0, t * (0.3 + q * 0.2)], [56 + q * 12, 56 + q * 12, 1], [1, 1, 1, 0.5], [1, 1, 0, 0], PASS.ADDLINE);
    // the eye: it blinks on the off-beat (armoured), the pupil swells on the kick
    e._lid = lerp(e._lid ?? 0, e.armored ? 1 : 0, 0.35);
    const ez = k * 1.12, er = k * 0.46;
    this.push([0, 0, ez], [clamp((sim.py - e.y) * 0.004, -0.3, 0.3), clamp(-(sim.px - e.x) * 0.004, -0.3, 0.3), 0], er);
    this.part(r, L.icoSmooth, [0, 0, 0], [0, 0, 0], [1, 1, 0.55], o.body || [1, 0.95, 0.92, 1], [0, 0.35, 0, 0]);
    this.part(r, L.c_iris, [0, 0, 0.55], [0, 0, t * 0.2], 0.85, [1, 0.15, 0.25, 1], [1, 2.2 + kick * 2, 0, 0]);
    this.part(r, L.c_disc, [0, 0, 0.57], [0, 0, 0], 0.32 + kick * 0.12, [0.01, 0, 0.02, 1], [0, 0, 0, 0]);
    const phi = lerp(-0.8, PI / 4 + 0.05, e._lid), lid = o.body || [0.35, 0.1, 0.15, 1];
    this.part(r, L.c_lid, [0, 0, 0], [phi, 0, 0], [1.06, 1.06, 0.62], lid, [2, 0.2, 0, 0]);
    this.part(r, L.c_lid, [0, 0, 0], [-phi, 0, 0], [1.06, -1.06, 0.62], lid, [2, 0.2, 0, 0]);
    this.pop();
    this.glow(r, [0, 0, ez + er * 0.8], 20 + kick * 10, [1, 0.2, 0.3, 0.3 * (1 - e._lid)], 2);
  }
  // ------------------------------------------------------------------------------------------- ICE
  /** true when drawn here (the default mesh draw is skipped) */
  enemy(r, e, sim, pal, time, kick, T, col, sx, sy, sz, roll) {
    const L = this.L, t = time, f = this.fire(e, sim, 6), tele = Math.exp(-Math.max(0, sim.t - (e.teleT ?? -99)) * 4);
    const acc = [...pal.palC, 1];
    switch (e.type) {
      case 'auditpanel': {
        this.base(e.s, e.x, e.y, 1, true, Math.sin(t * 1.5 + e.idx) * 0.3);
        this.part(r, L.c_ledger, [0, 0, 0], [0, 0, 0], 8, e.flashT > 0 ? col : [0.75, 0.8, 0.95, 1], [5, 0.7 + kick, 0, 0]);
        this.part(r, L.icoSmooth, [0, 0, 0.6], [0, 0, 0], 0.7, [1, 0.3, 0.2, 1], [1, 1.5 + f * 4, 0, 0]);
        for (const s2 of [-1, 1]) this.glow(r, [s2 * 3, -4.4, -0.4], 1 + Math.random() * 0.6, [1, 0.6, 0.2, 0.8], 3);
        return true;
      }
      case 'levseg': this.levseg(r, e, sim, { ec: [...pal.enemy, 1], acc, hit: e.flashT > 0, time, kick }); return true;
      case 'wardeneye': this.wardeneye(r, e, sim, { hit: e.flashT > 0, time, kick }); return true;
      case 'page': this.page(r, e, sim, { hit: e.flashT > 0, time, kick }); return true;
      case 'seednode': this.seednode(r, e, sim, { hit: e.flashT > 0, time, kick }); return true;
      case 'pinger': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.octa, [0, 0, 0], [0, 0, roll], [sx, sy, sz], col, [0, 0.7, 0, 0]);
        this.part(r, L.c_pingerFins, [0, 0, 0], [0, 0, -t * 4], 1.5 + kick * 0.2, mixc(col, [0.8, 0.8, 0.9, 1], 0.5), [2, 0.2, 0, 0]);
        this.glow(r, [0, 0, 1.3], 0.35 + tele * 1.5 + f * 1.5, [1, 0.9, 0.6, 0.35 + tele * 0.6], 3);
        return true;
      }
      case 'tracer': {
        this.base(e.s, e.x, e.y, 1, true);
        for (let k = 3; k >= 0; k--) this.part(r, L.dart, [0, 0, -k * 1.4], [0, 0, t * 6 - k * 0.5], [sx, sy, sz], [col[0], col[1], col[2], 1 - k * 0.25], [1, 1.6, 0, 0], k ? PASS.ADDLINE : PASS.LINE);
        this.glow(r, [0, 0, 1], 1.2 + kick * 0.4, [col[0], col[1], col[2], 0.7], 3);
        return true;
      }
      case 'splitter': case 'splitlet': {
        this.base(e.s, e.x, e.y, 1, true);
        const g = e.type === 'splitter' ? 0.62 + kick * 0.12 + (e.flashT > 0 ? 0.15 : 0) : 0;
        if (e.type === 'splitlet') { this.part(r, L.c_chamfer, [0, 0, 0], [roll, roll * 0.7, 0], sx * 1.1, col, [0, 0.7, 0, 0]); return true; }
        this.push([0, 0, 0], [roll * 0.6, roll, 0]);
        for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) this.part(r, L.c_chamfer, [i * g, j * g, k * g], [0, 0, 0], sx * 0.48, col, [0, 0.7, 0, 0]);
        this.part(r, L.icoSmooth, [0, 0, 0], [0, 0, 0], 0.45, [...acc.slice(0, 3), 1], [1, 2 + kick * 2, 0, 0]);
        this.pop();
        return true;
      }
      case 'scanner': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.c_scannerHead, [0, 0, 0], [0, 0, t * 0.5], 2.6, col, [2, 0.3, 0, 0]);
        this.part(r, L.icoSmooth, [0, 0, 0.3], [0, 0, 0], 0.8, e.beamOn ? [1, 0.1, 0.05, 1] : [0.6, 0.2, 0.2, 1], [1, e.beamOn ? 3 : 1, 0, 0]);
        if (e.beamOn) this.glow(r, [0, 0, 1], 2.5, [1, 0.1, 0.05, 0.8], 3);
        return true;
      }
      case 'worm': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.c_wormHead, [0, 0, 0], [0, 0, 0], 1.7, col, [0, 0.6, 0, 0]);
        const m = 0.3 + Math.max(0, Math.sin(t * 6)) * 0.5 + f * 0.4;
        for (const s2 of [-1, 1]) this.part(r, L.c_mandible, [s2 * 0.9, 0, 1.1], [0, s2 * m, 0], [s2 * 1.4, 1.4, 1.4], mixc(col, [0.9, 0.9, 0.8, 1], 0.4), [2, 0.2, 0, 0]);
        for (const s2 of [-1, 1]) this.glow(r, [s2 * 0.6, 0.6, 1.4], 0.45, [1, 0.3, 0.2, 0.9], 3);
        return true;
      }
      case 'wormseg': {
        if (e.junoFly) return false;
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.c_wormSeg, [0, 0, 0], [PI / 2, t * 2 + (e.idx || 0), 0], 1.35 * (e.scaleK || 1), col, [0, 0.5, 0, 0]);
        return true;
      }
      case 'hunter': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.c_stealth, [0, 0, 0], [0, 0, clamp(-(e.vx || 0) * 0.04, -0.7, 0.7) + Math.sin(t * 2) * 0.1], 2.4, col, [0, 0.2, 0, 0]);
        this.part(r, L.box, [0, 0.25, 0.9], [0, 0, 0], [0.9, 0.06, 0.06], [1, 0.1, 0.1, 1], [1, 2 + tele * 3, 0, 0]);
        return true;
      }
      case 'corruptor': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.blob, [0, 0, 0], [0, 0, roll], [sx, sy, sz], col, [0, 0.7, T.morph || 0, 1]);
        for (let k = 0; k < 4; k++) { const h = hash(k + Math.floor(t * 12) * 0.37); this.part(r, L.box, [(h - 0.5) * 6, (hash(h * 7) - 0.5) * 6, (hash(h * 3) - 0.5) * 3], [h * 3, h * 5, 0], 0.4 + h * 0.6, [...acc.slice(0, 3), 1], [1, 2, 0, 0]); }
        return true;
      }
      case 'shutter': {
        this.base(e.s, e.x, e.y, 6, true);
        const op = e.open || 0;
        this.part(r, L.c_shutterFrame, [0, 0, 0], [0, 0, 0], 1, mixc(col, [0.6, 0.6, 0.65, 1], 0.5), [2, 0.2, 0, 0]);
        for (let k = 0; k < 6; k++) this.part(r, L.c_slat, [0, -0.375 + k * 0.15, 0], [op * 1.25, 0, 0], 1, col, [0, 0.6, 0, 0]);
        if (e.vuln) this.glow(r, [0, 0, -0.3], 0.5, [...acc.slice(0, 3), 0.9], 3);
        return true;
      }
      case 'node': {
        this.base(e.s, e.x, e.y, 1, true);
        this.part(r, L.wireIco, [0, 0, 0], [t * 0.3, t * 0.2, 0], sx, col, [1, 1.6, 0, 0], PASS.LINE);
        this.part(r, L.icoSmooth, [0, 0, 0], [0, 0, 0], sx * (0.35 + kick * 0.1), [1, 0.9, 0.3, 1], [1, 2.5 + kick * 2, 0, 0]);
        this.part(r, L.c_tickRing, [0, 0, 0], [t * 0.8, 0, 0], sx * 1.3, [1, 0.85, 0.3, 1], [1, 1.5, 0, 0]);
        this.part(r, L.c_tickRing, [0, 0, 0], [0, t * 0.6, PI / 2], sx * 1.45, [1, 0.85, 0.3, 1], [1, 1.5, 0, 0]);
        this.glow(r, [0, 0, 0], sx * 1.5, [1, 0.85, 0.3, 0.35 + kick * 0.3]);
        return true;
      }
    }
    return false;
  }
}
