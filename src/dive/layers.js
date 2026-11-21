// Layer kits (bible §11.1, §16.2, §19.2): palette (before / after the first Breach), path style, corridor bounds,
// enemy pool, the set dressing placed along the path (near, mid and far bands, all around the corridor), and the
// per-frame dynamic geometry (grounds, seas, traffic, embers, petals, conduits).
// Every layer has its own architecture: a wireframe test room, a tower city, a chrome sea with colonnades, a lava
// canyon of falling code, a library of endless shelves, a fractal crystal field, an organic garden, a hexagonal
// military tunnel between spiked fortresses, and a vortex of every layer's debris spiralling into a white sun.
import { hex, mixc, lerp, clamp, basisMat, fract, TAU } from '../core/math.js';
import { rng } from '../core/rng.js';
import { PATH_STYLES } from './path.js';
import { PASS } from '../render/renderer.js';

const P = (o) => {
  const d = { skyTop: '#000000', skyHorizon: '#000000', skyBottom: '#000000', horizonGlow: 0, skyMode: 0, skyGrid: 0, sun: 0, fog: '#000000', fogDensity: 0.004,
    palA: '#202020', palB: '#101010', palC: '#ffffff', light: [0.3, 0.8, 0.4], ambient: 0.35, glow: 1, fractal: 0, unfold: 0, collapse: 0, enemy: '#ff3060', bullet: '#ffe040', player: '#80ffff' };
  const r = { ...d, ...o };
  for (const k of ['skyTop', 'skyHorizon', 'skyBottom', 'fog', 'palA', 'palB', 'palC', 'enemy', 'bullet', 'player']) if (typeof r[k] === 'string') r[k] = hex(r[k]);
  return r;
};
export function blendPal(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = {};
  for (const key in a) {
    const x = a[key], y = b[key];
    if (Array.isArray(x)) o[key] = mixc(x, y, k); else if (typeof x === 'number') o[key] = lerp(x, y, k); else o[key] = k < 0.5 ? x : y;
  }
  return o;
}
const tmp = new Float32Array(16);
// draw a big ground mesh following the camera (snapped so line grids don't crawl)
function ground(r, mesh, cam, y, size, snap, color, p, pass) {
  const x = Math.round(cam[0] / snap) * snap, z = Math.round(cam[2] / snap) * snap;
  basisMat(tmp, [x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], size, 1, size);
  r.draw(mesh, tmp, color, p, pass);
}
// ---------------------------------------------------------------------------------------------- placement helpers
const every = (w, R, step, f, start = 15) => { for (let s = start; s < w.path.n - 80; s += step * (0.6 + R() * 0.8)) f(s); };
const around = (R, r0, r1, yMin = -1e9, yMax = 1e9) => { for (let k = 0; k < 8; k++) { const a = R() * TAU, r = R.range(r0, r1); const p = [Math.cos(a) * r, Math.sin(a) * r]; if (p[1] >= yMin && p[1] <= yMax) return p; } return [R.sign() * r0, 0]; };
const side = (R, a, b) => R.sign() * R.range(a, b);
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ang = (R) => R() * TAU;
const pathY = (w, s) => w.path.pos(s)[1];

