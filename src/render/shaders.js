// WGSL shaders: the early-90s CGI look (bible §16): flat / Gouraud lighting, chrome env maps, checkerboards, glyph walls,
// fog, morphing and shattering meshes, billboards, a ray-marched fractal pass, bloom, ordered dither to 15-bit, CRT.
export const COMMON = /* wgsl */`
struct Frame {
  viewProj: mat4x4f, view: mat4x4f,
  camPos: vec4f,      // w = time
  camRight: vec4f,    // w = beat phase
  camUp: vec4f,       // w = kick pulse
  fogColor: vec4f,    // w = fog density
  skyTop: vec4f,      // w = layer id
  skyHorizon: vec4f,  // w = horizon glow
  skyBottom: vec4f,   // w = sky mode
  palA: vec4f, palB: vec4f, palC: vec4f,
  lightDir: vec4f,    // w = ambient
  params: vec4f,      // x,y = internal res, z = wobble, w = fractal amount
  params2: vec4f,     // x = sun size, y = sky grid, z = global glow (emissive multiplier), w = underwater
  camFwd: vec4f,      // w = tan(fov/2)
  params3: vec4f,     // x = aspect, y = fractal unfold, z = drift, w = collapse (core)
};
struct Inst { m: mat4x4f, color: vec4f, p: vec4f };
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var<storage, read> insts: array<Inst>;
fn hash11(x: f32) -> f32 { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
fn hash21(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
`;

