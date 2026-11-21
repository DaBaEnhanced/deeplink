// Bosses (bible §11.1, §13): multi-phase, synchronised with the second drop. Phase changes land on section thirds
// (8-bar boundaries); the final hit lands on the last big downbeat (handled by the dive: assisted timing).
import { lerp, clamp } from '../core/math.js';

export const BOSSES = {
  auditor: { name: 'THE AUDITOR', hp: 260, r: 8, ai: auditorAI },
  leviathan: { name: 'THE LEVIATHAN', hp: 280, r: 6.5, ai: leviathanAI },
  warden: { name: 'THE WARDEN', hp: 300, r: 9, ai: wardenAI, armored: true },
  librarian: { name: 'THE LIBRARIAN', hp: 300, r: 7, ai: librarianAI },
  seed: { name: 'THE SEED', hp: 320, r: 7, ai: seedAI },
  juno: { name: 'JUNO', hp: 1, r: 2, ai: junoAI, untouchable: true },
  hollis9: { name: 'HOLLIS-9', hp: 360, r: 7, ai: hollisAI },
  deep: { name: 'THE DEEP ITSELF', hp: 420, r: 22, ai: deepAI },
};
// minion / part types used by bosses (merged into the enemy table by the dive)
export const BOSS_PARTS = {
  auditpanel: { hp: 7, r: 4.5, mesh: 'panel', scale: [8, 8, 1], score: 300, ai: orbiterAI, link: 0.06 },
  levseg: { hp: 999, r: 5, mesh: 'pyramid', scale: [6, 6, 8], score: 0, armored: true, chrome: true, ai: segAI, nolock: true },
  wardeneye: { hp: 999, r: 5, mesh: 'panel', scale: [9, 5, 1], score: 0, ai: eyeAI, link: 1 },
  page: { hp: 1, r: 2.2, mesh: 'file', scale: [3.2, 3.2, 3.2], score: 60, ai: pageAI, glass: true, link: 0.02 },
  seednode: { hp: 2, r: 2.4, mesh: 'flower', scale: [3.2, 3.2, 3.2], score: 90, ai: seedNodeAI, link: 0.015 },
};

function* holdAt(e, D, d, rate = 1.5) { e.rel = true; while (Math.abs(e.d - d) > 0.5) { e.d = lerp(e.d, d, Math.min(1, D.dt * rate)); yield; } }
const phaseOf = (e, D) => clamp(Math.floor(((D.t - e.t0) / Math.max(1, e.end - e.t0)) * 3), 0, 2);
function ring(D, e, n, speed, rot = 0, kind) { for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; D.shoot(e, { speed, dir: [Math.cos(a) * 0.35, Math.sin(a) * 0.35], kind }); } }

