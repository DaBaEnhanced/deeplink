// Audio (bible §9, §17): the music player and beat clock (song time from the AudioContext clock, never the frame clock),
// the adaptive mix (low-pass on hits and low integrity, lead dropping out when Sync is lost), musical SFX pitched to the
// track's key, lock-on tones that build a chord, the lab ambience. Track files: assets/music/<id>.(mp3|ogg|wav|flac);
// a missing file plays the procedural arrangement at the same tempo and structure.
import { ProcMusic, parseKey, mtof } from './procmusic.js';
import { features, analyse, templateMap, finishMap } from './analysis.js';

const listings = {};
// a release build (tools/build_dist.py) ships assets/manifest.json, since static hosts can't list folders; the dev server lists them
let manifest = null;
const loadManifest = () => manifest || (manifest = fetch('assets/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null));
export function listing(dir) {
  if (!listings[dir]) listings[dir] = loadManifest().then(m => (m && m[dir] ? new Set(m[dir]) : fetch(dir + '/', { cache: 'no-cache' }).then(r => (r.ok ? r.text() : '')).then(t => {
    if (!t.includes('href=')) return null;
    return new Set([...t.matchAll(/href="([^"?#]+)"/gi)].map(m => decodeURIComponent(m[1]).split('/').filter(Boolean).pop()));
  }))).catch(() => null);
  return listings[dir];
}
async function findFile(dir, id, exts) {
  const ls = await listing(dir);
  for (const e of exts) { const n = `${id}.${e}`; if (ls ? ls.has(n) : false) return `${dir}/${n}`; }
  if (ls) return null;
  for (const e of exts) { try { const r = await fetch(`${dir}/${id}.${e}`, { method: 'HEAD' }); if (r.ok) return `${dir}/${id}.${e}`; } catch (err) { /* */ } }
  return null;
}

export class AudioEngine {
  constructor(opts) { this.opts = opts; this.ctx = null; this.buffers = new Map(); this.maps = new Map(); this.music = null; this.sfxFiles = new Map(); this.lastSfx = {}; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    this.ctx = new C({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createDynamicsCompressor(); this.master.threshold.value = -10; this.master.ratio.value = 4; this.master.connect(c.destination);
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.opts.musicVol;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.8;
    this.leadCut = c.createBiquadFilter(); this.leadCut.type = 'peaking'; this.leadCut.frequency.value = 2400; this.leadCut.Q.value = 0.8; this.leadCut.gain.value = 0;
    this.leadCut.connect(this.lp); this.lp.connect(this.musicGain); this.musicGain.connect(this.master);
    this.musicIn = this.leadCut;
    this.buildSides();
    this.stems = {};
    for (const s of ['kick', 'bass', 'lead', 'pads', 'fx']) { const g = c.createGain(); g.connect(this.sideIn); this.stems[s] = g; }
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = this.opts.sfxVol; this.sfxGain.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.key = parseKey('A minor');
    this.loadSfxFiles();
    setInterval(() => { if (this.music && this.music.proc) this.music.proc.tick(); }, 25);
  }
  // SHIFT: the same track through two live treatments, crossfaded on the shift (always in sync: one source).
  // A-side: trance — thinner low end, airy top, a dotted-eighth echo. B-side: hard techno — saturated, heavy low end,
  // biting mids. Both buses are level-matched.
  buildSides() {
    const c = this.ctx;
    this.sideIn = c.createGain();
    // A
    const aShelf = c.createBiquadFilter(); aShelf.type = 'highshelf'; aShelf.frequency.value = 7000; aShelf.gain.value = 3;
    const aLow = c.createBiquadFilter(); aLow.type = 'lowshelf'; aLow.frequency.value = 120; aLow.gain.value = -3;
    this.sideA = c.createGain(); this.sideA.gain.value = 1;
    this.sideIn.connect(aLow); aLow.connect(aShelf); aShelf.connect(this.sideA);
    const dl = c.createDelay(2); dl.delayTime.value = 0.32; const fb = c.createGain(); fb.gain.value = 0.38; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200; const dhp = c.createBiquadFilter(); dhp.type = 'highpass'; dhp.frequency.value = 500;
    const wet = c.createGain(); wet.gain.value = 0.2;
    aShelf.connect(dhp); dhp.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(this.sideA);
    this.echo = dl;
    this.sideA.connect(this.musicIn);
    // B
    const drive = c.createGain(); drive.gain.value = 2.2;
    const sh = c.createWaveShaper(); const n = 1024, curve = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * 2.4) / Math.tanh(2.4); } sh.curve = curve; sh.oversample = '2x';
    const bLow = c.createBiquadFilter(); bLow.type = 'lowshelf'; bLow.frequency.value = 90; bLow.gain.value = 5;
    const bMid = c.createBiquadFilter(); bMid.type = 'peaking'; bMid.frequency.value = 2200; bMid.Q.value = 0.9; bMid.gain.value = 3.5;
    const bTop = c.createBiquadFilter(); bTop.type = 'lowpass'; bTop.frequency.value = 12000;
    this.sideB = c.createGain(); this.sideB.gain.value = 0;
    const trim = c.createGain(); trim.gain.value = 0.5;
    this.sideIn.connect(drive); drive.connect(sh); sh.connect(bLow); bLow.connect(bMid); bMid.connect(bTop); bTop.connect(trim); trim.connect(this.sideB);
    this.sideB.connect(this.musicIn);
    this.side = 0;
  }
  setSide(side, clean) {
    if (!this.ctx) return; this.side = side;
    const t = this.ctx.currentTime, k = clean ? 0.025 : 0.06;
    this.sideA.gain.cancelScheduledValues(t); this.sideB.gain.cancelScheduledValues(t);
    this.sideA.gain.setTargetAtTime(side ? 0 : 1, t, k); this.sideB.gain.setTargetAtTime(side ? 1 : 0, t, k);
  }
  setVolumes() { if (!this.ctx) return; this.musicGain.gain.value = this.opts.musicVol; this.sfxGain.gain.value = this.opts.sfxVol; }
  async loadSfxFiles() {
    const ls = await listing('assets/sfx');
    if (!ls) return;
    for (const n of ls) { const m = n.match(/^([a-z0-9_]+)\.(mp3|wav|ogg|flac)$/i); if (m) this.sfxFiles.set(m[1], 'assets/sfx/' + n); }
  }
  async buffer(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const p = fetch(url).then(r => r.arrayBuffer()).then(a => this.ctx.decodeAudioData(a)).catch(e => { console.warn('audio', url, e); return null; });
    this.buffers.set(url, p); return p;
  }
  // track: music.json entry. returns { url, buffer, map }
  async loadTrack(track, opts = {}) {
    this.unlock();
    const id = opts.remix ? track.id + '_remix' : track.id;
    let url = await findFile('assets/music', id, ['mp3', 'ogg', 'flac', 'wav', 'opus']);
    if (!url && opts.remix) url = await findFile('assets/music', track.id, ['mp3', 'ogg', 'flac', 'wav', 'opus']);
    const buffer = url ? await this.buffer(url) : null;
    let map = null;
    if (buffer) {
      const mapId = url.split('/').pop().replace(/\.\w+$/, '');
      map = this.maps.get(mapId);
      if (!map) {
        try { const r = await fetch(`data/tracks/${mapId}.json`, { cache: 'no-cache' }); if (r.ok) map = await r.json(); } catch (e) { /* */ }
        if (!map) { if (opts.onAnalyse) opts.onAnalyse(); map = this.analyseBuffer(buffer, { bpm: track.bpm, bpm2: track.bpm2 }); }
        finishMap(map); this.maps.set(mapId, map);
      }
      map.length = Math.min(map.length, buffer.duration);
    } else {
      map = finishMap(templateMap(track.bpm || 140, track.id === 'lab_hum' ? { bars: [['intro', 8, 0.2], ['build', 8, 0.3], ['drop', 16, 0.35], ['breakdown', 8, 0.2], ['outro', 8, 0.2]] } : {}));
      if (track.bpm2) { // tempo change (The Core): hard first half, trance second half
        const bar1 = 240 / track.bpm, bar2 = 240 / track.bpm2; let t = 0; const secs = [];
        for (const [type, bars, e, two] of [['intro', 16, 0.5], ['build', 16, 0.7], ['drop', 32, 1], ['breakdown', 16, 0.3, 1], ['build', 16, 0.7, 1], ['drop2', 32, 1, 1], ['outro', 16, 0.4, 1]]) { secs.push({ t, type, energy: e }); t += bars * (two ? bar2 : bar1); }
        map = finishMap({ bpm: track.bpm, length: t + 2, sections: secs, tempos: [{ t: 0, bpm: track.bpm, offset: 0 }, { t: secs[3].t, bpm: track.bpm2 }], events: [] });
      }
    }
    return { url, buffer, map, track };
  }
  analyseBuffer(buffer, hint) {
    const ch = buffer.numberOfChannels, n = buffer.length, mono = new Float32Array(n);
    for (let c = 0; c < ch; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
    // analyse at 22.05 kHz for speed
    const step = Math.max(1, Math.round(buffer.sampleRate / 22050)), sr = buffer.sampleRate / step, ds = new Float32Array(Math.floor(n / step));
    for (let i = 0; i < ds.length; i++) ds[i] = mono[i * step];
    return analyse(features(ds, sr), hint);
  }
  // start the music at song time `from` (s). rate: playback rate (game speed, remix)
  playMusic(loaded, opts = {}) {
    this.unlock();
    this.stopMusic();
    const c = this.ctx, rate = opts.rate || 1, from = opts.from || 0;
    this.key = parseKey(loaded.track.key);
    const startAt = c.currentTime + 0.12;
    const m = { loaded, rate, songT0: from, ctxT0: startAt, loop: !!opts.loop };
    if (loaded.buffer) {
      const src = c.createBufferSource(); src.buffer = loaded.buffer; src.playbackRate.value = rate; src.loop = !!opts.loop;
      if (opts.loop) { src.loopStart = 0; src.loopEnd = loaded.buffer.duration; }
      src.connect(this.sideIn); src.start(startAt, from); m.src = src;
    } else {
      m.proc = new ProcMusic(c, this.stems, loaded.track, loaded.map); m.proc.loop = !!opts.loop; m.proc.start(from, startAt, rate);
    }
    for (const s of Object.values(this.stems)) s.gain.value = 1;
    this.echo.delayTime.value = Math.min(1.5, 0.75 * 60 / ((loaded.map && loaded.map.bpm) || 140));
    this.setSide(0, true);
    this.music = m; this.paused = false;
    if (c.state === 'suspended') c.resume();
    return m;
  }
  stopMusic(fade = 0) {
    const m = this.music; if (!m) return; this.music = null;
    if (fade && this.ctx) {
      const g = this.musicGain.gain, t = this.ctx.currentTime; g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => { this.stopNodes(m); this.musicGain.gain.cancelScheduledValues(0); this.musicGain.gain.value = this.opts.musicVol; }, fade * 1000 + 50);
    } else this.stopNodes(m);
  }
  stopNodes(m) { if (m.src) { try { m.src.stop(); } catch (e) { /* */ } } if (m.proc) m.proc.stop(); }
  // the beat clock: song time in seconds (with output latency compensation)
  songTime() {
    const m = this.music; if (!m || !this.ctx) return 0;
    const lat = (this.ctx.outputLatency || this.ctx.baseLatency || 0);
    let t = m.songT0 + (this.ctx.currentTime - m.ctxT0 - lat) * m.rate;
    if (m.loop && m.loaded.map) t = ((t % m.loaded.map.length) + m.loaded.map.length) % m.loaded.map.length;
    return t;
  }
  pause() { if (this.ctx && this.ctx.state === 'running') { this.ctx.suspend(); } this.paused = true; }
  resume() { this.paused = false; if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  // adaptive mix
  setMix({ integrity = 1, lead = true, overdrive = false, muffle = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = integrity > 0.5 ? 20000 : 600 + 19400 * Math.pow(integrity / 0.5, 2);
    const target = Math.max(250, base * (1 - muffle * 0.95));
    if (!this.hitUntil || t > this.hitUntil) this.lp.frequency.setTargetAtTime(target, t, 0.08);
    this.leadCut.gain.setTargetAtTime(lead ? (overdrive ? 1.5 : 0) : -11, t, 0.15);
    if (this.music && this.music.proc) this.stems.lead.gain.setTargetAtTime(lead ? 1 : 0.08, t, 0.15);
  }
  hitSweep() {
    if (!this.ctx) return; const t = this.ctx.currentTime, f = this.lp.frequency;
    f.cancelScheduledValues(t); f.setValueAtTime(380, t); f.exponentialRampToValueAtTime(20000, t + 0.7); this.hitUntil = t + 0.7;
  }
  // ------------------------------------------------------------------------------------------------- SFX
  note(deg, oct = 5) { const sc = this.key.mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]; const o = Math.floor(deg / 7); return 12 * (oct + 1 + o) + this.key.root + sc[((deg % 7) + 7) % 7]; }
  play(name, o = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const cd = { shot: 0.03, hit: 0.02, packet: 0.02, explode: 0.03, lock: 0.02 }[name] || 0;
    if (cd && this.lastSfx[name] && now - this.lastSfx[name] < cd) return;
    this.lastSfx[name] = now;
    const file = this.sfxFiles.get(name);
    if (file && !o.synth) { this.buffer(file).then(b => { if (!b) return; const s = this.ctx.createBufferSource(); s.buffer = b; const g = this.ctx.createGain(); g.gain.value = o.vol ?? 1; s.playbackRate.value = o.rate || 1; s.connect(g); g.connect(this.sfxGain); s.start(); }); return; }
    const f = SYN[name]; if (f) f(this, now + (o.delay || 0), o);
  }
  osc(type, f, t, dur, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
  nsrc(t, dur, dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s; }
  gain(t, a, peak, d, dest) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(dest || this.sfxGain); return g; }
  filt(type, f, q, dest) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; b.connect(dest); return b; }
  // lab ambience: rain + workstation fans (file 'lab_ambience' when present)
  ambience(on) {
    if (!this.ctx) return;
    if (!on) { if (this.amb) { const a = this.amb; this.amb = null; const t = this.ctx.currentTime; a.g.gain.setTargetAtTime(0.0001, t, 0.4); setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (e) { /* */ } }), 2000); } return; }
    if (this.amb) return;
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001; g.connect(this.sfxGain); g.gain.setTargetAtTime(0.5, c.currentTime, 0.8);
    const nodes = [];
    const file = this.sfxFiles.get('lab_ambience');
    if (file) { this.buffer(file).then(b => { if (!b || !this.amb) return; const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g); s.start(); nodes.push(s); }); }
    else {
      const rain = c.createBufferSource(); rain.buffer = this.noise; rain.loop = true; const bp = this.filt('bandpass', 2500, 0.4, g); rain.connect(bp); rain.start(); nodes.push(rain);
      const fan = c.createBufferSource(); fan.buffer = this.noise; fan.loop = true; const lp = this.filt('lowpass', 220, 1, g); const fg = c.createGain(); fg.gain.value = 1.4; fan.connect(fg); fg.connect(lp); fan.start(); nodes.push(fan);
      const hum = c.createOscillator(); hum.frequency.value = 50; const hg = c.createGain(); hg.gain.value = 0.03; hum.connect(hg); hg.connect(g); hum.start(); nodes.push(hum);
    }
    this.amb = { g, nodes };
  }
}

// procedural SFX (synth fallbacks; a file assets/sfx/<name>.* replaces any of them)
const SYN = {
  shot(a, t) { const g = a.gain(t, 0.001, 0.07, 0.06); const f = a.filt('lowpass', 3500, 2, g); a.osc('square', mtof(a.note([0, 4, 7][Math.floor(Math.random() * 3)], 6)), t, 0.07, f).frequency.exponentialRampToValueAtTime(200, t + 0.06); },
  lock(a, t, o) { const n = a.note([0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25][(o.n || 0) % 12], 5); const g = a.gain(t, 0.002, 0.12, 0.25); a.osc('triangle', mtof(n), t, 0.3, g); a.osc('sine', mtof(n + 12), t, 0.3, a.gain(t, 0.002, 0.05, 0.2)); },
  bolt(a, t, o) { const n = a.note([0, 2, 4, 7, 9, 11, 14, 16][(o.n || 0) % 8], 5); const g = a.gain(t, 0.001, 0.09, 0.18); const f = a.filt('lowpass', 5000, 6, g); a.osc('sawtooth', mtof(n), t, 0.2, f); },
  hit(a, t) { const g = a.gain(t, 0.001, 0.12, 0.05); a.nsrc(t, 0.06, a.filt('bandpass', 3000, 2, g)); },
  explode(a, t, o) { const big = o.big ? 1 : 0; const g = a.gain(t, 0.002, 0.35 + big * 0.3, 0.35 + big * 0.9); a.nsrc(t, 1.4, a.filt('lowpass', 2500 - big * 1200, 1, g)); const g2 = a.gain(t, 0.002, 0.4 + big * 0.3, 0.3 + big * 0.6); a.osc('sine', mtof(a.note(0, 2 + big * 0)), t, 1, g2).frequency.exponentialRampToValueAtTime(30, t + 0.4 + big * 0.6); },
  player_hit(a, t) { const g = a.gain(t, 0.001, 0.5, 0.35); a.osc('sawtooth', 110, t, 0.4, a.filt('lowpass', 600, 4, g)).frequency.exponentialRampToValueAtTime(40, t + 0.3); a.nsrc(t, 0.2, a.filt('highpass', 1500, 1, a.gain(t, 0.001, 0.2, 0.15))); },
  roll(a, t) { const g = a.gain(t, 0.05, 0.18, 0.3); const f = a.filt('bandpass', 600, 2, g); f.frequency.exponentialRampToValueAtTime(4000, t + 0.3); a.nsrc(t, 0.4, f); },
  deflect(a, t) { const g = a.gain(t, 0.001, 0.15, 0.3); a.osc('triangle', 1800, t, 0.3, g); a.osc('triangle', 2710, t, 0.3, g); },
  boost(a, t) { const g = a.gain(t, 0.05, 0.2, 0.6); const f = a.filt('bandpass', 400, 1.5, g); f.frequency.exponentialRampToValueAtTime(3000, t + 0.5); a.nsrc(t, 0.7, f); },
  gate(a, t, o) { const n = a.note(((o.n || 0) % 5) * 2, 6); const g = a.gain(t, 0.001, 0.12, 0.4); a.osc('sine', mtof(n), t, 0.45, g); a.osc('sine', mtof(n + 7), t + 0.04, 0.4, a.gain(t + 0.04, 0.001, 0.06, 0.35)); },
  packet(a, t) { const g = a.gain(t, 0.001, 0.08, 0.12); a.osc('square', mtof(a.note(7, 6)), t, 0.06, g); a.osc('square', mtof(a.note(9, 6)), t + 0.04, 0.06, a.gain(t + 0.04, 0.001, 0.06, 0.1)); },
  objective(a, t) { [0, 2, 4, 7].forEach((d, i) => { const g = a.gain(t + i * 0.06, 0.002, 0.12, 0.35); a.osc('triangle', mtof(a.note(d, 5)), t + i * 0.06, 0.4, g); }); },
  breach(a, t) { // reverse cymbal into an impact
    const g = a.gain(t, 0.002, 0.6, 1.6); a.nsrc(t, 1.8, a.filt('lowpass', 1800, 1, g));
    const g2 = a.gain(t, 0.002, 0.7, 1.2); a.osc('sine', 70, t, 1.3, g2).frequency.exponentialRampToValueAtTime(25, t + 1.1);
    const g3 = a.gain(t, 0.001, 0.25, 2.2); a.nsrc(t, 2.4, a.filt('highpass', 5000, 1, g3));
  },
  reverse(a, t, o) { const d = o.dur || 1; const g = a.ctx.createGain(); g.connect(a.sfxGain); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.02); a.nsrc(t, d, a.filt('highpass', 3000, 0.7, g)); },
  alarm(a, t) { for (let i = 0; i < 4; i++) { const g = a.gain(t + i * 0.18, 0.005, 0.1, 0.15); a.osc('square', i % 2 ? 660 : 880, t + i * 0.18, 0.16, a.filt('lowpass', 2000, 1, g)); } },
  power(a, t) { const g = a.gain(t, 0.05, 0.25, 1.2); const f = a.filt('bandpass', 300, 4, g); f.frequency.exponentialRampToValueAtTime(6000, t + 1); [0, 4, 7, 11].forEach(d => a.osc('sawtooth', mtof(a.note(d, 4)), t, 1.2, f)); },
  radio(a, t) { const g = a.gain(t, 0.001, 0.08, 0.12); a.nsrc(t, 0.14, a.filt('bandpass', 2000, 3, g)); },
  ui_move(a, t) { const g = a.gain(t, 0.001, 0.06, 0.05); a.osc('square', 880, t, 0.05, g); },
  ui_ok(a, t) { const g = a.gain(t, 0.001, 0.08, 0.12); a.osc('square', 660, t, 0.06, g); a.osc('square', 990, t + 0.06, 0.08, a.gain(t + 0.06, 0.001, 0.08, 0.1)); },
  ui_back(a, t) { const g = a.gain(t, 0.001, 0.08, 0.12); a.osc('square', 520, t, 0.06, g); a.osc('square', 330, t + 0.06, 0.08, a.gain(t + 0.06, 0.001, 0.08, 0.1)); },
  boot(a, t) { const g = a.gain(t, 0.01, 0.15, 0.6); a.osc('square', 1000, t, 0.2, a.filt('lowpass', 3000, 1, g)); },
  panel(a, t) { const g = a.gain(t, 0.01, 0.12, 0.25); const f = a.filt('bandpass', 1200, 0.8, g); f.frequency.exponentialRampToValueAtTime(3000, t + 0.2); a.nsrc(t, 0.3, f); },
  heartbeat(a, t) { [0, 0.18].forEach(o => { const g = a.gain(t + o, 0.005, 0.3, 0.15); a.osc('sine', 55, t + o, 0.2, g); }); },
  disconnect(a, t) { const g = a.gain(t, 0.001, 0.5, 1.4); const o = a.osc('sawtooth', 440, t, 1.5, a.filt('lowpass', 2000, 2, g)); o.frequency.exponentialRampToValueAtTime(30, t + 1.4); a.nsrc(t, 0.4, a.filt('highpass', 2000, 1, a.gain(t, 0.001, 0.3, 0.3))); },
  modem(a, t) { const freqs = [1270, 1070, 2225, 980, 1650, 1850, 2100, 1300]; for (let i = 0; i < 16; i++) { const g = a.gain(t + i * 0.09, 0.003, 0.06, 0.08); a.osc(i % 3 ? 'sine' : 'square', freqs[i % 8] * (1 + Math.random() * 0.05), t + i * 0.09, 0.09, g); } a.nsrc(t + 0.8, 0.8, a.filt('bandpass', 2400, 1, a.gain(t + 0.8, 0.01, 0.08, 0.7))); },
  // SHIFT: a scratch-like zip (up for the B-side, down for the A-side) on a sub thump; a clean shift adds a bright fifth
  shift(a, t, o) {
    const g = a.gain(t, 0.002, 0.3, 0.16); const f = a.filt('bandpass', o.side ? 500 : 4000, 3, g); f.frequency.exponentialRampToValueAtTime(o.side ? 4000 : 500, t + 0.12); a.nsrc(t, 0.18, f);
    const g2 = a.gain(t, 0.002, 0.45, 0.22); a.osc('sine', o.side ? 70 : 110, t, 0.25, g2).frequency.exponentialRampToValueAtTime(o.side ? 40 : 60, t + 0.2);
    if (o.clean) { const n = a.note(o.side ? 4 : 0, 6); const g3 = a.gain(t, 0.002, 0.1, 0.35); a.osc('triangle', mtof(n), t, 0.4, g3); a.osc('triangle', mtof(n + 7), t, 0.4, a.gain(t, 0.002, 0.06, 0.3)); }
    else { const g4 = a.gain(t, 0.001, 0.12, 0.12); a.osc('square', 90, t, 0.12, a.filt('lowpass', 900, 8, g4)); }
  },
  absorb(a, t) { const g = a.gain(t, 0.001, 0.05, 0.08); a.osc('sine', mtof(a.note(7 + Math.floor(Math.random() * 3) * 2, 6)), t, 0.1, g); },
  chain(a, t, o) { [0, 4, 7, 11].slice(0, 2 + Math.min(2, o.n || 1)).forEach((d, i) => { const g = a.gain(t + i * 0.05, 0.002, 0.1, 0.25); a.osc('square', mtof(a.note(d, 6)), t + i * 0.05, 0.3, a.filt('lowpass', 4000, 1, g)); }); },
  choice(a, t) { [0, 4, 7, 11, 14].forEach((d, i) => { const g = a.gain(t + i * 0.09, 0.01, 0.12, 0.8); a.osc('sine', mtof(a.note(d, 5)), t + i * 0.09, 0.9, g); }); },
};
