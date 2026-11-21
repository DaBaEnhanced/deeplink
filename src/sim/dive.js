// The dive simulation (bible §9, §10, §12, §13, §14): music-locked travel, flight in the corridor plane, pulse, lock-on,
// roll, boost, brake, neural powers, enemies and bosses as beat coroutines, gates, firewalls, streams, corruption,
// collapse debris, Flow / Sync / Integrity, objectives, scoring and ranks. Fixed 120 Hz steps driven by song time.
import { clamp, lerp } from '../core/math.js';
import { rng, hashStr } from '../core/rng.js';
import { ENEMY_TYPES, formation } from './enemies.js';
import { BOSSES, BOSS_PARTS } from './bosses.js';
import { MODS, tierVal, modPower } from '../story/mods.js';

const TYPES = { ...ENEMY_TYPES, ...BOSS_PARTS };
const STEP = 1 / 120;
const PLAYER_LEAD = 9;     // the avatar flies this far ahead of the camera
const VIEW = 560;          // spawn distance for world objects
const BEAT_WIN = 0.085;    // on-beat window (s)
const SHIFT_WIN = 0.095;   // a clean shift lands this close to a beat
const SHIFT_CD = 0.16;     // minimum time between shifts
export const STREAM_R = 4.6; // catch radius of objective data streams (shown as rings)