function* auditorAI(e, D) {
  e.unfold = 0; e.d = 240; e.armored = true;
  yield* holdAt(e, D, 80);
  let rot = 0;
  while (true) {
    const ph = phaseOf(e, D);
    e.spin = (e.spin || 0) + D.dt * (0.6 + ph * 0.5);
    if (ph === 0) {
      yield* D.onBeat(2);
      e.armored = false; e.unfold = 1; ring(D, e, 8, 22, rot += 0.4);
      yield* D.onBeat(1); e.armored = true; e.unfold = 0;
    } else if (ph === 1) {
      if (!e.detached) { e.detached = true; e.unfold = 1; for (let i = 0; i < 6; i++) D.spawnRaw('auditpanel', { parent: e, idx: i, n: 6, d: e.d, x: e.x, y: e.y, orbit: 9 }); }
      e.armored = false; e.unfold = 0.6;
      yield* D.onBeat(2); D.telegraph(e); yield* D.onBeat(1); for (let k = -1; k <= 1; k++) D.shoot(e, { speed: 34, spread: k * 0.12 });
    } else {
      e.armored = false; e.unfold = 1;
      yield* D.onBeat(1); D.shoot(e, { speed: 40 }); if (D.beatIndex % 2 === 0) ring(D, e, 10, 20, rot += 0.3);
      e.x = Math.sin(D.t * 0.9) * D.bounds.w * 0.5; e.y = Math.cos(D.t * 0.7) * D.bounds.h * 0.4;
    }
  }
}
function* orbiterAI(e, D) {
  e.rel = true; let a = (e.idx / e.n) * Math.PI * 2;
  while (!e.parent.dead && !e.parent.gone) {
    a += D.dt * 1.2; const p = e.parent;
    e.d = p.d + Math.sin(a * 2) * 3; e.x = p.x + Math.cos(a) * e.orbit * 2; e.y = p.y + Math.sin(a) * e.orbit * 1.3;
    if (D.isBeat(4, e.idx / 6)) D.shoot(e, { speed: 28 });
    yield;
  }
  e.gone = true;
}
function* leviathanAI(e, D) {
  e.d = 260; e.y = -D.bounds.h * 3; e.trail = [];
  for (let i = 0; i < 12; i++) D.spawnRaw('levseg', { parent: e, idx: i, d: e.d, x: e.x, y: e.y, scaleK: 1 - i * 0.05 });
  let a = 0;
  while (true) {
    const ph = phaseOf(e, D);
    a += D.dt * (1 + ph * 0.3);
    const dive = ph === 1 && Math.sin(a * 0.5) < -0.4;
    const target = ph === 2 && Math.sin(a * 0.7) > 0.6 ? 30 : 75;
    e.d = lerp(e.d, target, D.dt * 0.7);
    e.x = Math.sin(a) * D.bounds.w * 0.75;
    e.y = lerp(e.y, dive ? -D.bounds.h * 2.5 : Math.cos(a * 1.3) * D.bounds.h * 0.6, D.dt * 2);
    e.armored = dive;
    e.trail.unshift([e.d, e.x, e.y]); if (e.trail.length > 300) e.trail.pop();
    if (D.isBeat(2) && !dive) for (let k = -2; k <= 2; k++) D.shoot(e, { speed: 26 + ph * 4, spread: k * 0.14 });
    if (ph >= 1 && D.isBeat(4, 0.5) && !dive) ring(D, e, 12, 18, a);
    yield;
  }
}
function* segAI(e, D) {
  e.rel = true;
  while (!e.parent.dead && !e.parent.gone) {
    const tr = e.parent.trail || []; const p = tr[Math.min(tr.length - 1, (e.idx + 1) * 7)];
    if (p) { e.d = p[0] + (e.idx + 1) * 3.2; e.x = p[1]; e.y = p[2]; }
    yield;
  }
  D.explode(e, 1); e.dead = true;
}
function* wardenAI(e, D) {
  e.d = 260; e.armored = true;
  yield* holdAt(e, D, 115, 1);
  e.eyes = [];
  for (let i = 0; i < 4; i++) e.eyes.push(D.spawnRaw('wardeneye', { parent: e, idx: i, ox: [-14, 14, -22, 22][i], oy: [7, 7, -7, -7][i], active: i < 2 }));
  while (true) {
    const ph = phaseOf(e, D);
    for (const eye of e.eyes) eye.active = eye.idx < (ph === 0 ? 2 : 4);
    if (D.isBeat(ph === 2 ? 4 : 8)) D.wall(e, { hole: [(D.R() - 0.5) * D.bounds.w * 1.2, (D.R() - 0.5) * D.bounds.h * 1.2], size: 6 - ph * 0.6, speed: 40 });
    if (ph >= 1 && D.isBeat(2, 0.5)) for (const eye of e.eyes) if (eye.active && eye.open > 0.5) D.shoot(eye, { speed: 32 });
    e.x = Math.sin(D.t * 0.3) * 3;
    yield;
  }
}
function* eyeAI(e, D) {
  e.rel = true; e.open = 0;
  while (!e.parent.dead && !e.parent.gone) {
    const p = e.parent; e.d = p.d - 1; e.x = p.x + e.ox; e.y = p.y + e.oy;
    const k = D.beatIndex % 2 === (e.idx % 2) && e.active;
    e.open = lerp(e.open, k ? 1 : 0, D.dt * 12); e.vuln = e.open > 0.5; e.armored = !e.vuln;
    yield;
  }
  e.gone = true;
}
const FACE_PTS = (() => { const o = []; for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) { const u = (i / 5) * 2 - 1, v = (j / 6) * 2 - 1; if (u * u * 0.8 + v * v * 0.6 < 1) o.push([u * 20 * Math.sqrt(1 - v * v * 0.5), v * 18]); } return o; })();
function* librarianAI(e, D) {
  e.d = 260; e.armored = true;
  yield* holdAt(e, D, 95, 1);
  e.pages = [];
  const fill = (max) => { e.pages = e.pages.filter(p => !p.dead); FACE_PTS.forEach((pt, i) => { if (e.pages.length < max && !e.pages.some(p => p.slot === i)) e.pages.push(D.spawnRaw('page', { parent: e, slot: i, ox: pt[0], oy: pt[1], d: e.d + 40, x: pt[0] * 3, y: pt[1] * 3 })); }); };
  fill(40);
  let refill = D.beatAfter(32);
  while (true) {
    const ph = phaseOf(e, D);
    const alive = e.pages.filter(p => !p.dead).length;
    e.armored = alive > (ph === 2 ? 30 : 14);
    if (D.t > refill) { fill(ph === 2 ? 20 : 28); refill = D.beatAfter(32); }
    if (D.isBeat(2) && !e.armored) for (let k = -1; k <= 1; k++) D.shoot(e, { speed: 30, spread: k * 0.2 });
    e.x = Math.sin(D.t * 0.4) * 4; e.y = Math.cos(D.t * 0.3) * 2;
    yield;
  }
}
function* pageAI(e, D) {
  e.rel = true;
  while (!e.parent.dead && !e.parent.gone) {
    const p = e.parent; const sw = Math.sin(D.t * 2 + e.slot) * 0.6;
    e.d = lerp(e.d, p.d + sw, D.dt * 3); e.x = lerp(e.x, p.x + e.ox, D.dt * 3); e.y = lerp(e.y, p.y + e.oy, D.dt * 3);
    if (D.isBeat(8, (e.slot % 8) / 8) && D.R() < 0.25) D.shoot(e, { speed: 24 });
    yield;
  }
  e.gone = true;
}
function* seedAI(e, D) {
  e.d = 260; e.nodes = [];
  yield* holdAt(e, D, 100, 1);
  while (true) {
    const ph = phaseOf(e, D);
    e.nodes = e.nodes.filter(n => !n.dead && !n.gone);
    e.armored = e.nodes.length > [5, 7, 9][ph];
    e.grow = Math.min(3, (e.grow || 0) + D.dt * 0.05);
    yield* D.onBeat(1);
    for (let k = 0; k < 1 + ph; k++) e.nodes.push(D.spawnRaw('seednode', { parent: e, a: D.R() * 6.28, d: e.d, x: e.x, y: e.y }));
    if (!e.armored && D.beatIndex % 2 === 0) ring(D, e, 6 + ph * 2, 18, D.t, 'tendril');
  }
}
function* seedNodeAI(e, D) {
  e.rel = true; let r = 2;
  while (!e.parent.dead && !e.parent.gone) {
    r = Math.min(r + D.dt * 5, 26); e.a += D.dt * 0.6;
    const p = e.parent; e.d = p.d - r * 0.5; e.x = p.x + Math.cos(e.a) * r; e.y = p.y + Math.sin(e.a) * r * 0.7;
    if (D.isBeat(2, 0.5) && D.R() < 0.3) D.shoot(e, { speed: 20, kind: 'tendril' });
    yield;
  }
  e.gone = true;
}
function* junoAI(e, D) { // the chase: she flies ahead; keep inside her light
  e.d = 200; e.untouchable = true; e.juno = true;
  yield* holdAt(e, D, 45, 1);
  let a = 0;
  while (true) {
    const ph = phaseOf(e, D);
    a += D.dt * (0.8 + ph * 0.35);
    e.x = Math.sin(a) * D.bounds.w * 0.8; e.y = Math.sin(a * 1.7) * D.bounds.h * 0.7;
    e.d = 45 + Math.sin(a * 0.5) * 12 + ph * 6;
    if (D.isBeat(1)) D.shoot(e, { speed: -8, kind: 'petal', dir: [(D.R() - 0.5) * 0.3, (D.R() - 0.5) * 0.3] });
    yield;
  }
}
function* hollisAI(e, D) {
  e.d = 240;
  yield* holdAt(e, D, 70);
  while (true) {
    const ph = phaseOf(e, D);
    // blink to a new position on the beat
    yield* D.onBeat(2);
    e.armored = true; e.blink = 1;
    yield* D.wait(0.12);
    e.x = (D.R() - 0.5) * D.bounds.w * 1.4; e.y = (D.R() - 0.5) * D.bounds.h * 1.2; e.blink = 0; e.armored = false;
    D.telegraph(e, true);
    yield* D.onBeat(1);
    if (ph === 0) D.wall(e, { hole: [D.px + (D.R() - 0.5) * 6, D.py + (D.R() - 0.5) * 4], size: 6, speed: 50, laser: true });
    if (ph >= 1) { for (let k = 0; k < 4; k++) { D.shoot(e, { speed: 46 }); yield* D.wait(0.07); } }
    if (ph === 1 && D.beatIndex % 16 < 2) for (let k = 0; k < 3; k++) D.spawnRaw('agent', { d: 220, x: (k - 1) * 8, y: 4, hold: 60 + k * 5 });
    if (ph === 2) ring(D, e, 12, 24, D.t);
  }
}
function* deepAI(e, D) {
  e.d = 300;
  yield* holdAt(e, D, 150, 0.8);
  while (true) {
    const ph = phaseOf(e, D);
    e.armored = !(D.beatPhase < 0.5);
    if (D.isBeat(2)) ring(D, e, 10 + ph * 4, 22, D.t * 0.7);
    if (D.isBeat(8, 0.5)) D.wall(e, { hole: [(D.R() - 0.5) * D.bounds.w, (D.R() - 0.5) * D.bounds.h], size: 6, speed: 45 });
    if (ph >= 1 && D.isBeat(16)) for (let k = 0; k < 3; k++) D.spawnRaw(D.R() < 0.5 ? 'bloom' : 'agent', { d: 200, x: (D.R() - 0.5) * 20, y: (D.R() - 0.5) * 12, hold: 70 });
    if (ph === 2 && D.isBeat(1, 0.5)) D.shoot(e, { speed: 40 });
    e.x = Math.sin(D.t * 0.25) * 6; e.y = Math.cos(D.t * 0.2) * 4;
    yield;
  }
}
