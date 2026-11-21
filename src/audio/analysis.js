// Beat and structure analysis (bible §9.1, §14.3 Custom Music, §20 beat mapper first pass).
// Pure functions on mono PCM, used in the browser (Custom Music, beat mapper) and by tools/beatmap.mjs (node).
// Output: a beat map { bpm, offset, length, tempos, sections:[{t,type,energy}], events:[...] }.

function fft(re, im) { // in-place radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// frame features at 100 frames/s: spectral flux (all), low-band flux (kick), rms, low rms, mid rms (lead/vocals)
export function features(pcm, sr) {
  const fps = 200, hop = Math.round(sr / fps), N = 1024;
  const frames = Math.max(1, Math.floor((pcm.length - N) / hop));
  const flux = new Float32Array(frames), lowFlux = new Float32Array(frames), rms = new Float32Array(frames), low = new Float32Array(frames), mid = new Float32Array(frames);
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const re = new Float32Array(N), im = new Float32Array(N);
  let prev = new Float32Array(N / 2);
  const lowBin = Math.ceil(150 / (sr / N)), midLo = Math.floor(800 / (sr / N)), midHi = Math.ceil(4000 / (sr / N));
  for (let f = 0; f < frames; f++) {
    const o = f * hop; let e = 0;
    for (let i = 0; i < N; i++) { const v = pcm[o + i] || 0; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    fft(re, im);
    let fl = 0, lf = 0, le = 0, me = 0;
    const cur = new Float32Array(N / 2);
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(Math.hypot(re[k], im[k]) * 10);
      cur[k] = m; const d = m - prev[k];
      if (d > 0) { fl += d; if (k <= lowBin) lf += d; }
      if (k <= lowBin) le += m; else if (k >= midLo && k <= midHi) me += m;
    }
    prev = cur;
    flux[f] = fl; lowFlux[f] = lf; rms[f] = Math.sqrt(e / N); low[f] = le / lowBin; mid[f] = me / (midHi - midLo + 1);
  }
  return { flux, lowFlux, rms, low, mid, fps: sr / hop, length: pcm.length / sr, offset: N / 2 / sr };
}

function norm01(a) { let mx = 0; for (const v of a) mx = Math.max(mx, v); const o = new Float32Array(a.length); if (mx > 0) for (let i = 0; i < a.length; i++) o[i] = a[i] / mx; return o; }
function sample(a, t, fps) { const f = t * fps, i = Math.floor(f), k = f - i; if (i < 0 || i + 1 >= a.length) return 0; return a[i] * (1 - k) + a[i + 1] * k; }
// refine tempo and phase by least squares on the onset peaks nearest to each predicted beat (outliers dropped)
function refineFit(on, fps, bpm, phase, t0, t1) {
  let p = 60 / bpm, o = phase;
  for (let it = 0; it < 3; it++) {
    const xs = [], ys = [];
    for (let k = 0; ; k++) {
      const t = t0 + o + k * p; if (t >= t1) break;
      let bi = -1, bv = 0; const a = Math.floor((t - 0.05) * fps), b = Math.ceil((t + 0.05) * fps);
      for (let i = Math.max(1, a); i < Math.min(on.length - 1, b); i++) if (on[i] > bv && on[i] >= on[i - 1] && on[i] >= on[i + 1]) { bv = on[i]; bi = i; }
      if (bi > 0 && bv > 0.15) { const y0 = on[bi - 1], y1 = on[bi], y2 = on[bi + 1]; const d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1); xs.push(k); ys.push((bi + clamp01(d)) / fps); }
    }
    if (xs.length < 16) break;
    const fit = (X, Y) => { const n = X.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sx += X[i]; sy += Y[i]; sxx += X[i] * X[i]; sxy += X[i] * Y[i]; } const m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return [m, (sy - m * sx) / n]; };
    let [m, c] = fit(xs, ys);
    const res = xs.map((x, i) => Math.abs(ys[i] - (m * x + c))); const lim = Math.max(0.012, [...res].sort((a, b) => a - b)[Math.floor(res.length * 0.6)] * 2);
    const X2 = [], Y2 = []; xs.forEach((x, i) => { if (res[i] <= lim) { X2.push(x); Y2.push(ys[i]); } });
    if (X2.length > 16) [m, c] = fit(X2, Y2);
    p = m; o = c - t0;
  }
  return { bpm: 60 / p, phase: ((o % p) + p) % p };
}
const clamp01 = d => Math.max(-0.5, Math.min(0.5, d));

