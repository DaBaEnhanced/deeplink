// Procedural mid-90s trance / hard techno (fallback for missing track files, Endless Deep, attract mode).
// Plays a full arrangement that follows a beat map's sections (Intro, Build, Drop, Breakdown, Build, Drop 2, Outro) with
// real stems (kick, bass, lead, pads, fx) for the adaptive mix: 909-style kick, offbeat bass, hats, claps, snare rolls,
// detuned supersaw lead, gated pads, 303 acid lines, arpeggios, risers and crashes, a hall reverb and a delay.
import { rng, hashStr } from '../core/rng.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], phrygian: [0, 1, 4, 5, 7, 8, 10] };
export function parseKey(key = 'A minor') {
  const k = key.replace(/flat/gi, 'b').replace(/sharp/gi, '#');
  const m = k.match(/([A-G])\s*(#|b)?\s*(major|minor)?/i);
  if (!m) return { root: 9, mode: 'minor' };
  const root = NOTE[m[1].toUpperCase() + (m[2] || '')] ?? 9;
  return { root, mode: (m[3] || 'minor').toLowerCase() };
}
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function styleOf(track) {
  const c = ((track && track.caption) || '') + ' ' + ((track && track.title) || '');
  const lc = c.toLowerCase();
  return {
    acid: /acid|303/.test(lc), hard: /hard techno/.test(lc), hardTrance: /hard trance|hoover/.test(lc), ambient: /ambient/.test(lc),
    goa: /goa|psychedelic|modal/.test(lc), prog: /progressive/.test(lc), gated: /gated/.test(lc), breakbeat: /breakbeat/.test(lc),
  };
}

export class ProcMusic {
  constructor(ctx, stems, track, map) {
    this.ctx = ctx; this.stems = stems; this.track = track || { id: 'endless', key: 'A minor', caption: '' }; this.map = map;
    this.style = styleOf(this.track);
    const key = parseKey(this.track.key);
    if (/→\s*E major/.test(this.track.key || '')) key.mode2 = 'major';
    this.key = key;
    const R = rng(hashStr(this.track.id || 'x'));
    this.R = R;
    // progression (scale degrees) and hook
    const progs = key.mode === 'major' ? [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4]] : [[0, 5, 2, 6], [0, 6, 5, 6], [0, 3, 5, 4], [0, 5, 3, 4]];
    this.prog = progs[Math.floor(R() * progs.length)];
    this.hook = []; // 32 sixteenth steps (2 bars): scale degree offset or null
    const rhythm = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0];
    for (let i = 0; i < 32; i++) {
      const on = rhythm[i % 16] && R() < 0.85;
      this.hook.push(on ? [0, 2, 4, 7, 4, 2, 6, 5][Math.floor(R() * 8)] + (i >= 16 && R() < 0.4 ? 1 : 0) : null);
    }
    this.acidPat = []; for (let i = 0; i < 16; i++) this.acidPat.push({ on: R() < 0.75, deg: [0, 0, 0, 2, 4, 6, 7, -1][Math.floor(R() * 8)], acc: R() < 0.3, slide: R() < 0.2, oct: R() < 0.2 ? 12 : 0 });
    this.arpPat = [0, 2, 4, 2, 7, 4, 2, 4, 0, 2, 4, 7, 9, 7, 4, 2];
    this.nextStep = 0; this.playing = false;
    // shared nodes
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.rev = ctx.createConvolver(); this.rev.buffer = impulse(ctx, 2.6);
    this.revOut = ctx.createGain(); this.revOut.gain.value = 0.32; this.rev.connect(this.revOut); this.revOut.connect(stems.pads);
    this.delay = ctx.createDelay(1.5); this.delay.delayTime.value = 0.75 * 60 / (map.bpm || 140);
    this.fb = ctx.createGain(); this.fb.gain.value = 0.35; this.delayOut = ctx.createGain(); this.delayOut.gain.value = 0.25;
    this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.delayOut); this.delayOut.connect(stems.lead);
    this.kickBus = ctx.createGain(); this.kickBus.gain.value = 1;
    if (this.style.hard || this.style.hardTrance) { const ws = ctx.createWaveShaper(); ws.curve = distCurve(this.style.hard ? 6 : 3); this.kickBus.connect(ws); ws.connect(stems.kick); } else this.kickBus.connect(stems.kick);
    this.nodes = new Set();
  }
  // song time of a 16th step
  stepTime(k) {
    const beats = this.map.beats; const b = Math.floor(k / 4), f = (k % 4) / 4;
    if (b + 1 < beats.length) return beats[b] + (beats[b + 1] - beats[b]) * f;
    const p = 60 / this.map.bpm; return beats[beats.length - 1] + (b - beats.length + 1 + f) * p;
  }
  section(t) {
    const s = this.map.sections; let i = 0; while (i < s.length - 1 && s[i + 1].t <= t + 1e-3) i++;
    const next = s[i + 1]; return { s: s[i], i, end: next ? next.t : this.map.length, k: next ? (t - s[i].t) / (next.t - s[i].t) : (t - s[i].t) / Math.max(1, this.map.length - s[i].t) };
  }
  start(songT, ctxT, rate = 1) {
    this.stopAll(); this.songT0 = songT; this.ctxT0 = ctxT; this.rate = rate; this.playing = true;
    // first 16th at or after songT
    let k = 0; while (this.stepTime(k) < songT - 1e-4 && k < 1e6) k++;
    this.nextStep = k;
  }
  stop() { this.playing = false; this.stopAll(); }
  stopAll() { for (const n of this.nodes) { try { n.stop(); } catch (e) { /* */ } } this.nodes.clear(); }
  toCtx(t) { return this.ctxT0 + (t - this.songT0) / this.rate; }
  tick() {
    if (!this.playing) return;
    const horizon = this.ctx.currentTime + 0.25;
    let guard = 0;
    while (guard++ < 64) {
      const st = this.stepTime(this.nextStep);
      if (st >= this.map.length) { this.playing = this.loop ? this.restartLoop() : false; return; }
      const ct = this.toCtx(st);
      if (ct > horizon) break;
      if (ct > this.ctx.currentTime - 0.05) this.step(this.nextStep, st, Math.max(ct, this.ctx.currentTime));
      this.nextStep++;
    }
  }
  restartLoop() { this.start(0, this.toCtx(this.map.length), this.rate); return true; }
  step(k, t, ct) {
    const S = this.style, sec = this.section(t), type = sec.s.type;
    const st16 = k % 16, bar = Math.floor(k / 16), barInSec = Math.floor((t - sec.s.t) / (240 / this.map.bpm) + 1e-3);
    const secBars = Math.max(1, Math.round((sec.end - sec.s.t) / (240 / this.map.bpm)));
    const barsLeft = secBars - barInSec;
    const spb = 60 / this.map.bpm / this.rate;
    const chordDeg = this.prog[Math.floor(bar / 2) % 4];
    const mode = this.key.mode2 && type === 'drop2' ? this.key.mode2 : (S.goa ? 'phrygian' : this.key.mode);
    const scale = SCALES[mode] || SCALES.minor;
    const root = 36 + this.key.root; // C2..B2 bass root area
    const deg = d => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return scale[i] + o * 12; };
    const chordRoot = root + deg(chordDeg);
    const drop = type === 'drop' || type === 'drop2';
    const amb = S.ambient;
    // kick
    const kickOn = amb ? (st16 === 0 || st16 === 10) && type !== 'intro' && type !== 'outro'
      : (drop || type === 'outro' || (type === 'build') || (type === 'intro' && barInSec >= Math.min(8, secBars / 2))) && st16 % 4 === 0;
    if (kickOn && !(type === 'build' && barsLeft <= 1 && st16 >= 8)) this.kick(ct, amb ? 0.5 : (drop ? 1 : 0.8));
    if (type === 'breakdown' && (this.track.id === 'black_ice' || this.track.id === 'live_fire') && st16 % 8 === 0) this.kick(ct, 0.35); // heartbeat pulse
    // bass
    if (!amb && (drop || type === 'build' || type === 'outro' || (type === 'intro' && barInSec >= secBars / 2))) {
      if (S.hard) { if (st16 % 2 === 1 || (drop && st16 % 4 !== 0)) this.bass(ct, mtof(chordRoot - 12 + (st16 % 8 === 7 ? 12 : 0)), spb * 0.22, 0.5); }
      else if (st16 % 4 === 2) this.bass(ct, mtof(chordRoot), spb * 0.42, 0.6);
      else if (drop && (st16 % 4 === 3) && this.R() < 0.3) this.bass(ct, mtof(chordRoot + 12), spb * 0.2, 0.35);
    }
    if (amb && st16 === 0) this.bass(ct, mtof(chordRoot), spb * 3.5, 0.35, 220);
    // hats
    if (!amb && (drop || type === 'build' || type === 'outro')) {
      if (st16 % 4 === 2) this.hat(ct, true, drop ? 0.25 : 0.18);
      else if (drop && st16 % 2 === 1) this.hat(ct, false, 0.08);
      else if (type === 'build' && st16 % 2 === 1 && barInSec >= secBars / 2) this.hat(ct, false, 0.07);
    }
    if (S.breakbeat && drop && [3, 6, 11, 14].includes(st16)) this.clap(ct, 0.25, 2600);
    // clap / snare
    if (drop && (st16 === 4 || st16 === 12)) this.clap(ct, S.hard ? 0.45 : 0.35);
    if (type === 'build' && barsLeft <= 2) { // snare roll: 8ths -> 16ths -> 32nds
      const rate = barsLeft === 2 ? (st16 % 2 === 0) : true;
      if (rate) { const v = 0.12 + 0.3 * (1 - barsLeft / 2 + st16 / 32); this.snare(ct, v); if (barsLeft === 1 && st16 >= 8) this.snare(ct + spb / 8, v); }
    }
    if (type === 'build' && barsLeft === 4 && st16 === 0) this.riser(ct, spb * 16);
    if (st16 === 0 && barInSec === 0 && drop) { this.crash(ct); this.sub(ct); }
    // pads / chords
    const padsOn = amb || type === 'breakdown' || type === 'intro' || (drop && !S.hard) || (type === 'build' && !S.hard);
    if (padsOn && st16 === 0 && bar % 2 === 0) {
      const ch = [0, 2, 4].map(o => mtof(root + 24 + deg(chordDeg + o)));
      this.pad(ct, ch, spb * 8 * 0.98, amb ? 0.08 : (drop ? 0.07 : 0.09), (S.gated && drop) || (type === 'build' && S.gated));
    }
    // stabs (hard techno / acid)
    if ((S.hard || S.acid) && drop && [0, 3, 6, 10].includes(st16) && bar % 2 === (S.hard ? 0 : 1)) this.stab(ct, [0, 3, 7].map(o => mtof(chordRoot + 24 + o)), 0.12);
    // arpeggio
    const arpOn = !S.hard && (type === 'intro' || type === 'build' || type === 'breakdown' || type === 'outro' || (drop && S.goa));
    if (arpOn && (amb ? st16 % 4 === 0 && this.R() < 0.5 : true)) {
      const n = root + 36 + deg(chordDeg + this.arpPat[st16]);
      const open = type === 'build' ? 800 + 4000 * sec.k : type === 'intro' ? 600 + 1200 * sec.k : 1600;
      this.arp(ct, mtof(amb ? n - 12 : n), spb * (amb ? 0.9 : 0.22), amb ? 0.07 : 0.06, open);
    }
    // acid line
    if (S.acid && (drop || type === 'build' || (type === 'breakdown' && this.track.id === 'firewall') || type === 'intro')) {
      const a = this.acidPat[st16];
      if (a.on) {
        const cut = type === 'intro' ? 300 : type === 'build' ? 300 + 2200 * sec.k : drop ? (type === 'drop2' ? 3600 : 2600) : 900;
        this.acid(ct, mtof(chordRoot + 12 + deg(a.deg) - scale[0] + a.oct), spb * (a.slide ? 0.5 : 0.24), a.acc, cut);
      }
    }
    // lead hook / riff
    if (drop && !(S.hard && type === 'drop')) {
      const h = this.hook[(bar % 2) * 16 + st16];
      if (h !== null && h !== undefined) {
        const n = root + 48 + deg(chordDeg + h);
        const up = type === 'drop2' ? 12 : 0;
        this.lead(ct, mtof(n + up), spb * 0.42, S.hard ? 0.05 : 0.07);
        if (type === 'drop2' && !S.hard) this.lead(ct, mtof(n + up - 12), spb * 0.42, 0.04);
      }
    }
    if (S.hard && type === 'drop' && st16 % 2 === 0) { // relentless sequenced riff
      const r = [0, 0, 3, 0, 7, 0, 3, 5][(st16 / 2) % 8];
      this.stab(ct, [mtof(chordRoot + 24 + r)], 0.1, 'square', 1400);
    }
    if (type === 'breakdown' && !amb && st16 % 8 === 0) { // slow hook (half-time)
      const h = this.hook[((bar % 2) * 16 + st16 * 2) % 32] ?? 0;
      this.lead(ct, mtof(root + 48 + deg(chordDeg + (h || 0))), spb * 1.8, 0.035, 2200);
    }
  }
  // --------------------------------------------------------------------------------------------- voices
  env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  osc(type, f, t, dur, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); this.track_(o); return o; }
  track_(n) { this.nodes.add(n); n.onended = () => this.nodes.delete(n); }
  noiseSrc(t, dur, dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); this.track_(s); return s; }
  kick(t, v) {
    const g = this.ctx.createGain(); g.connect(this.kickBus);
    const o = this.osc('sine', 150, t, 0.4, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    this.env(g, t, 0.002, v * 0.9, 0.34);
    const c = this.ctx.createGain(); c.connect(this.kickBus); const n = this.noiseSrc(t, 0.02, c); n; this.env(c, t, 0.001, v * 0.15, 0.015);
  }
  sub(t) { const g = this.ctx.createGain(); g.connect(this.stems.fx); const o = this.osc('sine', 55, t, 1.2, g); o.frequency.exponentialRampToValueAtTime(30, t + 1); this.env(g, t, 0.01, 0.4, 1.1); }
  bass(t, f, dur, v, cut = 700) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(cut * 2.2, t); lp.frequency.exponentialRampToValueAtTime(cut * 0.5, t + dur);
    lp.connect(g); g.connect(this.stems.bass);
    this.osc('sawtooth', f, t, dur, lp); this.osc('square', f / 2, t, dur, lp);
    this.env(g, t, 0.004, v * 0.5, dur);
  }
  hat(t, open, v) {
    const g = this.ctx.createGain(), hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = open ? 7000 : 9000;
    hp.connect(g); g.connect(this.stems.fx); this.noiseSrc(t, open ? 0.2 : 0.05, hp); this.env(g, t, 0.001, v, open ? 0.16 : 0.04);
  }
  clap(t, v, f = 1500) {
    const g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.2;
    bp.connect(g); g.connect(this.stems.fx); g.connect(this.rev); this.noiseSrc(t, 0.25, bp);
    g.gain.setValueAtTime(0.0001, t); [0, 0.01, 0.022].forEach(o => { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.3, t + o + 0.009); });
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  }
  snare(t, v) {
    const g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    bp.connect(g); g.connect(this.stems.fx); this.noiseSrc(t, 0.12, bp); this.env(g, t, 0.001, v, 0.09);
  }
  riser(t, dur) {
    const g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    bp.connect(g); g.connect(this.stems.fx); g.connect(this.rev); this.noiseSrc(t, dur, bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + dur * 0.98); g.gain.linearRampToValueAtTime(0, t + dur);
  }
  crash(t) {
    const g = this.ctx.createGain(), hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    hp.connect(g); g.connect(this.stems.fx); g.connect(this.rev); this.noiseSrc(t, 2, hp); this.env(g, t, 0.002, 0.22, 1.8);
  }
  pad(t, freqs, dur, v, gated) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.7;
    lp.connect(g); g.connect(this.stems.pads); g.connect(this.rev);
    for (const f of freqs) { this.osc('sawtooth', f * 1.004, t, dur, lp); this.osc('sawtooth', f * 0.996, t, dur, lp); }
    if (gated) {
      const spb16 = 60 / this.map.bpm / this.rate / 4;
      g.gain.setValueAtTime(0, t);
      for (let s = 0; s * spb16 < dur; s++) { const on = [1, 1, 0, 1, 1, 0, 1, 0][s % 8]; g.gain.setValueAtTime(on ? v : 0.0001, t + s * spb16); }
      g.gain.setValueAtTime(0, t + dur);
    } else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.6, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
  }
  stab(t, freqs, v, type = 'sawtooth', cut = 2600) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 3;
    lp.connect(g); g.connect(this.stems.lead); g.connect(this.rev);
    for (const f of freqs) { this.osc(type, f, t, 0.2, lp); this.osc(type, f * 1.01, t, 0.2, lp); }
    this.env(g, t, 0.002, v, 0.16);
  }
  arp(t, f, dur, v, cut) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 5;
    lp.connect(g); g.connect(this.stems.pads); g.connect(this.delay);
    this.osc('square', f, t, dur, lp); this.env(g, t, 0.002, v, dur);
  }
  acid(t, f, acc, dur, cut) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 14;
    lp.frequency.setValueAtTime(cut * (acc ? 1.8 : 1), t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, cut * 0.15), t + dur * 1.2);
    lp.connect(g); g.connect(this.stems.lead); g.connect(this.delay);
    this.osc('sawtooth', f, t, dur, lp); this.env(g, t, 0.003, acc ? 0.16 : 0.1, dur);
  }
  lead(t, f, dur, v, cut = 4200) {
    const g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 1.5;
    lp.connect(g); g.connect(this.stems.lead); g.connect(this.rev); g.connect(this.delay);
    for (const d of [-0.012, -0.005, 0, 0.005, 0.012]) this.osc('sawtooth', f * (1 + d), t, dur + 0.1, lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.setValueAtTime(v * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  }
}
function impulse(ctx, sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  return b;
}
export function distCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }
