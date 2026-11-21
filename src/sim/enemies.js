// ICE and other things in the Deep (bible §13). Behaviours are coroutines that wait in beats (`yield* D.beats(n)`),
// the scripting style of the Saint Dragon port. Positions are in path space: s (metres along the path), x, y (metres in
// the corridor plane). `e.rel` enemies keep their distance ahead of the player (they fly with you); `e.world` enemies stay
// put in the world and you fly past them.
import { clamp, lerp } from '../core/math.js';

export const ENEMY_TYPES = {
  pinger: { hp: 2, r: 1.4, mesh: 'octa', scale: [1.2, 1.2, 1.2], score: 100, spin: 3, ai: pingerAI },
  tracer: { hp: 1, r: 1.1, mesh: 'dart', scale: [1.5, 1.5, 1.5], score: 80, lines: true, ai: tracerAI },
  shutter: { hp: 4, r: 3.2, mesh: 'panel', scale: [6, 6, 1], score: 150, ai: shutterAI, world: true },
  mirror_kite: { hp: 3, r: 1.8, mesh: 'kite', scale: [2, 2, 2], score: 200, chrome: true, reflect: true, ai: kiteAI },
  splitter: { hp: 3, r: 1.6, mesh: 'box', scale: [2.2, 2.2, 2.2], score: 120, spin: 1.5, ai: splitterAI },
  splitlet: { hp: 1, r: 0.9, mesh: 'box', scale: [1, 1, 1], score: 40, spin: 4, ai: splitletAI },
  scanner: { hp: 5, r: 2.4, mesh: 'ringThick', scale: [2.6, 2.6, 2.6], score: 250, ai: scannerAI },
  worm: { hp: 8, r: 1.5, mesh: 'icoSmooth', scale: [1.6, 1.6, 1.6], score: 400, ai: wormAI },
  wormseg: { hp: 999, r: 1.3, mesh: 'icoSmooth', scale: [1.2, 1.2, 1.2], score: 0, armored: true, ai: wormSegAI, nolock: true },
  glyph: { hp: 1, r: 1.0, mesh: 'glyph', scale: [2, 2, 2], score: 50, lines: true, ai: glyphAI, areaWeak: true },
  gatekeeper: { hp: 26, r: 7, mesh: 'face', scale: [9, 9, 9], score: 1200, ai: gatekeeperAI, world: true, mouthWeak: true },
  corruptor: { hp: 4, r: 2.2, mesh: 'blob', scale: [2.2, 2.2, 2.2], score: 220, morph: 0.6, ai: corruptorAI },
  hunter: { hp: 4, r: 1.6, mesh: 'tetra', scale: [2.6, 1.2, 4], score: 300, ai: hunterAI },
  echo_diver: { hp: 4, r: 1.4, mesh: 'avatar0', scale: [1.6, 1.6, 1.6], score: 280, lines: true, ai: echoAI },
  bloom: { hp: 5, r: 2.2, mesh: 'flower8', scale: [2.6, 2.6, 2.6], score: 260, ai: bloomAI, world: true },
  agent: { hp: 5, r: 1.6, mesh: 'agent', scale: [1.4, 1.4, 1.4], score: 320, chrome: true, ai: agentAI },
  node: { hp: 14, r: 3, mesh: 'wireIco', scale: [3.2, 3.2, 3.2], score: 600, lines: true, ai: nodeAI, world: true, objective: true },
};

// ------------------------------------------------------------------------------------------------ helpers
function* approach(e, D, dist, rate = 2.5) { // fly in from far ahead to a held distance
  e.rel = true;
  while (Math.abs(e.d - dist) > 1) { e.d = lerp(e.d, dist, Math.min(1, D.dt * rate)); yield; }
}
function* leave(e, D, dir = 1) { // fly away (ahead or past) and despawn
  e.leaving = true;
  for (let k = 0; k < 400; k++) { e.d += dir * D.dt * 60; e.x += e.vx * D.dt; e.y += e.vy * D.dt; if (e.d > 420 || e.d < -20) break; yield; }
  e.gone = true;
}
function* wiggle(e, D, beats, amp = 4) {
  const t0 = D.t, x0 = e.x, y0 = e.y, ph = e.seed * 10;
  const end = D.beatAfter(beats);
  while (D.t < end) { const k = (D.t - t0) * 2.2; e.x = x0 + Math.sin(k + ph) * amp; e.y = y0 + Math.cos(k * 0.8 + ph) * amp * 0.5; yield; }
}

