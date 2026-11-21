// DEEPLINK — in-game trailer director + recorder (OPTIONS → Trailer / Record trailer, or ?trailer=play | ?trailer=record).
// Plays the edit in ./edit.js over ONE song (the title theme): storyboard panels, gameplay clips (autopilot, the clip's
// own music off, sfx on, its clock sped / slowed so its beats land on the theme's beats), title cards, the countdown and
// the logo, composed into one 16:9 canvas (OPTIONS → Video → Trailer size: 1080 / 1440 / 2160 lines; everything is drawn
// in 1920×1080 units and scaled). Recording works as in TheLostsTB: WebCodecs H.264 + AAC muxed into a seekable MP4
// (./videorec.js, constant frame rate, audio as the master clock, 60 fps, OPTIONS bitrate 40 / 80 / 150 Mbps, a key frame
// every 2 s, AAC 256 kbps); MediaRecorder (MP4, else WebM) only where WebCodecs is missing. Every cut follows the theme's clock.
import { createDive } from '../dive/session.js';
import { Bot } from '../sim/bot.js';
import { DIVE } from '../story/dives.js';
import { finishMap, templateMap } from '../audio/analysis.js';
import { panelImage, letterPanel, aspectOf, getBalloons } from '../panels/player.js';
import { HUD_FONT } from '../ui/hud.js';
import { clamp } from '../core/math.js';
import { TRAILER, TRAILER_TRACK, START, END } from './edit.js';
import { CodecRecorder } from './videorec.js';

const W = 1920, H = 1080;   // drawing units (the canvas is W·S × H·S)
const FPS = 60;
const SFX_LEVEL = 0.6;   // gameplay sfx under the theme
const ease = k => k * k * (3 - 2 * k);

