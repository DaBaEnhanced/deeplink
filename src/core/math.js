// Small vector / matrix helpers. Matrices are Float32Array(16), column-major (WGSL mat4x4f layout).
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const fract = x => x - Math.floor(x);
export const TAU = Math.PI * 2;

export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

export function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = far * nf; m[11] = -1; m[14] = far * near * nf;
  return m;
}
export function lookAt(eye, at, up) {
  const z = norm(sub(eye, at)), x = norm(cross(up, z)), y = cross(z, x);
  const m = new Float32Array(16);
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[12] = -dot(x, eye);
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[13] = -dot(y, eye);
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2]; m[14] = -dot(z, eye);
  m[15] = 1;
  return m;
}
export function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
// model matrix from a basis (right, up, forward=-z in local? we use local +z = forward), position and scale
// columns: X axis = r*sx, Y axis = u*sy, Z axis = f*sz
export function basisMat(out, o, r, u, f, sx = 1, sy = sx, sz = sx) {
  out[0] = r[0] * sx; out[1] = r[1] * sx; out[2] = r[2] * sx; out[3] = 0;
  out[4] = u[0] * sy; out[5] = u[1] * sy; out[6] = u[2] * sy; out[7] = 0;
  out[8] = f[0] * sz; out[9] = f[1] * sz; out[10] = f[2] * sz; out[11] = 0;
  out[12] = o[0]; out[13] = o[1]; out[14] = o[2]; out[15] = 1;
  return out;
}
// rotate a basis around its forward axis (roll) and around up (yaw), around right (pitch)
export function rotBasis(r, u, f, roll = 0, yaw = 0, pitch = 0) {
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const nr = add(scale(r, c), scale(u, s)), nu = add(scale(u, c), scale(r, -s)); r = nr; u = nu; }
  if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); const nr = add(scale(r, c), scale(f, -s)), nf = add(scale(f, c), scale(r, s)); r = nr; f = nf; }
  if (pitch) { const c = Math.cos(pitch), s = Math.sin(pitch); const nu = add(scale(u, c), scale(f, s)), nf = add(scale(f, c), scale(u, -s)); u = nu; f = nf; }
  return [r, u, f];
}
// project a world point with a view-projection matrix -> [x, y] in 0..1 (y down), depth w; null when behind
export function project(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
  const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
  const w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0.05) return null;
  return [(x / w) * 0.5 + 0.5, 0.5 - (y / w) * 0.5, w];
}
export function hex(c) {
  const n = parseInt(c.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
