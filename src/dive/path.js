// The dive path (bible §10.1): a smooth curve sampled every metre, its frame (forward, right, up), and the music-locked
// distance table S(t): forward speed = base x (BPM / 140) x section energy, so the whole path is exactly as long as the
// track and the camera's distance is a pure function of song time.
import { norm, cross, clamp, lerp, smooth } from '../core/math.js';
import { rng } from '../core/rng.js';

export const BASE_SPEED = 62; // m/s at 140 BPM
const SECTION_SPEED = { intro: 0.92, build: 1.0, drop: 1.32, breakdown: 0.78, drop2: 1.38, outro: 0.9 };

// speed multiplier at song time t from the beat map's sections (smoothed; builds ramp up; breach jump on the drop)
export function speedAt(map, t) {
  const secs = map.sections;
  let i = 0; while (i < secs.length - 1 && secs[i + 1].t <= t) i++;
  const s = secs[i], next = secs[i + 1];
  const end = next ? next.t : map.length;
  const k = clamp((t - s.t) / Math.max(1, end - s.t), 0, 1);
  let m = SECTION_SPEED[s.type] || 1;
  if (s.type === 'build') m = lerp(1.0, 1.24, k * k);
  if (s.type === 'outro') m = lerp(0.95, 0.7, k);
  // ease from the previous section over 1.5 s (except into drops: the breach is a jump)
  if (i > 0 && s.type !== 'drop' && s.type !== 'drop2') {
    const prev = secs[i - 1]; const pm = prev.type === 'build' ? 1.24 : (SECTION_SPEED[prev.type] || 1);
    const e = clamp((t - s.t) / 1.5, 0, 1); m = lerp(pm, m, smooth(e));
  }
  return m * (0.9 + 0.2 * (s.energy ?? 0.6));
}
export function buildDistance(map, rate = 1) {
  const dt = 0.05, n = Math.ceil(map.length / dt) + 2;
  const S = new Float32Array(n); let s = 0;
  const bpmScale = (map.bpm || 140) / 140;
  for (let i = 0; i < n; i++) { S[i] = s; s += BASE_SPEED * bpmScale * speedAt(map, i * dt) * rate * dt / rate; }
  return { S, dt, length: s, at(t) { const f = clamp(t / dt, 0, n - 1.001); const i = Math.floor(f); return lerp(S[i], S[i + 1], f - i); },
    speed(t) { const f = clamp(t / dt, 0, n - 2); const i = Math.floor(f); return (S[i + 1] - S[i]) / dt; } };
}