export const SCENE = COMMON + /* wgsl */`
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) col: vec3f };
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) col: vec4f, @location(3) @interpolate(flat) p: vec4f,
  @location(4) lp: vec3f,
};
fn seaH(x: f32, z: f32, t: f32) -> f32 {
  return sin(x * 0.045 + t * 1.1) * 1.6 + sin(z * 0.06 - t * 1.4) * 1.2 + sin((x + z) * 0.11 + t * 2.1) * 0.5;
}
@vertex fn vs(v: VIn, @builtin(instance_index) ii: u32, @builtin(vertex_index) vi: u32) -> VOut {
  let I = insts[ii];
  let t = F.camPos.w;
  var lp = v.pos;
  var n = v.nrm;
  let kind = I.p.w;
  let amt = I.p.z;
  if (kind > 0.5 && kind < 1.5) { // morph: organic wobble
    let w = sin(lp.x * 2.3 + t * 2.0) * sin(lp.y * 1.9 + t * 1.6) * sin(lp.z * 2.1 + t * 1.3 + F.camUp.w);
    lp = lp + n * amt * w;
  } else if (kind > 1.5 && kind < 2.5) { // shatter: each triangle flies along its normal and drifts
    let tri = f32(vi / 3u) + f32(ii) * 17.0;
    let h1 = hash11(tri); let h2 = hash11(tri + 3.1); let h3 = hash11(tri + 7.7);
    lp = lp + n * amt * (1.0 + h1 * 5.0) + (vec3f(h2, h3, h1) - 0.5) * amt * 6.0;
  } else if (kind > 3.5 && kind < 4.5) { // rise: scale y from 0..1 (towers growing out of the grid)
    lp.y = lp.y * amt;
  }
  var wp = (I.m * vec4f(lp, 1.0)).xyz;
  var wn = normalize((I.m * vec4f(n, 0.0)).xyz);
  if (kind > 2.5 && kind < 3.5) { // chrome sea: waves in world space
    let e = 0.5;
    let h = seaH(wp.x, wp.z, t) * amt;
    let hx = seaH(wp.x + e, wp.z, t) * amt; let hz = seaH(wp.x, wp.z + e, t) * amt;
    wp.y = wp.y + h;
    wn = normalize(vec3f(-(hx - h) / e, 1.0, -(hz - h) / e));
  }
  if (kind > 8.5) { // camera-facing billboard (local x,y in the camera plane)
    let c = (I.m * vec4f(0.0, 0.0, 0.0, 1.0)).xyz;
    let sx = length(I.m[0].xyz); let sy = length(I.m[1].xyz);
    wp = c + F.camRight.xyz * v.pos.x * sx + F.camUp.xyz * v.pos.y * sy;
    wn = -F.camFwd.xyz;
  }
  var o: VOut;
  var cp = F.viewProj * vec4f(wp, 1.0);
  if (F.params.z > 0.5) { // PS1-style vertex snapping
    let g = F.params.xy * 0.5;
    cp = vec4f(round(cp.xy / cp.w * g) / g * cp.w, cp.zw);
  }
  o.pos = cp; o.wp = wp; o.n = wn; o.col = vec4f(v.col * I.color.rgb, I.color.a); o.p = I.p; o.lp = lp;
  return o;
}
fn env(r: vec3f) -> vec3f {
  // procedural environment for chrome: sky gradient above, checker floor below, horizon glow
  let y = r.y;
  var c = mix(F.skyHorizon.rgb, F.skyTop.rgb, clamp(y * 1.6, 0.0, 1.0));
  if (y < 0.0) {
    let d = -1.0 / min(y, -0.02);
    let uv = r.xz * d * 0.35;
    let ch = (i32(floor(uv.x)) + i32(floor(uv.y))) & 1;
    let fc = select(F.palA.rgb, F.palB.rgb, ch == 1);
    c = mix(fc, F.skyHorizon.rgb, clamp(1.0 + y * 6.0, 0.0, 1.0) * 0.8);
  }
  c = c + F.skyHorizon.rgb * exp(-abs(y) * 14.0) * F.skyHorizon.w;
  return c;
}
fn glyph(uv0: vec2f) -> f32 {
  // falling columns of code: only some columns are active, each scrolls down at its own speed and fades with a tail
  let col = floor(uv0.x);
  let hc = hash21(vec2f(col, 7.3));
  if (hc < 0.72) { return 0.0; }
  let speed = 2.0 + hc * 6.0;
  let uv = vec2f(uv0.x, uv0.y + F.camPos.w * speed);
  let cell = floor(uv);
  let f = fract(uv);
  let gx = floor(f.x * 4.0); let gy = floor(f.y * 6.0);
  if (gx > 2.5 || gy > 4.5) { return 0.0; }
  let h = hash21(cell + vec2f(floor(F.camPos.w * 8.0) * step(0.85, hash21(cell * 1.3)), 0.0));
  let bit = u32(gx + gy * 3.0);
  let on = f32((u32(h * 32767.0) >> bit) & 1u);
  let tail = fract(cell.y * 0.071 + hc * 13.0);
  return on * smoothstep(0.35, 1.0, tail);
}
fn shade(i: VOut, front: bool) -> vec3f {
  let mode = i.p.x;
  let emis = i.p.y * F.params2.z;
  var n = normalize(i.n);
  if (!front) { n = -n; }
  let vdir = normalize(i.wp - F.camPos.xyz);
  let L = normalize(F.lightDir.xyz);
  let lam = max(dot(n, L), 0.0);
  let amb = F.lightDir.w;
  var c = i.col.rgb;
  let kick = F.camUp.w;
  if (mode < 0.5) {            // flat / Gouraud lit
    c = c * (amb + lam * (1.0 - amb)) + i.col.rgb * emis * (1.0 + kick * 0.5);
  } else if (mode < 1.5) {     // emissive
    c = c * (1.0 + emis * (1.0 + kick * 0.6));
  } else if (mode < 2.5) {     // chrome
    let r = reflect(vdir, n);
    let e = env(r);
    let fr = 0.35 + 0.65 * pow(1.0 - max(dot(-vdir, n), 0.0), 3.0);
    c = mix(c * 0.15, e * (0.6 + 0.4 * c), fr) + vec3f(1.0) * pow(max(dot(r, L), 0.0), 40.0) * 1.5 + i.col.rgb * emis;
  } else if (mode < 3.5) {     // world checker floor with glowing grid lines
    let s = max(i.p.z, 0.001);
    let uv = i.wp.xz / s;
    let ch = (i32(floor(uv.x)) + i32(floor(uv.y))) & 1;
    var b = select(F.palA.rgb, F.palB.rgb, ch == 1) * (amb + lam * (1.0 - amb));
    let g = fract(uv); let gl = min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y));
    let line = 1.0 - smoothstep(0.0, 0.04, gl);
    c = b + F.palC.rgb * line * (emis + kick * 0.8);
  } else if (mode < 4.5) {     // glass (additive): fresnel rim
    let fr = pow(1.0 - abs(dot(-vdir, n)), 2.0);
    c = c * (0.15 + fr * 1.4) * (1.0 + emis);
  } else if (mode < 5.5) {     // glyph wall: lit rock with scrolling code glyphs
    let uv = vec2f(i.wp.x * 0.7 + i.wp.z * 0.7, i.wp.y * 0.5);
    let gy = glyph(uv);
    let strata = 0.85 + 0.15 * sin(i.wp.y * 0.9 + sin(i.wp.x * 0.05) * 3.0);
    c = c * (amb + lam * (1.0 - amb)) * strata + F.palC.rgb * gy * (0.8 + emis + kick * 0.6);
  } else if (mode < 6.5) {     // chrome sea: reflection with a checker below the surface
    let r = reflect(vdir, n);
    var e = env(vec3f(r.x, abs(r.y), r.z));
    let uv = i.wp.xz / 12.0;
    let ch = f32((i32(floor(uv.x)) + i32(floor(uv.y))) & 1);
    let fr = 0.25 + 0.75 * pow(1.0 - max(dot(-vdir, n), 0.0), 2.0);
    c = mix(mix(F.palA.rgb, F.palB.rgb, ch), e, fr) + vec3f(1.0) * pow(max(dot(r, L), 0.0), 60.0) * 2.0;
  } else if (mode < 7.5) {     // tower: dark body with a lit window grid (world-space windows, 3 m cells)
    let side = abs(n.x) > abs(n.z);
    let uv = vec2f(select(i.wp.x, i.wp.z, side) / 3.0, i.wp.y / 3.6);
    let cell = floor(uv);
    let on = step(0.62, hash21(cell + floor(F.camPos.w * 0.3 + hash21(cell) * 4.0)));
    let f = fract(uv);
    let win = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.7) * on;
    c = c * (amb + lam * (1.0 - amb)) * 0.35 + F.palC.rgb * win * (emis * 0.8 + kick * 0.3);
  } else if (mode < 8.5) {     // 8: scanline (Black ICE): black body with moving white scan bands
    let band = smoothstep(0.92, 1.0, fract(i.wp.y * 0.08 - F.camPos.w * 0.7));
    c = c * (amb + lam * (1.0 - amb)) * 0.4 + F.palC.rgb * band * emis + i.col.rgb * emis * 0.2;
  } else {                     // 9: TV screen. p.z 0: snow (local), 1: colour bars, 2: snow in world space (floors)
    let t = F.camPos.w;
    var uv = i.lp.xy;
    var tv = vec3f(0.0);
    if (i.p.z > 1.5) { uv = i.wp.xz * 0.35; }
    if (i.p.z > 0.5 && i.p.z < 1.5) {
      let k = floor(clamp(uv.x * 0.5 + 0.5, 0.0, 0.999) * 7.0);
      let r = select(0.0, 1.0, k < 1.5 || (k > 3.5 && k < 5.5));
      let g = select(0.0, 1.0, k < 3.5);
      let b = select(0.0, 1.0, k == 0.0 || k == 2.0 || k == 4.0 || k == 6.0);
      tv = vec3f(r, g, b) * 0.85;
      if (uv.y < -0.45) { tv = vec3f(step(0.5, fract(uv.x * 2.0 + 0.25))) * 0.7; }
    } else {
      let sn = hash21(floor(uv * 40.0) + vec2f(floor(t * 24.0) * 17.0, floor(t * 24.0) * 3.0));
      tv = vec3f(sn * sn);
    }
    let roll = smoothstep(0.88, 1.0, fract(uv.y * 0.4 - t * 0.35));
    c = tv * i.col.rgb * (0.5 + emis * (1.0 + kick * 0.6)) + vec3f(roll * 0.18);
  }
  return c;
}
fn fogf(wp: vec3f) -> f32 {
  let d = length(wp - F.camPos.xyz);
  return 1.0 - exp(-d * F.fogColor.w);
}
@fragment fn fsOpaque(i: VOut, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  var c = shade(i, front);
  var f = fogf(i.wp);
  if (i.col.a < 0.0) { f = 1.0 - (1.0 - f) * (-i.col.a); } // fading in at the draw distance
  c = mix(c, F.fogColor.rgb, f);
  return vec4f(c, 1.0);
}
@fragment fn fsAdd(i: VOut, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  var c = shade(i, front);
  if (i.p.w > 8.5) { // billboard glow: soft round falloff from the quad's local coordinates
    let r = length(i.lp.xy);
    c = c * pow(clamp(1.0 - r, 0.0, 1.0), 1.6) * (1.0 + i.p.y * F.params2.z);
  }
  c = c * i.col.a * (1.0 - fogf(i.wp));
  return vec4f(c, 1.0);
}
`;

