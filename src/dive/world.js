// A dive's world: the path, the music-locked distance table, static props placed along the path (drawn in a window
// around the camera), and the layer kit's dynamic draw. Props are instanced draws with precomputed matrices.
import { basisMat, rotBasis, add, scale } from '../core/math.js';
import { PASS } from '../render/renderer.js';

export class World {
  constructor(path, kit, lib) { this.path = path; this.kit = kit; this.lib = lib; this.props = []; this.sorted = false; }
  // place a prop in path space: (s, x, y) with local rotation (roll around forward, yaw, pitch) and scale
  prop(s, x, y, mesh, o = {}) {
    const p = this.path, o0 = p.world(s, x, y);
    let r = p.right(s), u = p.up(s), f = p.fwd(s);
    if (o.flat) { r = norm2([r[0], 0, r[2]]); u = [0, 1, 0]; f = norm2([f[0], 0, f[2]]); }
    if (o.roll || o.yaw || o.pitch) [r, u, f] = rotBasis(r, u, f, o.roll || 0, o.yaw || 0, o.pitch || 0);
    const pos = o.ground !== undefined ? [o0[0], o.ground, o0[2]] : o0;
    const sc = o.scale ? (o.scale.length === 1 ? [o.scale[0], o.scale[0], o.scale[0]] : o.scale) : [1, 1, 1];
    const m = basisMat(new Float32Array(16), add(pos, o.offset || [0, 0, 0]), r, u, f, sc[0], sc[1], sc[2]);
    const pr = { s, mesh, m, color: o.color || [1, 1, 1, 1], p: o.p || [0, 0, 0, 0], pass: o.pass, anim: o.anim || null, t0: o.t0 || 0, data: o.data || null, pos, far: o.far || 0, frame: !!o.frame };
    this.props.push(pr); this.sorted = false;
    return pr;
  }
  sort() { this.props.sort((a, b) => a.s - b.s); this.sorted = true; }
  // Remove set dressing that ends up inside the flight corridor (a tower on the inside of a bend, a sky-bridge where the
  // path climbs, a long lintel on a curve). The corridor is the player's box (bounds + margin) swept along the path;
  // props placed as deliberate frames around it (rings, arches, gates, canyon walls) are flagged `frame` and kept.
  clearCorridor(bounds, margin = 2.5) {
    // every path sample is tested, not only the ones near the prop's own s: a curving or climbing path can come back
    // past a tower that was placed well beside it a few hundred metres earlier (the towers "in the middle of the road")
    const P = this.path, W = bounds.w + margin, Hh = bounds.h + margin, R = Math.max(W, Hh), STEP = 2.5, C = 48;
    const smp = [], grid = new Map(), key = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
    for (let s = 0; s <= P.n - 1; s += STEP) {
      const c = P.pos(s), q = { c, r: P.right(s), u: P.up(s), f: P.fwd(s) }; smp.push(q);
      const kk = key(Math.floor(c[0] / C), Math.floor(c[1] / C), Math.floor(c[2] / C));
      let a = grid.get(kk); if (!a) grid.set(kk, (a = [])); a.push(q);
    }
    const keep = []; let removed = 0;
    const lo = [0, 0, 0], hi = [0, 0, 0];
    for (const pr of this.props) {
      const mb = pr.mesh && pr.mesh.bmin;
      if (pr.frame || !mb) { keep.push(pr); continue; }
      const m = pr.m, b0 = pr.mesh.bmin, b1 = pr.mesh.bmax;
      lo[0] = lo[1] = lo[2] = Infinity; hi[0] = hi[1] = hi[2] = -Infinity;
      for (let c = 0; c < 8; c++) {
        const x = c & 1 ? b1[0] : b0[0], y = c & 2 ? b1[1] : b0[1], z = c & 4 ? b1[2] : b0[2];
        for (let k = 0; k < 3; k++) { const v = m[k] * x + m[4 + k] * y + m[8 + k] * z + m[12 + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
      }
      let hit = false;
      const i0 = Math.floor((lo[0] - R) / C), i1 = Math.floor((hi[0] + R) / C), j0 = Math.floor((lo[1] - R) / C), j1 = Math.floor((hi[1] + R) / C), k0 = Math.floor((lo[2] - R) / C), k1 = Math.floor((hi[2] + R) / C);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 4000) { keep.push(pr); continue; }   // the far backdrop giants
      for (let i = i0; i <= i1 && !hit; i++) for (let j = j0; j <= j1 && !hit; j++) for (let k = k0; k <= k1 && !hit; k++) {
        const a = grid.get(key(i, j, k)); if (!a) continue;
        for (const q of a) {
          const c = q.c;
          const qx = Math.max(lo[0], Math.min(hi[0], c[0])) - c[0], qy = Math.max(lo[1], Math.min(hi[1], c[1])) - c[1], qz = Math.max(lo[2], Math.min(hi[2], c[2])) - c[2];
          if (qx * qx + qy * qy + qz * qz > R * R) continue;
          const dr = qx * q.r[0] + qy * q.r[1] + qz * q.r[2], du = qx * q.u[0] + qy * q.u[1] + qz * q.u[2], df = qx * q.f[0] + qy * q.f[1] + qz * q.f[2];
          if (Math.abs(df) < STEP * 0.75 && (dr / W) ** 2 + (du / Hh) ** 2 < 1) { hit = true; break; }
        }
      }
      if (hit) removed++; else keep.push(pr);
    }
    this.props = keep; this.sorted = false;
    return removed;
  }
  // first prop index with s >= v
  lower(v) { let lo = 0, hi = this.props.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.props[m].s < v) lo = m + 1; else hi = m; } return lo; }
  // props are kept in path order (s); the window reaches further ahead and a prop is also drawn when it is physically
  // close to the camera, so a curving path never reveals a building that was "far along the path" but right in front
  drawProps(r, s0, s1, st, filt) {
    if (!this.sorted) this.sort();
    const p4 = [0, 0, 0, 0], c4 = [0, 0, 0, 0], FADE = 240, DRAW = s1 - s0 - 40, ext = s1 + 1400, cam = st && st.cam;
    for (let i = this.lower(s0); i < this.props.length && this.props[i].s <= ext; i++) {
      const pr = this.props[i];
      let fade = (s1 - pr.s) / FADE;
      if (cam && fade < 1) { const m = pr.m, dx = m[12] - cam[0], dy = m[13] - cam[1], dz = m[14] - cam[2]; fade = Math.max(fade, (DRAW - Math.sqrt(dx * dx + dy * dy + dz * dz)) / FADE); }
      if (fade <= 0) continue;
      if (pr.far && pr.s > s0 + 40 + pr.far) continue;
      if (filt && !filt(pr)) continue;
      let p = pr.p;
      if (pr.anim) { p4[0] = p[0]; p4[1] = p[1]; p4[2] = p[2]; p4[3] = p[3]; if (pr.anim(pr, p4, st) === false) continue; p = p4; }
      // the last stretch before the draw distance fades into the fog, so nothing pops in (opaque: negative alpha = visibility)
      if (fade < 1) {
        const c = pr.color; c4[0] = c[0]; c4[1] = c[1]; c4[2] = c[2];
        const add = pr.pass === PASS.ADD || pr.pass === PASS.ADDLINE;
        c4[3] = add ? (c[3] ?? 1) * fade : -Math.max(0.001, fade);
        r.draw(pr.mesh, pr.m, c4, p, pr.pass);
      } else r.draw(pr.mesh, pr.m, pr.color, p, pr.pass);
    }
  }
}
function norm2(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
export { PASS, scale };
