// Builds a dive's script from the track's beat map (bible §9.2): level phases follow the sections, enemy waves and
// patterns land on bars and beats, gates and firewalls are placed so you reach them exactly on their beat.
// Event kinds: wave, world (world-anchored enemy), gate, run (gate run), wall, stream, packets, corruption, debris, breach,
// radio, tip, boss, token, node, ogate (objective gate), guide, refuse, choice, exit, juno.
import { rng, hashStr } from '../core/rng.js';
import { SHAPES } from '../sim/enemies.js';

const DIFF = { easy: 0.65, normal: 1, hard: 1.35, deep: 1.5 };

export function buildScript(dive, kit, map, opts = {}) {
  const R = rng(hashStr(dive.id + (opts.seed || '')));
  const ev = [];
  const E = (t, k, o = {}) => { ev.push({ t: +t.toFixed(4), k, ...o }); };
  const diff = (DIFF[opts.difficulty] || 1) * (1 + (dive.layer || 0) * 0.07) * (opts.suspicion ? 1.25 : 1) * (dive.density || 1) * (opts.remix ? 1.25 : 1) * (opts.endlessLoop ? 1 + opts.endlessLoop * 0.2 : 1);
  const pool = dive.enemies || kit.enemies;
  const bars = map.bars, spb = 60 / map.bpm;
  const B = kit.bounds;
  const secs = map.sections;
  const barsIn = (t0, t1) => bars.filter(b => b >= t0 - 1e-3 && b < t1 - 1e-3);
  const pickType = (sec, i) => {
    let p = pool;
    if (sec === 'intro') p = pool.slice(0, Math.min(2, pool.length));
    else if (sec === 'build') p = pool.slice(0, Math.min(3, pool.length));
    const worldTypes = ['shutter', 'gatekeeper', 'bloom'];
    const t = p[(i + Math.floor(R() * p.length)) % p.length];
    return t;
  };
  const objective = dive.objective || null;
  const isStory = dive.type === 'story';
  let waveN = 0;
  // SHIFT: waves, world ICE, gates and firewalls belong to the A-side (0) or the B-side (1). Calibration teaches it:
  // everything is A-side until the first build.
  const shiftFrom = dive.id === 'calibration' ? (secs.find(s => s.type === 'build')?.t ?? 0) : 0;
  let sideSeq = R() < 0.5 ? 0 : 1;
  const nextSide = (t) => { if (t < shiftFrom) return 0; if (R() < 0.7) sideSeq ^= 1; return sideSeq; };
  const sideAt = (t) => (t < shiftFrom ? 0 : sideSeq);
  let buildCount = 0, dropCount = 0;
  secs.forEach((sec, si) => {
    const t0 = sec.t, t1 = secs[si + 1] ? secs[si + 1].t : map.length;
    const bs = barsIn(t0, t1); const nb = bs.length;
    const energy = sec.energy ?? 0.6;
    const type = sec.type;
    if (type === 'build') buildCount++;
    if (type === 'drop' || type === 'drop2') dropCount++;
    // radio lines for this section
    for (const line of (dive.radio || [])) {
      const key = line.at;
      const match = key === type || (key === 'build2' && type === 'build' && buildCount === 2) || (key === 'build1' && type === 'build' && buildCount === 1);
      if (match) E(t0 + (line.delay || 1) * spb * 4, 'radio', { who: line.who, text: line.text });
    }
    for (const tip of (dive.tips || [])) if (tip.at === type && (tip.n || 1) === (type === 'build' ? buildCount : 1)) E(t0 + (tip.bar || 0) * spb * 4 + 0.2, 'tip', { text: tip.text, dur: tip.dur || 6 });
    if (type === 'drop' || type === 'drop2') E(t0, 'breach', { n: dropCount });
    // ---------------------------------------------------------------- per section content
    bs.forEach((bt, bi) => {
      const last = nb - bi;
      const bar = bt;
      if (type === 'intro') {
        if (bi >= 4 && bi % 4 === 0 && (!isStory || dive.layer > 0 || bi >= 8)) wave(bar, pickType('intro', bi), 2 + (diff > 1.2 ? 1 : 0));
        if (bi % 4 === 2) E(bar, 'packets', { n: 5, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, line: true });
      } else if (type === 'build') {
        const k = bi / Math.max(1, nb - 1);
        if (last > 2 && bi % 2 === 0) wave(bar, pickType('build', bi), Math.round(2 + k * 3 * diff));
        if (last > 2 && bi % 4 === 1) gateLine(bar, 3);
        if (dive.kit === 'firewall' || dive.walls) { if (last > 2 && bi % 2 === 1) E(bar, 'wall', { hole: [(R() - 0.5) * B.w * 1.2, (R() - 0.5) * B.h * 1.2], size: 5.5 - k * 1.2, weak: R() < 0.3, side: nextSide(bar) }); }
        if (last === 2) gateRun(bar, spb * 8); // the snare roll: a gate run
      } else if (type === 'drop' || type === 'drop2') {
        const boss = type === 'drop2' && dive.boss && !opts.noBoss;
        if (bi === 0) { E(bar, 'debris', { dur: spb * 8 }); }
        if (boss) {
          if (bi === 0) E(bar + spb * 2, 'boss', { type: dive.boss, end: t1 });
          if (bi % 4 === 2 && dive.boss !== 'juno') wave(bar, pickType('drop', bi), Math.round(2 * diff));
          if (bi % 8 === 4) E(bar, 'packets', { n: 6, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, line: true });
        } else {
          if (bi % 1 === 0 && bi > 0) wave(bar + (bi % 2 ? spb * 2 : 0), pickType('drop', bi + waveN), Math.round((2 + energy * 3) * diff * (dive.traffic ? 1.7 : 1)));
          if (bi % 8 === 2) E(bar, 'stream', { t1: bar + spb * 4 * 6, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h * 0.8 });
          if (bi % 4 === 3) E(bar, 'packets', { n: 6, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, line: true });
          if (bi % 8 === 6 && pool.some(p => ['shutter', 'bloom'].includes(p))) E(bar, 'world', { type: pool.includes('bloom') ? 'bloom' : 'shutter', x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, side: nextSide(bar) });
          if ((dive.kit === 'firewall' || dive.walls) && bi % 2 === 1) E(bar, 'wall', { hole: [(R() - 0.5) * B.w * 1.2, (R() - 0.5) * B.h * 1.2], size: 5, weak: R() < 0.4, side: nextSide(bar) });
          if (pool.includes('gatekeeper') && bi === 12) E(bar, 'world', { type: 'gatekeeper', x: 0, y: 0, side: nextSide(bar) });
          if (pool.includes('corruptor') && bi % 8 === 5) E(bar, 'corruption', { t1: bar + spb * 12, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, r: 4.5 });
          if (bi % 6 === 3) gateLine(bar, 4);
        }
      } else if (type === 'breakdown') {
        if (bi % 4 === 0) E(bar, 'packets', { n: 8, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, ring: true });
        if (bi === 2) E(bar, 'stream', { t1: bar + spb * 4 * Math.max(4, nb - 4), x: 0, y: 0, secret: true });
        if (bi % 4 === 1) gateLine(bar, 2);
        if (dive.boss === 'juno' && bi === 0) E(bar, 'juno', { t1 });
      } else if (type === 'outro') {
        if (bi === 2 && !dive.final) wave(bar, pickType('intro', 1), 2);
        if (dive.final) { if (bi === Math.min(4, nb - 2)) { E(bar, 'choice', {}); E(bar - spb * 16, 'tip', { text: 'THE CHOICE  ·  FLY THROUGH ONE GATE', dur: 6 }); } }
        else if (bi === nb - 2) E(bar, 'exit', {});
      }
    });
  });
  // ---------------------------------------------------------------- objectives (contracts) along the dive
  if (objective) {
    const span = secs.filter(s => s.type !== 'intro' && s.type !== 'outro');
    const tA = span[0].t, tB = secs.find(s => s.type === 'outro')?.t || map.length * 0.9;
    // Easy / Normal: twice the packets and rings (1.5× the nodes) for the same number needed (objNeeded)
    const easier = !opts.difficulty || opts.difficulty === 'easy' || opts.difficulty === 'normal';
    const mult = easier ? (objective.kind === 'destroy' ? 1.5 : 2) : 1;
    const n = Math.round((objective.n || 10) * mult);
    if (['collect', 'destroy', 'gates'].includes(objective.kind)) {
      for (let i = 0; i < n; i++) {
        const t = tA + ((i + 0.5) / n) * (tB - tA);
        const bt = bars.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), bars[0]);
        const x = (R() - 0.5) * B.w * 1.3, y = (R() - 0.5) * B.h * 1.3;
        // SHIFT: objectives alternate between the two worlds (in pairs), so a contract needs both of them
        const side = Math.floor(i / 2) % 2;
        if (objective.kind === 'collect') E(bt + spb * 2, 'token', { x, y, side });
        else if (objective.kind === 'destroy') E(bt, 'node', { x: x * 0.7, y: y * 0.7, side });
        else E(bt + spb * 2, 'ogate', { x, y, side });
      }
    }
    if (objective.kind === 'follow') E(tA, 'guide', { t1: tB });
    // say what the objective is when it starts (the HUD shows the count; markers point at packets and nodes)
    const pct = Math.round((objective.need || 0.7) * 100), L = objective.label || '', needN = Math.max(1, Math.ceil((objective.n || 10) * (objective.need || 0.7)));
    const what = { collect: `COLLECT ${needN} ${L} OF ${n}: FLY THROUGH THE PACKETS  ·  HALF ARE IN THE OTHER WORLD: SHIFT`, destroy: `${L}: SHOOT ${needN} OF THE ${n} MARKED NODES  ·  SHIFT FOR THE OTHER WORLD'S`,
      gates: `FLY THROUGH ${needN} OF THE ${n} ${L}  ·  SHIFT TO MATCH THEIR COLOUR`, follow: `${L}: STAY CLOSE TO THE GUIDE`, stream: 'STAY INSIDE THE DATA STREAMS TO FILL THE BAR', survive: 'SURVIVE TO THE END' }[objective.kind];
    if (what) E(Math.max(0.5, tA - spb * 8), 'tip', { text: what, dur: 7 });
    if (objective.kind === 'stream') {
      for (const s of secs) if (['build', 'drop', 'breakdown'].includes(s.type)) { // not in the boss fight
        const end = secs[secs.indexOf(s) + 1]?.t ?? map.length;
        E(s.t + spb * 2, 'stream', { t1: end - spb * 2, x: (R() - 0.5) * B.w * 0.8, y: (R() - 0.5) * B.h * 0.6, objective: true });
      }
    }
    if (objective.refuse) { const bd = secs.find(s => s.type === 'breakdown'); if (bd) E(bd.t + spb * 4 * 4, 'refuse', {}); }
  }
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, diff };

  function wave(t, type, n) {
    waveN++;
    if (!type) return;
    const shape = R.pick(SHAPES);
    const big = ['gatekeeper', 'worm', 'scanner', 'shutter', 'bloom'].includes(type);
    const side = nextSide(t);
    if (type === 'shutter' || type === 'bloom') { E(t, 'world', { type, x: (R() - 0.5) * B.w, y: (R() - 0.5) * B.h, side }); return; }
    if (type === 'glyph_swarm') { E(t, 'wave', { type: 'glyph', n: Math.min(14, 6 + n * 2), shape: 'circle', hold: 80 + R() * 20, cx: (R() - 0.5) * B.w * 0.6, cy: (R() - 0.5) * B.h * 0.6, side }); return; }
    const count = big ? 1 : Math.max(1, Math.min(10, n));
    E(t, 'wave', { type, n: count, shape, hold: 60 + R() * 50, stagger: type === 'tracer' ? 0.5 : (R() < 0.5 ? 0.25 : 0), side });
  }
  function gateLine(t, n) {
    let x = (R() - 0.5) * B.w, y = (R() - 0.5) * B.h;
    const side = t < shiftFrom ? undefined : nextSide(t);
    for (let i = 0; i < n; i++) { E(t + i * spb, 'gate', { x, y, side }); x = clamp(x + (R() - 0.5) * 8, -B.w * 0.8, B.w * 0.8); y = clamp(y + (R() - 0.5) * 5, -B.h * 0.8, B.h * 0.8); }
  }
  function gateRun(t, dur) {
    const n = Math.floor(dur / (spb / 2));
    let a = R() * 6;
    const flip = t >= shiftFrom, s0 = R() < 0.5 ? 0 : 1;
    for (let i = 0; i < n; i++) { a += 0.35; E(t + i * spb / 2, 'gate', { x: Math.cos(a) * B.w * 0.5, y: Math.sin(a * 1.3) * B.h * 0.45, run: true, side: flip ? s0 ^ (Math.floor(i / 4) & 1) : undefined }); }
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