export const SKY = COMMON + /* wgsl */`
@group(1) @binding(0) var fracTex: texture_2d<f32>;
@group(1) @binding(1) var samp: sampler;
struct SOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> SOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: SOut; o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}
@fragment fn fs(i: SOut) -> @location(0) vec4f {
  let x = i.uv.x * 2.0 - 1.0; let y = 1.0 - i.uv.y * 2.0;
  let tf = F.camFwd.w;
  let d = normalize(F.camFwd.xyz + F.camRight.xyz * x * tf * F.params3.x + F.camUp.xyz * y * tf);
  let mode = F.skyBottom.w;
  let t = F.camPos.w;
  var c = mix(F.skyHorizon.rgb, F.skyTop.rgb, clamp(d.y * 1.4, 0.0, 1.0));
  if (d.y < 0.0) { c = mix(F.skyHorizon.rgb, F.skyBottom.rgb, clamp(-d.y * 3.0, 0.0, 1.0)); }
  c = c + F.skyHorizon.rgb * exp(-abs(d.y) * 10.0) * F.skyHorizon.w;
  if (F.params2.y > 0.0) { // grid lines on the sky dome
    let az = atan2(d.x, d.z) * 12.0 / 3.14159; let el = d.y * 14.0;
    let g = min(abs(fract(az) - 0.5), abs(fract(el) - 0.5));
    c = c + F.palC.rgb * (1.0 - smoothstep(0.44, 0.5, 0.5 - g)) * F.params2.y * smoothstep(-0.05, 0.2, d.y) * (1.0 + F.camUp.w);
  }
  if (F.params2.x > 0.0) { // sun
    let sd = normalize(vec3f(F.lightDir.x, max(F.lightDir.y, 0.02), F.lightDir.z));
    let a = max(dot(d, sd), 0.0);
    let s = smoothstep(1.0 - F.params2.x * 0.004, 1.0 - F.params2.x * 0.0036, a);
    var stripes = 1.0;
    if (mode > 2.5 && mode < 3.5) { stripes = step(0.35, fract((d.y - sd.y) * 90.0)) + step(0.0, d.y - sd.y); }
    c = mix(c, vec3f(1.0, 0.95, 0.8) * 1.6, s * clamp(stripes, 0.0, 1.0)) + vec3f(1.0, 0.9, 0.7) * pow(a, 30.0) * 0.6 * F.params2.x;
  }
  if (mode > 5.5 && mode < 6.5) { // dead channel: snow over the whole sky
    let sp = floor(i.uv * vec2f(200.0, 150.0));
    let h = hash21(sp + floor(t * 20.0) * vec2f(7.0, 3.0));
    c = c + vec3f(h * h * 0.22) * (1.0 + F.camUp.w);
  }
  if (mode > 4.5 && mode < 5.5) { // starfield / data dust
    let sp = floor(d * 220.0);
    let h = hash21(sp.xy + sp.z * 3.1);
    c = c + vec3f(step(0.997, h)) * (0.5 + 0.5 * sin(t * 3.0 + h * 50.0));
  }
  if (mode > 3.5 && mode < 4.5) { // the Trench: light falling from far above in shafts, darkness below
    let az = atan2(d.x, d.z);
    let shaft = 0.55 + 0.45 * sin(az * 17.0 + t * 0.25 + sin(az * 5.0 - t * 0.1) * 2.0);
    c = c + F.palC.rgb * pow(max(d.y, 0.0), 2.2) * shaft * 0.35 * (1.0 + F.camUp.w * 0.3);
    c = c * (0.55 + 0.45 * smoothstep(-0.4, 0.1, d.y));
  }
  if (mode > 6.5 && mode < 7.5) { // Cold Storage: aurora curtains over the frozen canyon, a few stars
    let az = atan2(d.x, d.z);
    let h = 0.3 + 0.07 * sin(az * 3.0 + t * 0.12) + 0.03 * sin(az * 11.0 - t * 0.3);
    let band = exp(-pow((d.y - h) * 9.0, 2.0)) + 0.5 * exp(-pow((d.y - h - 0.12) * 14.0, 2.0));
    let curtain = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(az * 55.0 + sin(az * 7.0 + t * 0.4) * 5.0), 3.0);
    c = c + mix(vec3f(0.15, 1.0, 0.55), F.palC.rgb, smoothstep(0.25, 0.5, d.y)) * band * curtain * 0.5 * (1.0 + F.camUp.w * 0.4);
    let sp = floor(d * 260.0); c = c + vec3f(step(0.998, hash21(sp.xy + sp.z * 3.1))) * smoothstep(0.1, 0.4, d.y) * 0.7;
  }
  if (mode > 7.5 && mode < 8.5) { // Event Horizon: stars bent around a black hole straight ahead, its photon ring
    let a = clamp(dot(d, F.camFwd.xyz), -1.0, 1.0);
    let r = acos(a);
    let R = 0.04 + F.params3.w * 0.22;
    let sp = floor(d * 240.0);
    c = c + vec3f(step(0.996, hash21(sp.xy + sp.z * 3.1))) * 0.6 * smoothstep(R, R * 2.5, r);
    c = c + vec3f(1.0, 0.55, 0.22) * exp(-pow((r - R * 1.3) / (R * 0.18 + 0.004), 2.0)) * 1.4 * (1.0 + F.camUp.w * 0.5);
    c = c + vec3f(1.0, 0.35, 0.12) * exp(-r * 6.0) * 0.25;
    c = c * smoothstep(R * 0.95, R * 1.08, r);
  }
  if (F.params.w > 0.0) { // ray-marched fractal layer (rendered at low res)
    let fc = textureSampleLevel(fracTex, samp, i.uv, 0.0).rgb;
    c = mix(c, fc, F.params.w);
  }
  if (F.params3.w > 0.0 && (mode < 7.5 || mode > 8.5)) { // the Core: everything collapsing into a white sun ahead
    let a = max(dot(d, F.camFwd.xyz), 0.0);
    c = mix(c, vec3f(1.6), smoothstep(0.9, 1.0, a) * F.params3.w) + vec3f(1.0) * pow(a, 8.0) * F.params3.w * 0.8;
  }
  return vec4f(c, 1.0);
}
`;