// onset features peak slightly before the audible attack (low-band energy builds over the window); measured against
// librosa and the kick's energy rise on generated tracks
const ONSET_LAT = 0.04;
// best (bpm, phase) for an onset curve over [t0, t1]. Generated tracks rarely hit the asked tempo, so the whole
// 110-178 BPM range is searched; the hint only adds a mild prior.
function tempoSearch(on, fps, lo, hi, t0, t1, hint) {
  const score = (bpm, ph, fine) => {
    const p = 60 / bpm; let sc = 0, n = 0;
    for (let t = t0 + ph; t < t1; t += p) { sc += fine ? sample(on, t, fps) : sample(on, t, fps) + 0.5 * (sample(on, t - 0.01, fps) + sample(on, t + 0.01, fps)); n++; }
    return sc / Math.max(1, n);
  };
  const prior = bpm => (hint ? 1 - 0.08 * Math.abs(Math.log(bpm / hint)) / Math.log(1.1) * 0.5 : 1);
  let best = { score: -1, bpm: (lo + hi) / 2, phase: 0 };
  for (let bpm = lo; bpm <= hi; bpm += 0.1) {
    const p = 60 / bpm;
    for (let ph = 0; ph < p; ph += 0.012) {
      const sc = score(bpm, ph, false) * prior(bpm);
      if (sc > best.score) best = { score: sc, bpm, phase: ph };
    }
  }
  const c = { ...best }; best.score = -1;
  for (let bpm = c.bpm - 0.12; bpm <= c.bpm + 0.12; bpm += 0.005) {
    const p = 60 / bpm;
    for (let ph = Math.max(0, c.phase - 0.024); ph < c.phase + 0.024; ph += 0.002) {
      const sc = score(bpm, ph % p, true);
      if (sc > best.score) best = { score: sc, bpm, phase: ph % p };
    }
  }
  return best;
}

export function beatsFromTempos(tempos, length) {
  const beats = [];
  for (let k = 0; k < tempos.length; k++) {
    const seg = tempos[k], end = tempos[k + 1] ? tempos[k + 1].t : length + 0.001;
    const p = 60 / seg.bpm;
    let t = seg.t; if (k === 0) { t = seg.offset ?? seg.t; while (t - p >= 0) t -= p; }
    for (; t < end; t += p) if (t >= 0) beats.push(+t.toFixed(4));
  }
  return beats;
}

// hint: { bpm, bpm2 } from the soundtrack file (MiniMax/Stable Audio don't always hit the asked tempo exactly)
export function analyse(feat, hint = {}) {
  const { fps, length } = feat;
  const on = norm01(feat.lowFlux.map((v, i) => v * 0.7 + feat.flux[i] * 0.3));
  const range = () => [110, 178];
  let tempos;
  if (hint.bpm2) {
    // tempo change: search the switch point (bar resolution) between 25% and 85%
    const a = tempoSearch(on, fps, ...range(), 0, length * 0.3, hint.bpm);
    const b = tempoSearch(on, fps, ...range(), length * 0.7, length, hint.bpm2);
    let bestT = length * 0.5, bestS = -1;
    for (let tc = length * 0.25; tc < length * 0.85; tc += 60 / a.bpm * 4) {
      let s1 = 0, n1 = 0, s2 = 0, n2 = 0;
      for (let t = a.phase; t < tc; t += 60 / a.bpm) { s1 += sample(on, t, fps); n1++; }
      for (let t = tc + ((b.phase - tc) % (60 / b.bpm) + 60 / b.bpm) % (60 / b.bpm); t < length; t += 60 / b.bpm) { s2 += sample(on, t, fps); n2++; }
      const s = s1 + s2; if (s > bestS) { bestS = s; bestT = tc; }
    }
    const p2 = 60 / b.bpm; let t2 = b.phase; while (t2 - p2 > bestT) t2 -= p2; while (t2 < bestT) t2 += p2;
    tempos = [{ t: 0, bpm: +a.bpm.toFixed(3), offset: +a.phase.toFixed(4) }, { t: +t2.toFixed(4), bpm: +b.bpm.toFixed(3) }];
  } else {
    const r0 = tempoSearch(on, fps, ...range(), 0, length, hint.bpm);
    const r = refineFit(on, fps, r0.bpm, r0.phase, 0, length);
    const p = 60 / r.bpm; const off = ((r.phase + feat.offset + ONSET_LAT) % p + p) % p;
    tempos = [{ t: 0, bpm: +r.bpm.toFixed(4), offset: +off.toFixed(4) }];
  }
  let beats = beatsFromTempos(tempos, length);
  // generated tracks sometimes drift: when the constant grid misses the onsets, follow them with a DP beat tracker
  const lat = (feat.offset || 0) + ONSET_LAT;
  const resid = gridResidual(on, fps, beats.map(t => t - lat));
  let tracked = null;
  if (!hint.bpm2 && resid > 0.014) {
    const raw = dpBeats(on, fps, 60 / tempos[0].bpm);
    if (raw.length > beats.length * 0.8 && gridResidual(on, fps, raw) < resid * 0.7) { tracked = raw.map(t => +(t + lat).toFixed(4)); beats = tracked; }
  }
  // per-beat kick strength and energy
  const rmsN = norm01(feat.rms), lowN = norm01(feat.low), midN = norm01(feat.mid), lf = norm01(feat.lowFlux);
  const bk = beats.map(t => Math.max(sample(lf, t, fps), sample(lf, t + 0.01, fps), sample(lf, t - 0.01, fps)));
  // downbeat: the beat phase (mod 4) whose bar starts carry the largest energy changes
  const segE = (t0, t1, arr) => { let s = 0, n = 0; for (let i = Math.floor(t0 * fps); i < Math.min(arr.length, t1 * fps); i++) { s += arr[i]; n++; } return n ? s / n : 0; };
  let db = 0, dbS = -1;
  for (let ph = 0; ph < 4; ph++) {
    let s = 0;
    for (let i = ph + 16; i < beats.length - 16; i += 16) s += Math.abs(segE(beats[i], beats[i + 16], rmsN) - segE(beats[i - 16], beats[i], rmsN)) + Math.abs(segE(beats[i], beats[i + 4], lowN) - segE(beats[i - 4], beats[i], lowN));
    if (s > dbS) { dbS = s; db = ph; }
  }
  const bars = []; for (let i = db; i < beats.length; i += 4) bars.push(beats[i]);
  // per 4-bar phrase features
  const ph = [];
  for (let i = 0; i + 4 < bars.length; i += 4) {
    const t0 = bars[i], t1 = bars[i + 4];
    const b0 = beats.indexOf(t0), b1 = beats.indexOf(t1);
    let k = 0; for (let j = b0; j < b1; j++) k += bk[j]; k /= Math.max(1, b1 - b0);
    ph.push({ t: t0, t1, e: segE(t0, t1, rmsN), kick: k, low: segE(t0, t1, lowN), mid: segE(t0, t1, midN) });
  }
  const sections = structure(ph, length, bars);
  const events = [];
  for (const s of sections) {
    if (s.type === 'drop' || s.type === 'drop2') events.push({ t: s.t, kind: 'kick_return' });
    if (s.type === 'build') { const end = sections[sections.indexOf(s) + 1]?.t ?? length; const bl = 4 * 60 / tempos[0].bpm; events.push({ t: +(end - bl * 2).toFixed(3), kind: 'snare_roll' }, { t: +(end - bl * 4).toFixed(3), kind: 'riser' }); }
  }
  return { bpm: tempos[0].bpm, offset: tempos[0].offset, tempos, ...(tracked ? { beatTimes: tracked } : {}), length: +length.toFixed(3), downbeat: db, bars: bars.map(b => +b.toFixed(3)), sections, events, analysed: true };
}

// map phrases onto the level phases (bible §9.2): Intro, then Build -> Drop (-> Breakdown -> Build -> Drop)... ending in
// Drop 2 (the last drop: the boss) and the Outro. Generated tracks often have more than one breakdown; all are kept.
function structure(ph, length, bars) {
  const n = ph.length;
  const fallback = () => {
    const fr = [['intro', 0, 0.3], ['build', 0.11, 0.6], ['drop', 0.22, 0.9], ['breakdown', 0.44, 0.35], ['build', 0.55, 0.65], ['drop2', 0.66, 1], ['outro', 0.88, 0.4]];
    const snap = t => { let best = t, d = 1e9; for (const b of bars) { if (Math.abs(b - t) < d) { d = Math.abs(b - t); best = b; } } return best; };
    return fr.map(([type, f, energy]) => ({ t: +(f === 0 ? 0 : snap(f * length)).toFixed(3), type, energy }));
  };
  if (n < 10) return fallback();
  const score = ph.map(p => p.e * 0.45 + p.low * 0.3 + p.kick * 0.25);
  const sorted = [...score].sort((a, b) => a - b);
  const thr = (sorted[Math.floor(n * 0.3)] + sorted[Math.floor(n * 0.8)]) / 2;
  let lab = score.map(v => v >= thr);
  // runs, merging runs shorter than 2 phrases (8 bars) into their neighbours
  const runsOf = l => { const r = []; l.forEach((v, i) => { if (r.length && r[r.length - 1].v === v) r[r.length - 1].j = i + 1; else r.push({ v, i, j: i + 1 }); }); return r; };
  for (let pass = 0; pass < 4; pass++) {
    const r = runsOf(lab); let changed = false;
    for (let k = 0; k < r.length; k++) { const len = r[k].j - r[k].i; if (len < 2 && r.length > 1 && !(k === 0 && !r[k].v) && !(k === r.length - 1 && !r[k].v)) { for (let i = r[k].i; i < r[k].j; i++) lab[i] = !r[k].v; changed = true; break; } }
    if (!changed) break;
  }
  const runs = runsOf(lab);
  if (!runs.some(r => r.v)) return fallback();
  const mx = Math.max(...score) || 1;
  const mean = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += score[i]; return s / Math.max(1, b - a) / mx; };
  const out = [];
  const push = (type, i, j) => { if (j > i) out.push({ t: ph[i].t, type, energy: +mean(i, j).toFixed(2), i, j }); };
  // Drop 2 (the boss) is the longest drop in the second half (ties: the later one)
  let lastFull = runs.map(r => r.v).lastIndexOf(true), bestLen = -1;
  runs.forEach((r, k) => { if (r.v && ph[r.i].t >= length * 0.42 && r.j - r.i >= bestLen) { bestLen = r.j - r.i; lastFull = k; } });
  runs.forEach((r, k) => {
    if (r.v) { push(k === lastFull ? 'drop2' : 'drop', r.i, r.j); return; }
    const nextFull = runs[k + 1] && runs[k + 1].v;
    const len = r.j - r.i;
    if (k === 0) { // intro, with a build carved from its end when long enough
      if (nextFull && len >= 3) { push('intro', r.i, r.j - 2); push('build', r.j - 2, r.j); } else if (nextFull && len === 2) { push('intro', r.i, r.i + 1); push('build', r.i + 1, r.j); } else push('intro', r.i, r.j);
      return;
    }
    if (!nextFull) { push('outro', r.i, r.j); return; }
    if (len >= 3) { push('breakdown', r.i, r.j - 2); push('build', r.j - 2, r.j); } else push('build', r.i, r.j);
  });
  if (out[0].type !== 'intro') { out.unshift({ t: 0, type: 'intro', energy: 0.3, i: 0, j: 0 }); if (out[1].type.startsWith('drop') && out[1].j - out[1].i > 4) { const d = out[1]; out.splice(1, 0, { t: d.t, type: 'build', energy: d.energy * 0.7 }); d.t = ph[d.i + 2].t; } }
  if (out[out.length - 1].type !== 'outro') { const d = out[out.length - 1]; if (d.j - d.i > 4) out.push({ t: ph[d.j - 2].t, type: 'outro', energy: d.energy * 0.6 }); }
  if (!out.some(s => s.type === 'drop2')) return fallback();
  out[0].t = 0;
  return out.map(s => ({ t: +s.t.toFixed(3), type: s.type, energy: s.energy }));
}

// a fixed-structure beat map for a given tempo (procedural music, unknown files): bars per section
export const TEMPLATE_BARS = [['intro', 16, 0.3], ['build', 16, 0.6], ['drop', 32, 0.9], ['breakdown', 16, 0.3], ['build', 16, 0.65], ['drop2', 32, 1], ['outro', 16, 0.4]];
export function templateMap(bpm, opts = {}) {
  const bar = 240 / bpm; let t = opts.offset || 0;
  const sections = [];
  for (const [type, bars, energy] of opts.bars || TEMPLATE_BARS) { sections.push({ t: +t.toFixed(4), type, energy, bars }); t += bars * bar; }
  const length = t + bar * 2;
  const tempos = [{ t: 0, bpm, offset: opts.offset || 0 }];
  const events = [];
  for (let i = 0; i < sections.length; i++) { const s = sections[i]; if (s.type === 'build') { const end = sections[i + 1].t; events.push({ t: end - bar * 4, kind: 'riser' }, { t: end - bar * 2, kind: 'snare_roll' }); } if (s.type.startsWith('drop')) events.push({ t: s.t, kind: 'kick_return' }); }
  return { bpm, offset: opts.offset || 0, tempos, length: +length.toFixed(3), sections, events, template: true };
}
// fill in beats/bars arrays for a map (from its tempos)
export function finishMap(map) {
  if (!map.tempos) map.tempos = [{ t: 0, bpm: map.bpm, offset: map.offset || 0 }];
  map.beats = map.beatTimes && map.beatTimes.length ? map.beatTimes.slice() : beatsFromTempos(map.tempos, map.length);
  if (!map.bars || !map.bars.length) { const db = map.downbeat || 0; map.bars = map.beats.filter((_, i) => i % 4 === (db % 4)); }
  map.sections.sort((a, b) => a.t - b.t);
  normalizeSections(map);
  return map;
}
// Gameplay needs a playable shape even when the analysis finds little structure (one endless drop, an "outro" at a third
// of the song): the outro starts no earlier than the last ~14% / 40 s, and any section far longer than a phrase is cut
// into build → drop → breakdown cycles on bar lines (a long Drop 2 keeps its place as the last part of the span).
const NEXT_SEC = { intro: 'build', build: 'drop', drop: 'breakdown', drop2: 'breakdown', breakdown: 'build' };
const PIECE_BARS = { intro: 16, build: 8, drop: 16, drop2: 16, breakdown: 8 };
const MAX_BARS = { intro: 24, build: 16, drop: 32, drop2: 40, breakdown: 16 };
export function normalizeSections(map) {
  const bars = map.bars, L = map.length;
  if (map.template || !bars || bars.length < 24 || !map.sections.length) return map;
  const bl = (bars[bars.length - 1] - bars[0]) / (bars.length - 1);
  const snap = t => { let best = bars[0]; for (const b of bars) if (Math.abs(b - t) < Math.abs(best - t)) best = b; return best; };
  let secs = map.sections.map(x => ({ ...x }));
  const minOutro = snap(Math.max(L * 0.86, L - 40));
  const oi = secs.findIndex(x => x.type === 'outro');
  if (oi >= 0 && secs[oi].t < minOutro - bl) { const o = secs[oi]; secs = secs.filter(x => x !== o && !(x.t > o.t && x.t < minOutro)); secs.push({ ...o, t: minOutro }); }
  secs.sort((a, b) => a.t - b.t);
  const out = [];
  for (let i = 0; i < secs.length; i++) {
    const sc = secs[i], a = sc.t, b = secs[i + 1]?.t ?? L;
    if (sc.type === 'outro' || !MAX_BARS[sc.type] || (b - a) / bl <= MAX_BARS[sc.type]) { out.push(sc); continue; }
    const last2 = sc.type === 'drop2';
    const stop = last2 ? b - 24 * bl : b;
    let t = a, ty = last2 ? (!out.length || out[out.length - 1].type === 'intro' ? 'build' : 'drop') : sc.type;
    while (t < stop - 6 * bl) { out.push({ ...sc, t, type: ty, split: true }); t = snap(t + PIECE_BARS[ty] * bl); ty = NEXT_SEC[ty]; }
    if (last2) out.push({ ...sc, t: out.length && out[out.length - 1].t >= t ? snap(t + 8 * bl) : t, type: 'drop2' });
  }
  const merged = [];
  for (const x of out) { const p = merged[merged.length - 1]; if (p && (x.t <= p.t + 0.01 || x.type === p.type)) continue; merged.push(x); }
  map.sections = merged;
  return map;
}