// style: { yawAmp, yawFreq, pitchAmp, pitchFreq, alt: [min, max], straight: 0..1 (grid turns), seed }
export class Path {
  constructor(length, style) {
    const n = Math.ceil(length) + 600; // a little beyond the end for the exit
    this.n = n;
    this.P = new Float32Array(n * 3); this.F = new Float32Array(n * 3); this.R = new Float32Array(n * 3); this.U = new Float32Array(n * 3);
    this.bank = new Float32Array(n);
    const R = rng(style.seed || 1);
    const ph = [R() * 100, R() * 100, R() * 100, R() * 100, R() * 100];
    let x = 0, y = (style.alt[0] + style.alt[1]) / 2, z = 0, yaw = 0, pitch = 0;
    let prevYaw = 0;
    const targetAltAt = style.altAt || (() => null);
    for (let i = 0; i < n; i++) {
      const s = i;
      // heading from layered sines (smooth, layer-specific), optional quantised "street" turns
      let yr = style.yawAmp * (Math.sin(s * style.yawFreq + ph[0]) * 0.6 + Math.sin(s * style.yawFreq * 2.3 + ph[1]) * 0.3 + Math.sin(s * style.yawFreq * 0.37 + ph[4]) * 0.4);
      if (style.straight) { const q = Math.round(yr / style.straight) * style.straight; yr = lerp(yr, q, 0.85); }
      yaw += yr * 0.004;
      let pr = style.pitchAmp * Math.sin(s * style.pitchFreq + ph[2]) + style.pitchAmp * 0.4 * Math.sin(s * style.pitchFreq * 2.7 + ph[3]);
      // altitude bounds / targets steer the pitch
      const ta = targetAltAt(s);
      const [amin, amax] = style.alt;
      let want = pr;
      if (ta !== null && ta !== undefined) want = clamp((ta - y) * 0.02, -0.5, 0.5);
      else { if (y < amin) want = Math.max(want, (amin - y) * 0.03); if (y > amax) want = Math.min(want, (amax - y) * 0.03); }
      pitch = lerp(pitch, clamp(want, -0.6, 0.6), ta !== null && ta !== undefined ? 0.03 : 0.02);
      const cp = Math.cos(pitch);
      const f = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
      this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
      this.F.set(f, i * 3);
      const r = norm(cross(f, [0, 1, 0]));
      const u = cross(r, f);
      this.R.set(r, i * 3); this.U.set(u, i * 3);
      this.bank[i] = clamp((yaw - prevYaw) * 60, -0.6, 0.6);
      prevYaw = yaw;
      x += f[0]; y += f[1]; z += f[2];
    }
    // smooth the bank
    for (let k = 0; k < 3; k++) for (let i = 1; i < n - 1; i++) this.bank[i] = (this.bank[i - 1] + this.bank[i] * 2 + this.bank[i + 1]) / 4;
  }
  idx(s) { const f = clamp(s, 0, this.n - 1.001); const i = Math.floor(f); return [i, f - i]; }
  _get(arr, s) { const [i, k] = this.idx(s); const a = i * 3, b = a + 3; return [lerp(arr[a], arr[b], k), lerp(arr[a + 1], arr[b + 1], k), lerp(arr[a + 2], arr[b + 2], k)]; }
  pos(s) { return this._get(this.P, s); }
  fwd(s) { return norm(this._get(this.F, s)); }
  right(s) { return norm(this._get(this.R, s)); }
  up(s) { return norm(this._get(this.U, s)); }
  bankAt(s) { const [i, k] = this.idx(s); return lerp(this.bank[i], this.bank[i + 1], k); }
  // path space (s, x, y) -> world
  world(s, x, y, out) {
    const [i, k] = this.idx(s); const a = i * 3, b = a + 3, P = this.P, R = this.R, U = this.U;
    const px = lerp(P[a], P[b], k), py = lerp(P[a + 1], P[b + 1], k), pz = lerp(P[a + 2], P[b + 2], k);
    const rx = lerp(R[a], R[b], k), ry = lerp(R[a + 1], R[b + 1], k), rz = lerp(R[a + 2], R[b + 2], k);
    const ux = lerp(U[a], U[b], k), uy = lerp(U[a + 1], U[b + 1], k), uz = lerp(U[a + 2], U[b + 2], k);
    out = out || [0, 0, 0];
    out[0] = px + rx * x + ux * y; out[1] = py + ry * x + uy * y; out[2] = pz + rz * x + uz * y;
    return out;
  }
  frame(s) { return { o: this.pos(s), f: this.fwd(s), r: this.right(s), u: this.up(s) }; }
}

// path styles per layer (bible §16.2 looks): how the route moves
export const PATH_STYLES = {
  calibration: { yawAmp: 0.6, yawFreq: 0.004, pitchAmp: 0.05, pitchFreq: 0.004, alt: [10, 22] },
  grid_city: { yawAmp: 1.4, yawFreq: 0.003, pitchAmp: 0.12, pitchFreq: 0.003, alt: [30, 90], straight: 0.7 },
  chrome_sea: { yawAmp: 1.0, yawFreq: 0.0025, pitchAmp: 0.02, pitchFreq: 0.003, alt: [7, 14] },
  firewall: { yawAmp: 2.4, yawFreq: 0.006, pitchAmp: 0.08, pitchFreq: 0.005, alt: [12, 30] },
  archive: { yawAmp: 1.2, yawFreq: 0.003, pitchAmp: 0.25, pitchFreq: 0.002, alt: [-80, 80] },
  fractal: { yawAmp: 2.0, yawFreq: 0.004, pitchAmp: 0.35, pitchFreq: 0.004, alt: [-200, 200] },
  garden: { yawAmp: 1.6, yawFreq: 0.0035, pitchAmp: 0.15, pitchFreq: 0.004, alt: [14, 40] },
  black_ice: { yawAmp: 2.0, yawFreq: 0.005, pitchAmp: 0.1, pitchFreq: 0.006, alt: [12, 40], straight: 0.5 },
  core: { yawAmp: 0.9, yawFreq: 0.003, pitchAmp: 0.2, pitchFreq: 0.003, alt: [-300, 300] },
};