// kaleidoscopic IFS / box fold fractal, marched at 200x150 (bible §19.3)
export const FRACTAL = COMMON + /* wgsl */`
struct SOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> SOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: SOut; o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}
fn de(p0: vec3f, unfold: f32) -> vec2f {
  // an infinite lattice of kaleidoscopic IFS blooms (one per 6-unit cell) seen from a fixed point between them: the
  // fractal behaves like a distant environment that turns exactly with the camera (no motion of its own)
  var p = (fract(p0 / 6.0) - 0.5) * 6.0;
  var s = 1.0; var trap = 1e3;
  for (var k = 0; k < 8; k++) {
    p = abs(p) - vec3f(0.8, 0.65, 0.95) * (0.75 + unfold * 0.2);
    if (p.x < p.y) { p = p.yxz; }
    if (p.x < p.z) { p = p.zyx; }
    if (p.y < p.z) { p = p.xzy; }
    let r2 = dot(p, p);
    let k2 = clamp(1.4 / r2, 0.6, 2.2);
    p = p * k2; s = s * k2;
    p = p * 1.3 - vec3f(0.7, 0.45, 0.65);
    s = s * 1.3;
    trap = min(trap, r2);
  }
  return vec2f((length(p) - 0.8) / s, trap);
}
@fragment fn fs(i: SOut) -> @location(0) vec4f {
  let x = i.uv.x * 2.0 - 1.0; let y = 1.0 - i.uv.y * 2.0;
  let tf = F.camFwd.w;
  let rd = normalize(F.camFwd.xyz + F.camRight.xyz * x * tf * F.params3.x + F.camUp.xyz * y * tf);
  let ro = vec3f(0.0, 0.0, 0.0);
  let unfold = F.params3.y;
  var tt = 0.3; var hit = false; var trap = 0.0; var steps = 0.0;
  for (var k = 0; k < 72; k++) {
    let r = de(ro + rd * tt, unfold);
    if (r.x < 0.0015 * tt) { hit = true; trap = r.y; break; }
    tt = tt + r.x * 0.9; steps = steps + 1.0;
    if (tt > 26.0) { break; }
  }
  let hue = fract(trap * 0.22 + tt * 0.02 + F.camPos.w * 0.01);
  let rainbow = 0.5 + 0.5 * cos(6.2831 * (hue + vec3f(0.0, 0.33, 0.67)));
  var c = F.palA.rgb * 0.3;
  if (hit) { c = rainbow * (1.15 - steps / 72.0) * (1.0 + F.camUp.w * 0.35) * exp(-tt * 0.04); }
  c = c + F.palB.rgb * steps / 72.0 * 0.5;
  return vec4f(c, 1.0);
}
`;