// median distance (s) from each grid beat to the nearest onset peak within ±60 ms (missing peaks count as 60 ms)
function gridResidual(on, fps, beats) {
  const d = [];
  for (let k = 8; k < beats.length - 8; k += 2) {
    const t = beats[k]; let bi = -1, bv = 0;
    for (let i = Math.max(1, Math.floor((t - 0.06) * fps)); i < Math.min(on.length - 1, Math.ceil((t + 0.06) * fps)); i++) if (on[i] > bv && on[i] >= on[i - 1] && on[i] >= on[i + 1]) { bv = on[i]; bi = i; }
    d.push(bi < 0 || bv < 0.12 ? 0.06 : Math.abs(bi / fps - t));
  }
  d.sort((a, b) => a - b); return d.length ? d[Math.floor(d.length / 2)] : 0;
}
// dynamic-programming beat tracker (Ellis 2007): best path of onsets spaced about one period apart
export function dpBeats(on, fps, period) {
  const P = period * fps, n = on.length, alpha = 120;
  const score = new Float32Array(n), back = new Int32Array(n).fill(-1);
  const lo = Math.round(P * 0.7), hi = Math.round(P * 1.35);
  for (let t = 0; t < n; t++) {
    let best = 0, bi = -1;
    for (let tau = t - hi; tau <= t - lo; tau++) {
      if (tau < 0) continue;
      const pen = Math.log((t - tau) / P); const v = score[tau] - alpha * pen * pen;
      if (v > best || bi < 0) { best = v; bi = tau; }
    }
    score[t] = on[t] + Math.max(0, best); back[t] = best > 0 ? bi : -1;
  }
  let t = n - 1, m = -Infinity;
  for (let i = n - 1; i > n - 1 - hi && i >= 0; i--) if (score[i] > m) { m = score[i]; t = i; }
  const out = [];
  while (t >= 0) { out.push(t / fps); t = back[t]; }
  return out.reverse();
}
