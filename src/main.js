// DEEPLINK — entry point. Boot, title, menus, story (storyboards, lab, contract board, mods, choices, endings), the
// dives and every mode (Free Dive, Remix, Endless Deep, Custom Music, Time Attack). URL options for testing:
//   ?dive=<id>  jump into a dive   &bot  autopilot   &from=<s>  start at song time   &remix   &kit=<id>
//   ?seq=<id>   play a storyboard sequence           ?lab=<layer>  open the lab at a layer (debug campaign; &drift=<0-100>; lab=8: full evidence + fragments)
//   ?unlock     unlock every dive, mode and gallery panel   ?trailer=play | record   the trailer (OPTIONS has it too)
import { Renderer } from './render/renderer.js';
import { buildLib } from './render/lib.js';
import { AudioEngine } from './audio/audio.js';
import { Input } from './core/input.js';
import { loadOptions, saveOptions, loadRecords, saveRecords } from './core/save.js';
import { createDive } from './dive/session.js';
import { Hud } from './ui/hud.js';
import { PanelPlayer } from './panels/player.js';
import { Screens } from './ui/screens.js';
import { DIVE } from './story/dives.js';
import { MODS } from './story/mods.js';
import { Trailer } from './trailer/trailer.js';

class Game {
  constructor() {
    this.gpuCanvas = document.getElementById('gpu'); this.hudCanvas = document.getElementById('hud'); this.ui = document.getElementById('ui');
    this.opts = loadOptions(); this.records = loadRecords();
    this.params = new URLSearchParams(location.search);
    this.state = 'boot'; this.dive = null; this.time = 0; this.last = performance.now();
  }
  async init() {
    this.renderer = new Renderer(this.gpuCanvas);
    try { await this.renderer.init(); } catch (e) { this.fatal(e.message); return; }
    this.lib = buildLib(this.renderer);
    // the previous session ended in the middle of a dive without closing (tab crash, GPU crash): say so, F9 copies it
    try {
      const last = JSON.parse(localStorage.getItem('deeplink_last') || 'null');
      if (last && last.running) this.lastCrash = last;
      localStorage.setItem('deeplink_last', JSON.stringify({ ...(last || {}), running: false }));
    } catch (e) { /* */ }
    addEventListener('pagehide', () => { try { const l = JSON.parse(localStorage.getItem('deeplink_last') || '{}'); l.running = false; localStorage.setItem('deeplink_last', JSON.stringify(l)); } catch (e) { /* */ } });
    this.audio = new AudioEngine(this.opts);
    this.input = new Input(this.hudCanvas, this.opts);
    this.hud = new Hud(); this.g = this.hudCanvas.getContext('2d');
    const [panels, music] = await Promise.all([fetch('data/panels.json').then(r => r.json()), fetch('data/music.json').then(r => r.json())]);
    this.panelDefs = Object.fromEntries(panels.map(p => [p.id, p]));
    this.music = Object.fromEntries(music.map(m => [m.id, m]));
    this.panels = new PanelPlayer(this.audio, this.panelDefs);
    this.screens = new Screens(this);
    if (this.params.has('unlock')) this.unlockAll();
    addEventListener('resize', () => this.resize()); this.resize();
    try { await document.fonts.load('20px VT323'); } catch (e) { /* */ }
    this.input.onKey((code) => this.onKey(code));
    // touch: tapping the picture turns a storyboard page; the first touch turns auto-fire on (one thumb is on the stick)
    this.input.onTap = () => { this.audio.unlock(); if (this.state === 'story' && this.panels.active) this.panels.next(); };
    this.input.onFirstTouch = () => { this.audio.unlock(); };
    // auto-fire follows the touch controls (on while they are shown) instead of being saved on: an earlier version turned the
    // saved option on at the first touch, which a Windows touchpad / touchscreen could trigger — undo that once
    if (this.opts.touchInit && !this.opts.touchFireFix) { this.opts.autoFire = false; this.opts.touchFireFix = true; this.saveOptions(); }
    this.hudCanvas.addEventListener('click', () => { this.audio.unlock(); if (this.state === 'story' && this.panels.active) this.panels.next(); });
    if (this.lastCrash) { // shown for 12 s over the title; F9 copies the details
      const L = this.lastCrash;
      this.errShown = { msg: `The last session ended abruptly in ${L.dive || 'a dive'} at ${L.t}s (${L.section}${L.boss ? `, ${L.boss.type} hp ${L.boss.hp}${L.boss.dead ? ' dead' : ''}` : ''}).`, t: 0, text: 'DEEPLINK abrupt end\n' + JSON.stringify(L, null, 1) + '\n' + navigator.userAgent + '\nGPU: ' + ((this.renderer.adapter && this.renderer.adapter.info && (this.renderer.adapter.info.vendor + ' ' + this.renderer.adapter.info.architecture + ' ' + this.renderer.adapter.info.description)) || '?') };
    }
    requestAnimationFrame(t => this.frame(t));
    addEventListener('keydown', e => { if (e.code === 'F9' && this.errShown) { e.preventDefault(); navigator.clipboard?.writeText(this.errShown.text); this.errShown.t = this.time; this.errShown.msg = 'copied to the clipboard — ' + this.errShown.msg.replace(/^copied to the clipboard — /, ''); } });
    addEventListener('error', e => this.report(e.error || e.message));
    // leaving the game (Esc releases the mouse, alt-tab, another window, a hidden tab) pauses the dive
    const autoPause = () => { const d = this.dive; if (this.state === 'dive' && d && !d.paused && !d.ended && !d.attract && !d.bot) this.screens.pause(); };
    this.input.onLockLost = autoPause;
    addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    addEventListener('unhandledrejection', e => this.report(e.reason));
    // debug entry points
    const p = this.params;
    if (p.has('dive')) { this.audio.unlock(); this.startDive({ dive: DIVE[p.get('dive')] || DIVE.calibration, mode: 'free', bot: p.has('bot'), from: p.get('from') || 0, remix: p.has('remix'), kit: p.get('kit'), mods: p.has('mods') ? { overclock: 2, long_lock: 1, dilation: 1, foresight: 1, peripheral: 1 } : {}, equipped: 'dilation' }); return; }
    if (p.has('seq')) { this.screens.debugSeq(p.get('seq')); return; }
    if (p.has('lab')) { this.screens.debugLab(+p.get('lab')); return; }
    if (p.has('trailer')) { this.startTrailer(p.get('trailer') === 'record', () => this.screens.menu()); return; }
    this.screens.boot();
  }
  fatal(msg) { this.ui.innerHTML = `<div id="err">DEEPLINK needs WebGPU.<br><br>${msg}<br><br>Use a current Chrome or Edge, served from http://localhost (run.bat).</div>`; }
  unlockAll() { for (const id of Object.keys(DIVE)) this.records.cleared[id] = this.records.cleared[id] || 'A'; for (const id of Object.keys(this.panelDefs)) this.records.gallery[id] = 1; this.records.unlocked = true; }
  saveRecords() { saveRecords(this.records); }
  saveOptions() { saveOptions(this.opts); this.input.setBindings(this.opts.keys); this.audio.setVolumes(); this.resize(); }
  resize() {
    if (this.trailer) return; // the trailer renders at a fixed 1920×1080
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    for (const c of [this.gpuCanvas, this.hudCanvas]) { c.width = W; c.height = H; }
    let [rw, rh] = this.opts.res === '16:9' ? [480, 270] : [400, 300];
    let k = Math.max(1, Math.floor(Math.min(W / rw, H / rh)));
    if (this.opts.hires || this.params.has('hires')) { const a = rw / rh; let vw = W, vh = Math.round(W / a); if (vh > H) { vh = H; vw = Math.round(H * a); } rw = Math.round(vw / 2); rh = Math.round(vh / 2); k = 2; }
    if (this.renderer && this.renderer.ok) this.renderer.setRes(rw, rh);
    const vw = rw * k, vh = rh * k;
    this.view = { x: Math.floor((W - vw) / 2), y: Math.floor((H - vh) / 2), w: vw, h: vh };
  }
  onKey(code) {
    if (this.state === 'trailer') { if (code === 'Escape' && this.trailer) this.trailer.finish(true); return; }
    if (this.state === 'story' && this.panels.active) {
      if (code === 'Space' || code === 'Enter' || code === 'ArrowRight' || code === 'KeyJ') this.panels.next();
      else if (code === 'ArrowLeft' || code === 'Backspace') this.panels.back();
      else if (code === 'KeyA') this.panels.auto = !this.panels.auto;
      else if (code === 'Escape') this.panels.skip();
      return;
    }
    if (this.state === 'dive' && this.dive) {
      if (code === 'Escape' && performance.now() - this.input.lockLostAt < 400) return; // that Esc already released the mouse and paused
      if ((code === 'Escape' || code === 'KeyP') && !this.dive.ended) { if (this.dive.paused) this.screens.closePause(); else this.screens.pause(); }
    }
    this.screens.onKey(code);
  }
  // ------------------------------------------------------------------------------------------- dives
  // cfg: { dive, mode, camp, mods, drift, equipped, remix, bot, from, kit, timeAttack, track, loaded, loop, onEnd }
  async startDive(cfg) {
    this.audio.unlock(); this.audio.ambience(false);
    this.screens.clear();
    this.screens.loading(cfg.dive.title || 'DIVE');
    const track = cfg.track || this.music[cfg.dive.track] || this.music.grid_city;
    if (this.dive) this.dive.stop();
    const s = await createDive(this, { ...cfg, track, onAnalyse: () => this.screens.loading('ANALYSING TRACK…') });
    this.screens.clear();
    this.dive = s; this.state = 'dive';
    if (this.audio.ctx && this.audio.ctx.state === 'suspended') { // autoplay policy: needs a gesture (debug URLs)
      const o = document.createElement('div'); o.className = 'center'; o.style.cssText = 'font-size:40px;color:#9ff;cursor:pointer;background:#000a;padding:20px 40px;border:1px solid #9ff';
      o.textContent = 'CLICK TO LINK'; this.ui.appendChild(o);
      await new Promise(res => { const go = () => { this.audio.ctx.resume(); o.remove(); removeEventListener('keydown', go); res(); }; o.onclick = go; addEventListener('keydown', go); });
    }
    s.onEnd = (res) => { if (cfg.onEnd) cfg.onEnd(res, s); else this.screens.results(res, s, cfg); };
    s.invulnerable = !!cfg.invulnerable; s.bot = cfg.bot ? s.bot || new (await import('./sim/bot.js')).Bot() : null;
    s.loop = !!cfg.loop;
    let from = cfg.from || 0;
    if (typeof from === 'string' && isNaN(+from)) { const sec = s.map.sections.find(x => x.type === from); from = sec ? Math.max(0, sec.t - 0.3) : 0; } else from = +from;
    if (cfg.timeAttack) { const d2 = s.map.sections.find(x => x.type === 'drop2'); from = d2 ? Math.max(0, d2.t - 0.05) : 0; }
    s.start(from);
    s.equipped = cfg.equipped;
    return s;
  }
  // the trailer (OPTIONS): one song, panels + autopilot clips + cards, optionally recorded to a video file
  startTrailer(record, onDone) {
    this.audio.unlock(); this.audio.ambience(false);
    this.endDive(); this.screens.clear(); this.state = 'trailer';
    this.trailer = new Trailer(this, { record, onDone: (aborted) => { this.state = 'menu'; if (onDone) onDone(aborted); } });
    this.trailer.enter();
  }
  endDive() { if (this.dive) { this.dive.stop(); this.dive = null; } }
  // ------------------------------------------------------------------------------------------- loop
  frame(ts) {
    requestAnimationFrame(t => this.frame(t));
    const raw = ts - this.last; this.frameMs = raw; if (this.state === 'dive') this.worstMs = Math.max((this.worstMs || 0) * 0.995, raw);
    const dt = Math.min(0.1, (ts - this.last) / 1000); this.last = ts; this.time += dt;
    this.input.update();
    const dv = this.dive, T = this.input.touch;
    if (T) {
      T.configure(this.opts.touch, this.opts.touchSwap === true || this.opts.touchSwap === 'true');
      this.input.touchFire = T.shown();   // one thumb is on the stick: fire on its own while the touch controls are up
      const playing = this.state === 'dive' && dv && !dv.paused && !dv.ended && !dv.attract && !dv.bot;
      const eq = playing && dv.sim.equipped && MODS[dv.sim.equipped] && MODS[dv.sim.equipped].type === 'active' ? MODS[dv.sim.equipped] : null;
      T.setContext(playing ? (this.opts.controlMode === 'onekey' ? 'onekey' : 'game') : this.state === 'story' && this.panels.active ? 'story' : 'menu', eq ? dv.sim.flow >= eq.cost : null);
    }
    this.input.setWantLock(!!(this.state === 'dive' && dv && !dv.paused && !dv.ended && !dv.attract && !dv.bot && !this.panels.active && document.hasFocus() && this.input.lastDevice !== 'touch' && !(T && T.shown())));
    const g = this.g, W = this.hudCanvas.width, H = this.hudCanvas.height;
    g.clearRect(0, 0, W, H);
    const vis = this.state === 'dive' && this.dive ? 'visible' : 'hidden'; if (this.gpuCanvas.style.visibility !== vis) { this.gpuCanvas.style.visibility = vis; const cap = document.getElementById('cap'); if (cap) cap.style.visibility = vis; }
    if (this.state === 'trailer') { if (this.trailer) try { this.trailer.frame(dt); } catch (e) { this.report(e); } } else
    if (this.state === 'dive' && this.dive) try {
      const d = this.dive;
      d.update(dt, this.input);
      const drift = d.drift ?? 0;
      const F = d.render(this.renderer, drift);
      const post = { bloom: this.opts.bloom * (d.sim.overdrive ? 1.35 : 1), dither: this.opts.dither && !this.opts.hires, crt: this.opts.crt, damage: d.sim.integrity < 40 ? (1 - d.sim.integrity / 40) : 0, flash: this.opts.lowFlash ? Math.min(0.1, d.sim.flash * 0.2) : d.sim.flash * 0.32, overdrive: d.sim.overdrive ? 1 : 0, desat: d.paused ? 0.7 : 0 };
      this.renderer.end(F, post, this.view);
      this.renderer.begin();
      if (!this.params.has('viewcam')) this.hud.draw(g, W, H, d.sim, d.view, { view: this.view, kick: d.kick(), time: this.time, titleT: d.titleT, diveLabel: d.label || '', lowFlash: this.opts.lowFlash, cursor: this.input.locked && this.input.mouseTarget ? [this.input.mouse.x, this.input.mouse.y] : null, needClick: this.input.wantLock && !this.input.locked && this.opts.mouseSteer, shiftKey: this.opts.controlMode === 'onekey' ? '[TAP]' : '[SHIFT]', touch: !!(this.input.touch && this.input.touch.shown()), title: d.dive.title || '', track: `${d.loaded.track.title} — ${Math.round(d.map.bpm)} BPM${d.loaded.buffer ? '' : ' (synth)'}`, sectionLabel: `${d.sim.section.type.toUpperCase()}  ${fmt(d.sim.t)} / ${fmt(d.map.length)}`, subtitles: this.opts.subtitles, beatIndicator: this.opts.beatIndicator, equipped: d.equipped });
      if (d.attract) { g.font = `${Math.round(H * 0.04)}px VT323`; g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; g.fillText('DEMO  ·  PRESS ANY KEY', W / 2, H * 0.94); }
    } catch (e) { this.report(e); this.renderer.begin(); } else if (this.state === 'story') {
      this.panels.update(dt);
      this.panels.draw(g, W, H);
    }
    this.screens.update(dt);
    if (this.screens.canvasDraw) this.screens.canvasDraw(g, W, H, dt);
    if (this.errShown && this.time - this.errShown.t < 12) { // a crash report the player can copy (F9)
      g.font = `${Math.round(H * 0.026)}px VT323`; g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, W, H * 0.09);
      g.fillStyle = '#ff6060'; g.fillText('INTERNAL ERROR: ' + this.errShown.msg.slice(0, 140), W * 0.01, H * 0.035);
      g.fillStyle = '#ffffff'; g.fillText('The game keeps going. F9 copies the details to the clipboard — please send them.', W * 0.01, H * 0.07);
    }
    if (this.renderer.ok === false && !this.lostShown) { this.lostShown = true; this.report(new Error(`The graphics driver reset (WebGPU device lost: ${this.renderer.lostInfo || 'no reason given'}). Reload (F5); if that fails, restart Chrome (chrome://restart).`)); }
    // crash breadcrumb: if the tab or the GPU dies, the next start reports where (dive, time, what was on screen)
    if (this.state === 'dive' && this.dive && this.time - (this.crumbT || 0) > 0.5) {
      this.crumbT = this.time;
      const d = this.dive, s = d.sim, b = s && s.boss;
      try { localStorage.setItem('deeplink_last', JSON.stringify({ running: true, when: new Date().toISOString(), dive: d.dive && d.dive.id, t: s && +s.t.toFixed(2), section: s && s.section.type, side: s && s.side, boss: b ? { type: b.bossType, hp: +b.hp.toFixed(1), dead: !!b.dead, critical: !!b.critical } : null, enemies: s && s.enemies.length, bullets: s && s.ebullets.length, fx: s && s.fx.length, frameMs: +(this.frameMs || 0).toFixed(1), worstMs: +(this.worstMs || 0).toFixed(1), paused: !!d.paused, locked: !!this.input.locked })); } catch (e) { /* */ }
    }
  }
  // errors in a frame are caught, logged and shown once (with the stack in localStorage and on F9) instead of freezing the game
  report(e) {
    const msg = (e && e.message) || String(e), stack = (e && e.stack) || '';
    const d = this.dive, ctx = d ? { dive: d.dive && d.dive.id, t: d.sim && +d.sim.t.toFixed(2), section: d.sim && d.sim.section.type, boss: d.sim && d.sim.boss && d.sim.boss.bossType, side: d.sim && d.sim.side } : {};
    const key = msg + stack.split('\n')[1];
    this.errCount = this.errCount || {};
    if ((this.errCount[key] = (this.errCount[key] || 0) + 1) > 1) return;
    console.error('[DEEPLINK]', e, ctx);
    this.errShown = { msg, t: this.time, text: `${msg}\n${stack}\n${JSON.stringify(ctx)}\n${navigator.userAgent}` };
    try { const l = JSON.parse(localStorage.getItem('deeplink_errors') || '[]'); l.push({ when: new Date().toISOString(), msg, stack, ctx }); localStorage.setItem('deeplink_errors', JSON.stringify(l.slice(-20))); } catch (x) { /* */ }
  }
}
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const game = new Game();
window.DEEPLINK = game;
game.init();