export const POST = /* wgsl */`
struct Post { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
// a: x,y internal res, z = bloom strength, w = time
// b: x = dither, y = crt, z = damage distortion, w = flash
// c: x = overdrive, y = low-pass (visual) / desaturate, z = viewport x0, w = viewport y0 (px)
// d: x,y = viewport size (px), z = blur dir x, w = blur dir y
@group(0) @binding(0) var<uniform> P: Post;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;
@group(0) @binding(4) var sampN: sampler;
struct SOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> SOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: SOut; o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}
@fragment fn bright(i: SOut) -> @location(0) vec4f {
  // capped: a pile of additive sprites must not turn into a screen-wide white bloom
  var c = textureSampleLevel(src, samp, i.uv, 0.0).rgb;
  let l = max(max(c.r, c.g), c.b);
  c = c * min(1.0, 3.0 / max(l, 1e-4));
  return vec4f(c * smoothstep(1.1, 2.6, l), 1.0);
}
@fragment fn blur(i: SOut) -> @location(0) vec4f {
  let texel = 1.0 / vec2f(textureDimensions(src));
  let d = P.d.zw * texel;
  var c = textureSampleLevel(src, samp, i.uv, 0.0).rgb * 0.227;
  c = c + (textureSampleLevel(src, samp, i.uv + d * 1.38, 0.0).rgb + textureSampleLevel(src, samp, i.uv - d * 1.38, 0.0).rgb) * 0.316;
  c = c + (textureSampleLevel(src, samp, i.uv + d * 3.23, 0.0).rgb + textureSampleLevel(src, samp, i.uv - d * 3.23, 0.0).rgb) * 0.07;
  return vec4f(c, 1.0);
}
fn bayer(p: vec2u) -> f32 {
  let m = array<f32, 16>(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return m[(p.y % 4u) * 4u + (p.x % 4u)] / 16.0 - 0.5;
}
@fragment fn composite(i: SOut) -> @location(0) vec4f {
  let res = P.a.xy;
  // position inside the viewport -> internal pixel
  let vp = (i.pos.xy - P.c.zw) / P.d.xy;
  var uv = vp;
  if (P.b.y > 0.5) { // CRT curvature
    let cc = uv * 2.0 - 1.0;
    uv = (cc * (1.0 + dot(cc, cc) * vec2f(0.035, 0.045))) * 0.5 + 0.5;
  }
  let dmg = P.b.z;
  let t = P.a.w;
  if (dmg > 0.0) { // integrity distortion: horizontal tearing
    let row = floor(uv.y * res.y / 3.0);
    let j = (fract(sin(row * 91.7 + floor(t * 20.0) * 13.1) * 4375.5) - 0.5) * step(0.86, fract(sin(row * 3.7 + floor(t * 12.0)) * 991.3));
    uv.x = uv.x + j * 0.03 * dmg;
  }
  let px = floor(uv * res);
  let suv = (px + 0.5) / res;
  var c = textureSampleLevel(src, sampN, suv, 0.0).rgb;
  if (dmg > 0.0) {
    let o = vec2f(1.5 * dmg / res.x, 0.0);
    c.r = textureSampleLevel(src, sampN, suv + o, 0.0).r;
    c.b = textureSampleLevel(src, sampN, suv - o, 0.0).b;
  }
  let bl = textureSampleLevel(bloomTex, samp, uv, 0.0).rgb;
  c = c + bl * P.a.z * (1.0 + P.c.x * 0.6);
  // hue-preserving shoulder: the brightest channel rolls off toward 1 and the others keep their ratio, so stacked
  // magenta stays magenta instead of clipping to white; only very hot pixels drift a little toward white
  let m = max(max(c.r, c.g), c.b);
  if (m > 0.75) {
    let fm = 0.75 + 0.25 * (1.0 - exp(-(m - 0.75) * 3.0));
    c = c * (fm / m);
    c = mix(c, vec3f(fm), clamp((m - 2.0) * 0.08, 0.0, 0.3));
  }
  let g = dot(c, vec3f(0.3, 0.59, 0.11));
  c = mix(c, vec3f(g), P.c.y);
  c = mix(c, vec3f(1.0), clamp(P.b.w, 0.0, 1.0));
  if (P.b.x > 0.5) { // ordered dither to 15-bit colour (5 bits per channel)
    c = floor(clamp(c, vec3f(0.0), vec3f(1.0)) * 31.0 + 0.5 + bayer(vec2u(px))) / 31.0;
  }
  if (P.b.y > 0.5) {
    let sl = 0.82 + 0.18 * sin((uv.y * res.y) * 3.14159 * 2.0);
    c = c * sl;
    let vg = uv * (1.0 - uv); c = c * clamp(pow(vg.x * vg.y * 16.0, 0.25), 0.0, 1.0);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { c = vec3f(0.0); }
  }
  return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
