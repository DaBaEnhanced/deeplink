// Draws a dive: camera on the path (leaning with the ship), the layer's palette and props, enemies and bosses, the
// light-body avatar (Drift stage), bullets, bolts, gates, firewalls, streams, corruption, debris and effects.
import { basisMat, perspective, lookAt, mul, clamp, lerp, add, scale, rotBasis, project, mixc, cross, norm } from '../core/math.js';
import { PASS } from '../render/renderer.js';
import { kitPalette, blendPal } from './layers.js';
import { ENEMY_TYPES } from '../sim/enemies.js';
import { BOSS_PARTS } from '../sim/bosses.js';
import { STREAM_R } from '../sim/dive.js';
import { CreatureView } from './creatures.js';

const TYPES = { ...ENEMY_TYPES, ...BOSS_PARTS };
const M = new Float32Array(16);
const W = [0, 0, 0];
// SHIFT polarity colours: A-side cyan, B-side magenta (bullets, gates, ghosts, the avatar's tint)
export const SIDE_COL = [[0.35, 1, 1], [1, 0.3, 0.75]];
const WIPE = 0.32; // seconds for the shift wave to sweep the world
const QP = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
const CAM = QP.get('viewcam'), CAMD = +QP.get('viewdist') || 0, ISO = QP.has('isolate'), CAMA = QP.has('viewang') ? +QP.get('viewang') : 1; // &isolate: no world, just the creatures