// ------------------------------------------------------------------------------------------------ behaviours
function* pingerAI(e, D) {
  yield* approach(e, D, e.hold || 80);
  for (let i = 0; i < (e.shots || 4); i++) {
    yield* D.onBeat(D.R() < 0.5 ? 1 : 2);
    D.telegraph(e);
    yield* D.onBeat(1);
    D.shoot(e, { speed: 34 });
    e.x += (D.R() - 0.5) * 4;
  }
  e.vx = (D.R() - 0.5) * 20; yield* leave(e, D);
}
function* tracerAI(e, D) {
  e.rel = true; e.d = e.d || 240;
  yield* D.onBeat(1);
  // dive at the player, homing a little, then pass by
  while (e.d > -10) {
    e.d -= D.dt * (60 + e.speed * 0.4);
    const k = e.d > 30 ? 1.2 : 0.2;
    e.x += clamp(D.px - e.x, -1, 1) * D.dt * 12 * k; e.y += clamp(D.py - e.y, -1, 1) * D.dt * 10 * k;
    e.face = true; yield;
  }
  e.gone = true;
}
function* shutterAI(e, D) { // panels open and close on the beat; vulnerable only when open
  e.open = 0;
  while (true) {
    yield* D.onBeat(1);
    e.openUntil = D.t + D.spb * 0.5; e.vuln = true;
    while (D.t < e.openUntil) { e.open = Math.min(1, e.open + D.dt * 10); yield; }
    e.vuln = false;
    while (e.open > 0) { e.open = Math.max(0, e.open - D.dt * 10); yield; }
  }
}
function* kiteAI(e, D) {
  yield* approach(e, D, e.hold || 90);
  for (let i = 0; i < 3; i++) {
    yield* wiggle(e, D, 2, 6);
    D.telegraph(e); yield* D.onBeat(1);
    for (let k = -1; k <= 1; k++) D.shoot(e, { speed: 30, spread: k * 0.12 });
  }
  yield* leave(e, D);
}
function* splitterAI(e, D) { yield* approach(e, D, e.hold || 100); yield* wiggle(e, D, 4, 3); D.telegraph(e); yield* D.onBeat(1); D.shoot(e, { speed: 30 }); yield* wiggle(e, D, 4, 5); yield* leave(e, D); }
function* splitletAI(e, D) {
  e.rel = true; const vx = (D.R() - 0.5) * 18, vy = (D.R() - 0.5) * 14;
  for (let k = 0; k < 90; k++) { e.x += vx * D.dt; e.y += vy * D.dt; e.d -= D.dt * 10; yield; }
  yield* D.onBeat(1); D.shoot(e, { speed: 26 }); yield* leave(e, D, -1);
}
function* scannerAI(e, D) { // sweeps a red beam across the corridor; being caught raises the alarm
  yield* approach(e, D, e.hold || 70);
  e.beam = 0;
  const end = D.beatAfter(16);
  while (D.t < end) {
    e.beam = Math.sin((D.t - e.t0) * 1.4) * D.bounds.w * 1.1;
    e.beamOn = true;
    if (Math.abs(D.px - e.beam) < 1.6 && !e.alarmed && !D.phase && D.sameSide(e)) { e.alarmed = true; D.alarm(e); }
    yield;
  }
  e.beamOn = false; yield* leave(e, D);
}
function* wormAI(e, D) { // segmented chain; the head is the weak point
  e.rel = true; e.d = e.d || 220;
  const segs = [];
  for (let i = 0; i < 8; i++) segs.push(D.spawnRaw('wormseg', { d: e.d + (i + 1) * 3, x: e.x, y: e.y, parent: e, idx: i }));
  e.segs = segs; e.trail = [];
  let ph = D.R() * 6;
  const hold = e.hold || 70;
  const end = D.beatAfter(24);
  while (D.t < end) {
    e.d = lerp(e.d, hold, D.dt * 0.8);
    ph += D.dt * 2.2;
    e.x = Math.sin(ph) * D.bounds.w * 0.7; e.y = Math.cos(ph * 0.7) * D.bounds.h * 0.6;
    e.trail.unshift([e.d, e.x, e.y]); if (e.trail.length > 200) e.trail.pop();
    if (D.isBeat(2)) D.shoot(e, { speed: 28 });
    yield;
  }
  yield* leave(e, D);
}
function* wormSegAI(e, D) {
  e.rel = true;
  while (!e.parent.dead && !e.parent.gone) {
    const tr = e.parent.trail || []; const p = tr[Math.min(tr.length - 1, (e.idx + 1) * 6)];
    if (p) { e.d = p[0] + (e.idx + 1) * 2.4; e.x = p[1]; e.y = p[2]; }
    yield;
  }
  if (e.parent.dead) { D.explode(e, 0.6); e.dead = true; } else e.gone = true;
}
function* glyphAI(e, D) { // floats in swarms; patterns turn on the beat
  yield* approach(e, D, e.hold || 85, 1.5);
  const cx = e.x, cy = e.y; let a = e.seed * 6.28;
  const end = D.beatAfter(12);
  while (D.t < end) { a += D.dt * (D.beatPhase < 0.15 ? 4 : 1.2); e.x = cx + Math.cos(a) * 5; e.y = cy + Math.sin(a) * 3; if (D.isBeat(4) && D.R() < 0.2) D.shoot(e, { speed: 24 }); yield; }
  yield* leave(e, D);
}
function* gatekeeperAI(e, D) { // a huge face on a wall; opens its mouth on beats, fire inside
  e.mouth = 0;
  while (true) {
    yield* D.onBeat(2);
    e.vuln = true; const until = D.t + D.spb * 1.2;
    while (D.t < until) { e.mouth = Math.min(1, e.mouth + D.dt * 6); if (D.isBeat(1)) for (let k = -2; k <= 2; k++) D.shoot(e, { speed: 26, spread: k * 0.15 }); yield; }
    e.vuln = false; while (e.mouth > 0) { e.mouth = Math.max(0, e.mouth - D.dt * 6); yield; }
  }
}
function* corruptorAI(e, D) {
  yield* approach(e, D, e.hold || 90, 1.2);
  const end = D.beatAfter(16);
  while (D.t < end) { yield* wiggle(e, D, 2, 6); D.corruption(e); }
  yield* leave(e, D);
}
function* hunterAI(e, D) { // black, angular, fast: comes from behind, overtakes, turns and fires
  e.rel = true; e.d = -40; e.behind = true; e.vuln = false;
  while (e.d < -6) { e.d += D.dt * 22; e.x = lerp(e.x, D.px, D.dt * 1.5); e.y = lerp(e.y, D.py, D.dt * 1.5); yield; }
  // close: rams the player unless they boost away or roll
  const tRam = D.t + 1.2;
  while (D.t < tRam) { e.d += D.dt * (D.boosting ? -8 : 8); e.x = lerp(e.x, D.px, D.dt * 3); e.y = lerp(e.y, D.py, D.dt * 3); if (Math.abs(e.d) < 2 && Math.hypot(e.x - D.px, e.y - D.py) < 2) D.ram(e, 14); yield; }
  e.behind = false; e.vuln = true;
  while (e.d < 60) { e.d += D.dt * 70; e.x += (D.R() - 0.5) * D.dt * 20; yield; }
  for (let i = 0; i < 3; i++) { yield* D.onBeat(1); D.shoot(e, { speed: 40 }); }
  yield* leave(e, D);
}
function* echoAI(e, D) { // ghost of a past test subject: mimics your movement a beat late
  yield* approach(e, D, e.hold || 50, 1.5);
  const end = D.beatAfter(16);
  while (D.t < end) {
    const h = D.history(D.spb);
    e.x = lerp(e.x, -h[0], D.dt * 6); e.y = lerp(e.y, h[1], D.dt * 6);
    if (D.isBeat(2)) { D.telegraph(e); }
    if (D.isBeat(2, 0.5)) D.shoot(e, { speed: 36 });
    yield;
  }
  yield* leave(e, D);
}
function* bloomAI(e, D) { // fractal flower: grows tendrils on the beat
  e.grow = 0;
  while (true) { yield* D.onBeat(1); e.grow = Math.min(1, e.grow + 0.25); if (e.d < 160 && e.d > 15) for (let k = 0; k < 3; k++) D.shoot(e, { speed: 18, spread: (k - 1) * 0.5, kind: 'tendril' }); }
}
function* agentAI(e, D) { // chrome humanoids: fly in formation, lock on (telegraphed), fire bursts
  yield* approach(e, D, e.hold || 75, 1.8);
  for (let i = 0; i < 3; i++) {
    yield* wiggle(e, D, 2, 3);
    D.telegraph(e, true); yield* D.onBeat(1);
    for (let k = 0; k < 3; k++) { D.shoot(e, { speed: 44 }); yield* D.wait(0.08); }
  }
  yield* leave(e, D);
}
function* nodeAI(e) { while (true) yield; }

// formation offsets for a group of n (corridor-plane units, scaled by bounds)
export function formation(shape, n, R, B) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0.5, c = k * 2 - 1;
    switch (shape) {
      case 'line': o.push([c * B.w * 0.8, 0]); break;
      case 'column': o.push([0, c * B.h * 0.8]); break;
      case 'v': o.push([c * B.w * 0.7, -Math.abs(c) * B.h * 0.7 + B.h * 0.3]); break;
      case 'circle': { const a = (i / n) * Math.PI * 2; o.push([Math.cos(a) * B.w * 0.55, Math.sin(a) * B.h * 0.6]); break; }
      case 'diag': o.push([c * B.w * 0.8, c * B.h * 0.7]); break;
      case 'pincer': o.push([(i % 2 ? 1 : -1) * B.w * 0.85, (k - 0.5) * B.h]); break;
      default: o.push([(R() - 0.5) * B.w * 1.6, (R() - 0.5) * B.h * 1.6]);
    }
  }
  return o;
}
export const SHAPES = ['line', 'column', 'v', 'circle', 'diag', 'pincer', 'random'];