export class Trailer {
  /** opts: { record: bool, onDone(aborted) } */
  constructor(game, opts = {}) {
    this.g = game; this.opts = opts; this.state = 'prep'; this.msg = 'PREPARING TRAILER'; this.progress = 0;
    this.shots = TRAILER.map(s => ({ ...s })); this.cur = -1; this.clips = [];
  }
  // ------------------------------------------------------------------------------------------- setup
  async enter() {
    const G = this.g;
    const c = (this.canvas = document.createElement('canvas'));
    const lines = +G.opts.trailerSize || 1440;
    this.S = lines / H; c.width = Math.round(W * this.S); c.height = lines;
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#000;z-index:50;cursor:none';
    document.body.appendChild(c);
    this.ctx = c.getContext('2d');
    // the game renders at a fixed 16:9 frame while the trailer runs
    G.gpuCanvas.width = c.width; G.gpuCanvas.height = c.height;
    if (G.renderer.ok) G.renderer.setRes(G.opts.hires ? 960 : 480, G.opts.hires ? 540 : 270);
    this.view = { x: 0, y: 0, w: W, h: H };                      // the HUD, in drawing units
    this.gpuView = { x: 0, y: 0, w: c.width, h: c.height };      // the 3D view, in canvas pixels
    try { await this.prepare(); } catch (e) { console.error(e); this.msg = 'TRAILER FAILED: ' + (e.message || e); this.state = 'error'; setTimeout(() => this.finish(true), 4000); }
  }
  async mapOnly(track) { // clips need the beat map, not the audio
    let map = null;
    try { const r = await fetch(`data/tracks/${track.id}.json`, { cache: 'no-cache' }); if (r.ok) map = await r.json(); } catch (e) { /* */ }
    return { url: null, buffer: null, track, map: finishMap(map || templateMap(track.bpm || 140)) };
  }
  async prepare() {
    const G = this.g, A = G.audio;
    A.unlock();
    // the trailer owns the mix: no adaptive filtering, no hit sweeps, no shift crossfades except on the SHIFT shots,
    // and the clips' silent pre-roll is muted
    A.setMix({}); A.setSide(0, true);
    this.restore = [];
    const patch = (key, fn) => { const old = A[key]; this.restore.push(() => { A[key] = old; }); A[key] = fn; };
    this.setSide = A.setSide.bind(A);
    const play = A.play.bind(A);
    patch('setMix', () => {}); patch('hitSweep', () => {}); patch('setSide', () => {});
    patch('play', (n, o) => { if (!this.mute) play(n, o); });
    const sfx0 = A.sfxGain.gain.value; A.sfxGain.gain.value = sfx0 * SFX_LEVEL; this.restore.push(() => { A.sfxGain.gain.value = sfx0; });
    this.msg = 'LOADING THE THEME';
    this.theme = await A.loadTrack(G.music[TRAILER_TRACK]);
    const map = this.theme.map;
    this.bar = 240 / map.bpm; this.beat = this.bar / 4;
    const d1 = map.sections.find(s => s.type === 'drop') || map.sections[0];
    this.zero = d1.t;                                  // song time of bar 0
    this.songStart = Math.max(0, this.timeOf(START));
    this.length = this.timeOf(END) - this.songStart;
    // clips (built up front: no hitch on the cut)
    const clips = this.shots.filter(s => s.kind === 'clip' || s.kind === 'logo');
    let n = 0;
    for (const s of clips) {
      this.msg = `PREPARING CLIPS ${++n}/${clips.length}`; this.progress = n / (clips.length + 1);
      await this.makeClip(s);
      await new Promise(r => setTimeout(r, 0));
    }
    // panels
    this.msg = 'LOADING PANELS';
    const ids = this.shots.filter(s => s.kind === 'panel').map(s => s.id);
    for (const id of ids) panelImage(id);
    const t0 = performance.now();
    while (ids.some(id => !panelImage(id).tried) && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
    this.progress = 1;
    await this.start();
  }
  timeOf(bar) { return this.zero + bar * this.bar; }        // song time
  tOf(bar) { return this.timeOf(bar) - this.songStart; }    // trailer time
  // a clip: the dive built over its own map, its clock scaled to the theme's tempo and phase-aligned on a beat
  async makeClip(s) {
    const G = this.g, dive = DIVE[s.dive] || DIVE.grid_city;
    const track = G.music[dive.track] || G.music.grid_city;
    const loaded = await this.mapOnly(track);
    const d = await createDive(G, { dive, mode: 'free', track, loaded, equipped: null });
    const sim = d.sim, map = d.map;
    const [secType, bars] = s.from || ['drop', 4];
    const secs = map.sections.filter(x => x.type === secType);
    const sec = secs[0] || map.sections.find(x => x.type.startsWith('drop')) || map.sections[0];
    const clipBar = 240 / map.bpm;
    let from = sec.t + (bars || 0) * clipBar;
    from = sim.beatTime(Math.max(0, sim.beatIndexAt(from)));
    s.rate = map.bpm ? (240 / this.bar) / map.bpm : 1;
    s.from0 = from;
    s.dive_ = d;
    d.bot = new Bot({ noShift: !!s.shift || s.kind === 'logo' });
    // silent pre-roll so the shot opens in the middle of the action
    const warm = s.warm ?? 1.2;
    this.mute = true;
    sim.reset(Math.max(0, from - warm * s.rate));
    if (s.side) { sim.side = 1; d.view.side = 1; d.view.wipeT = -9; }
    for (let t = Math.max(0, from - warm * s.rate); t < from; t += s.rate / 60) this.step(s, t, 1 / 60);
    this.mute = false;
  }
  step(s, songT, dt) {
    const d = s.dive_, sim = d.sim;
    const inp = d.bot.input(sim);
    sim.update(songT, inp, dt);
    sim.integrity = 100; sim.failed = false; sim.done = false;
    const b = sim.boss; if (b && !b.dead && b.hpMax) b.hp = Math.max(b.hp, b.hpMax * 0.35);
  }
  async start() {
    const G = this.g, A = G.audio, c = A.ctx;
    if (this.opts.record) { this.msg = 'STARTING THE RECORDER'; await this.startRecording(); }
    const skip = Math.max(0, this.tOf(+(this.g.params.get('at') || START)));   // ?trailer=play&at=<bar> (testing)
    A.playMusic(this.theme, { from: this.songStart + skip });
    // fade the theme over the last two bars
    const g = A.musicGain.gain, t0 = A.music.ctxT0, endT = t0 + this.length - skip;
    g.cancelScheduledValues(c.currentTime); g.setValueAtTime(G.opts.musicVol, endT - this.bar * 2); g.linearRampToValueAtTime(0.0001, endT);
    this.restore.push(() => { g.cancelScheduledValues(0); g.value = G.opts.musicVol; });
    this.state = 'play';
  }
  async startRecording() {
    const A = this.g.audio, mbps = +this.g.opts.trailerMbps || 80;
    this.vrec = null;
    if (CodecRecorder.available()) {
      try { this.vrec = await CodecRecorder.create(this.canvas, { fps: FPS, mbps, audioCtx: A.ctx, audioNode: A.master }); }
      catch (e) { console.warn('trailer: WebCodecs recorder unavailable', e); this.vrec = null; }
      if (this.vrec) { this.mime = this.vrec.mime; console.info('trailer: recording', this.mime, mbps + ' Mbps'); return; }
    }
    // fallback: MediaRecorder (H.264 High profile first, then the plainer variants, then WebM)
    const dest = (this.dest = A.ctx.createMediaStreamDestination());
    A.master.connect(dest);
    const stream = this.canvas.captureStream(FPS);
    for (const tr of dest.stream.getAudioTracks()) stream.addTrack(tr);
    const types = ['video/mp4;codecs=avc1.640034,mp4a.40.2', 'video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    this.mime = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    if (!window.MediaRecorder) { this.recErr = 'This browser cannot record video'; return; }
    this.chunks = [];
    this.rec = new MediaRecorder(stream, { mimeType: this.mime || undefined, videoBitsPerSecond: mbps * 1e6, audioBitsPerSecond: 256000, videoKeyFrameIntervalDuration: 2000 });
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start(1000);
  }
  async stopRecording() {
    let blob = null, ext = 'mp4';
    if (this.vrec) { const v = this.vrec; this.vrec = null; try { blob = await v.stop(); } catch (e) { console.error('trailer: recording failed', e); this.recErr = 'Recording failed: ' + (e.message || e); } }
    if (this.rec) {
      const done = new Promise(r => { this.rec.onstop = r; });
      if (this.rec.state !== 'inactive') this.rec.stop();
      await done;
      blob = new Blob(this.chunks, { type: (this.mime || 'video/webm').split(';')[0] }); ext = /mp4/.test(this.mime) ? 'mp4' : 'webm';
      this.rec = null; this.chunks = [];
    }
    if (this.dest) { try { this.g.audio.master.disconnect(this.dest); } catch (e) { /* */ } this.dest = null; }
    if (blob) this.download(blob, ext);
  }
  download(blob, ext) {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deeplink_trailer_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 120000);
    this.saved = `${a.download} · ${(blob.size / 1048576).toFixed(1)} MB`;
    window.__trailerSaved = { name: a.download, size: blob.size, mime: this.mime };
  }
  now() { const A = this.g.audio; return A.music ? A.songTime() - this.songStart : -1; }
  // ------------------------------------------------------------------------------------------- run
  enterShot(i) {
    const prev = this.shots[this.cur];
    if (prev && prev.shift) this.setSide(0, true);
    this.cur = i;
    const s = this.shots[i]; if (!s) return;
    s.t0 = this.tOf(s.at); s.t1 = i + 1 < this.shots.length ? this.tOf(this.shots[i + 1].at) : this.length;
    s.nextShift = 1;
    if (s.dive_) { s.dive_.titleT = s.title ? 1.2 : 99; s.dive_.view.wipeT = -9; s.dive_.sim.shiftCD = 0; }
    if (s.kind === 'panel') this.g.audio.play('panel', { vol: 0.35 });
    if (s.fx === 'static' || s.fx === 'glitch') this.g.audio.play('shift', { side: 1, clean: true });
  }
  frame(dt) {
    if (this.state === 'play') {
      const t = this.now();
      if (t >= 0) {
        let i = this.cur;
        while (i + 1 < this.shots.length && t >= this.tOf(this.shots[i + 1].at)) i++;
        if (i !== this.cur && i >= 0) this.enterShot(i);
        const s = this.shots[this.cur];
        if (s && s.dive_) {
          const local = Math.max(0, t - s.t0);
          // forced shifts on the theme's beats (SHIFT shots): the music flips trance ⇄ hard techno with the world
          if (s.shift) while (s.nextShift * s.shift * this.beat <= local + 1e-3) { s.dive_.sim.shiftCD = 0; s.dive_.sim.doShift(); this.setSide(s.dive_.sim.side, true); s.nextShift++; }
          this.step(s, s.from0 + local * s.rate, Math.min(dt, 0.05));
          s.dive_.titleT += dt;
        }
        this.draw(t);
        if (this.vrec) this.vrec.capture();
      } else this.drawStatus();
      if (t >= this.length + 0.3) this.finish(false);
    } else this.drawStatus();
  }
  async finish(aborted) {
    if (this.state === 'done') return;
    this.state = 'done';
    const A = this.g.audio;
    for (const r of this.restore || []) r();
    const recording = !!(this.vrec || this.rec);
    if (recording) { this.drawStatus(); await this.stopRecording(); }
    A.stopMusic(aborted ? 0.3 : 0); A.setSide(0, true);
    window.__trailerDone = { aborted };
    this.drawStatus();
    setTimeout(() => { this.exit(); if (this.opts.onDone) this.opts.onDone(aborted); }, recording ? 2500 : 0);
  }
  exit() {
    this.canvas.remove();
    for (const s of this.shots) if (s.dive_) { s.dive_.ended = true; s.dive_ = null; }
    this.g.trailer = null; this.g.resize();
  }
  // ------------------------------------------------------------------------------------------- draw
  draw(t) {
    const g = this.ctx, s = this.shots[this.cur];
    g.setTransform(this.S, 0, 0, this.S, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (!s) return;
    const local = t - s.t0, k = clamp(local / Math.max(0.01, s.t1 - s.t0), 0, 1);
    if (s.kind === 'clip' || s.kind === 'logo') this.drawClip(g, s, local);
    else if (s.kind === 'panel') this.drawPanel(g, s, local, k);
    else if (s.kind === 'card') this.drawCard(g, s, local);
    else if (s.kind === 'count') this.drawCount(g, s, local);
    if (s.kind === 'logo') this.drawLogo(g, s, local);
    this.drawFx(g, s, local, t);
    // the last bar: fade to black
    if (t > this.length - this.bar) { g.fillStyle = `rgba(0,0,0,${clamp((t - (this.length - this.bar)) / this.bar, 0, 1)})`; g.fillRect(0, 0, W, H); }
  }
  drawClip(g, s, local) {
    const G = this.g, d = s.dive_, r = G.renderer, sim = d.sim;
    if (!r.ok) return;
    const F = d.render(r, 0);
    const post = { bloom: G.opts.bloom * (sim.overdrive ? 1.35 : 1), dither: G.opts.dither && !G.opts.hires, crt: G.opts.crt, damage: 0, flash: G.opts.lowFlash ? Math.min(0.1, sim.flash * 0.2) : sim.flash * 0.32, overdrive: sim.overdrive ? 1 : 0, desat: s.kind === 'logo' ? 0.35 : 0 };
    r.end(F, post, this.gpuView);
    r.begin();
    g.drawImage(r.capture ? r.capCanvas : G.gpuCanvas, 0, 0, W, H);
    if (s.hud && s.kind === 'clip') {
      G.hud.draw(g, W, H, sim, d.view, { view: this.view, kick: d.kick(), time: G.time, titleT: d.titleT, diveLabel: d.dive.layer !== undefined ? `LAYER ${d.dive.layer}` : '', lowFlash: G.opts.lowFlash, cursor: null, needClick: false, shiftKey: '[SHIFT]', title: d.dive.title || '', track: `${d.loaded.track.title} — ${Math.round(d.map.bpm)} BPM`, sectionLabel: '', subtitles: true, beatIndicator: true, equipped: null });
    }
  }
  drawPanel(g, s, local, k) {
    const G = this.g, def = G.panelDefs[s.id] || { id: s.id, aspect: '3:2', text: [] };
    const a = aspectOf(def.aspect);
    let pw = W * 0.92, ph = pw / a;
    if (ph > H * 0.88) { ph = H * 0.88; pw = ph * a; }
    const x = (W - pw) / 2, y = (H - ph) / 2;
    // paper border, ink frame
    g.fillStyle = '#f2efe6'; g.fillRect(x - 14, y - 14, pw + 28, ph + 28);
    g.save(); g.beginPath(); g.rect(x, y, pw, ph); g.clip();
    const im = panelImage(s.id).img;
    const [z0, z1] = s.zoom || [1, 1.08], z = z0 + (z1 - z0) * ease(k);
    const [fx, fy] = s.focus || [0.5, 0.5];
    if (im) {
      const ia = im.width / im.height; let iw = pw, ih = pw / ia; if (ih < ph) { ih = ph; iw = ph * ia; }
      iw *= z; ih *= z;
      g.drawImage(im, x + (pw - iw) * fx, y + (ph - ih) * fy, iw, ih);
    } else {
      g.fillStyle = '#2a2a2a'; g.fillRect(x, y, pw, ph);
      g.fillStyle = '#ddd'; g.font = `48px ${HUD_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${s.id} — ${def.title || ''}`, W / 2, H / 2);
    }
    g.restore();
    g.strokeStyle = '#0b0b0b'; g.lineWidth = 5; g.strokeRect(x, y, pw, ph);
    // lettering: the chosen lines, hand placement kept, set larger than in the game (read in a cut)
    let text = def.text || [], lay = getBalloons(s.id) || {};
    if (s.say) { text = s.say.map(([who, kind, t]) => ({ who, kind, text: t })); lay = {}; }
    else if (s.keep) { const L = {}; s.keep.forEach((oi, ni) => { if (lay[oi]) L[ni] = lay[oi]; }); text = s.keep.map(i => text[i]).filter(Boolean); lay = L; }
    if (text.length && local > 0.12) {
      const sc = 1.75;
      g.save(); g.globalAlpha = clamp((local - 0.12) / 0.15, 0, 1); g.scale(sc, sc);
      letterPanel(g, { ...def, text }, null, x / sc, y / sc, pw / sc, ph / sc, { layout: lay });
      g.restore();
    }
  }
  drawCard(g, s, local) {
    const sizes = { kicker: 46, big: 230, small: 40, type: 54 };
    const lines = s.lines || [];
    const total = lines.reduce((a, [, st]) => a + sizes[st] * 1.1, 0);
    let y = H / 2 - total / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([text, st], i) => {
      const sz = sizes[st]; y += sz * 0.55;
      const a = clamp((local - i * 0.18) / 0.2, 0, 1);
      g.globalAlpha = a;
      if (st === 'big') this.chromeText(g, text, W / 2, y, sz, local);
      else if (st === 'kicker') { g.font = `${sz}px ${HUD_FONT}`; g.fillStyle = '#7cf7ff'; g.shadowColor = '#0ff'; g.shadowBlur = 16; g.fillText(text.split('').join(' '), W / 2, y); g.shadowBlur = 0; }
      else if (st === 'type') { g.font = `${sz}px "Special Elite", monospace`; g.fillStyle = '#e8e4d8'; const n = Math.floor(clamp(local - i * 0.18, 0, 9) * 28); g.fillText(text.slice(0, n), W / 2, y); }
      else { g.font = `${sz}px ${HUD_FONT}`; g.fillStyle = 'rgba(220,240,255,0.8)'; g.fillText(text.toUpperCase(), W / 2, y); }
      g.globalAlpha = 1;
      y += sz * 0.55;
    });
  }
  // the title look of the menus: white → cyan → deep blue chrome, cyan glow, a red/cyan split on the beat
  chromeText(g, text, x, y, sz, local) {
    g.font = `${sz}px ${HUD_FONT}`;
    const ph = (((this.now() + this.songStart - this.zero) / this.beat) % 1 + 1) % 1, kick = Math.exp(-ph * 7);
    const sp = 3 + kick * 9;
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,40,90,0.55)'; g.fillText(text, x - sp, y);
    g.fillStyle = 'rgba(40,220,255,0.55)'; g.fillText(text, x + sp, y);
    g.globalCompositeOperation = 'source-over';
    const gr = g.createLinearGradient(0, y - sz * 0.42, 0, y + sz * 0.42);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.38, '#99ffff'); gr.addColorStop(0.5, '#112266'); gr.addColorStop(0.52, '#66ccff'); gr.addColorStop(0.8, '#ffffff');
    g.shadowColor = 'rgba(0,255,255,0.7)'; g.shadowBlur = 30;
    g.fillStyle = gr; g.fillText(text, x, y);
    g.shadowBlur = 0;
  }
  drawCount(g, s, local) {
    const n = Math.floor(local / this.beat), b = (local / this.beat) % 1;
    const v = (s.from || 7) - n;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (v >= 1) {
      g.globalAlpha = 1 - b * 0.6;
      this.chromeText(g, String(v), W / 2, H / 2, 420 + b * 80, local);
      g.globalAlpha = 1;
    } else { // the last beat: the white of the link opening
      g.fillStyle = `rgba(255,255,255,${0.15 + b * 0.85})`; g.fillRect(0, 0, W, H);
    }
  }
  drawLogo(g, s, local) {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, W, 2); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = clamp(local / 0.4, 0, 1);
    this.chromeText(g, 'DEEPLINK', W / 2, H * 0.42, 300, local);
    g.globalAlpha = clamp((local - 0.9) / 0.6, 0, 1);
    g.font = `52px ${HUD_FONT}`; g.fillStyle = '#9ff'; g.shadowColor = '#0ff'; g.shadowBlur = 14;
    g.fillText('1 9 9 6', W / 2, H * 0.58);
    g.globalAlpha = clamp((local - 1.8) / 0.6, 0, 1);
    g.font = `40px ${HUD_FONT}`; g.fillStyle = 'rgba(230,245,255,0.9)'; g.shadowBlur = 6;
    g.fillText('A RHYTHM DIVE THROUGH THE NETWORK  ·  SHIFT BETWEEN WORLDS ON THE BEAT', W / 2, H * 0.68);
    g.shadowBlur = 0; g.globalAlpha = 1;
  }
  drawFx(g, s, local, t) {
    if (s.fx === 'flash' && local < 0.3) { g.fillStyle = `rgba(255,255,255,${(1 - local / 0.3) * 0.85})`; g.fillRect(0, 0, W, H); }
    if (s.fx === 'fade' && local < 1.2) { g.fillStyle = `rgba(0,0,0,${1 - local / 1.2})`; g.fillRect(0, 0, W, H); }
    if (s.fx === 'glitch' && local < 0.4) {
      const k = 1 - local / 0.4;
      for (let i = 0; i < 10; i++) {
        const y = Math.floor(((Math.sin(i * 91.7 + Math.floor(local * 30) * 13.1) + 1) / 2) * H), h = 10 + ((i * 37) % 80);
        const dx = Math.sin(i * 7.3 + local * 50) * 90 * k;
        { const S = this.S; g.drawImage(this.canvas, 0, y * S, W * S, h * S, dx, y, W, h); }
      }
      g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,40,190,${0.16 * k})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    }
    if (s.fx === 'static' && local < 0.35) { // TV snow, like the B-side static layer
      const k = 1 - local / 0.35, img = this.snow || (this.snow = this.makeSnow());
      g.globalAlpha = 0.85 * k; g.drawImage(img, (Math.random() * 64) | 0, (Math.random() * 64) | 0, W, H, 0, 0, W, H); g.globalAlpha = 1;
    }
  }
  makeSnow() {
    const c = document.createElement('canvas'); c.width = W / 4 + 64; c.height = H / 4 + 64;
    const x = c.getContext('2d'), im = x.createImageData(c.width, c.height);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    const big = document.createElement('canvas'); big.width = W + 256; big.height = H + 256;
    const bx = big.getContext('2d'); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, big.width, big.height);
    return big;
  }
  drawStatus() {
    const g = this.ctx;
    g.setTransform(this.S, 0, 0, this.S, 0, 0); g.globalAlpha = 1;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#9ff'; g.font = `56px ${HUD_FONT}`;
    g.fillText(this.state === 'done' ? (this.saved ? 'SAVED ' + this.saved : this.vrec || this.rec ? 'SAVING THE VIDEO…' : 'END OF TRAILER') : this.msg, W / 2, H / 2);
    g.fillStyle = '#7cf7ff'; g.fillRect(W / 2 - 300, H / 2 + 50, 600 * this.progress, 4);
    g.fillStyle = 'rgba(200,240,255,0.55)'; g.font = `34px ${HUD_FONT}`;
    g.fillText(this.opts.record ? 'RECORDING STARTS WITH THE MUSIC  ·  KEEP THIS TAB IN FRONT  ·  ESC ABORTS' : 'PREVIEW  ·  ESC STOPS', W / 2, H / 2 + 120);
    if (this.recErr) g.fillText(this.recErr, W / 2, H / 2 + 170);
  }
}
