// Autopilot (attract mode, automated tests): steers for walls' openings, gates, tokens and guides, dodges bullets,
// fires constantly and sweeps lock-ons.
import { clamp } from '../core/math.js';

export class Bot {
  constructor(o = {}) { this.cur = {}; this.prev = {}; this.lockT = 0; this.noShift = !!o.noShift; this.simple = !!o.simple; this.lastShift = -9; }
  input(sim) {
    this.prev = this.cur; this.cur = {};
    const px = sim.px, py = sim.py, ps = sim.ps;
    let tx = 0, ty = 0, best = 1e9;
    const consider = (s, x, y, w) => { const d = s - ps; if (d < 1 || d > 160) return; const sc = d / w; if (sc < best) { best = sc; tx = x; ty = y; } };
    for (const w of sim.walls) if (!w.passed) consider(w.s, w.hole[0], w.hole[1], 4);
    for (const g of sim.gates) if (!g.passed && !g.missed && !g.refuse && !(g.choice && g.closed) && (this.noShift ? g.side === undefined || g.side === sim.side : true)) consider(g.s, g.x, g.y, g.objective ? 3 : 1.5);
    for (const p of sim.tokens) consider(p.s, p.x, p.y, 2);
    for (const p of sim.packets) consider(p.s, p.x, p.y, 0.7);
    if (best === 1e9) {
      if (sim.guide && sim.t < sim.guide.t1) { tx = sim.guide.x; ty = sim.guide.y; }
      else if (sim.boss && sim.boss.bossType === 'juno' && !sim.boss.gone) { tx = sim.boss.x; ty = sim.boss.y; }
      else { const e = sim.enemies.filter(e => !e.dead && !e.gone && !e.nolock && e.d > 10 && e.d < 200 && sim.sameSide(e)).sort((a, b) => a.d - b.d)[0]; if (e) { tx = e.x; ty = e.y; } }
    }
    // dodge bullets about to arrive
    let dx = 0, dy = 0;
    for (const b of sim.ebullets) { const d = b.s - ps; if (d < 0 || d > 30 || b.side === sim.side) continue; const ox = px - b.x, oy = py - b.y, o = Math.hypot(ox, oy); if (o < 3) { dx += (ox || 1) / (o + 0.3) * 4; dy += (oy || 0.5) / (o + 0.3) * 4; } }
    const ax = clamp((tx - px) * 0.25 + dx, -1, 1), ay = clamp((ty - py) * 0.25 + dy, -1, 1);
    this.axis = [ax, ay]; this.mouseTarget = null;
    this.cur.fire = true;
    this.lockT += 1 / 60;
    this.cur.lock = (this.lockT % 3) < 1.2;
    // shift on the beat: toward a gate of the other world just ahead, away from a wave of other-world bullets, or to
    // reach ICE that only lives in the other world
    if (!this.noShift) {
      const near = sim.beatPhase > 0.92 || sim.beatPhase < 0.04;
      let want = false;
      const g = sim.gates.filter(g => !g.passed && !g.missed && g.side !== undefined && g.s - ps > 0 && g.s - ps < 40).sort((a, b) => a.s - b.s)[0];
      const boss = sim.boss && !sim.boss.dead && !sim.boss.gone && sim.boss.polar ? sim.boss : null;
      const tk = sim.tokens.filter(t => !t.got && t.side !== undefined && t.s - ps > 0 && t.s - ps < 40).sort((a, b) => a.s - b.s)[0];
      if (g) want = g.side !== sim.side;
      else if (boss && boss.polarity !== undefined) want = boss.polarity !== sim.side;   // match the boss's core
      else if (tk) want = tk.side !== sim.side;
      else {
        const threat = sim.ebullets.filter(b => b.side !== sim.side && b.s - ps > 0 && b.s - ps < 45).length;
        const mine = sim.ebullets.filter(b => b.side === sim.side && b.s - ps > 0 && b.s - ps < 45).length;
        const here = sim.enemies.some(e => !e.dead && !e.gone && !e.nolock && !e.bothSides && e.side === sim.side && e.d > 10 && e.d < 200);
        const there = sim.enemies.some(e => !e.dead && !e.gone && !e.nolock && !e.bothSides && e.side !== sim.side && e.d > 10 && e.d < 200);
        want = threat > mine + 1 || (!here && there && threat === 0);
      }
      this.cur.shift = want && near && sim.t - this.lastShift > 0.5;
      if (this.cur.shift) this.lastShift = sim.t;
    }
    if (this.simple) return this;
    this.cur.boost = sim.flow > 60 && sim.section.type === 'build' && (this.lockT % 5) < 0.6;
    this.cur.rollL = sim.ebullets.some(b => b.s - ps > 0 && b.s - ps < 6 && Math.hypot(b.x - px, b.y - py) < 2.5) && (this.lockT % 1) < 0.1;
    return this;
  }
  down(a) { return !!this.cur[a]; }
  pressed(a) { return !!this.cur[a] && !this.prev[a]; }
  released(a) { return !this.cur[a] && !!this.prev[a]; }
}

// One-key mode: the autopilot steers, fires and locks; the player only shifts (tap) and slows time (hold)
export class OneKey {
  constructor() { this.bot = new Bot({ noShift: true, simple: true }); this.held = 0; this.was = false; this.cur = {}; this.prev = {}; }
  input(sim, input) {
    const b = this.bot.input(sim);
    const on = input.oneKey();
    this.prev = this.cur; this.cur = { ...b.cur, rollL: false, rollR: false, boost: false, brake: false, shift: on && !this.was, pause: input.down('pause') };
    this.held = on ? this.held + 1 / 60 : 0; this.was = on;
    this.axis = b.axis; this.mouseTarget = null; this.focus = this.held > 0.25;
    return this;
  }
  down(a) { return !!this.cur[a]; }
  pressed(a) { return !!this.cur[a] && !this.prev[a]; }
  released(a) { return !this.cur[a] && !!this.prev[a]; }
}
