// A playable dive: loads the track and its beat map, builds path / world / script / simulation / view, starts the music
// and keeps the simulation locked to the song clock. Handles pause, disconnection and reconnecting at a section start.
import { buildDistance, Path } from './path.js';
import { World } from './world.js';
import { KITS, SHIFT_PAIR } from './layers.js';
import { buildScript } from './builder.js';
import { DiveSim } from '../sim/dive.js';
import { DiveView } from './view.js';
import { rng, hashStr } from '../core/rng.js';
import { Bot, OneKey } from '../sim/bot.js';

export async function createDive(game, cfg) {
  const { audio, lib } = game;
  const dive = cfg.dive;
  const track = cfg.track;
  const loaded = cfg.loaded || await audio.loadTrack(track, { remix: cfg.remix, onAnalyse: cfg.onAnalyse });
  const map = loaded.map;
  const kit = KITS[cfg.kit || dive.kit] || KITS.grid_city;
  const remixFile = loaded.url && /_remix\./.test(loaded.url);
  const rate = (game.opts.gameSpeed || 1) * (cfg.remix && !remixFile ? 1.06 : 1);
  const dist = buildDistance(map);
  const style = { ...kit.path, seed: hashStr(dive.id + (cfg.seed || '')) };
  if (kit === KITS.chrome_sea) { // the Chrome Sea dives under the surface in the breakdown
    const bd = map.sections.find(s => s.type === 'breakdown'), nx = map.sections[map.sections.indexOf(bd) + 1];
    if (bd && nx) { const a = dist.at(bd.t) + 40, b = dist.at(nx.t) - 60; style.altAt = s => (s > a && s < b ? -26 : null); }
  }
  const path = new Path(dist.length + 300, style);
  const world = new World(path, kit, lib);
  kit.build(world, rng(style.seed), map, dive);
  world.cleared = world.clearCorridor(kit.bounds);
  world.sort();
  // the B-side: the paired layer built over the same path
  const kitB = KITS[SHIFT_PAIR[cfg.kit || dive.kit]] || KITS.black_ice;
  const worldB = new World(path, kitB, lib);
  kitB.build(worldB, rng(style.seed ^ 0x5f3759df), map, dive);
  worldB.cleared = worldB.clearCorridor(kit.bounds);
  worldB.sort();
  const camp = cfg.camp;
  const script = buildScript(dive, kit, map, { difficulty: game.opts.difficulty, suspicion: cfg.suspicion, remix: cfg.remix, seed: cfg.seed, endlessLoop: cfg.endlessLoop, noBoss: cfg.noBoss });
  const sim = new DiveSim({
    dive, kit, map, dist, script, mods: cfg.mods || {}, drift: cfg.drift || 0, difficulty: game.opts.difficulty, opts: { ...game.opts, remix: cfg.remix },
    equipped: cfg.equipped || null, choices: cfg.choices, timeAttack: cfg.timeAttack, sfx: (n, o) => audio.play(n, o),
  });
  sim.onHit = () => audio.hitSweep();
  sim.onShift = (side, clean) => audio.setSide(side, clean);
  const view = new DiveView(lib, world, kit, sim, game.opts, worldB, kitB);
  return new DiveSession(game, { ...cfg, loaded, map, kit, rate, sim, view, world, dist, script });
}

export class DiveSession {
  constructor(game, o) { Object.assign(this, o); this.game = game; this.titleT = 0; this.paused = false; this.ended = false; this.bot = o.bot ? new Bot() : null; this.oneKey = !o.bot && game.opts.controlMode === 'onekey' ? new OneKey() : null; this.time = 0; }
  start(from = 0) {
    this.sim.reset(from);
    if (from > 0) this.sim.stats.retries++;
    this.music = this.game.audio.playMusic(this.loaded, { from, rate: this.rate, loop: !!this.loop });
    this.titleT = from > 0 ? 6 : 0;
    this.paused = false;
  }
  songTime() { return this.game.audio.songTime(); }
  update(dt, input) {
    if (this.paused || this.ended) return;
    this.time += dt; this.titleT += dt;
    const t = this.songTime();
    const inp = this.bot ? this.bot.input(this.sim) : this.oneKey ? this.oneKey.input(this.sim, input) : input;
    this.sim.update(t, inp, dt);
    if (this.invulnerable) this.sim.integrity = 100;
    const s = this.sim;
    this.game.audio.setMix({ integrity: s.integrity / 100, lead: s.sync >= 1.5 || s.t - s.player.hitT > 4, overdrive: s.overdrive, muffle: s.muffle });
    if (s.done && !this.ended) {
      if (this.loop && !s.failed) { this.start(0); return; }
      this.ended = true;
      if (this.onEnd) this.onEnd(s.results());
    }
  }
  // kick envelope from the beat phase (for pulsing materials)
  kick() { const p = this.sim.beatPhase; return Math.exp(-p * 7); }
  render(r, drift) {
    const F0 = { kick: this.kick(), drift };
    const F = this.view.render(r, F0, this.sim.t);
    return F;
  }
  pause() { if (this.paused || this.ended) return; this.paused = true; this.game.audio.pause(); }
  resume() { if (!this.paused) return; this.paused = false; this.game.audio.resume(); }
  // reconnect at the start of the current section (seek the music)
  reconnect() {
    const sec = this.sim.sectionAt(this.sim.t);
    const score = this.sim.stats.score;
    this.ended = false;
    this.game.audio.resume();
    this.start(Math.max(0, sec.t - 0.01));
    this.sim.stats.score = Math.round(score * 0.8);
  }
  restart() { this.ended = false; this.sim.stats = null; this.game.audio.resume(); this.start(0); }
  stop() { this.game.audio.stopMusic(0.3); this.ended = true; }
}