export class DiveView {
  constructor(lib, world, kit, sim, opts, worldB, kitB) { this.L = lib; this.world = world; this.kit = kit; this.worldB = worldB || world; this.kitB = kitB || kit; this.side = 0; this.wipeT = -9; this.sim = sim; this.opts = opts; this.fov = 72; this.trail = []; this.vp = null; this.lastT = 0; this.cv = new CreatureView(this); }
  // entity basis at path position s: facing back toward the player
  basis(s) { const p = this.world.path; return [p.right(s), p.up(s), p.fwd(s)]; }
  put(s, x, y, sx, sy, sz, roll = 0, yaw = 0, pitch = 0, face = false) {
    let [r, u, f] = this.basis(s);
    if (face) { f = scale(f, -1); r = scale(r, -1); }
    if (roll || yaw || pitch) [r, u, f] = rotBasis(r, u, f, roll, yaw, pitch);
    return basisMat(M, this.world.path.world(s, x, y, W), r, u, f, sx, sy, sz);
  }
  render(r, F0, time) {
    const sim = this.sim, path = this.world.path, L = this.L, kit = this.kit, P = sim.player;
    // ------------------------------------------------------------------------------------- camera
    const sCam = sim.sCam + P.offset * 0.85;
    const shake = sim.shake * (this.opts.shake ?? 1);
    const cx = P.x * 0.55 + (Math.random() - 0.5) * shake, cy = P.y * 0.55 + 1.7 + (Math.random() - 0.5) * shake;
    let eye = path.world(sCam, cx, cy);
    let look = path.world(sim.ps + 32, P.x * 0.75, P.y * 0.75 + 0.6);
    if (CAM) { // debug: ?viewcam=<boss or enemy type>[&viewdist=m] orbits the camera around the first one alive
      const tg = sim.enemies.find(e => !e.dead && !e.gone && (e.bossType === CAM || e.type === CAM));
      if (tg) { const R = CAMD || (tg.boss ? 70 : 14), a = Math.sin(time * 0.3) * CAMA; eye = path.world(tg.s - R * Math.cos(a), tg.x + R * Math.sin(a), tg.y + R * 0.25); look = path.world(tg.s, tg.x, tg.y); }
    }
    let up = path.up(sCam), fw = norm(sub3(look, eye));
    // kit.roll: a slow sway of the horizon (the Archive drifts like zero gravity), never a full turn: the controls stay
    // screen-aligned only while the horizon stays within ±20° (a continuous roll flipped left and right after a minute)
    const bank = path.bankAt(sCam) * 0.45 + P.bank * 0.3 + (kit.roll ? Math.sin(time * kit.roll * 4) * 0.35 : 0);
    let rt = norm(cross(fw, up)); up = norm(cross(rt, fw));
    const c = Math.cos(bank), s = Math.sin(bank);
    const up2 = add(scale(up, c), scale(rt, s)); const rt2 = norm(cross(fw, up2));
    const targetFov = sim.boosting ? 84 : (sim.player.offV < -8 ? 64 : 72);
    this.fov = lerp(this.fov, targetFov, 0.08);
    const aspect = r.res[0] / r.res[1];
    const proj = perspective(this.fov * Math.PI / 180, aspect, 0.3, 2400);
    const view = lookAt(eye, add(eye, fw), up2);
    const vp = mul(proj, view); this.vp = vp; this.eye = eye;
    // ------------------------------------------------------------------------------------- palette
    const sec = sim.section;
    const post = clamp((sim.t - (sim.breachT >= 0 ? sim.breachT : 1e9)) / 0.5, 0, 1) || (sim.dropSeen ? 1 : 0);
    const under = clamp(-eye[1] / 3, 0, 1);
    const collapse = kit.collapsing ? clamp(sim.t / this.sim.map.length * 1.4 - 0.2, 0, 1) : 0;
    const st = { t: sim.t, s: sim.sCam, cam: eye, camWorldY: eye[1], path, kick: F0.kick, post, under, drop: sec.type === 'drop' || sec.type === 'drop2', dropSeen: sim.dropSeen, sinceDrop: sim.sinceDrop, sinceFirstDrop: sim.firstDropT === null ? -1 : sim.t - sim.firstDropT, collapse, beat: sim.beatIndex + sim.beatPhase };
    // SHIFT: the target world sweeps outward from the camera, the palette follows
    if (sim.side !== this.side) { this.side = sim.side; this.wipeT = time; }
    const wk = clamp((time - this.wipeT) / WIPE, 0, 1);
    const kits = [kit, this.kitB], worlds = [this.world, this.worldB];
    const tgt = this.side, oth = tgt ^ 1;
    const palT = kitPalette(kits[tgt], st);
    let pal = palT;
    if (wk < 1) { const palO = kitPalette(kits[oth], st); const e = wk * wk * (3 - 2 * wk); pal = blendPal(palO, palT, e); pal.skyMode = e < 0.5 ? palO.skyMode : palT.skyMode; }
    const kick = F0.kick;
    const F = {
      viewProj: vp, view, camPos: eye, camRight: rt2, camUp: up2, camFwd: fw, tanHalfFov: Math.tan(this.fov * Math.PI / 360), aspect, time,
      beatPhase: sim.beatPhase, kick, fog: pal.fog, fogDensity: pal.fogDensity, skyTop: pal.skyTop, skyHorizon: pal.skyHorizon, skyBottom: pal.skyBottom,
      horizonGlow: pal.horizonGlow * (1 + kick * 0.3), skyMode: pal.skyMode, skyGrid: pal.skyGrid, sun: pal.sun, palA: pal.palA, palB: pal.palB, palC: pal.palC,
      layer: 0, lightDir: norm(pal.light), ambient: pal.ambient, fractal: pal.fractal, unfold: (this.unfold = lerp(this.unfold ?? pal.unfold, pal.unfold + (st.drop ? 0.35 : 0), 0.004)), collapse: pal.collapse || 0,
      wobble: this.opts.wobble, glow: pal.glow ?? 1, drift: 0,
    };
    // ------------------------------------------------------------------------------------- world
    if (ISO) { /* creature viewer: no world */ } else if (wk >= 1) worlds[tgt].drawProps(r, sCam - 40, sCam + 900, st);
    else {
      const R2 = Math.pow(1100 * Math.pow(wk, 1.5), 2);
      const d2 = pr => { const dx = pr.m[12] - eye[0], dy = pr.m[13] - eye[1], dz = pr.m[14] - eye[2]; return dx * dx + dy * dy + dz * dz; };
      worlds[tgt].drawProps(r, sCam - 40, sCam + 900, st, pr => d2(pr) < R2);
      worlds[oth].drawProps(r, sCam - 40, sCam + 900, st, pr => d2(pr) >= R2);
      // the shift wave: a ring of light racing out along the corridor
      const sw = sCam + 6 + 900 * Math.pow(wk, 1.5), a = 1 - wk;
      this.put(sw, 0, 0, 30 + wk * 40, 30 + wk * 40, 1, time); r.draw(L.wireRing, M, [...SIDE_COL[tgt], a], [1, 3, 0, 0], PASS.ADDLINE);
      this.put(sw, 0, 0, 26 + wk * 36, 26 + wk * 36, 1, -time); r.draw(L.hexLines, M, [1, 1, 1, a * 0.7], [1, 2, 0, 0], PASS.ADDLINE);
    }
    if (!ISO) kits[wk < 0.5 ? oth : tgt].draw(r, L, st);
    const ec = pal.enemy, bc = this.opts.colorBlind !== 'off' ? CB[this.opts.colorBlind] : null, pc = mixc(pal.player, SIDE_COL[sim.side], 0.6);
    // gates
    for (const g of sim.gates) {
      const d = g.s - sim.ps; if (d > 600) continue;
      let col = g.objective ? [1, 0.85, 0.2, 1] : g.refuse ? [1, 0.1, 0.1, 1] : g.exit ? [1, 1, 1, 1] : g.choice ? (g.closed ? [0.3, 0.05, 0.05, 1] : g.choice === 'ascend' ? [0.6, 0.9, 1, 1] : g.choice === 'free' ? [1, 0.6, 0.9, 1] : [1, 1, 0.8, 1]) : [...pal.palC, 1];
      const ghost = g.side !== undefined && g.side !== sim.side && !g.passed;
      if (g.side !== undefined) col = [...SIDE_COL[g.side], 1];
      if (g.passed) col = [1, 1, 1, 0.5];
      const pulse = 1 + kick * 0.15;
      this.put(g.s, g.x, g.y, g.r * pulse, g.r * pulse, 1);
      if (ghost) { r.draw(L.wireRing, M, [col[0], col[1], col[2], 0.55], [1, 1, 0, 0], PASS.ADDLINE); continue; }
      r.draw(L.ring, M, col, [1, g.passed ? 3 : 1.4, 0, 0]);
      if (g.objective || g.choice) { this.put(g.s, g.x, g.y, g.r * 0.7, g.r * 0.7, 1, time); r.draw(L.wireRing, M, col, [1, 1, 0, 0], PASS.ADDLINE); }
    }
    // firewalls
    const B = sim.bounds;
    for (const w of sim.walls) {
      const d = w.s - sim.ps; if (d > 600 || w.broken) continue;
      const open = w.open ?? 1, sz = w.size * (0.6 + open * 0.6), szy = sz * 0.75;
      const W2 = B.w + 10, H2 = B.h + 8, hx = w.hole[0], hy = w.hole[1];
      const ghost = w.side !== undefined && w.side !== sim.side;
      const col = ghost ? SIDE_COL[w.side] : w.laser ? [1, 0.1, 0.1, 1] : w.weak ? [1, 0.6, 0.2, 1] : [1, 0.25, 0.1, 1];
      const mode = w.laser || ghost ? 1 : 5, em = w.laser ? 0.5 : ghost ? 0.25 : 0.8;
      const pass = w.laser || ghost ? PASS.ADD : PASS.OPAQUE;
      const quad = (x0, x1, y0, y1) => { if (x1 - x0 < 0.05 || y1 - y0 < 0.05) return; this.put(w.s, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, w.laser ? 0.2 : 0.6); r.draw(L.box, M, [col[0], col[1], col[2], ghost ? 0.12 : w.laser ? 0.3 : 0.85], [mode, em, 0, 0], pass); };
      quad(-W2, W2, hy + szy, H2); quad(-W2, W2, -H2, hy - szy); quad(-W2, hx - sz, hy - szy, hy + szy); quad(hx + sz, W2, hy - szy, hy + szy);
      this.put(w.s, hx, hy, sz, szy, 1); r.draw(L.wireBox, M, w.side !== undefined ? [...SIDE_COL[w.side], 1] : [1, 1, 0.5, 1], [1, 1.5, 0, 0], PASS.ADDLINE);
    }
    // streams
    for (const st2 of sim.streams) {
      const a = Math.max(st2.s0, sim.ps + 4), b = Math.min(st2.s1, sim.ps + 420);
      const off = (time * 60) % 5;
      // objective streams show their catch radius: a ring every 15 m, brighter while you are inside
      if (st2.objective) for (let s3 = Math.ceil(a / 15) * 15; s3 < b; s3 += 15) {
        const sx = st2.x + Math.sin(s3 * 0.01 + st2.wob) * 4, sy = st2.y + Math.cos(s3 * 0.013 + st2.wob) * 2;
        this.put(s3, sx, sy, STREAM_R, STREAM_R, 1); r.draw(L.wireRing, M, [0.4, 1, 0.6, sim.streamIn ? 0.75 : 0.4], [1, 1, 0, 0], PASS.ADDLINE);
      }
      for (let s2 = a - ((a - off) % 5); s2 < b; s2 += 5) {
        const sx = st2.x + Math.sin(s2 * 0.01 + st2.wob) * 4, sy = st2.y + Math.cos(s2 * 0.013 + st2.wob) * 2;
        this.put(s2, sx, sy, 1.1, 1.1, 1);
        r.draw(L.quad, M, st2.objective ? [0.4, 1, 0.6, 0.5] : st2.secret ? [1, 0.9, 0.5, 0.45] : [0.3, 0.8, 1, 0.45], [1, 0.6, 0, 9], PASS.ADD);
      }
    }
    // corruption zones
    for (const z of sim.zones) {
      if (z.s1 < sim.ps - 10 || z.s0 > sim.ps + 500) continue;
      for (let s2 = Math.max(z.s0, sim.ps - 5); s2 < Math.min(z.s1, sim.ps + 500); s2 += 6) { this.put(s2, z.x, z.y, z.r, z.r, z.r, time); r.draw(L.blob, M, [0.6, 0.1, 0.8, 0.5], [4, 1, 0.5, 1], PASS.ADD); }
    }
    // debris
    for (const d of sim.debris) { this.put(d.s, d.x, d.y, d.size, d.size, d.size, d.rot, d.rot * 0.7); r.draw(L.rock, M, [...pal.palC, 1], [0, 0.5, 0, 0]); }
    // packets and tokens
    for (const p of sim.packets) { this.put(p.s, p.x, p.y, 0.7, 0.7, 0.7, time * 3, time * 2); r.draw(L.octa, M, [0.4, 1, 1, 1], [1, 1.5, 0, 0]); }
    for (const p of sim.tokens) { // gold data packets; the ring shows which world they are in (ghosted in the other one)
      const sc = p.side === undefined ? [1, 0.85, 0.2] : SIDE_COL[p.side], here = p.side === undefined || p.side === sim.side;
      this.put(p.s, p.x, p.y, 1.4, 1.4, 1.4, time * 2, time); r.draw(L.wireOcta, M, here ? [1, 0.85, 0.2, 1] : [...sc, 0.35], [1, here ? 2 : 0.8, 0, 0], PASS.ADDLINE);
      this.put(p.s, p.x, p.y, 2.2, 2.2, 1, time * 3); r.draw(L.wireRing, M, [...sc, here ? 1 : 0.5], [1, 1.5, 0, 0], PASS.ADDLINE);
      if (here) { this.put(p.s, p.x, p.y, 2.5, 2.5, 1); r.draw(L.quad, M, [1, 0.8, 0.3, 0.5], [1, 1, 0, 9], PASS.ADD); } }
    // guide
    if (sim.guide && sim.t < sim.guide.t1) {
      const g = sim.guide, s2 = sim.ps + g.d;
      this.put(s2, g.x, g.y, 2.4, 2.4, 1); r.draw(L.quad, M, g.near ? [1, 1, 1, 1] : [0.6, 0.9, 1, 0.8], [1, 2, 0, 9], PASS.ADD);
      this.put(s2, g.x, g.y, 6.5, 6.5, 1, time); r.draw(L.wireRing, M, g.near ? [0.6, 1, 0.6, 1] : [0.4, 0.6, 1, 0.6], [1, 1, 0, 0], PASS.ADDLINE);
      for (let k = 1; k < 8; k++) { this.put(s2 - k * 3, g.x - Math.cos(g.a - k * 0.05) * k * 0.3, g.y, 1.4 - k * 0.15, 1.4 - k * 0.15, 1); r.draw(L.quad, M, [0.5, 0.8, 1, 0.5], [1, 1, 0, 9], PASS.ADD); }
    }
    // enemies
    for (const e of sim.enemies) {
      if (e.dead || e.gone) continue;
      const d = e.s - sim.ps; if (d > 620 || d < -40) continue;
      if (e.boss) { this.drawBoss(r, e, time, pal, kick); continue; }
      if (e.junoFly) { this.put(e.s, e.x, e.y, 2.2, 2.2, 2.2, Math.sin(time) * 0.2, 0, -1.3); r.draw(L.juno, M, [0.9, 0.15, 0.6, 1], [1, 0.8, 0, 0], PASS.LINE); continue; }
      const T = TYPES[e.type]; if (!T) continue;
      let mesh = L[T.mesh] || L.octa; if (T.mesh === 'glyph') mesh = L['glyph' + (Math.floor(e.seed * 10) % 10)];
      const sc = T.scale; let k = e.scaleK || 1;
      const spin = (T.spin || 0) * (time - e.t0);
      let col = e.ally ? [0.3, 1, 0.5, 1] : [...ec, 1];
      if (e.type === 'node') col = [1, 0.85, 0.2, 1];
      if (e.type === 'hunter') col = [0.05, 0.05, 0.06, 1];
      if (e.type === 'echo_diver') col = [0.7, 0.8, 1, 0.6];
      if (e.flashT > 0) { col = [1, 1, 1, 1]; e.flashT -= 1 / 60; }
      const mode = T.chrome ? 2 : T.lines ? 1 : (e.type === 'hunter' ? 0 : 0);
      const em = T.lines ? 1.6 : (e.type === 'hunter' ? 0.2 : 0.7);
      let roll = spin, yaw = 0, pitch = 0, face = true, sx = sc[0] * k, sy = sc[1] * k, sz = sc[2] * k;
      if (e.type === 'tracer') { face = true; pitch = 0; roll = time * 6; }
      if (e.type === 'shutter') { sx = sc[0] * (1 - (e.open || 0) * 0.5); roll = 0; }
      if (e.type === 'gatekeeper') { roll = 0; }
      if (e.type === 'scanner') { roll = time * 0.5; }
      if (e.type === 'agent' || e.type === 'echo_diver') { roll = 0; pitch = e.type === 'echo_diver' ? -1.5 : 0; }
      if (e.type === 'bloom' || e.type === 'seednode') { const gr = 0.6 + (e.grow || 0.5) * 0.6 + kick * 0.2; sx *= gr; sy *= gr; sz *= gr; roll = time * 0.6; }
      if (e.type === 'wardeneye') { sy = sc[1] * Math.max(0.08, e.open || 0); roll = 0; }
      this.put(e.s, e.x, e.y, sx, sy, sz, roll, yaw, pitch, face);
      const pass = T.lines ? PASS.LINE : T.glass ? PASS.ADD : PASS.OPAQUE;
      if (!sim.sameSide(e)) { // a ghost from the other world: visible, untouchable until you shift
        const gc = [...SIDE_COL[e.side], 0.28];
        if (e.type === 'gatekeeper') r.draw(e.mouth > 0.4 ? L.faceOpen : L.face, M, gc, [4, 0.4, 0, 0], PASS.ADD);
        else r.draw(mesh, M, gc, [T.lines ? 1 : 4, 0.5, T.morph || 0, T.morph ? 1 : 0], T.lines ? PASS.ADDLINE : PASS.ADD);
        continue;
      }
      if (e.type === 'gatekeeper') { r.draw(e.mouth > 0.4 ? L.faceOpen : L.face, M, col, [2, 0.3, 0, 0]); }
      else if (!this.cv.enemy(r, e, sim, pal, time, kick, T, col, sx, sy, sz, roll)) { this.put(e.s, e.x, e.y, sx, sy, sz, roll, yaw, pitch, face); r.draw(mesh, M, col, [T.glass ? 4 : mode, em, T.morph || 0, T.morph ? 1 : 0], pass); }
      if (e.type === 'scanner' && e.beamOn) { // red sweeping beam across the corridor
        this.put(e.s, e.beam, e.y, 0.25, B.h * 3, 0.25); r.draw(L.box, M, [1, 0.05, 0.05, 1], [1, 3, 0, 0], PASS.ADD);
      }
      if (e.locked) { this.put(e.s, e.x, e.y, (T.r + 1.2), (T.r + 1.2), 1, time * 4); r.draw(L.wireRing, M, [1, 0.2, 0.2, 1], [1, 2, 0, 0], PASS.ADDLINE); }
    }
    // telegraphs (Foresight / boss lock lines): thin beams from the attacker toward you
    for (const g of sim.telegraphs) {
      const e = g.e; if (e.dead || e.gone) continue;
      const a = path.world(e.s, e.x, e.y), b = path.world(sim.ps, sim.px, sim.py);
      const k = (sim.t - g.t) / g.dur;
      beamBetween(M, a, b, 0.06);
      r.draw(L.beam, M, [1, 0.2, 0.2, (g.strong ? 0.8 : 0.5) * (1 - k)], [1, 2, 0, 0], PASS.ADD);
    }
    // enemy bullets: a solid disc with a dark rim and a small white core (opaque: a dense pattern stays readable
    // instead of summing into a white sheet), plus a faint halo that gets fainter the more bullets are on screen
    const nb = sim.ebullets.length, halo = clamp(1.1 / Math.sqrt(Math.max(1, nb / 25)), 0.25, 1);
    for (const b of sim.ebullets) {
      const sz = b.r * (b.kind === 'shot' ? 1.6 : 2) * (1 + kick * 0.08);
      if (!b.ally && b.kind !== 'petal' && b.side === sim.side) { // your world's shots: hollow, absorbed on contact
        this.put(b.s, b.x, b.y, sz, sz, 1); r.draw(L.quad, M, [...SIDE_COL[b.side], 0.22 * halo], [1, 0.8, 0, 9], PASS.ADD);
        this.put(b.s, b.x, b.y, sz * 0.8, sz * 0.8, 1, time * 4); r.draw(L.wireRing, M, [...SIDE_COL[b.side], 0.9], [1, 1.2, 0, 0], PASS.ADDLINE);
        continue;
      }
      const hot = b.side !== undefined ? (bc || SIDE_COL[b.side]) : (bc || pal.bullet);
      const col = b.ally ? [0.3, 1, 0.5, 1] : b.kind === 'petal' ? [1, 0.7, 0.9, 1] : b.kind === 'tendril' ? [...mixc(ec, hot, 0.5), 1] : [...hot, 1];
      const dr = sz * 0.5;
      this.put(b.s + 0.06, b.x, b.y, dr * 1.28, dr * 1.28, 1, 0, 0, 0, true); r.draw(L.c_disc, M, [0.02, 0.02, 0.04, 1], [1, 0, 0, 0]);
      this.put(b.s, b.x, b.y, dr, dr, 1, 0, 0, 0, true); r.draw(L.c_disc, M, col, [1, 1.05, 0, 0]);
      this.put(b.s - 0.06, b.x, b.y, dr * 0.42, dr * 0.42, 1, 0, 0, 0, true); r.draw(L.c_disc, M, [1, 1, 1, 1], [1, 1.1, 0, 0]);
      this.put(b.s, b.x, b.y, sz * 1.15, sz * 1.15, 1); r.draw(L.quad, M, [col[0], col[1], col[2], 0.3 * halo], [1, 0.9, 0, 9], PASS.ADD);
    }
    // player shots and bolts
    for (const b of sim.shots) { this.put(b.s, b.x, b.y, 0.16, 0.16, 3.2); r.draw(L.box, M, [...SIDE_COL[b.side || 0], 0.7], [1, 1.6, 0, 0], PASS.ADD); }
    for (const b of sim.bolts) { if (sim.t < b.launch) continue; this.put(b.s, b.x, b.y, 1.1, 1.1, 1); r.draw(L.quad, M, [1, 0.4, 0.3, 0.8], [1, 1.8, 0, 9], PASS.ADD); this.put(b.s, b.x, b.y, 0.5, 0.5, 0.5, time * 9); r.draw(L.octa, M, [1, 1, 1, 1], [1, 2, 0, 0]); }
    // effects
    for (const f of sim.fx) {
      const k = f.t / f.life;
      if (f.kind === 'spark') { this.put(f.s, f.x, f.y, f.size * (1 - k), f.size * (1 - k), 1); r.draw(L.quad, M, f.col ? [...f.col, 0.8 * (1 - k)] : [1, 0.8, 0.4, 0.8 * (1 - k)], [1, 1.7, 0, 9], PASS.ADD); }
      else { const sz = f.size * (0.3 + k * 1.2); this.put(f.s, f.x, f.y, sz, sz, sz, k * 3); r.draw(L.wireIco, M, [1, 0.9, 0.6, 1 - k], [1, 2, 0, 0], PASS.ADDLINE); this.put(f.s, f.x, f.y, sz * 0.7, sz * 0.7, 1); r.draw(L.quad, M, [1, 0.6, 0.3, (1 - k) * 0.45], [1, 1, 0, 9], PASS.ADD); }
    }
    // the avatar: a body of light (stage by Drift), trails, core
    this.drawAvatar(r, sim, time, pc, F0.drift || 0);
    // the Core: the white sun ahead
    F.collapse = kits[wk < 0.5 ? oth : tgt].collapsing ? collapse : 0;   // the white sun / the black hole (sky)
    return F;
  }
  drawAvatar(r, sim, time, pc, drift) {
    const P = sim.player, L = this.L;
    const stage = drift >= 66 ? 2 : drift >= 33 ? 1 : 0;
    const blink = P.inv > 0 && Math.floor(time * 20) % 2 === 0;
    const roll = P.bank * 1.2 + P.roll;
    const pitch = clamp(-P.vy / 60, -0.4, 0.4);
    this.put(sim.ps, P.x, P.y, 1.5, 1.5, 1.5, roll, P.vx / 80, pitch);
    const avCol = sim.overdrive ? [1, 1, 1, 1] : [...pc, 1];
    if (!blink) r.draw(L['avatar' + stage], M, avCol, [1, 1.6 + (sim.overdrive ? 1.5 : 0), 0, 0], PASS.LINE);
    this.put(sim.ps + 0.6, P.x, P.y, 0.32 + 0.06 * Math.sin(time * 10), 0.32 + 0.06 * Math.sin(time * 10), 1);
    r.draw(L.quad, M, [...pc, 0.9], [1, 1.2, 0, 9], PASS.ADD);
    // trails of light
    this.trail.unshift([sim.ps, P.x, P.y]); if (this.trail.length > 26) this.trail.pop();
    for (let i = 2; i < this.trail.length; i += 2) {
      const [, x0, y0] = this.trail[i]; const k = 1 - i / this.trail.length;
      for (const side of [-1, 1]) { this.put(sim.ps - 0.8 - i * 0.22, x0 + side * 0.55, y0 - 0.1, 0.12 * k + 0.03, 0.12 * k + 0.03, 1); r.draw(L.quad, M, [...pc, k * 0.7], [1, 1, 0, 9], PASS.ADD); }
    }
    if (sim.echo && sim.t < sim.echo.until) { this.put(sim.ps, -P.x, P.y, 1.1, 1.1, 1.1, -roll); r.draw(L['avatar' + stage], M, [0.6, 0.6, 1, 0.6], [1, 1, 0, 0], PASS.ADDLINE); }
    if (sim.t < sim.shiftGuard || sim.t - sim.absorbT < 0.12) { this.put(sim.ps, P.x, P.y, 2.4, 2.4, 1, time * 6); r.draw(L.hexLines, M, [...SIDE_COL[sim.side], 0.9], [1, 2, 0, 0], PASS.ADDLINE); }
    if (sim.phase) { this.put(sim.ps, P.x, P.y, 2.2, 2.2, 2.2, time * 3); r.draw(L.wireIco, M, [0.5, 1, 1, 0.6], [1, 1, 0, 0], PASS.ADDLINE); }
  }
  drawBoss(r, e, time, pal, kick) {
    if (e.polar && e.polarity !== undefined) { // SHIFT: the core's colour, a ring that flickers on the beat before it flips
      const sim = this.sim, toFlip = 8 - ((sim.beatIndex % 8) + sim.beatPhase), warn = toFlip < 1 ? (Math.floor(time * 16) % 2) : 0;
      const col = SIDE_COL[warn ? e.polarity ^ 1 : e.polarity], R = (e.r || 7) * 1.9 + kick * 0.6, fl = clamp((time - (e.flipT ?? -9)) / 0.3, 0, 1);
      const zs = e.bossType === 'warden' ? e.s - 16 : e.bossType === 'deep' ? e.s - 55 : e.s;
      this.put(zs, e.x, e.y, R * (1.4 - 0.4 * fl), R * (1.4 - 0.4 * fl), 1, time * 0.8); r.draw(this.L.c_tickRing, M, [...col, 1], [1, 2.2, 0, 0]);
      this.put(zs, e.x, e.y, R * 1.08, R * 1.08, 1, -time * 0.5); r.draw(this.L.wireRing, M, [...col, 0.6], [1, 1.4, 0, 0], PASS.ADDLINE);
    }
    if (e.bossType !== 'juno') return this.cv.boss(r, e, this.sim, pal, time, kick);
    const L = this.L, t = time;
    switch (e.bossType) {
      case 'juno': {
        this.put(e.s, e.x, e.y - 3, 5, 5, 5, Math.sin(t) * 0.15, 0, -1.2);
        r.draw(L.juno, M, e.near ? [1, 0.1, 0.6, 1] : [0.8, 0.1, 0.5, 1], [1, 0.8, 0, 0], PASS.LINE);
        this.put(e.s, e.x, e.y, 7, 7, 1); r.draw(L.quad, M, [1, 0.7, 0.9, e.near ? 0.5 : 0.25], [1, 1, 0, 9], PASS.ADD);
        this.put(e.s, e.x, e.y, 7, 7, 1, t); r.draw(L.wireRing, M, e.near ? [1, 1, 1, 1] : [1, 0.5, 0.8, 0.8], [1, 1, 0, 0], PASS.ADDLINE);
        break;
      }
    }
  }
  project(s, x, y) { if (!this.vp) return null; return project(this.vp, this.world.path.world(s, x, y)); }
}
const CB = { protan: [1, 0.85, 0.1], deutan: [1, 0.85, 0.1], tritan: [1, 0.2, 0.6] };
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function beamBetween(m, a, b, w) {
  const f = sub3(b, a), l = Math.hypot(f[0], f[1], f[2]) || 1; const fz = [f[0] / l, f[1] / l, f[2] / l];
  let r = cross(fz, [0, 1, 0]); if (Math.hypot(...r) < 0.01) r = [1, 0, 0]; r = norm(r); const u = cross(r, fz);
  basisMat(m, a, r, u, fz, w, w, l);
}
function hsv(h) { const f = n => { const k = (n + h * 6) % 6; return 1 - Math.max(0, Math.min(k, 4 - k, 1)) * 0.7; }; return [f(5), f(3), f(1), 1]; }
export { mixc };