export class DiveSim {
  // cfg: { dive, kit, map, dist (distance table), script, mods, drift, difficulty, opts, mode, rate }
  constructor(cfg) {
    Object.assign(this, cfg);
    this.R = rng(hashStr(cfg.dive.id) ^ 0x9e37);
    this.bounds = { ...cfg.kit.bounds };
    if (cfg.opts.wideGates) this.gateR = 5.6; else this.gateR = 4.2;
    this.mods = cfg.mods || {}; this.power = modPower({ drift: cfg.drift || 0 });
    this.diffK = { easy: 0.6, normal: 1, hard: 1.25, deep: 1.25 }[cfg.difficulty] || 1;
    this.reset(0);
  }
  mod(id) { return this.mods[id] || 0; }
  reset(t0) {
    this.t = t0; this.prevT = t0; this.acc = 0; this.dt = STEP;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, roll: 0, rollT: 0, rollDir: 1, rollCD: 0, bank: 0, offset: 0, offV: 0, hitT: -9, inv: 0, fireCD: 0 };
    this.enemies = []; this.shots = []; this.ebullets = []; this.bolts = []; this.fx = []; this.gates = []; this.walls = []; this.streams = []; this.packets = [];
    this.zones = []; this.debris = []; this.tokens = []; this.locks = []; this.radio = []; this.tips = [];
    this.ev = 0; while (this.ev < this.script.events.length && this.script.events[this.ev].t < t0 - 0.01) this.ev++;
    this.pending = [];  // world objects waiting to come into view
    { const ce = this.script.events.find(q => q.k === 'choice'); this.choiceS = ce ? this.dist.at(ce.t) + PLAYER_LEAD : undefined; }   // the ending gates
    // world-anchored events already passed are skipped; ones ahead of t0 queue normally
    if (!this.stats || t0 === 0) this.stats = { score: 0, kills: 0, spawned: 0, gates: 0, gatesTotal: 0, hits: 0, packets: 0, syncSum: 0, syncN: 0, maxSync: 1, boss: null, bossKilled: false, objective: 0, objectiveTotal: 0, objHave: 0, streamT: 0, streamTotal: 0, followT: 0, followTotal: 0, chain: 0, secrets: 0, retries: 0, shifts: 0, cleanShifts: 0, absorbed: 0, sideChain: 0, sideChainBest: 0 };
    this.integrity = 100; this.flow = 40; this.sync = 1; this.overdrive = false; this.noHitT = 0;
    this.boss = null; this.guide = null; this.juno = null; this.exitPassed = false; this.done = false; this.failed = false; this.refused = false; this.choice = null;
    this.power_ = { active: null, until: 0 }; this.slow = 1; this.phase = false; this.echo = null; this.becomeUntil = 0;
    this.history_ = []; this.lastBeat = this.beatIndexAt(t0); this.beatIndex = this.lastBeat; this.beatPhase = 0;
    this.lockHeld = false; this.alarmT = 0; this.flash = 0; this.shake = 0; this.breachT = -9; this.dropSeen = false; this.sinceDrop = 99;
    const pastDrop = this.map.sections.filter(s => (s.type === 'drop' || s.type === 'drop2') && s.t <= t0 + 1e-3).pop();
    this.firstDropT = null;
    if (pastDrop) { this.dropSeen = true; this.breachT = pastDrop.t - 1; this.sinceDropT0 = pastDrop.t - 4; this.firstDropT = -1e9; }
    // SHIFT: two worlds share the corridor (bible §SHIFT). side 0 = A-side, 1 = B-side
    this.side = 0; this.shiftCD = 0; this.shiftT = -9; this.shiftClean = false; this.shiftGuard = 0; this.focus = false; this.focusHeld = 0;
    this.chainSide = -1; this.chainN = 0; this.chainT = -9; this.absorbT = -9;
    if (!this.wlev || t0 === 0) { this.wlev = 1; this.wcharge = 0; this.wlevT = -9; }   // weapon level (absorbing charges it)
    this.streamIn = false; this.invertT = 0; this.muffle = 0; this.telegraphs = []; this.lockChainBeat = -1;
    this.sCam = this.dist.at(t0); this.ps = this.sCam + PLAYER_LEAD; this.px = 0; this.py = 0; this.speed = this.dist.speed(t0);
    this.section = this.sectionAt(t0);
  }
  // ---------------------------------------------------------------------------------------- music helpers
  beatIndexAt(t) { const b = this.map.beats; let lo = 0, hi = b.length - 1; if (t < b[0]) return -1; if (t >= b[hi]) return hi + Math.floor((t - b[hi]) / this.spb); while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= t) lo = m; else hi = m - 1; } return lo; }
  beatTime(i) { const b = this.map.beats; if (i < 0) return b[0] + i * this.spb; if (i < b.length) return b[i]; return b[b.length - 1] + (i - b.length + 1) * this.spb; }
  get spb() { return 60 / this.map.bpm; }
  beatAfter(n) { return this.beatTime(this.beatIndex + n); }
  nearBeat(t) { const i = this.beatIndexAt(t); return Math.min(Math.abs(t - this.beatTime(i)), Math.abs(this.beatTime(i + 1) - t)); }
  onBeatNow() { return this.nearBeat(this.t) < BEAT_WIN; }
  sectionAt(t) { const s = this.map.sections; let i = 0; while (i < s.length - 1 && s[i + 1].t <= t + 1e-4) i++; return { ...s[i], i, end: s[i + 1] ? s[i + 1].t : this.map.length }; }
  // beat crossed this step (every n beats, with a fractional offset)
  isBeat(n = 1, off = 0) {
    const a = this.prevT, b = this.t;
    const i0 = this.beatIndexAt(a - off * this.spb), i1 = this.beatIndexAt(b - off * this.spb);
    if (i1 <= i0) return false;
    return i1 % n === 0;
  }
  // (always yields at least once: a coroutine waiting on beats can never spin without letting the frame go)
  *onBeat(n = 1) { const target = this.beatTime(this.beatIndex + n); if (this.t >= target - 1e-4) { yield; return; } while (this.t < target - 1e-4) yield; }
  *wait(sec) { const end = this.t + sec; do yield; while (this.t < end); }
  // --------------------------------------------------------------------------------------------- update
  // songT: current song time from the audio clock; input: Input
  update(songT, input, realDt) {
    if (this.done) return;
    // advance in fixed steps toward the song time (catch up at most 0.25 s)
    if (songT < this.t - 0.5) { this.t = songT; } // seek / loop
    let n = 0; this.freshInput = true;
    while (this.t + STEP <= songT && n < 30) { this.step(input); n++; }
    if (n === 30) this.t = songT;
  }
  step(input) {
    this.prevT = this.t; this.t += STEP; const dt = STEP; this.dt = dt * this.slow;
    const t = this.t;
    this.beatIndex = this.beatIndexAt(t);
    const b0 = this.beatTime(this.beatIndex), b1 = this.beatTime(this.beatIndex + 1);
    this.beatPhase = clamp((t - b0) / (b1 - b0), 0, 1);
    const sec = this.sectionAt(t);
    if (sec.i !== this.section.i) this.onSection(sec);
    this.section = sec;
    this.speed = this.dist.speed(t);
    this.sCam = this.dist.at(t);
    const P = this.player;
    this.updatePlayer(input, dt);
    this.ps = this.sCam + PLAYER_LEAD + P.offset;
    this.px = P.x; this.py = P.y;
    this.history_.push([t, P.x, P.y]); if (this.history_.length > 240) this.history_.shift();
    this.runScript();
    this.spawnPending();
    this.updateEnemies();
    this.updateShots(dt);
    this.updateWorld(dt);
    this.updateMeters(dt);
    if (t >= this.map.length - 0.05 || (this.exitPassed && t > this.exitT + 0.6)) this.finish();
  }
  onSection(sec) {
    if (sec.type === 'drop' || sec.type === 'drop2') { if (this.firstDropT === null) this.firstDropT = this.t; this.dropSeen = true; this.sinceDropT0 = this.t; }
    // no-hit section bonus
    if (this.sectionHits === 0 && this.section.type !== 'intro') this.addScore(2000, false);
    this.sectionHits = 0;
    if (this.section.type === 'drop2' && this.boss && !this.boss.dead && !this.boss.escaping) this.bossFinale();
  }
  // ---------------------------------------------------------------------------------------------- player
  updatePlayer(input, dt) {
    const P = this.player, B = this.bounds;
    let [ax, ay] = input.axis;
    if (this.invertT > 0) { ax = -ax; ay = -ay; this.invertT -= dt; }
    const maxV = 26;
    if (input.mouseTarget) {
      const tx = clamp(input.mouseTarget[0] * B.w * 1.05, -B.w, B.w), ty = clamp(input.mouseTarget[1] * B.h * 1.05, -B.h, B.h);
      const ix = this.invertT > 0 ? -1 : 1;
      P.vx = lerp(P.vx, clamp((tx * ix - P.x) * 6, -maxV, maxV), dt * 10); P.vy = lerp(P.vy, clamp((ty * ix - P.y) * 6, -maxV, maxV), dt * 10);
    } else {
      P.vx = lerp(P.vx, ax * maxV, dt * 7); P.vy = lerp(P.vy, ay * maxV * 0.85, dt * 7);
    }
    // roll: a quick lateral dodge that deflects small shots
    if (P.rollCD > 0) P.rollCD -= dt;
    if ((input.pressed('rollL') || input.pressed('rollR')) && P.rollCD <= 0) {
      P.rollDir = input.pressed('rollL') ? -1 : 1; P.rollT = 0.45; P.rollCD = 0.7; this.audio('roll'); this.beatAction();
    }
    if (P.rollT > 0) { P.rollT -= dt; P.roll = P.rollDir * (1 - P.rollT / 0.45) * Math.PI * 2; P.vx += P.rollDir * dt * 160 * (P.rollT > 0.3 ? 1 : 0); } else P.roll = 0;
    P.x += P.vx * dt; P.y += P.vy * dt;
    // soft walls
    if (Math.abs(P.x) > B.w) { P.x = Math.sign(P.x) * B.w; P.vx *= -0.2; }
    if (Math.abs(P.y) > B.h) { P.y = Math.sign(P.y) * B.h; P.vy *= -0.2; }
    P.bank = lerp(P.bank, -P.vx / maxV * 0.6, dt * 6);
    // boost / brake: move ahead of / behind the music line, then ease back
    this.boosting = false;
    const boostCost = 30 * dt;
    if (input.down('boost') && this.flow > boostCost) {
      if (!this.wasBoost) { this.audio('boost'); this.beatAction(); }
      this.boosting = true; this.flow -= boostCost; P.offV = lerp(P.offV, 30, dt * 4);
    } else if (input.down('brake')) { P.offV = lerp(P.offV, -18, dt * 4); }
    else P.offV = lerp(P.offV, -P.offset * 1.2, dt * 2);
    this.wasBoost = this.boosting;
    P.offset = clamp(P.offset + P.offV * dt, -22, 38);
    if (P.inv > 0) P.inv -= dt;
    // weapons
    const rateK = 1 + tierVal(this.mod('overclock'), 0.1, 0.18, 0.25) * this.power;
    P.fireCD -= dt;
    const firing = input.down('fire') || this.opts.autoFire || !!input.touchFire;
    if (firing && P.fireCD <= 0) {
      P.fireCD = 0.1 / rateK;
      this.fire();
      if (input.pressed('fire')) this.beatAction();
    }
    this.updateLock(input, rateK);
    if (input.pressed('power')) this.usePower();
    if (this.shiftCD > 0) this.shiftCD -= dt;
    if (input.pressed('shift') && this.freshInput) { this.freshInput = false; this.doShift(); }
    // one-key mode: holding the key slows time (uses Flow)
    this.focus = !!input.focus && this.flow > 1;
    if (this.focus) this.flow = Math.max(0, this.flow - 14 * dt);
  }
  // flip between the A-side and B-side worlds. On the beat: a clean shift (Sync, a short guard that absorbs anything)
  doShift() {
    if (this.shiftCD > 0 || this.done) return;
    const clean = this.nearBeat(this.t) < SHIFT_WIN;
    this.side ^= 1; this.shiftCD = SHIFT_CD; this.shiftT = this.t; this.shiftClean = clean;
    this.stats.shifts++;
    if (clean) { this.stats.cleanShifts++; this.sync = Math.min(8, this.sync + 0.3); this.shiftGuard = this.t + 0.18; this.beatHitT = this.t; this.addScore(50, true); }
    else this.sync = Math.max(1, this.sync - 0.15);
    // locks on enemies left behind in the other world drop
    for (const l of this.locks) if (!this.sameSide(l.e)) l.e.locked = 0;
    this.locks = this.locks.filter(l => this.sameSide(l.e));
    this.audio('shift', { side: this.side, clean });
    if (this.onShift) this.onShift(this.side, clean);
  }
  sameSide(e) { return e.bothSides || e.side === undefined || e.side === this.side || !!e.ally; }
  // weapon spread by level: [x offset, y offset, vx, vy] — one pair of lines, then three, then a fan, then a fan
  // with vertical spread, then the full fan
  static WEAPON = [null,
    [[-0.6, 0, 0, 0], [0.6, 0, 0, 0]],
    [[-0.9, 0, 0, 0], [0, 0.3, 0, 0], [0.9, 0, 0, 0]],
    [[-0.9, 0, 0, 0], [0, 0.3, 0, 0], [0.9, 0, 0, 0], [-1.3, 0, -9, 0], [1.3, 0, 9, 0]],
    [[-0.9, 0, 0, 0], [0, 0.3, 0, 0], [0.9, 0, 0, 0], [-1.3, 0, -9, 0], [1.3, 0, 9, 0], [0, 0.8, 0, 7], [0, -0.6, 0, -7]],
    [[-0.9, 0, 0, 0], [0, 0.3, 0, 0], [0.9, 0, 0, 0], [-1.3, 0, -9, 0], [1.3, 0, 9, 0], [0, 0.8, 0, 7], [0, -0.6, 0, -7], [-1.7, 0, -19, 0], [1.7, 0, 19, 0]],
  ];
  fire() {
    const P = this.player;
    for (const [ox, oy, vx, vy] of DiveSim.WEAPON[this.wlev || 1]) this.shots.push({ s: this.ps + 1, x: P.x + ox, y: P.y - 0.2 + oy, vx, vy, life: 1.6, dmg: 1, side: this.side });
    if (this.echo && this.t < this.echo.until) for (const k of [-1, 1]) this.shots.push({ s: this.ps + 1, x: -P.x + k * 0.6, y: P.y, vx: 0, vy: 0, life: 1.6, dmg: 1, echo: true });
    this.audio('shot', { vol: 0.5 });
  }
  maxLocks() { return [8, 12, 14, 16][this.mod('long_lock')] || 8; }
  updateLock(input, rateK) {
    const lockDown = input.down('lock') || this.opts.autoLock;
    if (lockDown) {
      this.lockHeld = true;
      this.lockTick = (this.lockTick || 0) - STEP;
      if (this.lockTick <= 0 && this.locks.length < this.maxLocks()) {
        const tgt = this.findLockTarget();
        if (tgt) {
          this.locks.push({ e: tgt, beat: this.beatIndex + (this.beatPhase > 0.5 ? 1 : 0) });
          tgt.locked = (tgt.locked || 0) + 1;
          this.lockTick = 0.12 / rateK;
          this.audio('lock', { n: this.locks.length - 1 });
          if (this.opts.autoLock && this.locks.length >= 4) this.releaseLocks();
        }
      }
    }
    if ((!lockDown && this.lockHeld) || (this.opts.autoLock && !lockDown && this.locks.length && this.beatPhase < 0.05)) { this.lockHeld = false; this.releaseLocks(); }
  }
  findLockTarget() {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e.gone || e.nolock || e.ally || e.untouchable || e.behind || !this.sameSide(e)) continue;
      const d = e.s - this.ps; if (d < 8 || d > 330) continue;
      const big = TYPES[e.type] ? TYPES[e.type].r : 2;
      const lim = d * 0.085 + 2.5 + big;
      const off = Math.hypot(e.x - this.px, e.y - this.py);
      if (off > lim) continue;
      const already = e.locked || 0;
      const maxOn = e.boss || e.hpMax > 6 ? 4 : 1;
      if (already >= maxOn) continue;
      const sc = off / lim + d / 600 + already;
      if (sc < bd) { bd = sc; best = e; }
    }
    return best;
  }
  releaseLocks() {
    if (!this.locks.length) return;
    // locks acquired on the same beat multiply each other's damage
    const perBeat = {};
    for (const l of this.locks) perBeat[l.beat] = (perBeat[l.beat] || 0) + 1;
    const onBeat = this.beatAction();
    // bolts launch on the next 16ths (quantised)
    const n16 = this.spb / 4;
    let k = 0;
    for (const l of this.locks) {
      const mult = Math.min(4, perBeat[l.beat]);
      const launch = this.t + (k + 1) * n16 * 0.5;
      this.bolts.push({ target: l.e, s: this.ps, x: this.px, y: this.py, vs: 40, vx: (k % 2 ? 1 : -1) * 18, vy: 10, launch, dmg: 3 * mult * (onBeat ? 1.25 : 1), life: 3, n: k, chain: this.locks.length });
      k++;
    }
    this.stats.chain = Math.max(this.stats.chain, this.locks.length);
    for (const l of this.locks) l.e.locked = 0;
    this.locks = [];
  }
  usePower() {
    const id = this.equipped; if (!id || !MODS[id] || MODS[id].type !== 'active') return;
    const m = MODS[id], tier = this.mod(id); if (!tier) return;
    const cost = m.cost; if (this.flow < cost || (this.power_.until > this.t)) { this.audio('ui_back'); return; }
    this.flow -= cost; this.audio('power'); this.beatAction(); this.flash = this.opts.lowFlash ? 0.1 : 0.35;
    const pw = this.power;
    const dur = { dilation: tierVal(tier, 3, 4, 5), phase: tierVal(tier, 2, 2.6, 3.2), rewrite: tierVal(tier, 10, 13, 16), echo: tierVal(tier, 8, 11, 14), become: 5 }[id] * pw;
    this.power_ = { active: id, until: this.t + dur, t0: this.t };
    if (id === 'rewrite') {
      const tgt = this.findLockTarget() || this.enemies.filter(e => !e.dead && !e.boss && !e.nolock && e.s > this.ps).sort((a, b) => a.s - b.s)[0];
      if (tgt && !tgt.boss) { tgt.ally = this.t + dur; tgt.co = allyAI(tgt, this); }
    }
    if (id === 'echo') this.echo = { until: this.t + dur };
    if (id === 'become') { this.becomeUntil = this.t + dur; }
  }
  // ------------------------------------------------------------------------------------------- the script
  runScript() {
    const ev = this.script.events;
    while (this.ev < ev.length) {
      const e = ev[this.ev];
      // world-anchored things are placed by arrival time: queue them as soon as they are within view
      const worldK = ['gate', 'wall', 'packets', 'world', 'token', 'node', 'ogate', 'refuse', 'choice', 'exit', 'stream', 'corruption'].includes(e.k);
      if (worldK) { const s = this.dist.at(e.t) + PLAYER_LEAD; if (s - this.sCam > VIEW + 80 && e.t > this.t) break; this.pending.push({ ...e, s }); this.ev++; continue; }
      if (e.t > this.t) break;
      this.ev++;
      this.trigger(e);
    }
  }
  spawnPending() {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const e = this.pending[i];
      if (e.s - this.ps > VIEW) continue;
      this.pending.splice(i, 1);
      this.trigger(e);
    }
  }
  trigger(e) {
    const B = this.bounds;
    switch (e.k) {
      case 'wave': {
        const offs = formation(e.shape, e.n, this.R, B);
        offs.forEach((o, i) => {
          const cx = e.cx || 0, cy = e.cy || 0;
          this.spawnRaw(e.type, { d: 230 + i * 4, x: clamp(o[0] + cx, -B.w, B.w), y: clamp(o[1] + cy, -B.h, B.h), hold: e.hold + (i % 3) * 6, startDelay: (e.stagger || 0) * i, side: e.side || 0 });
        });
        break;
      }
      case 'world': this.spawnRaw(e.type, { s: e.s, x: e.x, y: e.y, side: e.side || 0 }); break;
      case 'node': this.spawnRaw('node', e.side === undefined ? { s: e.s, x: e.x, y: e.y, bothSides: true } : { s: e.s, x: e.x, y: e.y, side: e.side }); this.stats.objectiveTotal++; break;
      case 'gate': this.gates.push({ s: e.s, x: e.x, y: e.y, run: e.run, r: this.gateR, side: e.side }); this.stats.gatesTotal++; break;
      case 'ogate': this.gates.push({ s: e.s, x: e.x, y: e.y, r: this.gateR, objective: true, side: e.side }); this.stats.objectiveTotal++; break;
      case 'token': this.tokens.push({ s: e.s, x: e.x, y: e.y, side: e.side }); this.stats.objectiveTotal++; break;
      case 'wall': this.walls.push({ s: e.s, hole: e.hole, size: e.size, weak: e.weak, rel: false, side: e.side }); break;
      case 'stream': this.streams.push({ s0: e.s, s1: this.dist.at(e.t1) + PLAYER_LEAD, x: e.x, y: e.y, objective: e.objective, secret: e.secret, wob: this.R() * 6 }); break;
      case 'corruption': if (!this.nearChoice(e.s)) this.zones.push({ s0: e.s, s1: this.dist.at(e.t1) + PLAYER_LEAD, x: e.x, y: e.y, r: e.r }); break;
      case 'packets': for (let i = 0; i < e.n; i++) { const a = (i / e.n) * Math.PI * 2; this.packets.push({ s: e.s + (e.line ? i * 6 : 0), x: e.x + (e.ring ? Math.cos(a) * 4 : 0), y: e.y + (e.ring ? Math.sin(a) * 3 : 0) }); } break;
      case 'debris': this.debrisUntil = this.t + e.dur; break;
      case 'breach': this.breach(e); break;
      case 'radio': this.radio.push({ who: e.who, text: e.text, t: this.t }); this.audio('radio'); break;
      case 'tip': this.tips.push({ text: e.text, t: this.t, dur: e.dur }); break;
      case 'boss': this.spawnBoss(e.type, e.end); break;
      case 'juno': this.juno = this.spawnRaw('wormseg', { d: 30, x: 8, y: 2, nolock: true, untouchable: true, junoFly: true }); this.juno.co = junoFlyAI(this.juno, this, e.t1); break;
      case 'guide': this.guide = { x: 0, y: 0, d: 40, t1: e.t1, a: 0 }; break;
      case 'refuse': this.gates.push({ s: e.s, x: B.w * 0.6, y: 0, r: 5, refuse: true }); break;
      case 'exit': this.gates.push({ s: e.s, x: 0, y: 0, r: Math.max(B.w, B.h) * 1.2, exit: true }); break;
      case 'choice': {
        const opts = this.choices || { ascend: false, free: false };
        this.gates.push({ s: e.s, x: 0, y: 0, r: 5.5, choice: 'come_back', label: 'COME BACK' });
        this.gates.push({ s: e.s, x: -B.w * 0.75, y: 0, r: 5, choice: 'ascend', label: 'ASCEND', closed: !opts.ascend });
        this.gates.push({ s: e.s, x: B.w * 0.75, y: 0, r: 5, choice: 'free', label: 'FREE HER', closed: !opts.free });
        this.choiceS = e.s;   // nothing may steer the player near the ending: trim corruption and streams before the gates
        for (const z of this.zones) z.s1 = Math.min(z.s1, e.s - 220);
        for (const q of this.streams) q.s1 = Math.min(q.s1, e.s - 220);
        break;
      }
    }
  }
  breach(e) {
    this.breachT = this.t; this.flash = this.opts.lowFlash ? 0.15 : 1; this.shake = 0.6 * (this.opts.shake ?? 1);
    this.audio('breach'); this.sinceDropT0 = this.t;
    this.tips.push({ text: e.n === 2 ? 'B R E A C H  ·  II' : 'B R E A C H', t: this.t, dur: 2.2, big: true });
  }
  spawnRaw(type, o = {}) {
    const T = TYPES[type]; if (!T) { console.warn('enemy type', type); return null; }
    const e = { type, hp: Math.max(1, Math.round(T.hp * (T.hp > 50 ? 1 : this.diffK))), hpMax: T.hp, r: T.r, t0: this.t, seed: this.R(), x: 0, y: 0, d: 230, s: 0, vx: 0, vy: 0, ...o };
    if (o.s !== undefined) { e.world = true; e.d = e.s - this.ps; } else if (T.world && o.d === undefined) { e.world = true; e.s = this.ps + 300; }
    if (o.s === undefined) e.s = this.ps + e.d;
    if (T.world && o.s === undefined && o.d !== undefined) { e.world = true; e.s = this.ps + e.d; }
    e.nolock = e.nolock || T.nolock; e.armored = T.armored;
    if (e.side === undefined && !e.bothSides) { if (e.parent) { e.side = e.parent.side; e.bothSides = e.parent.bothSides; } else e.side = this.R() < 0.5 ? 0 : 1; }
    e.co = T.ai(e, this);
    if (o.startDelay) e.wake = this.t + o.startDelay;
    this.enemies.push(e);
    if (!T.nolock && T.score) this.stats.spawned++;
    return e;
  }
  spawnBoss(type, end) {
    const B = BOSSES[type]; if (!B) return;
    const hp = Math.round(B.hp * (this.diffK > 1 ? 1.2 : this.diffK < 1 ? 0.75 : 1) * (this.opts.remix ? 1.2 : 1));
    const e = { bothSides: true, type: 'boss_' + type, bossType: type, boss: true, name: B.name, hp, hpMax: hp, r: B.r, t0: this.t, end, x: 0, y: 0, d: 240, s: this.ps + 240, seed: 0.5, rel: true, untouchable: B.untouchable, armored: B.armored };
    e.co = B.ai(e, this);
    if (type !== 'juno' && !B.untouchable) { e.polar = true; this.tips.push({ text: 'ITS CORE FLIPS COLOUR EVERY TWO BARS  ·  SHIFT TO MATCH IT TO HURT IT', t: this.t + 2, dur: 6 }); }
    this.enemies.push(e); this.boss = e; this.stats.boss = type;
    if (type === 'juno') this.chase = { t0: this.t, in: 0, total: 0 };
    this.audio('alarm');
  }
  bossFinale() { // the last big downbeat: the final hit lands here if the boss is close to it
    const b = this.boss; if (!b || b.dead) return;
    if (b.bossType === 'juno') { b.gone = true; return; }
    if (b.hp <= b.hpMax * 0.15 || this.timeAttack) { this.kill(b, true); this.stats.bossKilled = true; }
    else { b.escaping = true; this.tips.push({ text: `${b.name} ESCAPED`, t: this.t, dur: 2.5 }); }
  }
  // -------------------------------------------------------------------------------------------- enemies
  updateEnemies() {
    const slowK = this.power_.active === 'dilation' && this.t < this.power_.until ? 0.35 : this.focus ? 0.5 : 1;
    this.slow = slowK;
    for (const e of this.enemies) {
      if (e.dead || e.gone) continue;
      if (e.wake && this.t < e.wake) { if (e.rel || !e.world) e.s = this.ps + e.d; continue; }
      if (e.boss && e.polar) { // SHIFT: the boss's core flips colour every two bars; only shots of its colour hurt it
        const pol = Math.floor(this.beatIndex / 8) & 1;
        if (pol !== e.polarity) { if (e.polarity !== undefined) { e.flipT = this.t; this.audio('shift', { side: pol, clean: true }); } e.polarity = pol; }
      }
      if (e.escaping) { e.d += STEP * 80; if (e.d > 400) e.gone = true; }
      else if (e.co) { const r = e.co.next(); if (r.done) e.co = null; }
      if (e.world) e.d = e.s - this.ps; else e.s = this.ps + e.d;
      // become: everything on screen is locked and destroyed
      if (this.t < this.becomeUntil && !e.boss && !e.nolock && e.d > 5 && e.d < 300 && this.isBeat(1)) this.damage(e, 99, 'bolt');
      if (e.world && e.d < -30) e.gone = true;
      // collisions with the player
      if (!e.ally && Math.abs(e.d) < (e.r + 1) && this.sameSide(e)) {
        if (Math.hypot(e.x - this.px, e.y - this.py) < e.r + 0.9 && !e.untouchable) {
          if (e.type === 'shutter' || e.type === 'gatekeeper') { if (!this.phase && !(this.boosting && e.type === 'shutter')) this.hitPlayer(15, 'wall'); else if (this.boosting) this.kill(e); }
          else if (!e.boss && !e.armored) { this.hitPlayer(12, 'ram'); this.kill(e); }
        }
      }
    }
    this.phase = this.power_.active === 'phase' && this.t < this.power_.until;
    if (this.enemies.length > 400 || this.frameN++ % 60 === 0) this.enemies = this.enemies.filter(e => !e.dead && !e.gone);
  }
  get frameN() { return this._fn || 0; } set frameN(v) { this._fn = v; }
  damage(e, dmg, kind) {
    if (e.dead || e.gone || e.untouchable) return false;
    const T = TYPES[e.type] || {};
    if (e.type === 'shutter' && !e.vuln) { this.spark(e); return false; }
    if (e.type === 'gatekeeper' && !e.vuln) { this.spark(e); return false; }
    if (T.reflect && kind === 'pulse') return 'reflect';
    { const host = e.boss ? e : e.parent && e.parent.boss ? e.parent : null;
      if (host && host.polar && host.polarity !== undefined && this.side !== host.polarity) { this.spark(e); e.wrongT = this.t; this.wrongSide = this.t; return false; } }
    if (e.armored || (e.type === 'wardeneye' && !e.vuln)) { this.spark(e); return false; }
    if (e.type === 'hunter' && e.behind) return false;
    if (T.areaWeak && kind === 'bolt') dmg *= 2;
    e.hp -= dmg; e.flashT = 0.08;
    // parts pass their damage to the boss
    if (T.link && e.parent && e.parent.boss) this.damageBoss(e.parent, T.link >= 1 ? dmg : 0);
    if (e.boss) { this.damageBoss(e, 0, true); }
    this.audio('hit', { vol: 0.4 });
    if (e.hp <= 0) { if (T.link && T.link < 1 && e.parent && e.parent.boss) this.damageBoss(e.parent, e.parent.hpMax * T.link); this.kill(e); }
    return true;
  }
  damageBoss(b, dmg, direct) {
    if (!direct) b.hp -= dmg;
    const floor = this.t < (b.end - 0.05) && !this.timeAttack ? Math.max(1, b.hpMax * 0.02) : 0;
    if (b.hp < floor) { b.hp = floor; b.critical = true; }
    if (b.hp <= 0 && !b.dead) { this.kill(b, true); this.stats.bossKilled = true; }
  }
  kill(e, big = false) {
    if (e.dead) return;
    const T = TYPES[e.type] || {};
    if (e.boss && e.hp > 0 && !big) return;
    e.dead = true;
    if (e.boss) { this.addScore(20000, true); this.flash = this.opts.lowFlash ? 0.2 : 1; this.shake = 1 * (this.opts.shake ?? 1); this.explode(e, 6); this.audio('explode', { big: true }); this.tips.push({ text: `${e.name} DOWN`, t: this.t, dur: 3, big: true }); this.bossDownT = this.t; return; }
    if (T.score) {
      this.stats.kills++; this.addScore(T.score, true); this.flow = Math.min(100, this.flow + 2);
      // polarity chain: three kills in a row from the same world score a doubling bonus
      if (!e.bothSides) {
        if (e.side === this.chainSide) this.chainN++; else { this.chainSide = e.side; this.chainN = 1; }
        if (this.chainN % 3 === 0) { const k = this.chainN / 3; this.addScore(100 * Math.pow(2, Math.min(8, k - 1)), true); this.chainT = this.t; this.stats.sideChainBest = Math.max(this.stats.sideChainBest, k); this.audio('chain', { n: k }); }
      }
    }
    if (e.type === 'node') { this.stats.objHave++; this.objTip(); }
    if (e.type === 'splitter') for (let i = 0; i < 3; i++) this.spawnRaw('splitlet', { d: e.d, x: e.x, y: e.y, side: e.side });
    this.explode(e, T.r || 1); this.audio('explode', { big: e.type === 'node' || e.type === 'gatekeeper' });
  }
  explode(e, size) {
    const col = e.color || null;
    for (let i = 0; i < 6 + size * 4; i++) this.fx.push({ kind: 'spark', d: e.d, s: e.s, x: e.x, y: e.y, vx: (this.R() - 0.5) * 30 * Math.sqrt(size), vy: (this.R() - 0.5) * 30 * Math.sqrt(size), vd: (this.R() - 0.5) * 20, life: 0.6 + this.R() * 0.4, t: 0, col, size: 0.4 + size * 0.1 });
    this.fx.push({ kind: 'boom', d: e.d, s: e.s, x: e.x, y: e.y, life: 0.5, t: 0, size: size * 2 + 1 });
  }
  spark(e) { this.fx.push({ kind: 'spark', s: e.s, x: e.x + (this.R() - 0.5), y: e.y + (this.R() - 0.5), vx: (this.R() - 0.5) * 20, vy: (this.R() - 0.5) * 20, vd: -10, life: 0.25, t: 0, size: 0.3 }); }
  // API for behaviours
  shoot(e, o) {
    if (e.ally) return;
    e.firedT = this.t;   // the view animates the shot (jaws, visors, iris flares)
    if (this.ebullets.length > 1500) return;
    const sp = (o.speed || 30) * (this.diffK) * (this.opts.remix ? 1.15 : 1);
    let dx, dy, dd;
    if (o.dir) { dx = o.dir[0]; dy = o.dir[1]; dd = -1; }
    else {
      const d = Math.max(4, e.d);
      dx = (this.px - e.x) / d; dy = (this.py - e.y) / d; dd = -1;
      if (o.spread) { dx += o.spread; dy += o.spread * 0.3; }
    }
    const l = Math.hypot(dx, dy, dd);
    // bosses (in both worlds) fire in alternating polarity, one bar at a time
    const host = e.boss ? e : e.parent && e.parent.boss ? e.parent : null;
    let side = o.side ?? (e.bothSides ? Math.floor(this.beatIndex / 4) & 1 : (e.side ?? 0));
    if (o.side === undefined && host && host.polar && host.polarity !== undefined) { host.shotN = (host.shotN || 0) + 1; side = host.shotN % 3 === 0 ? host.polarity ^ 1 : host.polarity; }
    this.ebullets.push({ s: e.s, x: e.x, y: e.y, vd: (dd / l) * sp, vx: (dx / l) * sp, vy: (dy / l) * sp, life: 8, kind: o.kind || 'shot', r: o.kind === 'tendril' ? 0.9 : o.kind === 'petal' ? 1.1 : 0.7, side });
  }
  telegraph(e, strong) { e.teleT = this.t; if (this.mod('foresight') || strong) this.telegraphs.push({ e, t: this.t, dur: this.spb, strong }); }
  // how many objective items are needed: always the same count (need × n), however many the difficulty put in
  objNeeded() { const o = this.dive && this.dive.objective; return o ? Math.max(1, Math.ceil((o.n || 10) * (o.need || 0.7))) : 1; }
  objTip() { const o = this.dive && this.dive.objective; if (o && o.label) this.tips.push({ text: `${o.label}  ${this.stats.objHave} / ${this.objNeeded()}${this.stats.objHave >= this.objNeeded() ? '  ·  DONE' : ''}`, t: this.t, dur: 1.6 }); }
  alarm(e) { this.audio('alarm'); this.alarmT = this.t; this.tips.push({ text: 'ALARM', t: this.t, dur: 1.5 }); for (let i = 0; i < 4; i++) this.spawnRaw('tracer', { d: 240 + i * 10, x: (this.R() - 0.5) * this.bounds.w, y: (this.R() - 0.5) * this.bounds.h }); }
  nearChoice(s) { return this.choiceS !== undefined && s > this.choiceS - 220 && s < this.choiceS + 60; }
  corruption(e) { if (this.nearChoice(e.s) || this.nearChoice(this.ps)) return; this.zones.push({ s0: e.s - 4, s1: e.s + 30, x: e.x, y: e.y, r: 4 }); }
  ram(e, dmg) { if (this.player.rollT > 0 || this.phase || !this.sameSide(e)) return; this.hitPlayer(dmg, 'ram'); e.d += 10; }
  history(back) { const t = this.t - back; for (let i = this.history_.length - 1; i >= 0; i--) if (this.history_[i][0] <= t) return [this.history_[i][1], this.history_[i][2]]; return [this.px, this.py]; }
  wall(e, o) { this.walls.push({ rel: true, d: e.d, s: e.s, hole: o.hole, size: o.size, speed: o.speed, laser: o.laser }); }
  // ----------------------------------------------------------------------------------- shots and bullets
  updateShots(dt) {
    const P = this.player, edt = this.dt;
    // player pulse shots
    for (const b of this.shots) {
      b.s += (this.speed + 260) * dt; b.life -= dt; if (b.vx) b.x += b.vx * dt; if (b.vy) b.y += b.vy * dt;
      if (b.s - this.ps > 420) b.life = 0;
      for (const e of this.enemies) {
        if (e.dead || e.gone || e.ally || e.behind || !(e.bothSides || e.side === b.side)) continue;
        if (Math.abs(e.s - b.s) < e.r + 3 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 0.3) {
          const r = this.damage(e, b.dmg, 'pulse');
          if (r === 'reflect') { this.ebullets.push({ s: e.s, x: e.x, y: e.y, vd: -30, vx: (this.px - e.x) * 0.3, vy: (this.py - e.y) * 0.3, life: 4, kind: 'shot', r: 0.6, side: (e.side ?? 0) ^ 1 }); this.audio('deflect'); }
          b.life = 0; break;
        }
      }
    }
    this.shots = this.shots.filter(b => b.life > 0);
    // homing bolts (launch quantised)
    for (const b of this.bolts) {
      if (this.t < b.launch) { b.s = this.ps; b.x = this.px; b.y = this.py; continue; }
      if (!b.fired) { b.fired = true; this.audio('bolt', { n: b.n }); }
      const tg = b.target;
      b.life -= dt;
      if (!tg || tg.dead || tg.gone) { b.s += (this.speed + 200) * dt; if (b.life < 2.5) b.life = 0; continue; }
      const ds = tg.s - b.s, dx = tg.x - b.x, dy = tg.y - b.y, L = Math.hypot(ds, dx, dy);
      const sp = 240;
      b.vs = lerp(b.vs, (ds / L) * sp, dt * 8); b.vx = lerp(b.vx, (dx / L) * sp, dt * 8); b.vy = lerp(b.vy, (dy / L) * sp, dt * 8);
      b.s += (this.speed + b.vs) * dt * 0.5 + b.vs * dt * 0.5; b.x += b.vx * dt; b.y += b.vy * dt;
      if (L < tg.r + 2) {
        b.life = 0;
        const ok = this.damage(tg, b.dmg, 'bolt');
        if (ok && tg.dead && !tg.boss) this.addScore(100 * b.chain, true);
        // area damage
        for (const e of this.enemies) if (e !== tg && !e.dead && TYPES[e.type] && TYPES[e.type].areaWeak && Math.abs(e.s - tg.s) < 6 && Math.hypot(e.x - tg.x, e.y - tg.y) < 5) this.damage(e, b.dmg, 'bolt');
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0);
    // enemy bullets (relative to the player frame: they approach at their own speed)
    const rolling = P.rollT > 0;
    for (const b of this.ebullets) {
      b.s += this.speed * dt + b.vd * edt;
      b.x += b.vx * edt; b.y += b.vy * edt; b.life -= edt;
      const d = b.s - this.ps;
      if (d < -15 || d > 600) b.life = 0;
      if (Math.abs(d) < 1.6) {
        const off = Math.hypot(b.x - this.px, b.y - this.py);
        if (rolling && off < 3.2 && b.kind === 'shot') { // deflect: send it back
          this.shots.push({ s: this.ps + 2, x: b.x, y: b.y, vx: 0, vy: 0, life: 1.5, dmg: 2 }); b.life = 0; this.audio('deflect'); this.addScore(50, true); continue;
        }
        const absorb = b.kind !== 'petal' && !b.ally && (b.side === this.side || this.t < this.shiftGuard);
        if (absorb && off < b.r + 1.4) { b.life = 0; this.absorb(b); continue; }
        if (off < b.r + 0.75) { b.life = 0; if (b.kind === 'petal') { this.flow = Math.min(100, this.flow + 4); this.audio('packet'); } else this.hitPlayer(b.kind === 'tendril' ? 8 : 10, 'shot'); }
      }
      // allies' shots
      if (b.ally) for (const e of this.enemies) if (!e.ally && !e.dead && Math.abs(e.s - b.s) < e.r + 2 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 0.5) { this.damage(e, 2, 'pulse'); b.life = 0; break; }
    }
    this.ebullets = this.ebullets.filter(b => b.life > 0);
    // fx
    for (const f of this.fx) { f.t += dt; if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.s += f.vd * dt; f.vx *= 0.96; f.vy *= 0.96; } }
    this.fx = this.fx.filter(f => f.t < f.life);
    this.telegraphs = this.telegraphs.filter(g => this.t - g.t < g.dur);
  }
  // a bullet from your own world: soaked up as energy
  absorb(b) {
    this.stats.absorbed++; this.flow = Math.min(100, this.flow + 2.5); this.addScore(20, true); this.absorbT = this.t;
    this.fx.push({ kind: 'spark', s: this.ps, x: b.x, y: b.y, vx: (this.px - b.x) * 4, vy: (this.py - b.y) * 4, vd: 0, life: 0.25, t: 0, size: 0.5, col: b.side ? [1, 0.4, 0.8] : [0.5, 1, 1] });
    this.audio('absorb', { vol: 0.5 });
    // absorbing charges the weapon: a full bar adds a line of fire (up to level 5)
    if (this.wlev < 5) {
      this.wcharge += 1 / (10 + this.wlev * 6);
      if (this.wcharge >= 1) { this.wcharge = 0; this.wlev++; this.wlevT = this.t; this.audio('objective'); this.tips.push({ text: `WEAPON LV ${this.wlev}`, t: this.t, dur: 1.6 }); }
    }
  }
  // a hit drains the weapon by difficulty: Easy nothing, Normal one absorbed shot's worth, Hard half a level,
  // Deep a whole level (the charge carries down into the level below)
  weaponHit() {
    const cost = { easy: 0, normal: 1 / (10 + this.wlev * 6), hard: 0.5, deep: 1 }[this.difficulty] ?? 1 / (10 + this.wlev * 6);
    if (!cost) return;
    this.wcharge -= cost;
    while (this.wcharge < 0 && this.wlev > 1) { this.wlev--; this.wcharge += 1; this.wlevT = -this.t; }
    if (this.wcharge < 0) this.wcharge = 0;
  }
  hitPlayer(dmg, kind) {
    const P = this.player;
    if (P.inv > 0 || this.done) return;
    if (this.phase && (kind === 'wall' || kind === 'debris')) return;
    if (kind === 'debris' && this.boosting) return;
    const mult = { easy: 0.6, normal: 1, hard: 1.25, deep: 999 }[this.difficulty] || 1;
    this.integrity -= dmg * mult;
    if (kind !== 'debris') this.weaponHit();
    this.stats.hits++; this.sectionHits = (this.sectionHits || 0) + 1;
    this.sync = 1; this.noHitT = 0;
    P.inv = 0.6; P.hitT = this.t;
    this.shake = 0.35 * (this.opts.shake ?? 1); this.flash = this.opts.lowFlash ? 0 : 0.15;
    this.audio('player_hit'); if (this.onHit) this.onHit();
    if (this.integrity <= 0) { this.integrity = 0; this.failed = true; this.done = true; this.audio('disconnect'); }
  }
  // ------------------------------------------------------------------------------------- world objects
  updateWorld(dt) {
    const P = this.player;
    // gates (fly through)
    for (const g of this.gates) {
      if (g.passed || g.missed) continue;
      if (this.ps >= g.s) {
        const off = Math.hypot(this.px - g.x, this.py - g.y);
        if (g.exit) { g.passed = true; this.exitPassed = true; this.exitT = this.t; continue; }
        if (g.choice) { if (!this.choice) { const pick = this.gates.filter(q => q.choice && Math.abs(q.s - g.s) < 1).sort((a, b) => Math.hypot(this.px - a.x, this.py - a.y) - Math.hypot(this.px - b.x, this.py - b.y))[0]; this.choice = pick.closed ? 'come_back' : pick.choice; this.audio('choice'); this.exitPassed = true; this.exitT = this.t; } g.passed = true; continue; }
        if (off < g.r && (g.side === undefined || g.side === this.side || this.t - this.shiftT < 0.12)) {
          g.passed = true;
          if (g.refuse) { this.refused = true; this.exitPassed = true; this.exitT = this.t; this.audio('choice'); continue; }
          if (g.objective) { this.stats.objHave++; this.audio('objective'); }
          else { this.stats.gates++; this.audio('gate', { n: this.stats.gates }); }
          this.flow = Math.min(100, this.flow + 4); this.sync = Math.min(8, this.sync + 0.35); this.addScore(g.run ? 150 : 100, true);
        } else g.missed = true;
      }
    }
    this.gates = this.gates.filter(g => g.s > this.ps - 40);
    // firewalls: the opening breathes with the beat; outside it you crash (boost breaks weak walls, Phase passes)
    for (const w of this.walls) {
      if (w.rel) { w.d -= (w.speed || 40) * this.dt; w.s = this.ps + w.d; }
      const open = 0.55 + 0.45 * Math.cos(this.beatPhase * Math.PI * 2);
      w.open = open;
      if (!w.passed && this.ps >= w.s) {
        w.passed = true;
        const sz = w.size * (0.6 + open * 0.6) * (this.opts.wideGates ? 1.25 : 1);
        const inside = Math.abs(this.px - w.hole[0]) < sz && Math.abs(this.py - w.hole[1]) < sz * 0.75;
        if (!inside && w.side !== undefined && w.side !== this.side) { w.ghost = true; }
        else if (!inside) {
          if (this.phase) { /* pass through */ } else if (this.boosting && w.weak) { w.broken = true; this.audio('explode'); this.addScore(200, true); }
          else { this.hitPlayer(w.laser ? 12 : 16, 'wall'); w.broken = true; }
        } else { this.addScore(80, true); this.sync = Math.min(8, this.sync + 0.15); }
      }
    }
    this.walls = this.walls.filter(w => w.s > this.ps - 30);
    // streams: rivers of light that carry you faster
    this.streamIn = false;
    if (this.nearChoice(this.ps)) this.invertT = 0;   // free steering for the choice
    for (const st of this.streams) {
      if (this.ps < st.s0 || this.ps > st.s1) continue;
      const sx = st.x + Math.sin(this.ps * 0.01 + st.wob) * 4, sy = st.y + Math.cos(this.ps * 0.013 + st.wob) * 2;
      const isObj = st.objective;
      if (isObj) this.stats.streamTotal += dt;
      const sd = Math.hypot(this.px - sx, this.py - sy), rad = isObj ? STREAM_R : 3.2;
      // objective streams pull you in gently when you are near (the dodging never fully throws you out)
      if (isObj && sd < rad + 5 && sd > 0.5) { const k = Math.min(1, 2.2 * dt); this.player.x += (sx - this.px) * k * 0.6; this.player.y += (sy - this.py) * k * 0.6; }
      if (sd < rad) {
        this.streamIn = true;
        const k = tierVal(this.mod('slipstream'), 2, 2.5, 3) || 1;
        this.flow = Math.min(100, this.flow + 8 * k * dt); this.player.offV += 20 * k * dt; this.addScore(30 * dt * k, true);
        if (isObj) this.stats.streamT += dt;
        if (st.secret && !st.found) { st.found = true; this.stats.secrets++; this.addScore(1500, true); this.tips.push({ text: 'SECRET STREAM', t: this.t, dur: 2 }); }
      }
    }
    this.streams = this.streams.filter(s => s.s1 > this.ps - 20);
    // corruption: drains integrity, inverts controls briefly
    for (const z of this.zones) {
      if (this.ps < z.s0 || this.ps > z.s1) continue;
      if (Math.hypot(this.px - z.x, this.py - z.y) < z.r) { this.integrity -= 8 * dt; this.regenBlock = this.t; if (this.invertT <= 0) this.invertT = 1.5; this.muffle = 0.5; if (this.integrity <= 0) this.hitPlayer(1, 'shot'); }
    }
    this.zones = this.zones.filter(z => z.s1 > this.ps - 20);
    // collapse debris during breaches
    if (this.t < (this.debrisUntil || 0) && this.frameN % 6 === 0) {
      this.debris.push({ s: this.ps + 120 + this.R() * 160, x: (this.R() - 0.5) * this.bounds.w * 2.2, y: this.bounds.h * 2.5, vy: -(14 + this.R() * 18), rot: this.R() * 6, size: 1 + this.R() * 2.5 });
    }
    for (const d of this.debris) {
      d.y += d.vy * dt; d.rot += dt * 2;
      if (!d.hit && Math.abs(d.s - this.ps) < d.size + 1 && Math.hypot(d.x - this.px, d.y - this.py) < d.size + 0.8) { d.hit = true; this.hitPlayer(10, 'debris'); }
    }
    this.debris = this.debris.filter(d => d.s > this.ps - 20 && d.y > -this.bounds.h * 3);
    // packets and objective tokens
    for (const p of this.packets) if (!p.got && Math.abs(p.s - this.ps) < 2 && Math.hypot(p.x - this.px, p.y - this.py) < 2.6) { p.got = true; this.stats.packets++; this.flow = Math.min(100, this.flow + 6); this.addScore(50, true); this.audio('packet'); }
    this.packets = this.packets.filter(p => !p.got && p.s > this.ps - 20);
    for (const p of this.tokens) if (!p.got && Math.abs(p.s - this.ps) < 2.5 && Math.hypot(p.x - this.px, p.y - this.py) < 3.2 && (p.side === undefined || p.side === this.side || this.t - this.shiftT < 0.15)) { p.got = true; this.stats.objHave++; this.audio('objective'); this.addScore(500, true); this.objTip(); }
    this.tokens = this.tokens.filter(p => !p.got && p.s > this.ps - 20);
    // follow guide (Signals)
    if (this.guide && this.t < this.guide.t1) {
      const g = this.guide; g.a += dt * 0.7;
      g.x = Math.sin(g.a) * this.bounds.w * 0.7; g.y = Math.sin(g.a * 1.6 + 1) * this.bounds.h * 0.6; g.d = 38 + Math.sin(g.a * 0.4) * 6;
      this.stats.followTotal += dt;
      if (Math.hypot(this.px - g.x, this.py - g.y) < 6.5) { this.stats.followT += dt; g.near = true; } else g.near = false;
    }
    // Juno's chase: stay within her light
    if (this.boss && this.boss.bossType === 'juno' && !this.boss.gone) {
      const b = this.boss; this.chase.total += dt;
      if (Math.hypot(this.px - b.x, this.py - b.y) < 7) { this.chase.in += dt; this.flow = Math.min(100, this.flow + 2 * dt); b.near = true; } else b.near = false;
    }
  }
  // ----------------------------------------------------------------------------------- meters and score
  beatAction() {
    if (this.onBeatNow()) { this.sync = Math.min(8, this.sync + 0.25); this.beatHitT = this.t; return true; }
    return false;
  }
  addScore(v, mult) { this.stats.score += Math.round(v * (mult ? this.sync : 1)); }
  updateMeters(dt) {
    this.noHitT += dt;
    if (this.noHitT > this.spb * 4) { this.noHitT = 0; this.sync = Math.min(8, this.sync + 0.4); }
    const decay = this.difficulty === 'deep' ? 0.12 : 0.03;
    this.sync = Math.max(1, this.sync - decay * dt);
    this.overdrive = this.sync >= 7.95;
    this.stats.syncSum += this.sync * dt; this.stats.syncN += dt; this.stats.maxSync = Math.max(this.stats.maxSync, this.sync);
    if (this.t - (this.player.hitT || -9) > 3 && this.t - (this.regenBlock || -9) > 1) this.integrity = Math.min(100, this.integrity + 3 * dt);
    this.flash = Math.max(0, this.flash - dt * 2.5); this.shake = Math.max(0, this.shake - dt * 1.8); this.muffle = Math.max(0, this.muffle - dt);
    this.sinceDrop = this.dropSeen ? this.t - (this.sinceDropT0 || 0) : 99;
    if (this.integrity < 30 && this.isBeat(2)) this.audio('heartbeat', { vol: 0.5 });
  }
  finish() {
    if (this.done) return;
    this.done = true;
  }
  audio(name, o) { if (this.sfx) this.sfx(name, o || {}); }
  // ---------------------------------------------------------------------------------------- results
  results() {
    const S = this.stats;
    const killPct = S.spawned ? S.kills / S.spawned : 1;
    const gatePct = S.gatesTotal ? S.gates / S.gatesTotal : 1;
    const hitK = 1 - Math.min(S.hits, 12) / 12;
    const avgSync = S.syncN ? S.syncSum / S.syncN : 1;
    const bossK = S.boss ? (S.bossKilled ? 1 : 0) : 1;
    const v = killPct * 0.33 + gatePct * 0.2 + hitK * 0.22 + clamp((avgSync - 1) / 4, 0, 1) * 0.13 + bossK * 0.12;
    let rank = v >= 0.86 ? 'S' : v >= 0.72 ? 'A' : v >= 0.58 ? 'B' : v >= 0.42 ? 'C' : 'D';
    if (rank === 'S' && S.hits === 0 && avgSync >= 5.5) rank = 'SS';
    // objective
    const obj = this.dive.objective; let objOk = true, objVal = 1;
    if (obj) {
      if (obj.kind === 'collect' || obj.kind === 'destroy' || obj.kind === 'gates') { const need = this.objNeeded(); objOk = S.objHave >= need; objVal = Math.min(1, S.objHave / need) * (obj.need || 0.7) + Math.max(0, Math.min(1, (S.objHave - need) / Math.max(1, S.objectiveTotal - need))) * (1 - (obj.need || 0.7)); }
      if (obj.kind === 'follow') { objVal = S.followTotal ? S.followT / S.followTotal : 0; objOk = objVal >= (obj.need || 0.55); }
      if (obj.kind === 'stream') { objVal = S.streamTotal ? S.streamT / S.streamTotal : 0; objOk = objVal >= (obj.need || 0.5); }
      if (obj.kind === 'survive') { objOk = !this.failed; objVal = objOk ? 1 : 0; }
    }
    if (this.refused) objOk = false;
    const chase = this.chase ? this.chase.in / Math.max(1, this.chase.total) : null;
    return { shifts: S.shifts, cleanShifts: S.cleanShifts, absorbed: S.absorbed, sideChain: S.sideChainBest, rank, score: S.score, killPct, gatePct, hits: S.hits, avgSync, bossKilled: S.bossKilled, boss: S.boss, objOk, objVal, refused: this.refused, choice: this.choice, chase, secrets: S.secrets, chain: S.chain, failed: this.failed };
  }
}
function* allyAI(e, D) { // Rewrite: a turned enemy fights for you
  e.rel = true; e.d = Math.min(e.d, 40);
  while (D.t < e.ally) {
    e.x = lerp(e.x, D.px + (e.seed - 0.5) * 8, D.dt); e.y = lerp(e.y, D.py + 3, D.dt);
    if (D.isBeat(1)) { const tg = D.enemies.find(o => !o.ally && !o.dead && !o.gone && o.d > e.d && !o.nolock); if (tg) { D.ebullets.push({ s: e.s, x: e.x, y: e.y, vd: 120, vx: (tg.x - e.x) * 1.5, vy: (tg.y - e.y) * 1.5, life: 3, kind: 'ally', r: 0.5, ally: true }); } }
    yield;
  }
  e.ally = 0; D.kill(e);
}
function* junoFlyAI(e, D, t1) { // Juno flies beside you in the breakdown
  e.rel = true; e.junoFly = true;
  while (D.t < t1) { e.d = lerp(e.d, 14, D.dt); e.x = lerp(e.x, D.px + 7 * Math.sin(D.t * 0.6), D.dt * 2); e.y = lerp(e.y, D.py + 2 + Math.sin(D.t), D.dt * 2); yield; }
  while (e.d < 300) { e.d += D.dt * 60; yield; }
  e.gone = true;
}