export const KITS = {
  // ------------------------------------------------------------------------------------------- 0 Calibration
  calibration: {
    name: 'Calibration', path: PATH_STYLES.calibration, bounds: { w: 14, h: 8 },
    pre: P({ skyTop: '#e8eef8', skyHorizon: '#f4f6fa', skyBottom: '#dde6f2', fog: '#eef2f8', fogDensity: 0.0026, palA: '#e0f0ff', palB: '#ffffff', palC: '#0088d0', ambient: 0.75, glow: 0.12, enemy: '#b0003c', bullet: '#e00040', player: '#003c9c' }),
    post: P({ skyTop: '#000818', skyHorizon: '#0a3a80', skyBottom: '#000410', horizonGlow: 0.6, skyGrid: 0.6, fog: '#02102a', fogDensity: 0.0045, palA: '#001030', palB: '#000818', palC: '#20e0ff', ambient: 0.4, enemy: '#ff4080', bullet: '#ffe040' }),
    enemies: ['pinger', 'tracer', 'splitter'],
    build(w, R) {
      const L = w.lib, cyan = [0.05, 0.55, 0.95, 1], wires = [L.wireBox, L.wireOcta, L.wireIco, L.wireRing];
      // near: floating test primitives, slowly turning
      every(w, R, 5, s => { for (let k = 0; k < 2; k++) { const [x, y] = around(R, 20, 55, -9, 30); w.prop(s, x, y, pick(R, wires), { scale: [R.range(1.5, 5)], yaw: ang(R), roll: ang(R), color: cyan, p: [1, 0.6, 0, 0], pass: PASS.LINE, anim: spin, data: { spin: R.range(-0.6, 0.6), ph: ang(R) } }); } });
      // calibration hoops framing the corridor, rulers along it
      every(w, R, 150, s => { w.prop(s, 0, 0, L.wireRing, { frame: true, scale: [24, 24, 1], color: cyan, p: [1, 1, 0, 0], pass: PASS.LINE, anim: pulse }); w.prop(s, 0, 0, L.wireRing, { frame: true, scale: [26, 26, 1], color: cyan, p: [1, 0.4, 0, 0], pass: PASS.ADDLINE }); });
      every(w, R, 120, s => { for (const sx of [-1, 1]) w.prop(s, sx * 22, -7, L.ruler, { frame: true, scale: [60, 60, 120], color: cyan, p: [1, 0.8, 0, 0], pass: PASS.LINE }); });
      // light pillars floor to ceiling, room walls of grid, huge far frames
      every(w, R, 30, s => w.prop(s, side(R, 35, 160), 0, L.cyl, { ground: 0, flat: true, scale: [0.5, 46, 0.5], color: [0.2, 0.9, 1, 1], p: [1, 0.6, 0, 0], anim: pulse }));
      every(w, R, 70, s => w.prop(s, side(R, 70, 140), 0, L.grid8, { ground: 24, flat: true, roll: Math.PI / 2, scale: [48, 1, 48], color: cyan, p: [1, 0.5, 0, 0], pass: PASS.LINE }));
      every(w, R, 45, s => { const [x, y] = around(R, 120, 320, -20, 160); w.prop(s, x, y, pick(R, wires), { scale: [R.range(18, 50)], yaw: ang(R), roll: ang(R), color: [0.1, 0.5, 0.9, 1], p: [1, 0.4, 0, 0], pass: PASS.LINE, anim: spin, data: { spin: R.range(-0.15, 0.15) } }); });
    },
    draw(r, L, st) {
      const c = st.post ? [0.1, 0.9, 1, 1] : [0, 0.45, 0.85, 1];
      ground(r, L.grid, st.cam, 0, 480, 20, c, [1, 0.6 + st.kick * 0.8, 0, 0], PASS.LINE);
      ground(r, L.grid, st.cam, 46, 480, 20, [c[0], c[1], c[2], 0.5], [1, 0.3, 0, 0], PASS.ADDLINE);
    },
  },
  // ------------------------------------------------------------------------------------------- 1 Grid City
  grid_city: {
    name: 'Grid City', path: PATH_STYLES.grid_city, bounds: { w: 16, h: 9 },
    pre: P({ skyTop: '#000000', skyHorizon: '#02123a', skyBottom: '#000000', horizonGlow: 0.5, skyGrid: 0.35, fog: '#010616', fogDensity: 0.0035, palA: '#03081c', palB: '#000208', palC: '#2a7aff', ambient: 0.35, enemy: '#ff30c0', bullet: '#ffffff' }),
    post: P({ skyTop: '#000000', skyHorizon: '#0a2a8a', skyBottom: '#000000', horizonGlow: 0.9, skyGrid: 0.8, fog: '#020a2a', fogDensity: 0.0028, palA: '#040c2c', palB: '#000210', palC: '#4aa8ff', ambient: 0.4, enemy: '#ff30c0', bullet: '#ffffff' }),
    enemies: ['pinger', 'tracer', 'splitter', 'shutter', 'scanner'],
    build(w, R) {
      const L = w.lib;
      const tower = (s, x, h, wd, rows) => {
        const col = R() < 0.15 ? [0.5, 0.2, 0.6, 1] : [0.25, 0.35, 0.6, 1];
        w.prop(s, x, 0, L.tower, { ground: 0, flat: true, scale: [wd, h, wd * R.range(0.7, 1.3)], color: col, p: [7, 1.4, 1, 4], anim: rise, data: { k: R() } });
        if (rows < 2 && R() < 0.35) w.prop(s, x, 0, L.mast, { ground: 0, flat: true, scale: [wd * 2, h + R.range(12, 40), wd * 2], color: [0.6, 0.8, 1, 1], p: [1, 0.8, 1, 4], pass: PASS.LINE, anim: rise, data: { k: R() } });
        if (rows < 2 && R() < 0.25) w.prop(s, x, 0, L.box, { ground: h * 0.6, flat: true, scale: [wd + 1.5, 1.2, wd + 1.5], color: [1, 0.2, 0.9, 1], p: [1, 1.5, 0, 0], anim: rise, data: { k: R(), ring: h * 0.6 } });
      };
      every(w, R, 10, s => { for (const sd of [-1, 1]) if (R() < 0.8) tower(s, sd * R.range(26, 55), R.range(30, 140), R.range(8, 18), 0); });
      every(w, R, 13, s => { for (const sd of [-1, 1]) tower(s, sd * R.range(58, 140), R.range(60, 230), R.range(12, 26), 1); });
      every(w, R, 18, s => { for (const sd of [-1, 1]) tower(s, sd * R.range(150, 380), R.range(90, 320), R.range(18, 40), 2); });
      every(w, R, 28, s => { for (const sd of [-1, 1]) w.prop(s, sd * R.range(450, 800), 0, L.tower, { ground: 0, flat: true, scale: [R.range(40, 90), R.range(120, 380), 40], color: [0.12, 0.18, 0.35, 1], p: [7, 0.8, 1, 0] }); });
      // low blocks at street level, billboards beside the corridor, skybridges overhead
      every(w, R, 4, s => w.prop(s, side(R, 18, 70), 0, L.tower, { ground: 0, flat: true, scale: [R.range(3, 9), R.range(2, 14), R.range(3, 9)], color: [0.2, 0.28, 0.5, 1], p: [7, 1, 1, 0] }));
      every(w, R, 26, s => { const x = side(R, 22, 34), y = R.range(-4, 16); const c = pick(R, [[1, 0.2, 0.8, 1], [0.2, 0.9, 1, 1], [1, 0.85, 0.2, 1]]); w.prop(s, x, y, L.quad, { scale: [R.range(4, 8), R.range(2, 3.5), 1], color: c, p: [1, 1.2, 0, 0], anim: flicker, data: { k: R() } }); w.prop(s, x, y - 6, L.cyl, { scale: [0.2, 6, 0.2], color: [0.3, 0.3, 0.4, 1], p: [0, 0, 0, 0] }); });
      every(w, R, 55, s => w.prop(s, 0, 0, L.box, { ground: pathY(w, s) + R.range(20, 42), flat: true, yaw: Math.PI / 2 + R.range(-0.2, 0.2), scale: [4, 3, 120], color: [0.25, 0.35, 0.6, 1], p: [7, 1.2, 0, 0] }));
    },
    draw(r, L, st) {
      ground(r, L.plane, st.cam, 0, 1400, 50, [1, 1, 1, 1], [3, 1.2, 18, 0]);
      const t = st.t;
      for (let lane = 0; lane < 14; lane++) {
        const off = (lane - 6.5) * 22 + (lane % 2 ? 6 : -6), y = 4 + (lane % 4) * 14, sp = (lane % 2 ? 1 : -1) * (40 + lane * 7);
        for (let k = 0; k < 12; k++) {
          const s = st.s + fract((k * 37.1 + t * sp / 50 + lane * 0.3) / 12) * 700 - 80;
          const p = st.path.world(s, off, 0); p[1] = y;
          basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 1.2, 0.5, 2.5);
          r.draw(L.box, tmp, lane % 3 ? [1, 0.2, 0.9, 1] : [0.2, 0.9, 1, 1], [1, 1.1 + st.kick * 0.5, 0, 0]);
        }
      }
    },
  },
  // ------------------------------------------------------------------------------------------- 2 Chrome Sea
  chrome_sea: {
    name: 'Chrome Sea', path: PATH_STYLES.chrome_sea, bounds: { w: 16, h: 7 },
    pre: P({ skyTop: '#2a0a5a', skyHorizon: '#ff7a30', skyBottom: '#ff9a50', horizonGlow: 0.8, skyMode: 3, sun: 3, fog: '#c06070', fogDensity: 0.0022, palA: '#ffffff', palB: '#101018', palC: '#ffc0e0', light: [0, 0.18, 1], ambient: 0.5, enemy: '#40ffe0', bullet: '#ff2080' }),
    post: P({ skyTop: '#1a0440', skyHorizon: '#ff5a50', skyBottom: '#ff8a40', horizonGlow: 1.1, skyMode: 3, sun: 4, fog: '#a04070', fogDensity: 0.002, palA: '#ffffff', palB: '#08040c', palC: '#ffd0f0', light: [0, 0.14, 1], ambient: 0.5, enemy: '#40ffe0', bullet: '#ff2080' }),
    under: P({ skyTop: '#000818', skyHorizon: '#003060', skyBottom: '#000010', fog: '#002040', fogDensity: 0.012, palA: '#80a0c0', palB: '#001020', palC: '#40c0ff', ambient: 0.3, enemy: '#40ffe0', bullet: '#ff2080' }),
    enemies: ['pinger', 'tracer', 'mirror_kite', 'worm', 'splitter'],
    build(w, R) {
      const L = w.lib;
      const pyr = (s, x, h, col) => { w.prop(s, x, 0, L.pyramid, { ground: 0, flat: true, yaw: ang(R), scale: [h * 0.7, h, h * 0.7], color: col, p: [2, 0, 0, 0] }); w.prop(s, x, 0, L.pyramid, { ground: 0, flat: true, scale: [h * 0.7, -h, h * 0.7], color: [col[0] * 0.7, col[1] * 0.7, col[2] * 0.8, 1], p: [2, 0, 0, 0] }); };
      every(w, R, 14, s => pyr(s, side(R, 28, 90), R.range(8, 35), [0.9, 0.9, 1, 1]));
      every(w, R, 22, s => pyr(s, side(R, 90, 320), R.range(30, 110), [0.85, 0.8, 1, 1]));
      every(w, R, 40, s => w.prop(s, side(R, 500, 900), 0, L.pyramid, { ground: -5, flat: true, scale: [R.range(150, 300), R.range(80, 220), 150], color: [0.25, 0.08, 0.3, 1], p: [0, 0, 0, 0] }));
      // floating chrome spheres bobbing over the water
      every(w, R, 9, s => w.prop(s, side(R, 20, 140), 0, L.icoSmooth, { ground: R.range(4, 45), flat: true, scale: [R.range(1.5, 7)], color: [1, 0.95, 1, 1], p: [2, 0, 0, 0], anim: bob, data: { k: R(), base: null } }));
      // colonnades of chrome pillars with lintels
      every(w, R, 240, s => { const sd = R.sign(), x = sd * R.range(34, 60); for (let i = 0; i < 9; i++) { w.prop(s + i * 12, x, 0, L.cyl16, { ground: -2, flat: true, scale: [2.2, 34, 2.2], color: [0.95, 0.95, 1, 1], p: [2, 0, 0, 0] }); } w.prop(s + 48, x, 0, L.box, { ground: 33, flat: true, scale: [7, 3, 110], yaw: 0, color: [0.95, 0.9, 1, 1], p: [2, 0, 0, 0] }); }, 120);
      // giant rings standing half in the water
      every(w, R, 160, s => w.prop(s, side(R, 50, 140), 0, L.ring, { ground: 0, flat: true, yaw: R.range(-0.6, 0.6), scale: [R.range(25, 55), R.range(25, 55), 2], color: [1, 0.9, 1, 1], p: [2, 0, 0, 0] }));
      // kelp strands of light below the surface
      every(w, R, 5, s => w.prop(s, side(R, 5, 90), 0, R() < 0.5 ? L.strand : L.strand2, { ground: -48, flat: true, yaw: ang(R), scale: [8, R.range(20, 46), 8], color: [0.3, 1, 0.9, 1], p: [1, 1, 0, 0], pass: PASS.ADDLINE }));
    },
    draw(r, L, st) {
      ground(r, L.sea, st.cam, 0, 900, 900 / 48, [1, 1, 1, 1], [6, 0, st.under ? 0.6 : 1, 3]);
    },
  },
  // ------------------------------------------------------------------------------------------- 3 Firewall Canyons
  firewall: {
    name: 'Firewall Canyons', path: PATH_STYLES.firewall, bounds: { w: 13, h: 9 },
    pre: P({ skyTop: '#100000', skyHorizon: '#601000', skyBottom: '#200000', horizonGlow: 0.6, fog: '#300804', fogDensity: 0.004, palA: '#3a0a04', palB: '#1a0402', palC: '#ffd020', light: [0.4, 0.7, -0.3], ambient: 0.3, enemy: '#ffffff', bullet: '#40e0ff' }),
    post: P({ skyTop: '#200000', skyHorizon: '#ff3000', skyBottom: '#300000', horizonGlow: 1, fog: '#501004', fogDensity: 0.0036, palA: '#5a1004', palB: '#200402', palC: '#ffe040', light: [0.4, 0.7, -0.3], ambient: 0.35, enemy: '#ffffff', bullet: '#40e0ff' }),
    enemies: ['shutter', 'scanner', 'pinger', 'glyph_swarm', 'gatekeeper', 'tracer'],
    build(w, R) {
      const L = w.lib, rock = [0.75, 0.3, 0.14, 1];
      // the canyon walls (falling code on rock), with boulders jutting out
      for (let s = 0; s < w.path.n - 40; s += 9) for (const sd of [-1, 1]) w.prop(s, sd * R.range(20, 30), 0, L.rockSlab, { frame: true, ground: -8, scale: [R.range(6, 14) * sd, R.range(70, 120), 12], color: rock, p: [5, 0.4, 0, 0] });
      every(w, R, 6, s => w.prop(s, side(R, 17, 24), R.range(-6, 34), L.rock, { scale: [R.range(2, 6), R.range(2, 5), R.range(2, 6)], yaw: ang(R), roll: ang(R), color: [0.55, 0.22, 0.1, 1], p: [0, 0, 0, 0] }));
      // rock arches high over the canyon, firewall frames around the corridor
      every(w, R, 110, s => w.prop(s, 0, -12, L.arch, { frame: true, scale: [R.range(26, 32), R.range(30, 46), 6], color: rock, p: [5, 0.3, 0, 0] }));
      every(w, R, 85, s => { w.prop(s, 0, 0, L.wireBox, { frame: true, scale: [34, 24, 2], color: [1, 0.25, 0.05, 1], p: [1, 1.4, 0, 0], pass: PASS.LINE, anim: pulse }); w.prop(s, 0, 0, L.wireBox, { frame: true, scale: [35, 25, 0.5], color: [1, 0.5, 0.1, 0.7], p: [1, 0.6, 0, 0], pass: PASS.ADDLINE }); });
      // spires and mesas beyond the walls
      every(w, R, 16, s => { const h = R.range(70, 200); w.prop(s, side(R, 45, 260), 0, R() < 0.6 ? L.cone : L.cyl, { ground: -10, flat: true, yaw: ang(R), scale: [R.range(8, 22), h, R.range(8, 22)], color: [0.6, 0.2, 0.08, 1], p: [5, 0.25, 0, 0] }); });
      every(w, R, 40, s => w.prop(s, side(R, 120, 420), 0, L.tower, { ground: -10, flat: true, yaw: ang(R), scale: [R.range(60, 140), R.range(60, 130), R.range(60, 140)], color: [0.5, 0.15, 0.06, 1], p: [5, 0.2, 0, 0] }));
      // the lava river on the canyon floor
      for (let s = 0; s < w.path.n - 40; s += 10) w.prop(s, 0, 0, L.box, { frame: true, ground: -1, scale: [11 + Math.sin(s * 0.03) * 3, 0.6, 10.5], color: [1, 0.35, 0.05, 1], p: [1, 1.2, 0, 0], anim: lava, data: { k: s } });
    },
    draw(r, L, st) {
      ground(r, L.plane, st.cam, -2, 1200, 40, [0.6, 0.6, 0.6, 1], [3, 0.4, 10, 0]);
      // embers rising from the lava
      for (let k = 0; k < 70; k++) {
        const s = st.s + fract(k * 0.618) * 260, x = Math.sin(k * 12.9) * 14, h = fract(k * 0.37 + st.t * (0.15 + (k % 5) * 0.03)) * 60;
        const p = st.path.world(s, x, 0); p[1] = h; basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.18 + (k % 3) * 0.08);
        r.draw(L.quad, tmp, [1, 0.5, 0.1, 1 - h / 60], [1, 1.5, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- 4 The Archive
  archive: {
    name: 'The Archive', path: PATH_STYLES.archive, bounds: { w: 15, h: 10 }, roll: 0.06,
    pre: P({ skyTop: '#140a04', skyHorizon: '#5a3a14', skyBottom: '#0a0402', horizonGlow: 0.4, skyMode: 5, fog: '#2a1a0a', fogDensity: 0.004, palA: '#c0a060', palB: '#402a10', palC: '#fff0c0', light: [0.2, 1, 0.3], ambient: 0.45, enemy: '#ffffff', bullet: '#ff6020' }),
    post: P({ skyTop: '#1a0e06', skyHorizon: '#8a6020', skyBottom: '#0a0402', horizonGlow: 0.7, skyMode: 5, fog: '#3a2410', fogDensity: 0.0034, palA: '#e0c070', palB: '#503010', palC: '#ffffff', light: [0.2, 1, 0.3], ambient: 0.5, enemy: '#ffffff', bullet: '#ff6020' }),
    enemies: ['glyph_swarm', 'mirror_kite', 'echo_diver', 'splitter', 'worm'],
    build(w, R) {
      const L = w.lib, shelves = [L.shelf0, L.shelf1, L.shelf2, L.shelf3];
      // walls of shelves on both sides, stacked in floors above and below, books facing the corridor
      for (let s = 0; s < w.path.n - 40; s += 6.2) for (const sd of [-1, 1]) for (let lv = -3; lv <= 3; lv++) {
        if (R() < 0.12) continue;
        w.prop(s, sd * 26, lv * 10.6 - 5, pick(R, shelves), { yaw: -sd * Math.PI / 2, scale: [1, 1, 1], color: [1.2, 1.1, 0.95, 1], p: [0, 0.3, 0, 0], anim: collapse, data: { k: R() }, far: 300 });
      }
      // beyond the shelf draw distance the walls continue as warm window-lit slabs; a deeper hall behind
      for (let s = 0; s < w.path.n - 40; s += 36) for (const sd of [-1, 1]) { w.prop(s, sd * 29, 0, L.box, { scale: [3, 76, 37], color: [0.6, 0.42, 0.22, 1], p: [7, 0.6, 1, 0] }); w.prop(s, sd * 60, 0, L.box, { scale: [3, 90, 37], color: [0.5, 0.35, 0.2, 1], p: [7, 0.4, 1, 0] }); }
      every(w, R, 24, s => { const sd = R.sign(); w.prop(s, sd * 23.5, R.range(-30, 30), L.box, { scale: [3, 0.4, 30], color: [0.45, 0.3, 0.15, 1], p: [0, 0, 0, 0] }); });
      every(w, R, 18, s => w.prop(s, side(R, 23.5, 24.5), 0, L.strand, { ground: pathY(w, s) - 40, scale: [2, 80, 2], color: [0.9, 0.7, 0.4, 1], p: [1, 0.3, 0, 0], pass: PASS.LINE }));
      every(w, R, 9, s => { const x = side(R, 18, 23), y = R.range(-25, 30); w.prop(s, x, y, L.quad, { scale: [0.8, 0.8, 1], color: [1, 0.8, 0.45, 1], p: [1, 2, 0, 9], pass: PASS.ADD, anim: pulse }); });
      // golden rings slowly turning across the hall, floating glass files in drifting clusters
      every(w, R, 60, s => w.prop(s, 0, 0, L.ringArc, { frame: true, scale: [21, 21, 1], roll: ang(R), color: [0.9, 0.65, 0.3, 1], p: [1, 0.45, 0, 0], anim: spinRoll, data: { spin: R.range(-0.3, 0.3) } }));
      every(w, R, 5, s => { const [x, y] = around(R, 17, 24); w.prop(s, x, y, L.file, { scale: [R.range(1.5, 3.5), R.range(1.5, 3.5), 1], yaw: ang(R), roll: ang(R), color: [1, 0.9, 0.6, 0.9], p: [4, 0.6, 0, 0], pass: PASS.ADD, anim: spin, data: { spin: R.range(-0.8, 0.8) } }); });
    },
    draw(r, L, st) {
      for (let k = 0; k < 90; k++) {
        const s = st.s + fract(k * 0.618 + st.t * 0.02) * 300, x = Math.sin(k * 12.9) * 22, y = Math.cos(k * 7.3) * 30 + Math.sin(st.t * 0.3 + k) * 2;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.2);
        r.draw(L.quad, tmp, [1, 0.9, 0.6, 0.8], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- 5 Fractal Bloom
  fractal: {
    name: 'Fractal Bloom', path: PATH_STYLES.fractal, bounds: { w: 15, h: 10 },
    pre: P({ skyTop: '#100020', skyHorizon: '#300050', skyBottom: '#080010', fog: '#1a0030', fogDensity: 0.003, palA: '#200040', palB: '#ff40ff', palC: '#40ffc0', ambient: 0.4, fractal: 0.8, unfold: 0, enemy: '#ffffff', bullet: '#ffff40' }),
    post: P({ skyTop: '#100020', skyHorizon: '#500080', skyBottom: '#080010', fog: '#200040', fogDensity: 0.0026, palA: '#300060', palB: '#40ffff', palC: '#ffff40', ambient: 0.45, fractal: 1, unfold: 1, enemy: '#ffffff', bullet: '#ffff40' }),
    enemies: ['bloom', 'corruptor', 'splitter', 'worm', 'glyph_swarm'],
    build(w, R) {
      const L = w.lib;
      every(w, R, 4, s => { const [x, y] = around(R, 22, 70); w.prop(s, x, y, L.crystal, { scale: [R.range(0.6, 1.8), R.range(0.8, 2.2), R.range(0.6, 1.8)], yaw: ang(R), roll: ang(R), color: hsv(R(), 0.6, 1), p: [2, 0.4, 0, 0], anim: spin, data: { spin: R.range(-1, 1) } }); });
      every(w, R, 22, s => { const [x, y] = around(R, 25, 90); w.prop(s, x, y, R() < 0.5 ? L.branch4 : L.branch, { scale: [R.range(6, 18)], yaw: ang(R), roll: ang(R), color: hsv(R(), 0.7, 1), p: [1, 1, 0, 0], pass: PASS.ADDLINE, anim: pulse }); });
      every(w, R, 30, s => { const [x, y] = around(R, 90, 200); w.prop(s, x, y, L.crystal, { scale: [R.range(4, 9), R.range(6, 16), R.range(4, 9)], roll: ang(R), color: hsv(R(), 0.6, 0.8), p: [2, 0.1, 0, 0], anim: spin, data: { spin: R.range(-0.2, 0.2) } }); });
      every(w, R, 70, s => w.prop(s, 0, 0, L.wireRing, { frame: true, scale: [R.range(24, 34)], roll: ang(R), color: hsv(R(), 0.4, 1), p: [1, 1.2, 0, 0], pass: PASS.ADDLINE, anim: spinRoll, data: { spin: R.range(-0.6, 0.6) } }));
    },
    draw() { },
  },
  // ------------------------------------------------------------------------------------------- 6 Juno's Garden
  garden: {
    name: "Juno's Garden", path: PATH_STYLES.garden, bounds: { w: 15, h: 9 },
    pre: P({ skyTop: '#ffd0e8', skyHorizon: '#fff0f4', skyBottom: '#c0f0d0', horizonGlow: 0.5, fog: '#f8e0ec', fogDensity: 0.004, palA: '#ff90c0', palB: '#60e0a0', palC: '#ffffff', light: [0.3, 0.9, 0.2], ambient: 0.55, enemy: '#ff2080', bullet: '#4020a0' }),
    post: P({ skyTop: '#ff90d0', skyHorizon: '#fff8f0', skyBottom: '#80f0b0', horizonGlow: 0.9, fog: '#ffd8ec', fogDensity: 0.0034, palA: '#ff70b0', palB: '#40e090', palC: '#ffffff', light: [0.3, 0.9, 0.2], ambient: 0.6, enemy: '#ff2080', bullet: '#4020a0' }),
    enemies: ['bloom', 'echo_diver', 'corruptor', 'mirror_kite'],
    build(w, R) {
      const L = w.lib;
      every(w, R, 7, s => w.prop(s, side(R, 40, 160), 0, L.blob, { ground: R.range(-16, -8), flat: true, scale: [R.range(10, 26), R.range(6, 18), R.range(10, 26)], color: R() < 0.5 ? [1, 0.55, 0.75, 1] : [0.45, 0.9, 0.65, 1], p: [0, 0.05, R.range(0.1, 0.3), 1] }));
      // giant flowers on stems
      every(w, R, 11, s => { const x = side(R, 22, 110), h = R.range(15, 70), fs = R.range(5, 14); w.prop(s, x, 0, L.cyl, { ground: -10, flat: true, scale: [0.6 + h * 0.01, h + 10, 0.6 + h * 0.01], color: [0.3, 0.75, 0.45, 1], p: [0, 0.1, 0.15, 1] }); w.prop(s, x, 0, R() < 0.5 ? L.flower : L.flower8, { ground: h, flat: true, pitch: -Math.PI / 2 + R.range(-0.4, 0.4), scale: [fs], color: hsv(0.85 + R() * 0.3, 0.45, 1, 0.9), p: [4, 1, 0, 0], pass: PASS.ADD, anim: bloomOpen, data: { k: R() } }); });
      // mushrooms, bubbles, grass tufts, vine arches over the path
      every(w, R, 13, s => { const x = side(R, 20, 90), h = R.range(4, 18), c = R.range(4, 12); w.prop(s, x, 0, L.cyl, { ground: -10, flat: true, scale: [c * 0.15, h + 10, c * 0.15], color: [1, 0.95, 0.9, 1], p: [0, 0.1, 0, 0] }); w.prop(s, x, 0, L.dome, { ground: h, flat: true, scale: [c, c, c], color: pick(R, [[1, 0.4, 0.6, 1], [0.6, 0.4, 1, 1], [1, 0.75, 0.3, 1]]), p: [0, 0.2, 0.1, 1] }); });
      every(w, R, 6, s => { const [x, y] = around(R, 18, 70, -8, 50); w.prop(s, x, y, L.icoSmooth, { scale: [R.range(0.8, 3.5)], color: [1, 0.9, 1, 0.8], p: [4, 0.8, 0, 0], pass: PASS.ADD, anim: bob, data: { k: R() } }); });
      every(w, R, 2.5, s => w.prop(s, side(R, 16, 60), 0, L.tuft, { ground: -12, flat: true, yaw: ang(R), scale: [R.range(3, 7)], color: [0.3, 0.9, 0.5, 1], p: [1, 0.3, 0, 0], pass: PASS.LINE }));
      every(w, R, 65, s => w.prop(s, 0, -10, L.arch, { frame: true, scale: [R.range(24, 30), R.range(32, 44), 2], color: [0.35, 0.8, 0.5, 1], p: [0, 0.2, 0.3, 1] }));
    },
    draw(r, L, st) {
      ground(r, L.plane, st.cam, -14, 1500, 60, [1, 1, 1, 1], [3, 0.2, 40, 0]);
      for (let k = 0; k < 3; k++) {
        const p = st.path.world(st.s + 900, (k - 1) * 420, 260 + k * 30);
        const f = st.path.fwd(st.s), rr = st.path.right(st.s);
        basisMat(tmp, p, rr, [0, 1, 0], [-f[0], 0, -f[2]], 140);
        r.draw(L.face, tmp, [1, 0.8, 0.9, 0.25 + 0.06 * Math.sin(st.t + k)], [4, 0.6, 0, 1], PASS.ADD);
      }
      for (let k = 0; k < 60; k++) { // drifting petals
        const s = st.s + fract(k * 0.618 - st.t * 0.03) * 280, x = Math.sin(k * 9.1 + st.t * 0.4) * 30, y = Math.cos(k * 4.7) * 20 + Math.sin(st.t * 0.7 + k) * 3;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.35);
        r.draw(L.quad, tmp, [1, 0.6, 0.85, 0.9], [1, 0.8, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- 7 Black ICE
  black_ice: {
    name: 'Black ICE', path: PATH_STYLES.black_ice, bounds: { w: 13, h: 8 },
    pre: P({ skyTop: '#000000', skyHorizon: '#0a0000', skyBottom: '#000000', fog: '#000000', fogDensity: 0.0042, palA: '#100000', palB: '#000000', palC: '#ffffff', light: [0.2, 1, -0.4], ambient: 0.2, enemy: '#ff2020', bullet: '#ffffff', player: '#ffffff' }),
    post: P({ skyTop: '#000000', skyHorizon: '#300000', skyBottom: '#000000', horizonGlow: 0.4, fog: '#080000', fogDensity: 0.0036, palA: '#180000', palB: '#000000', palC: '#ffffff', light: [0.2, 1, -0.4], ambient: 0.25, enemy: '#ff2020', bullet: '#ffffff', player: '#ffffff' }),
    enemies: ['hunter', 'scanner', 'agent', 'shutter', 'pinger', 'tracer'],
    build(w, R) {
      const L = w.lib;
      // the hexagonal tunnel: black frames with red edges
      for (let s = 10, k = 0; s < w.path.n - 60; s += 16, k++) {
        const rot = (k % 2) * Math.PI / 6;
        w.prop(s, 0, 0, L.hexFrame, { frame: true, roll: rot, scale: [24, 24, 1.2], color: [0.08, 0.08, 0.1, 1], p: [8, 1, 0, 0] });
        w.prop(s, 0, 0, L.hexLines, { frame: true, roll: rot, scale: [21.4, 21.4, 1], color: [1, 0.05, 0.05, 1], p: [1, 1.5, 0, 0], pass: PASS.LINE, anim: pulse });
      }
      // data conduits running along the tunnel outside the frames
      every(w, R, 30, s => { for (let a = 0; a < 6; a++) { const t = a * TAU / 6 + Math.PI / 6; w.prop(s, Math.cos(t) * 27, Math.sin(t) * 27, L.beam, { scale: [0.3, 0.3, 30], color: [1, 0.1, 0.05, 1], p: [1, 1.2, 0, 0], pass: PASS.ADD, anim: pulse }); } });
      // sentry posts and black shards just beyond the frames
      every(w, R, 20, s => { const [x, y] = around(R, 30, 45); w.prop(s, x, y, L.pyramid, { scale: [3, 6, 3], roll: ang(R), color: [0.06, 0.06, 0.08, 1], p: [2, 0.2, 0, 0] }); w.prop(s, x * 0.98, y * 0.98, L.quad, { scale: [0.6, 0.6, 1], color: [1, 0.1, 0.1, 1], p: [1, 2, 0, 9], pass: PASS.ADD, anim: flicker, data: { k: R() } }); });
      every(w, R, 5, s => { const [x, y] = around(R, 32, 90); w.prop(s, x, y, L.shard, { scale: [R.range(1, 4)], yaw: ang(R), roll: ang(R), color: [0.05, 0.05, 0.07, 1], p: [8, 0.8, 0, 0], anim: spin, data: { spin: R.range(-0.5, 0.5) } }); });
      // ICE fortresses: spiked black polyhedra all around, scanning with red lasers
      every(w, R, 36, s => { const [x, y] = around(R, 90, 320); const sc = R.range(12, 34); w.prop(s, x, y, R() < 0.5 ? L.spikeBall : L.spikeBall2, { scale: [sc], yaw: ang(R), roll: ang(R), color: [0.1, 0.1, 0.12, 1], p: [2, 0.1, 0, 0], anim: spin, data: { spin: R.range(-0.2, 0.2) } }); w.prop(s, x, y, L.quad, { scale: [sc * 0.5, sc * 0.5, 1], color: [1, 0.05, 0.05, 1], p: [1, 1, 0, 9], pass: PASS.ADD, anim: pulse }); if (R() < 0.6) w.prop(s, x, y, L.beam, { flat: true, yaw: ang(R), scale: [0.4, 0.4, 260], color: [1, 0.05, 0.05, 1], p: [1, 2, 0, 0], pass: PASS.ADD, anim: laser, data: { k: R(), side: 0 } }); });
    },
    draw(r, L, st) {
      // a red horizon grid far below
      ground(r, L.grid, st.cam, st.camWorldY - 140, 1600, 66, [0.4, 0.02, 0.02, 1], [1, 0.3 + st.kick * 0.5, 0, 0], PASS.ADDLINE);
    },
  },
  // ------------------------------------------------------------------------------------------- 8 The Core
  core: {
    name: 'The Core', path: PATH_STYLES.core, bounds: { w: 15, h: 10 }, collapsing: true,
    pre: P({ skyTop: '#000010', skyHorizon: '#2040a0', skyBottom: '#000000', horizonGlow: 0.5, skyGrid: 0.5, fog: '#101030', fogDensity: 0.003, palA: '#202060', palB: '#000010', palC: '#ffffff', ambient: 0.4, collapse: 0.3, enemy: '#ff2040', bullet: '#ffffff' }),
    post: P({ skyTop: '#d8dcf0', skyHorizon: '#ffffff', skyBottom: '#b8c0e0', horizonGlow: 0.8, fog: '#e4e6f4', fogDensity: 0.0018, palA: '#ffffff', palB: '#a0a8e0', palC: '#ffb020', ambient: 0.7, glow: 0.35, collapse: 1, enemy: '#c00030', bullet: '#200060', player: '#ff6000' }),
    enemies: ['agent', 'hunter', 'bloom', 'glyph_swarm', 'mirror_kite', 'worm', 'echo_diver', 'corruptor'],
    build(w, R) {
      const L = w.lib;
      // every layer's debris on a three-armed spiral around the path, drawn into the white sun
      const kinds = [
        [L.tower, [0.3, 0.45, 0.9, 1], [7, 1.2, 1, 0], 6], [L.pyramid, [1, 0.95, 1, 1], [2, 0, 0, 0], 6], [L.rock, [1, 0.4, 0.15, 1], [5, 0.6, 0, 0], 4],
        [L.shelf1, [1, 0.9, 0.8, 1], [0, 0.1, 0, 0], 0.7], [L.crystal, [0.8, 0.5, 1, 1], [2, 0.4, 0, 0], 3], [L.flower8, [1, 0.6, 0.85, 1], [4, 1, 0, 0], 4], [L.spikeBall, [0.1, 0.1, 0.12, 1], [2, 0.1, 0, 0], 2.5], [L.wireIco, [1, 1, 1, 1], [1, 1.5, 0, 0], 5],
      ];
      for (let s = 20; s < w.path.n - 60; s += 2.2) {
        const kind = kinds[Math.min(kinds.length - 1, Math.floor((s / w.path.n) * kinds.length + R() * 1.5))];
        const arm = Math.floor(R() * 3), a = s * 0.012 + arm * TAU / 3 + R.range(-0.3, 0.3), rad = R.range(22, 75);
        const add = kind[0] === L.flower8 || kind[0] === L.wireIco;
        w.prop(s, Math.cos(a) * rad, Math.sin(a) * rad, kind[0], { scale: [kind[3] * R.range(0.6, 1.8)], yaw: ang(R), roll: ang(R), color: kind[1], p: kind[2].slice(), pass: kind[0] === L.wireIco ? PASS.ADDLINE : add ? PASS.ADD : undefined, anim: drift, data: { spin: R.range(-1, 1) } });
      }
      // rings of light turning around the corridor, streaks rushing toward the sun
      every(w, R, 32, s => { w.prop(s, 0, 0, L.wireRing, { frame: true, scale: [R.range(24, 40)], roll: ang(R), color: [1, 1, 1, 1], p: [1, 1.5, 0, 0], pass: PASS.ADDLINE, anim: spinRoll, data: { spin: R.range(-1, 1) } }); w.prop(s, 0, 0, L.ringArc, { frame: true, scale: [R.range(42, 60)], roll: ang(R), color: [0.6, 0.7, 1, 1], p: [1, 1, 0, 0], anim: spinRoll, data: { spin: R.range(-0.5, 0.5) } }); });
      every(w, R, 8, s => { const [x, y] = around(R, 30, 120); w.prop(s, x, y, L.beam, { scale: [0.2, 0.2, R.range(20, 60)], color: [1, 1, 1, 1], p: [1, 2, 0, 0], pass: PASS.ADD }); });
    },
    draw() { },
  },
  // =========================================================================================== B-side layers
  // Only reached through SHIFT. They are built over whatever corridor the A-side layer flies, so everything is placed
  // relative to the path (no fixed ground height).
  // ------------------------------------------------------------------------------------------- Static
  static: {
    name: 'Static', path: PATH_STYLES.calibration, bounds: { w: 14, h: 8 }, bSide: true,
    pre: P({ skyTop: '#0c0c0e', skyHorizon: '#3a3c40', skyBottom: '#050506', horizonGlow: 0.3, skyMode: 6, fog: '#18191c', fogDensity: 0.0034, palA: '#1c1c20', palB: '#08080a', palC: '#e8f0ff', light: [0.3, 0.8, 0.5], ambient: 0.45, enemy: '#ff3060', bullet: '#ffe040' }),
    post: P({ skyTop: '#100818', skyHorizon: '#40304a', skyBottom: '#06040a', horizonGlow: 0.5, skyMode: 6, fog: '#1c1420', fogDensity: 0.003, palA: '#201a26', palB: '#0a080c', palC: '#a0f0ff', light: [0.3, 0.8, 0.5], ambient: 0.5, enemy: '#ff3060', bullet: '#ffe040' }),
    enemies: ['pinger', 'tracer', 'splitter'],
    build(w, R) {
      const L = w.lib;
      // dead televisions tumbling around the corridor, screens toward you: snow, or the test card
      const tv = (s, x, y, sc, spinK) => {
        const d = { spin: R.range(-spinK, spinK), ph: ang(R) }, yaw = Math.PI + R.range(-0.5, 0.5), roll = R.range(-0.4, 0.4);
        w.prop(s, x, y, L.crt, { yaw, roll, scale: [sc], color: pick(R, [[0.75, 0.74, 0.7, 1], [0.25, 0.25, 0.27, 1], [0.55, 0.5, 0.42, 1]]), p: [0, 0.05, 0, 0], anim: spin, data: d });
        w.prop(s, x, y, L.crtScreen, { yaw, roll, scale: [sc], color: [0.9, 0.95, 1, 1], p: [9, 1, R() < 0.25 ? 1 : 0, 0], anim: spin, data: d });
      };
      every(w, R, 6, s => { const [x, y] = around(R, 19, 60); tv(s, x, y, R.range(1.2, 3.5), 0.5); });
      every(w, R, 30, s => { const [x, y] = around(R, 70, 180); tv(s, x, y, R.range(8, 20), 0.08); });
      // walls of snow out in the dark, and test-card monoliths
      every(w, R, 40, s => { const sd = R.sign(); w.prop(s, sd * R.range(80, 160), R.range(-20, 40), L.quad, { yaw: -sd * Math.PI / 2 + R.range(-0.3, 0.3), scale: [R.range(25, 50), R.range(18, 35), 1], color: [0.7, 0.75, 0.8, 1], p: [9, 0.4, 0, 0] }); });
      every(w, R, 70, s => { const sd = R.sign(), x = sd * R.range(45, 110), h = R.range(40, 90); w.prop(s, x, 0, L.tower, { ground: pathY(w, s) - 60, flat: true, scale: [h * 0.6, h + 60, 6], color: [0.12, 0.12, 0.14, 1], p: [0, 0, 0, 0] }); w.prop(s - 3.3, x, 0, L.quad, { ground: pathY(w, s) - 60 + (h + 60) * 0.62, flat: true, yaw: Math.PI, scale: [h * 0.27, h * 0.2, 1], color: [1, 1, 1, 1], p: [9, 0.6, 1, 0] }); });
      // broadcast masts rising from below with blinking red lights
      every(w, R, 35, s => { const x = side(R, 40, 200), h = R.range(80, 200), g = pathY(w, s) - 80; w.prop(s, x, 0, L.mast, { ground: g, flat: true, scale: [5, h, 5], color: [0.6, 0.65, 0.7, 1], p: [1, 0.5, 0, 0], pass: PASS.LINE }); w.prop(s, x, 0, L.quad, { ground: g + h, flat: true, scale: [1.5, 1.5, 1], color: [1, 0.1, 0.1, 1], p: [1, 2, 0, 9], pass: PASS.ADD, anim: flicker, data: { k: R() } }); });
      // dangling aerial cables
      every(w, R, 12, s => w.prop(s, side(R, 20, 70), R.range(10, 40), L.strand, { scale: [3, R.range(20, 50), 3], color: [0.5, 0.5, 0.55, 1], p: [1, 0.3, 0, 0], pass: PASS.LINE }));
    },
    draw(r, L, st) {
      const y = st.path.pos(st.s)[1] - 32;
      ground(r, L.plane, st.cam, y, 1400, 50, [0.35, 0.37, 0.4, 1], [9, 0.3, 2, 0]);
      for (let k = 0; k < 80; k++) { // loose pixels of snow drifting past
        const s = st.s + fract(k * 0.618 + st.t * 0.05) * 260, x = Math.sin(k * 12.9) * 26, yy = Math.cos(k * 7.3) * 18;
        const p = st.path.world(s, x, yy); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12 + (k % 3) * 0.06);
        r.draw(L.quad, tmp, [0.9, 0.95, 1, 0.8], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- The Graveyard
  graveyard: {
    name: 'The Graveyard', path: PATH_STYLES.grid_city, bounds: { w: 16, h: 9 }, bSide: true,
    pre: P({ skyTop: '#000200', skyHorizon: '#06200c', skyBottom: '#000000', horizonGlow: 0.5, skyMode: 5, fog: '#020c04', fogDensity: 0.0042, palA: '#031408', palB: '#000402', palC: '#40ff70', light: [0.2, 0.9, 0.3], ambient: 0.3, enemy: '#e0ffe8', bullet: '#ff40a0' }),
    post: P({ skyTop: '#000400', skyHorizon: '#0c3a14', skyBottom: '#000000', horizonGlow: 0.8, skyMode: 5, fog: '#041608', fogDensity: 0.0034, palA: '#042010', palB: '#000602', palC: '#70ff90', light: [0.2, 0.9, 0.3], ambient: 0.35, enemy: '#e0ffe8', bullet: '#ff40a0' }),
    enemies: ['pinger', 'tracer', 'glyph_swarm', 'worm'],
    build(w, R) {
      const L = w.lib, rack = [0.18, 0.22, 0.2, 1];
      // dead server racks, toppled and leaning, still blinking
      every(w, R, 5, s => { const x = side(R, 20, 70), g = pathY(w, s) - 22; w.prop(s, x, 0, L.tower, { ground: g, flat: true, roll: R.range(-1.1, 1.1), yaw: ang(R), scale: [R.range(3, 6), R.range(10, 26), R.range(3, 6)], color: rack, p: [7, 0.9, 1, 0] }); });
      every(w, R, 12, s => { const x = side(R, 75, 240), g = pathY(w, s) - 30; w.prop(s, x, 0, L.tower, { ground: g, flat: true, roll: R.range(-0.4, 0.4), yaw: ang(R), scale: [R.range(10, 30), R.range(30, 110), R.range(10, 30)], color: [0.1, 0.13, 0.11, 1], p: [7, 0.6, 1, 0] }); });
      // gravestones of corrupted code
      every(w, R, 7, s => { const x = side(R, 22, 90), g = pathY(w, s) - 22; w.prop(s, x, 0, L.tower, { ground: g, flat: true, yaw: R.range(-0.4, 0.4), roll: R.range(-0.2, 0.2), scale: [R.range(2, 4), R.range(4, 9), 0.8], color: [0.2, 0.25, 0.22, 1], p: [5, 0.6, 0, 0] }); });
      // dead terminals still printing, floating in the dark; floppies drifting like leaves
      every(w, R, 8, s => { const [x, y] = around(R, 19, 55); const d = { spin: R.range(-0.3, 0.3), ph: ang(R) }, yaw = Math.PI + R.range(-0.6, 0.6), sc = R.range(1.4, 3);
        w.prop(s, x, y, L.crt, { yaw, roll: R.range(-0.5, 0.5), scale: [sc], color: [0.6, 0.6, 0.52, 1], p: [0, 0.03, 0, 0], anim: spin, data: d });
        w.prop(s, x, y, L.crtScreen, { yaw, roll: R.range(-0.5, 0.5) * 0, scale: [sc], color: [0.05, 0.12, 0.06, 1], p: [5, 1.2, 0, 0], anim: spin, data: d }); });
      every(w, R, 3, s => { const [x, y] = around(R, 17, 45); w.prop(s, x, y, L.floppy, { yaw: ang(R), roll: ang(R), scale: [R.range(1, 2)], color: [1, 1, 1, 1], p: [0, 0.05, 0, 0], anim: spin, data: { spin: R.range(-1.5, 1.5) } }); });
      // cable nests hanging from nowhere, green status lights
      every(w, R, 9, s => w.prop(s, side(R, 18, 60), R.range(12, 40), R() < 0.5 ? L.strand : L.strand2, { scale: [5, R.range(25, 60), 5], color: [0.2, 0.45, 0.3, 1], p: [1, 0.3, 0, 0], pass: PASS.LINE }));
      every(w, R, 4, s => { const [x, y] = around(R, 20, 70); w.prop(s, x, y, L.quad, { scale: [0.35, 0.35, 1], color: [0.3, 1, 0.45, 1], p: [1, 2, 0, 9], pass: PASS.ADD, anim: flicker, data: { k: R() } }); });
    },
    draw(r, L, st) {
      const y = st.path.pos(st.s)[1] - 22;
      ground(r, L.plane, st.cam, y, 1400, 40, [1, 1, 1, 1], [3, 0.5, 8, 0]);
      for (let k = 0; k < 60; k++) { // phosphor dust
        const s = st.s + fract(k * 0.618 - st.t * 0.01) * 240, x = Math.sin(k * 12.9 + st.t * 0.1) * 28, yy = Math.cos(k * 7.3) * 20 - fract(st.t * 0.05 + k * 0.3) * 6;
        const p = st.path.world(s, x, yy); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.15);
        r.draw(L.quad, tmp, [0.4, 1, 0.55, 0.7], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- The Hive
  hive: {
    name: 'The Hive', path: PATH_STYLES.black_ice, bounds: { w: 13, h: 8 }, bSide: true,
    pre: P({ skyTop: '#060300', skyHorizon: '#2a1c00', skyBottom: '#000000', horizonGlow: 0.5, fog: '#100a00', fogDensity: 0.0045, palA: '#1a1400', palB: '#050300', palC: '#d8ff30', light: [0.1, 1, 0.2], ambient: 0.3, enemy: '#ffffff', bullet: '#ff2060' }),
    post: P({ skyTop: '#0a0500', skyHorizon: '#4a3000', skyBottom: '#000000', horizonGlow: 0.8, fog: '#1a1000', fogDensity: 0.0038, palA: '#241a00', palB: '#060400', palC: '#e8ff50', light: [0.1, 1, 0.2], ambient: 0.35, enemy: '#ffffff', bullet: '#ff2060' }),
    enemies: ['hunter', 'scanner', 'worm', 'splitter', 'tracer'],
    build(w, R) {
      const L = w.lib, RAD = 25, N = 22, cell = (TAU * RAD) / N / 2;
      // a honeycomb tunnel: hexagonal cells all around, their open mouths facing the corridor; some full of glowing
      // larvae, some missing (you see the hive beyond)
      for (let s = 10, k = 0; s < w.path.n - 60; s += cell * 1.55, k++) {
        for (let i = 0; i < N; i++) {
          if (R() < 0.12) continue;
          const a = (i + (k % 2) * 0.5) / N * TAU, lit = R() < 0.06;
          w.prop(s, Math.cos(a) * RAD, Math.sin(a) * RAD, L.hexCell, { frame: true, roll: a - Math.PI / 2, scale: [cell * 0.98, R.range(4, 9), cell * 0.98], color: lit ? [0.6, 0.75, 0.12, 1] : [0.12, 0.1, 0.05, 1], p: lit ? [1, 0.5, 0, 0] : [2, 0.05, 0, 0], anim: lit ? pulse : null });
        }
      }
      // egg sacs and larval ICE clinging inside the cells' rim
      every(w, R, 7, s => { const a = ang(R), r0 = RAD - 1.5; w.prop(s, Math.cos(a) * r0, Math.sin(a) * r0, L.blob, { frame: true, scale: [R.range(1, 2)], color: [0.45, 0.6, 0.12, 0.5], p: [4, 0.3, 0.2, 1], pass: PASS.ADD }); });
      every(w, R, 13, s => { const a = ang(R), r0 = RAD - 2; w.prop(s, Math.cos(a) * r0, Math.sin(a) * r0, L.spikeBall, { frame: true, scale: [R.range(1.2, 2.2)], color: [0.08, 0.07, 0.05, 1], p: [2, 0.1, 0, 0], anim: spin, data: { spin: R.range(-2, 2) } }); });
      // beyond the walls: hive spheres hanging in the dark, threaded with veins
      every(w, R, 24, s => { const [x, y] = around(R, 60, 220); const sc = R.range(15, 45); w.prop(s, x, y, L.icoSmooth, { scale: [sc], color: [0.15, 0.12, 0.05, 1], p: [2, 0.05, 0, 0] }); w.prop(s, x, y, L.hexLines, { scale: [sc * 1.02], roll: ang(R), color: [0.85, 1, 0.2, 1], p: [1, 0.8, 0, 0], pass: PASS.ADDLINE, anim: spinRoll, data: { spin: R.range(-0.2, 0.2) } }); });
      every(w, R, 10, s => w.prop(s, side(R, 30, 90), R.range(-30, 30), L.strand2, { scale: [6, R.range(30, 70), 6], roll: ang(R), color: [0.7, 0.9, 0.15, 1], p: [1, 0.6, 0, 0], pass: PASS.ADDLINE }));
    },
    draw(r, L, st) {
      for (let k = 0; k < 70; k++) { // spores
        const s = st.s + fract(k * 0.618 + st.t * 0.03) * 220, x = Math.sin(k * 12.9 + st.t * 0.3) * 18, y = Math.cos(k * 7.3 + st.t * 0.2) * 14;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.2);
        r.draw(L.quad, tmp, [0.85, 1, 0.3, 0.7], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- Negative
  negative: {
    name: 'Negative', path: PATH_STYLES.garden, bounds: { w: 15, h: 9 }, bSide: true,
    pre: P({ skyTop: '#ffffff', skyHorizon: '#f2f2f2', skyBottom: '#e6e6e6', horizonGlow: 0, fog: '#f4f4f4', fogDensity: 0.0042, palA: '#ffffff', palB: '#e8e8e8', palC: '#000000', light: [0.3, 0.9, 0.2], ambient: 1, glow: 0.15, enemy: '#000000', bullet: '#e00030', player: '#000000' }),
    post: P({ skyTop: '#ffffff', skyHorizon: '#ffe8ee', skyBottom: '#f0e0e4', horizonGlow: 0.2, fog: '#fff2f4', fogDensity: 0.0036, palA: '#ffffff', palB: '#f0e0e4', palC: '#000000', light: [0.3, 0.9, 0.2], ambient: 1, glow: 0.15, enemy: '#000000', bullet: '#e00030', player: '#000000' }),
    enemies: ['bloom', 'echo_diver', 'corruptor', 'mirror_kite'],
    build(w, R) {
      const L = w.lib, ink = [0.02, 0.02, 0.02, 1];
      // Juno's garden drawn in ink: black flowers on black stems over a white void
      every(w, R, 7, s => { const x = side(R, 22, 110), g = pathY(w, s) - 18, h = R.range(12, 60), fs = R.range(4, 12);
        w.prop(s, x, 0, L.cyl, { ground: g, flat: true, scale: [0.35 + h * 0.008, h, 0.35 + h * 0.008], color: ink, p: [1, 0, 0, 0] });
        w.prop(s, x, 0, R() < 0.5 ? L.flower : L.flower8, { ground: g + h, flat: true, pitch: -Math.PI / 2 + R.range(-0.5, 0.5), yaw: ang(R), scale: [fs], color: ink, p: [1, 0, 0, 0] }); });
      // ink blots for hills, bare black trees, floating black bubbles
      every(w, R, 9, s => w.prop(s, side(R, 40, 160), 0, L.blob, { ground: pathY(w, s) - 22, flat: true, scale: [R.range(10, 30), R.range(5, 16), R.range(10, 30)], color: ink, p: [1, 0, R.range(0.1, 0.3), 1] }));
      every(w, R, 10, s => w.prop(s, side(R, 25, 120), 0, L.branch4, { ground: pathY(w, s) - 18, flat: true, yaw: ang(R), scale: [R.range(10, 24)], color: ink, p: [1, 0, 0, 0], pass: PASS.LINE }));
      every(w, R, 5, s => { const [x, y] = around(R, 18, 60, -10, 40); w.prop(s, x, y, L.icoSmooth, { scale: [R.range(0.5, 2.5)], color: ink, p: [1, 0, 0, 0], anim: bob, data: { k: R() } }); });
      // vine arches drawn as single ink lines over the path
      every(w, R, 55, s => w.prop(s, 0, 0, L.ringArc, { frame: true, scale: [R.range(22, 28)], roll: R.range(-0.3, 0.3), color: ink, p: [1, 0, 0, 0] }));
    },
    draw(r, L, st) {
      const y = st.path.pos(st.s)[1] - 18;
      ground(r, L.grid, st.cam, y, 1400, 58, [0, 0, 0, 1], [1, 0, 0, 0], PASS.LINE);
      for (let k = 0; k < 3; k++) { // her face, inverted, in the white sky
        const p = st.path.world(st.s + 900, (k - 1) * 420, 260 + k * 30);
        const f = st.path.fwd(st.s), rr = st.path.right(st.s);
        basisMat(tmp, p, rr, [0, 1, 0], [-f[0], 0, -f[2]], 140);
        r.draw(L.face, tmp, [0.02, 0.02, 0.02, 1], [1, 0, 0, 0]);
      }
      for (let k = 0; k < 50; k++) { // black petals
        const s = st.s + fract(k * 0.618 - st.t * 0.03) * 260, x = Math.sin(k * 9.1 + st.t * 0.4) * 30, yy = Math.cos(k * 4.7) * 20 + Math.sin(st.t * 0.7 + k) * 3;
        const p = st.path.world(s, x, yy); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.3);
        r.draw(L.box, tmp, [0.02, 0.02, 0.02, 1], [1, 0, 0, 0]);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- The Trench (Chrome Sea's B-side)
  trench: {
    name: 'The Trench', path: PATH_STYLES.chrome_sea, bounds: { w: 16, h: 7 }, bSide: true,
    pre: P({ skyTop: '#000206', skyHorizon: '#002238', skyBottom: '#000000', horizonGlow: 0.35, skyMode: 4, fog: '#00121e', fogDensity: 0.0058, palA: '#0a2632', palB: '#00080e', palC: '#30e8ff', light: [0.1, 1, 0.2], ambient: 0.3, enemy: '#ffb040', bullet: '#40ffd0' }),
    post: P({ skyTop: '#020008', skyHorizon: '#140a40', skyBottom: '#000000', horizonGlow: 0.6, skyMode: 4, fog: '#06061e', fogDensity: 0.005, palA: '#1a1440', palB: '#02010a', palC: '#c070ff', light: [0.1, 1, 0.2], ambient: 0.32, enemy: '#ffb040', bullet: '#40ffd0' }),
    enemies: ['pinger', 'tracer', 'mirror_kite', 'worm', 'splitter'],
    build(w, R) {
      const L = w.lib, bone = [0.55, 0.56, 0.52, 1], stone = [0.3, 0.36, 0.4, 1];
      // the skeleton of something enormous: runs of ribs arching over the corridor, vertebrae along the top
      every(w, R, 380, s0 => { const n = 18 + Math.floor(R() * 10), roll = R.range(-0.4, 0.4);
        for (let i = 0; i < n; i++) { const k = Math.sin(Math.PI * (i + 0.5) / n), rad = 21 + k * 9;
          w.prop(s0 + i * 7, 0, -6, L.arch, { frame: true, roll, scale: [rad, rad * 1.25, 1.6 + k], color: bone, p: [0, 0.06, 0, 0] });
          w.prop(s0 + i * 7, -Math.sin(roll) * (rad * 1.25 - 6), Math.cos(roll) * (rad * 1.25 - 6), L.c_levVert, { frame: true, roll, pitch: 0, scale: [3 + k * 2, 3 + k * 2, 3.4], color: bone, p: [0, 0.05, 0, 0] }); } }, 60);
      // jellyfish drifting up through the dark, pulsing
      every(w, R, 5, s => { const [x, y] = around(R, 24, 65); const sc = R.range(1.2, 4.5), c = R() < 0.6 ? [0.3, 0.9, 1, 0.7] : [0.8, 0.4, 1, 0.7], d = { k: R(), sc };
        w.prop(s, x, y, L.c_jellyBell, { scale: [sc], color: c, p: [4, 1.2, 0, 0], pass: PASS.ADD, anim: jelly, data: d });
        w.prop(s, x, y, L.c_jellyTent, { scale: [sc], color: [c[0], c[1], c[2], 0.6], p: [1, 1, 0, 0], pass: PASS.ADDLINE, anim: jelly, data: d }); });
      // a drowned city on the floor: broken colonnades, fallen lintels, statue heads half in the silt
      every(w, R, 26, s => { const x = side(R, 26, 95), g = pathY(w, s) - 26, h = R.range(10, 38);
        w.prop(s, x, 0, L.cyl16, { ground: g, flat: true, roll: R.range(-0.35, 0.35), yaw: ang(R), scale: [2.4, h, 2.4], color: stone, p: [0, 0.03, 0, 0] });
        if (R() < 0.4) w.prop(s + 6, x * 1.1, 0, L.box, { ground: g + 1, flat: true, yaw: ang(R), roll: R.range(-0.3, 0.3), scale: [6, 3, 26], color: stone, p: [0, 0.03, 0, 0] }); });
      every(w, R, 170, s => { const sd = R.sign(); w.prop(s, sd * R.range(55, 120), 0, L.face, { ground: pathY(w, s) - 30, flat: true, yaw: -sd * R.range(0.6, 1.4), roll: R.range(-0.5, 0.5), scale: [R.range(22, 38)], color: [0.36, 0.42, 0.46, 1], p: [0, 0.04, 0, 0] }); });
      // kelp of light and the lures of things you never see
      every(w, R, 6, s => w.prop(s, side(R, 18, 90), 0, R() < 0.5 ? L.strand : L.strand2, { ground: pathY(w, s) - 26, flat: true, yaw: ang(R), scale: [7, R.range(14, 34), 7], color: [0.15, 0.7, 0.6, 1], p: [1, 0.7, 0, 0], pass: PASS.ADDLINE }));
      every(w, R, 9, s => { const [x, y] = around(R, 60, 200); w.prop(s, x, y, L.quad, { scale: [0.9, 0.9, 1], color: [0.3, 1, 0.8, 1], p: [1, 2, 0, 9], pass: PASS.ADD, anim: flicker, data: { k: R() } }); });
    },
    draw(r, L, st) {
      ground(r, L.plane, st.cam, st.path.pos(st.s)[1] - 26, 1400, 30, [0.3, 0.3, 0.3, 1], [3, 0.2, 14, 0]);
      for (let k = 0; k < 90; k++) { // marine snow, drifting up
        const s = st.s + fract(k * 0.618) * 260, x = Math.sin(k * 12.9 + st.t * 0.05) * 30, y = (fract(k * 0.37 + st.t * 0.02) - 0.5) * 50;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.1 + (k % 3) * 0.05);
        r.draw(L.quad, tmp, [0.7, 0.9, 1, 0.6], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- Cold Storage (Firewall's B-side)
  cold: {
    name: 'Cold Storage', path: PATH_STYLES.firewall, bounds: { w: 13, h: 9 }, bSide: true,
    pre: P({ skyTop: '#01040e', skyHorizon: '#16405e', skyBottom: '#03070e', horizonGlow: 0.5, skyMode: 7, fog: '#0a1a2a', fogDensity: 0.004, palA: '#9cc8f0', palB: '#1c3850', palC: '#80ffff', light: [0.4, 0.7, -0.3], ambient: 0.5, enemy: '#ff4060', bullet: '#ffd040' }),
    post: P({ skyTop: '#04020e', skyHorizon: '#3a2c70', skyBottom: '#03030c', horizonGlow: 0.8, skyMode: 7, fog: '#141030', fogDensity: 0.0036, palA: '#b0c0ff', palB: '#262050', palC: '#d0a0ff', light: [0.4, 0.7, -0.3], ambient: 0.55, enemy: '#ff4060', bullet: '#ffd040' }),
    enemies: ['shutter', 'scanner', 'pinger', 'glyph_swarm', 'tracer'],
    build(w, R) {
      const L = w.lib, ice = [0.62, 0.82, 1, 1], deep = [0.3, 0.5, 0.7, 1];
      // the same canyon, frozen: walls of ice with the falling code stopped inside, icicles along the rims
      for (let s = 0; s < w.path.n - 40; s += 9) for (const sd of [-1, 1]) w.prop(s, sd * R.range(20, 30), 0, L.rockSlab, { frame: true, ground: -8, scale: [R.range(6, 14) * sd, R.range(70, 120), 12], color: ice, p: [5, 0.12, 0, 0] });
      every(w, R, 3, s => { const sd = R.sign(), x = sd * R.range(14, 22), y = R.range(14, 34); w.prop(s, x, y, L.cone, { pitch: Math.PI, scale: [R.range(0.4, 1.2), R.range(3, 10), R.range(0.4, 1.2)], color: [0.85, 0.95, 1, 1], p: [2, 0.1, 0, 0] }); });
      every(w, R, 7, s => w.prop(s, side(R, 16, 24), R.range(-6, 30), L.crystal, { scale: [R.range(1, 3), R.range(2, 6), R.range(1, 3)], yaw: ang(R), roll: ang(R), color: ice, p: [2, 0.2, 0, 0] }));
      // the lava river is a frozen ribbon with light under the ice; flames frozen mid-flicker on its banks
      for (let s = 0; s < w.path.n - 40; s += 10) w.prop(s, 0, 0, L.box, { frame: true, ground: -1, scale: [11 + Math.sin(s * 0.03) * 3, 0.6, 10.5], color: [0.5, 0.85, 1, 1], p: [2, 0.25, 0, 0] });
      every(w, R, 11, s => w.prop(s, side(R, 8, 16), 0, L.c_flame, { ground: -1, flat: true, yaw: ang(R), scale: [R.range(1.5, 3.5), R.range(2.5, 6), R.range(1.5, 3.5)], color: [0.45, 0.8, 1, 0.8], p: [4, 1, 0, 0], pass: PASS.ADD }));
      // frozen firewall frames, glazed and still; ice arches; white spires beyond
      every(w, R, 85, s => w.prop(s, 0, 0, L.wireBox, { frame: true, scale: [34, 24, 2], color: [0.7, 0.95, 1, 1], p: [1, 0.6, 0, 0], pass: PASS.LINE }));
      every(w, R, 110, s => w.prop(s, 0, -12, L.arch, { frame: true, scale: [R.range(26, 32), R.range(30, 46), 6], color: ice, p: [5, 0.1, 0, 0] }));
      every(w, R, 16, s => { const h = R.range(70, 200); w.prop(s, side(R, 45, 260), 0, R() < 0.6 ? L.cone : L.crystal, { ground: -10, flat: true, yaw: ang(R), scale: [R.range(8, 22), h, R.range(8, 22)], color: deep, p: [2, 0.05, 0, 0] }); });
    },
    draw(r, L, st) {
      ground(r, L.plane, st.cam, -2, 1200, 40, [0.8, 0.9, 1, 1], [3, 0.3, 10, 0]);
      for (let k = 0; k < 110; k++) { // snow, blowing across the canyon
        const s = st.s + fract(k * 0.618) * 260, x = ((fract(k * 0.21 + st.t * 0.04) - 0.5) * 60), h = (1 - fract(k * 0.37 + st.t * (0.05 + (k % 5) * 0.01))) * 60 - 10;
        const p = st.path.world(s, x, 0); p[1] = h; basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12 + (k % 3) * 0.05);
        r.draw(L.quad, tmp, [0.9, 0.95, 1, 0.8], [1, 1, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- The Ashes (the Archive's B-side)
  ashes: {
    name: 'The Ashes', path: PATH_STYLES.archive, bounds: { w: 15, h: 10 }, bSide: true,
    pre: P({ skyTop: '#060100', skyHorizon: '#3a0c04', skyBottom: '#000000', horizonGlow: 0.7, fog: '#160604', fogDensity: 0.0042, palA: '#2a1a12', palB: '#080302', palC: '#ff7a20', light: [0.2, 1, 0.3], ambient: 0.28, enemy: '#ffe8b0', bullet: '#40c8ff' }),
    post: P({ skyTop: '#0a0200', skyHorizon: '#6a1806', skyBottom: '#000000', horizonGlow: 1, fog: '#220804', fogDensity: 0.0036, palA: '#3a2214', palB: '#0a0402', palC: '#ffa030', light: [0.2, 1, 0.3], ambient: 0.32, enemy: '#ffe8b0', bullet: '#40c8ff' }),
    enemies: ['glyph_swarm', 'mirror_kite', 'echo_diver', 'splitter', 'worm'],
    build(w, R) {
      const L = w.lib, shelves = [L.shelf0, L.shelf1, L.shelf2, L.shelf3], char = [0.16, 0.12, 0.1, 1];
      // the library after the fire: charred shelves with gaps, some still glowing, some tipped over across the hall
      for (let s = 0; s < w.path.n - 40; s += 6.2) for (const sd of [-1, 1]) for (let lv = -3; lv <= 3; lv++) {
        if (R() < 0.35) continue;
        const hot = R() < 0.12;
        w.prop(s, sd * 26, lv * 10.6 - 5, pick(R, shelves), { yaw: -sd * Math.PI / 2, roll: R() < 0.1 ? R.range(-0.4, 0.4) : 0, scale: [1, 1, 1], color: hot ? [0.9, 0.35, 0.12, 1] : char, p: [0, hot ? 0.5 : 0.02, 0, 0], anim: hot ? flicker : null, data: { k: R() }, far: 300 });
        if (hot && R() < 0.5) w.prop(s, sd * 24, lv * 10.6 - 1, L.c_flame, { scale: [R.range(1.5, 3), R.range(2.5, 5), R.range(1.5, 3)], color: [1, 0.45, 0.1, 0.8], p: [1, 1.6, 0, 0], pass: PASS.ADD, anim: burn, data: { k: R() }, far: 300 });
      }
      every(w, R, 30, s => { const y = side(R, 17, 30); w.prop(s, 0, y, L.shelf1, { frame: true, roll: R.range(-0.5, 0.5), yaw: Math.PI / 2 + R.range(-0.2, 0.2), scale: [1, 1, 1], color: char, p: [0, 0.02, 0, 0] }); });
      // the outer walls burn behind their windows; columns of smoke; burning pages rising around you
      for (let s = 0; s < w.path.n - 40; s += 36) for (const sd of [-1, 1]) w.prop(s, sd * 60, 0, L.box, { scale: [3, 90, 37], color: [0.25, 0.12, 0.08, 1], p: [7, 1, 1, 0] });
      every(w, R, 40, s => { const [x, y] = around(R, 70, 160); w.prop(s, x, y, L.blob, { scale: [R.range(20, 45), R.range(40, 90), R.range(20, 45)], color: [0.07, 0.05, 0.05, 1], p: [0, 0, 0.2, 1] }); });
      every(w, R, 3, s => { const [x, y] = around(R, 16, 40); w.prop(s, x, y, L['c_sheet' + Math.floor(R() * 3)], { yaw: ang(R), roll: ang(R), scale: [R.range(0.8, 1.6)], color: [1, 0.55, 0.25, 1], p: [0, 0.7, 0, 0], anim: ascend, data: { k: R(), sp: R.range(0.8, 2) } }); });
    },
    draw(r, L, st) {
      for (let k = 0; k < 100; k++) { // embers up, ash down
        const up = k % 3 !== 0, s = st.s + fract(k * 0.618) * 280, x = Math.sin(k * 12.9 + st.t * 0.2) * 24;
        const y = up ? (fract(k * 0.37 + st.t * 0.06) - 0.5) * 70 : (0.5 - fract(k * 0.37 + st.t * 0.02)) * 70;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], up ? 0.14 : 0.22);
        r.draw(L.quad, tmp, up ? [1, 0.5, 0.15, 0.9] : [0.4, 0.38, 0.36, 0.5], [1, up ? 1.6 : 0.5, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- Recursion (Fractal Bloom's B-side)
  recursion: {
    name: 'Recursion', path: PATH_STYLES.fractal, bounds: { w: 15, h: 10 }, bSide: true,
    pre: P({ skyTop: '#06051a', skyHorizon: '#2c2660', skyBottom: '#04030c', horizonGlow: 0.5, skyMode: 5, fog: '#120f2c', fogDensity: 0.003, palA: '#ece4d4', palB: '#5c5478', palC: '#ffd070', light: [0.4, 0.9, 0.3], ambient: 0.55, enemy: '#ff3070', bullet: '#40ffff' }),
    post: P({ skyTop: '#0a0414', skyHorizon: '#4a2a60', skyBottom: '#06030c', horizonGlow: 0.8, skyMode: 5, fog: '#1c1030', fogDensity: 0.0028, palA: '#f4e8dc', palB: '#6a4c80', palC: '#ffb050', light: [0.4, 0.9, 0.3], ambient: 0.6, enemy: '#ff3070', bullet: '#40ffff' }),
    enemies: ['bloom', 'corruptor', 'splitter', 'worm', 'glyph_swarm'],
    build(w, R) {
      const L = w.lib, stone = [0.92, 0.9, 0.85, 1], gold = [1, 0.8, 0.4, 1];
      // a corridor of doorways, each turned a quarter from the last: every one is the floor of the next
      every(w, R, 24, s => { const q = Math.floor(s / 24) % 4, roll = q * Math.PI / 2 + R.range(-0.06, 0.06), c = Math.cos(roll), sn = Math.sin(roll);
        w.prop(s, 0, 0, L.c_doorway, { frame: true, roll, scale: [46, 46, 34], color: stone, p: [0, 0.05, 0, 0] });
        // a line of gold script across every lintel and two lamps on the posts, warm against the violet
        w.prop(s - 2.2, -17.9 * sn, 17.9 * c, L.quad, { frame: true, roll, scale: [11, 1.3, 1], color: gold, p: [5, 0.9, 0, 0], anim: pulse });
        for (const sx of [-1, 1]) w.prop(s - 2.6, sx * 21 * c - 13 * sn, sx * 21 * sn + 13 * c, L.quad, { frame: true, scale: [1.5, 1.5, 1], color: [1, 0.75, 0.35, 0.7], p: [1, 1.5, 0, 9], pass: PASS.ADD, anim: flicker, data: { k: R() } });
      }, 20);
      // Droste: doorways inside doorways inside doorways, each level turning at its own speed, a light at the bottom
      every(w, R, 140, s => { const [x, y] = around(R, 95, 210), S = R.range(40, 70), dir = R.sign(), r0 = ang(R);
        for (let k = 0; k < 8; k++) w.prop(s + k * 0.5, x, y, L.c_doorway, { roll: r0 + k * 0.28, scale: [S * Math.pow(0.76, k)], color: k % 2 ? gold : stone, p: k % 2 ? [2, 0.25, 0, 0] : [0, 0.08, 0, 0], anim: spinRoll, data: { spin: dir * (0.04 + k * 0.035) } });
        w.prop(s + 4.5, x, y, L.quad, { scale: [S * 0.12, S * 0.12, 1], color: [1, 0.85, 0.5, 1], p: [1, 2.2, 0, 9], pass: PASS.ADD, anim: pulse }); }, 70);
      // staircases on every wall, ceiling and floor; blocks with stairs climbing their faces
      every(w, R, 4, s => { const [x, y] = around(R, 19, 70); const a = Math.atan2(y, x); w.prop(s, x, y, L.c_stairs, { roll: a + Math.PI / 2 + (R() < 0.5 ? 0 : Math.PI), yaw: R() < 0.5 ? 0 : Math.PI / 2, scale: [R.range(2, 5)], color: stone, p: [0, 0.04, 0, 0] }); });
      // blocks with stairs climbing their faces: they turn a quarter on the last beat of every bar, edges lit in gold
      every(w, R, 12, s => { const [x, y] = around(R, 30, 110); const sc = R.range(6, 16), rr = ang(R), yy = ang(R), d = { dir: R.sign(), ph: Math.floor(R() * 4) };
        w.prop(s, x, y, L.c_chamfer, { roll: rr, yaw: yy, scale: [sc], color: [0.8, 0.76, 0.72, 1], p: [0, 0.04, 0, 0], anim: quarter, data: d });
        w.prop(s, x, y, L.c_stairs, { roll: rr, yaw: yy, scale: [sc * 0.6], color: stone, p: [0, 0.04, 0, 0], anim: quarter, data: d });
        w.prop(s, x, y, L.wireBox, { roll: rr, yaw: yy, scale: [sc * 1.02], color: [1, 0.8, 0.4, 0.8], p: [1, 1, 0, 0], pass: PASS.ADDLINE, anim: quarter, data: { ...d, glow: true } }); });
      // spiral stairs standing in every direction, arches, and impossible triangles turning far away
      every(w, R, 28, s => { const [x, y] = around(R, 35, 120); w.prop(s, x, y, L.c_helix, { roll: ang(R), yaw: ang(R), scale: [R.range(8, 20)], color: stone, p: [0, 0.05, 0, 0], anim: spin, data: { spin: R.range(-0.15, 0.15) } }); });
      every(w, R, 20, s => { const [x, y] = around(R, 25, 90); w.prop(s, x, y, L.arch, { roll: ang(R), yaw: ang(R), scale: [R.range(6, 14), R.range(8, 18), 2], color: stone, p: [0, 0.04, 0, 0] }); });
      every(w, R, 60, s => { const [x, y] = around(R, 120, 260); w.prop(s, x, y, L.c_tribar, { roll: ang(R), yaw: ang(R), scale: [R.range(40, 90)], color: gold, p: [2, 0.25, 0, 0], anim: spin, data: { spin: R.range(-0.1, 0.1) } }); });
    },
    draw(r, L, st) {
      // Escher's tiled floor far below and the same floor as a ceiling far above: an endless hall
      const py = st.path.pos(st.s)[1];
      ground(r, L.plane, st.cam, py - 85, 1600, 40, [0.72, 0.72, 0.75, 1], [3, 0.18, 12, 0]);
      ground(r, L.plane, st.cam, py + 120, 1600, 40, [0.45, 0.45, 0.5, 1], [3, 0.12, 12, 0]);
      for (let k = 0; k < 70; k++) { // gold motes drifting in the still air
        const s = st.s + fract(k * 0.618) * 240, x = Math.sin(k * 12.9 + st.t * 0.07) * 32, y = Math.cos(k * 7.7 + st.t * 0.05) * 22;
        const p = st.path.world(s, x, y); basisMat(tmp, p, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12 + (k % 3) * 0.05);
        r.draw(L.quad, tmp, [1, 0.82, 0.45, 0.8], [1, 1.4 + st.kick * 0.6, 0, 9], PASS.ADD);
      }
    },
  },
  // ------------------------------------------------------------------------------------------- Event Horizon (the Core's B-side)
  horizon: {
    name: 'Event Horizon', path: PATH_STYLES.core, bounds: { w: 15, h: 10 }, bSide: true, collapsing: true,
    pre: P({ skyTop: '#000000', skyHorizon: '#140608', skyBottom: '#000000', horizonGlow: 0.25, skyMode: 8, fog: '#060203', fogDensity: 0.0024, palA: '#3a2420', palB: '#000000', palC: '#ff9040', light: [0.1, 0.2, 1], ambient: 0.35, collapse: 0.3, enemy: '#ffffff', bullet: '#ff6020' }),
    post: P({ skyTop: '#000000', skyHorizon: '#060203', skyBottom: '#000000', horizonGlow: 0.1, skyMode: 8, fog: '#000000', fogDensity: 0.0016, palA: '#1a1010', palB: '#000000', palC: '#ffe0a0', light: [0.1, 0.2, 1], ambient: 0.22, collapse: 1, enemy: '#ffe0c0', bullet: '#ff4010' }),
    enemies: ['agent', 'hunter', 'bloom', 'glyph_swarm', 'mirror_kite', 'worm', 'echo_diver', 'corruptor'],
    build(w, R) {
      const L = w.lib;
      // every layer's wreckage again, dark, lit from the disk ahead; as the Deep collapses it is stretched toward the hole
      const kinds = [[L.tower, [0.25, 0.22, 0.3, 1], [7, 0.8, 1, 0], 6], [L.pyramid, [0.5, 0.45, 0.5, 1], [2, 0, 0, 0], 6], [L.rock, [0.5, 0.2, 0.1, 1], [5, 0.4, 0, 0], 4],
        [L.shelf1, [0.3, 0.22, 0.18, 1], [0, 0.05, 0, 0], 0.7], [L.crystal, [0.5, 0.3, 0.6, 1], [2, 0.3, 0, 0], 3], [L.c_doorway, [0.6, 0.55, 0.5, 1], [0, 0.05, 0, 0], 8], [L.spikeBall, [0.08, 0.08, 0.1, 1], [2, 0.1, 0, 0], 2.5], [L.c_jellyBell, [0.4, 0.2, 0.1, 1], [2, 0.2, 0, 0], 4]];
      for (let s = 20; s < w.path.n - 60; s += 2.6) {
        const kind = kinds[Math.min(kinds.length - 1, Math.floor((s / w.path.n) * kinds.length + R() * 1.5))];
        const arm = Math.floor(R() * 2), a = -s * 0.016 + arm * Math.PI + R.range(-0.4, 0.4), rad = R.range(30, 85);
        w.prop(s, Math.cos(a) * rad, Math.sin(a) * rad, kind[0], { scale: [kind[3] * R.range(0.6, 1.8)], yaw: ang(R), roll: ang(R), color: kind[1], p: kind[2].slice(), anim: spaghetti, data: { spin: R.range(-0.6, 0.6) } });
      }
      // torn rings and streams of matter racing ahead into the dark
      every(w, R, 36, s => w.prop(s, 0, 0, L.ringArc, { frame: true, scale: [R.range(26, 44)], roll: ang(R), color: [1, 0.55, 0.2, 1], p: [1, 1.2, 0, 0], anim: spinRoll, data: { spin: R.range(-0.8, 0.8) } }));
      every(w, R, 6, s => { const [x, y] = around(R, 26, 140); w.prop(s, x, y, L.beam, { scale: [0.25, 0.25, R.range(30, 90)], color: [1, 0.6, 0.25, 1], p: [1, 1.6, 0, 0], pass: PASS.ADD, anim: stream, data: { k: R() } }); });
    },
    draw(r, L, st) {
      // the hole ahead grows as the Deep collapses: a black sphere, its disk, the photon ring
      const c = st.collapse, s = st.s + 760, p = st.path.world(s, 0, 40), f = st.path.fwd(st.s), rr = st.path.right(st.s), u = st.path.up(st.s);
      const R0 = 40 + c * 220;
      basisMat(tmp, p, rr, u, f, R0); r.draw(L.icoSmooth, tmp, [0, 0, 0, 1], [1, 0, 0, 0]);
      const t = st.t, tilt = 0.32;
      const du = [u[0] * Math.cos(tilt) + f[0] * Math.sin(tilt), u[1] * Math.cos(tilt) + f[1] * Math.sin(tilt), u[2] * Math.cos(tilt) + f[2] * Math.sin(tilt)];
      const df = [f[0] * Math.cos(tilt) - u[0] * Math.sin(tilt), f[1] * Math.cos(tilt) - u[1] * Math.sin(tilt), f[2] * Math.cos(tilt) - u[2] * Math.sin(tilt)];
      for (let k = 0; k < 4; k++) { const a = t * (0.3 - k * 0.05), ca = Math.cos(a), sa = Math.sin(a);
        const rx = [rr[0] * ca + df[0] * sa, rr[1] * ca + df[1] * sa, rr[2] * ca + df[2] * sa], fx = [df[0] * ca - rr[0] * sa, df[1] * ca - rr[1] * sa, df[2] * ca - rr[2] * sa];
        basisMat(tmp, p, rx, fx, du, R0 * (1.5 + k * 0.45)); r.draw(L.c_tickRing, tmp, [1, 0.5 + k * 0.1, 0.2, 1], [1, 1.6 - k * 0.3 + st.kick * 0.5, 0, 0]); }
      basisMat(tmp, p, rr, u, f, R0 * 1.06); r.draw(L.wireRing, tmp, [1, 0.95, 0.8, 1], [1, 2, 0, 0], PASS.ADDLINE);
    },
  },
};
// --------------------------------------------------------------------------------------------- prop animations
function pulse(pr, p, st) { p[1] = p[1] * (1 + st.kick * 1.2); }
function flicker(pr, p, st) { p[1] = p[1] * (0.6 + 0.4 * (Math.sin(st.t * 13 + pr.data.k * 40) > -0.6 ? 1 : 0.2) + st.kick * 0.5); }
function spin(pr, p, st) { // turn around the prop's local up axis
  if (!pr.base) pr.base = pr.m.slice();
  const d = pr.data || {}; const a = st.t * (d.spin || 0.3) + (d.ph || 0); const c = Math.cos(a), sn = Math.sin(a); const b = pr.base, m = pr.m;
  for (let k = 0; k < 3; k++) { const x = b[k], z = b[8 + k]; m[k] = x * c - z * sn; m[8 + k] = x * sn + z * c; }
}
function spinRoll(pr, p, st) { // turn around the prop's local forward axis (rings around the corridor)
  if (!pr.base) pr.base = pr.m.slice();
  const a = st.t * (pr.data.spin || 0.3); const c = Math.cos(a), sn = Math.sin(a); const b = pr.base, m = pr.m;
  for (let k = 0; k < 3; k++) { const x = b[k], y = b[4 + k]; m[k] = x * c - y * sn; m[4 + k] = x * sn + y * c; }
  p[1] = p[1] * (1 + st.kick * 0.8);
}
function quarter(pr, p, st) { // Recursion: a quarter turn around the prop's forward axis on the last beat of every bar
  if (!pr.base) pr.base = pr.m.slice();
  const d = pr.data, bar = (st.beat || st.t * 2) / 4 + d.ph, k = clamp((bar % 1 - 0.75) * 4, 0, 1);
  const a = d.dir * (Math.floor(bar) + k * k * (3 - 2 * k)) * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), b = pr.base, m = pr.m;
  for (let i = 0; i < 3; i++) { const x = b[i], y = b[4 + i]; m[i] = x * c - y * sn; m[4 + i] = x * sn + y * c; }
  if (d.glow) p[1] = 1 + st.kick * 1.5 + (k > 0 && k < 1 ? 1.5 : 0);
}
function bob(pr, p, st) {
  if (!pr.base) pr.base = pr.m.slice();
  pr.m[13] = pr.base[13] + Math.sin(st.t * 0.8 + pr.data.k * 20) * 1.5;
}
function lava(pr, p, st) { p[1] = 1 + 0.5 * Math.sin(st.t * 2 + pr.data.k * 0.05) + st.kick * 0.8; }
function rise(pr, p, st) { // towers rise out of the grid in the FIRST drop only, and stay up for the rest of the dive
  const k = clamp((st.sinceFirstDrop - pr.data.k * 1.6) / 1.4, 0, 1);
  p[2] = st.sinceFirstDrop >= 0 ? 0.15 + 0.85 * (1 - Math.pow(1 - k, 3)) : 0.15 + 0.05 * Math.sin(st.t + pr.data.k * 9);
  p[1] = p[1] * (1 + st.kick * 0.5);
  if (pr.data.ring !== undefined) { if (!pr.base) pr.base = pr.m.slice(); pr.m[13] = pr.base[13] * p[2]; p[2] = 0; }
}
function collapse(pr, p, st) { // shelves shatter in the drops near the camera
  if (st.drop && pr.s > st.s + 30 && pr.s < st.s + 260 && pr.data.k < 0.12) { const d = clamp((st.s + 260 - pr.s) / 230, 0, 1); p[2] = d * d * 30; p[3] = 2; }
}
function bloomOpen(pr, p, st) { p[1] = 0.6 + st.kick * 1.5 + 0.5 * Math.sin(st.t * 2 + pr.data.k * 6); }
function laser(pr, p, st) {
  if (!pr.base) pr.base = pr.m.slice();
  const a = Math.sin(st.t * (0.5 + pr.data.k) + pr.data.k * 10) * 1.2;
  const m = pr.m, b = pr.base; const c = Math.cos(a), s = Math.sin(a);
  m[8] = b[8] * c - b[10] * s; m[10] = b[8] * s + b[10] * c;
  p[1] = 2 + st.kick * 2;
}
function drift(pr, p, st) { // the Core: debris turns, and falls apart as the Deep collapses
  spin(pr, p, st);
  if (st.collapse > 0.3) { p[2] = (st.collapse - 0.3) * 2; p[3] = p[3] || 2; }
}
function jelly(pr, p, st) { // bells contract on the kick and the jellyfish drift upward
  if (!pr.base) pr.base = pr.m.slice();
  const d = pr.data, k = 1 - st.kick * 0.18 + Math.sin(st.t * 1.6 + d.k * 20) * 0.05, b = pr.base, m = pr.m;
  for (let i = 0; i < 3; i++) { m[i] = b[i] * k; m[8 + i] = b[8 + i] * k; m[4 + i] = b[4 + i] * (2 - k); }
  m[13] = b[13] + ((st.t * 0.6 + d.k * 16) % 16) - 8;
}
function ascend(pr, p, st) { // pages burning their way up
  if (!pr.base) pr.base = pr.m.slice();
  const d = pr.data; pr.m[13] = pr.base[13] + ((st.t * d.sp + d.k * 60) % 60) - 30;
  p[1] = 0.5 + 0.4 * Math.sin(st.t * 9 + d.k * 30);
}
function burn(pr, p, st) {
  if (!pr.base) pr.base = pr.m.slice();
  const k = 0.85 + 0.15 * Math.sin(st.t * 11 + pr.data.k * 40) + 0.1 * Math.sin(st.t * 17 + pr.data.k * 9) + st.kick * 0.15;
  for (let i = 0; i < 3; i++) pr.m[4 + i] = pr.base[4 + i] * k;
}
function stream(pr, p, st) { p[1] = (0.4 + st.collapse * 2) * (0.6 + 0.4 * Math.sin(st.t * 3 + pr.data.k * 20)); }
function spaghetti(pr, p, st) { // Event Horizon: wreckage turns, then stretches along the path and is pulled inward
  spin(pr, p, st);
  const c = st.collapse;
  if (c > 0.15) {
    const k = 1 + (c - 0.15) * 7, f = st.path.fwd(pr.s), m = pr.m, ctr = st.path.pos(pr.s), pull = Math.min(0.3, (c - 0.15) * 0.35);
    for (let i = 0; i < 3; i++) m[4 + i] = pr.base[4 + i];   // spin() only rewrites the other two axes
    for (const o of [0, 4, 8]) { /* stretch along the path */ const dot = m[o] * f[0] + m[o + 1] * f[1] + m[o + 2] * f[2]; m[o] += f[0] * dot * (k - 1); m[o + 1] += f[1] * dot * (k - 1); m[o + 2] += f[2] * dot * (k - 1); }
    m[12] = lerp(pr.base[12], ctr[0], pull); m[13] = lerp(pr.base[13], ctr[1], pull); m[14] = lerp(pr.base[14], ctr[2], pull);
    p[1] = (p[1] || 0) + (c - 0.15) * 0.8;
  }
}
function hsv(h, s, v, a = 1) { const f = (n) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1), a]; }

// palette at this moment: pre / post Breach blend (+ underwater for the Chrome Sea, white collapse for the Core)
export function kitPalette(kit, st) {
  let pal = blendPal(kit.pre, kit.post, kit.collapsing ? st.collapse : st.post);
  if (kit.under && st.under > 0) pal = blendPal(pal, kit.under, st.under);
  if (kit.collapsing) { pal = { ...pal, collapse: st.collapse }; }
  return pal;
}
// SHIFT: every layer has its own B-side world laid over the same corridor (nine shadow layers, one per layer)
export const SHIFT_PAIR = { calibration: 'static', grid_city: 'graveyard', chrome_sea: 'trench', firewall: 'cold', archive: 'ashes', fractal: 'recursion', garden: 'negative', black_ice: 'hive', core: 'horizon' };
export function kitFor(id) { return KITS[id] || KITS.grid_city; }
export { rng };
