// WebGPU low-poly renderer (bible §16, §19): low internal resolution (400x300 or 480x270) integer-scaled to the screen,
// sky / fractal background, instanced meshes in four passes (opaque triangles and lines, additive triangles and lines),
// bloom, ordered dither to 15-bit, optional CRT. Every draw is an instance (matrix, colour, material params) in one
// storage buffer per frame; draws are batched per mesh.
import { SCENE, SKY, FRACTAL, POST } from './shaders.js';

const VSTRIDE = 36; // pos, nrm, col (3 x vec3f)
const ISTRIDE = 24; // floats per instance (mat4 + color + params)
const MAX_INST = 40000;
export const PASS = { OPAQUE: 0, LINE: 1, ADD: 2, ADDLINE: 3 };

export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.meshes = []; this.ok = false; this.lists = [new Map(), new Map(), new Map(), new Map()]; this.count = 0; }
  async init() {
    if (!navigator.gpu) throw new Error('WebGPU is not available in this browser. Use a current Chrome or Edge.');
    const adapter = this.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No WebGPU adapter found. If the game was running a moment ago, the graphics driver crashed and Chrome has switched WebGPU off until it restarts: open chrome://restart (or close every Chrome window) and try again.');
    this.device = await adapter.requestDevice();
    this.device.lost.then(i => { console.error('WebGPU device lost', i.reason, i.message); this.lostInfo = `${i.reason || ''} ${i.message || ''}`.trim(); this.ok = false; });
    this.device.onuncapturederror = e => { if ((this.errN = (this.errN || 0) + 1) < 6) console.error('WebGPU error:', e.error.message); };
    // ?capture (headless tests): render into an offscreen texture and copy it to a 2D canvas, no swap chain
    this.capture = new URLSearchParams(location.search).has('capture');
    if (this.capture) {
      this.format = 'rgba8unorm';
      this.capCanvas = document.createElement('canvas'); this.capCanvas.id = 'cap'; this.capCanvas.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;image-rendering:pixelated';
      this.canvas.after(this.capCanvas); this.canvas.style.display = 'none';
    } else {
      this.ctx = this.canvas.getContext('webgpu');
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
    }
    const d = this.device;
    this.frameBuf = d.createBuffer({ size: 384, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.instBuf = d.createBuffer({ size: MAX_INST * ISTRIDE * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.instData = new Float32Array(MAX_INST * ISTRIDE);
    this.frameData = new Float32Array(96);
    this.postBufs = [0, 1, 2, 3].map(() => d.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
    this.linear = d.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    this.nearest = d.createSampler({ magFilter: 'nearest', minFilter: 'nearest', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    const sceneMod = d.createShaderModule({ code: SCENE });
    const skyMod = d.createShaderModule({ code: SKY });
    const fracMod = d.createShaderModule({ code: FRACTAL });
    const postMod = d.createShaderModule({ code: POST });
    for (const [n, m] of [['scene', sceneMod], ['sky', skyMod], ['fractal', fracMod], ['post', postMod]]) {
      m.getCompilationInfo().then(info => { for (const msg of info.messages) if (msg.type === 'error') console.error(`WGSL ${n}:${msg.lineNum}: ${msg.message}`); });
    }
    this.bgl0 = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
    ] });
    this.bgSky1L = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ] });
    const vbuf = [{ arrayStride: VSTRIDE, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x3' }] }];
    const scenePL = d.createPipelineLayout({ bindGroupLayouts: [this.bgl0] });
    const HDR = 'rgba16float';
    const mk = (topology, fs, additive) => d.createRenderPipeline({
      layout: scenePL,
      vertex: { module: sceneMod, entryPoint: 'vs', buffers: vbuf },
      fragment: { module: sceneMod, entryPoint: fs, targets: [{ format: HDR, ...(additive ? { blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } } : {}) }] },
      primitive: { topology, cullMode: 'none' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: !additive, depthCompare: 'less' },
    });
    this.pipes = [mk('triangle-list', 'fsOpaque', false), mk('line-list', 'fsOpaque', false), mk('triangle-list', 'fsAdd', true), mk('line-list', 'fsAdd', true)];
    this.skyPipe = d.createRenderPipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bgSky1L] }),
      vertex: { module: skyMod, entryPoint: 'vs' }, fragment: { module: skyMod, entryPoint: 'fs', targets: [{ format: HDR }] },
      primitive: { topology: 'triangle-list' }, depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    });
    this.fracPipe = d.createRenderPipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [this.bgl0] }),
      vertex: { module: fracMod, entryPoint: 'vs' }, fragment: { module: fracMod, entryPoint: 'fs', targets: [{ format: HDR }] },
      primitive: { topology: 'triangle-list' },
    });
    this.postBGL = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ] });
    const postPL = d.createPipelineLayout({ bindGroupLayouts: [this.postBGL] });
    const mkPost = (entry, format) => d.createRenderPipeline({ layout: postPL, vertex: { module: postMod, entryPoint: 'vs' },
      fragment: { module: postMod, entryPoint: entry, targets: [{ format }] }, primitive: { topology: 'triangle-list' } });
    this.brightPipe = mkPost('bright', HDR); this.blurPipe = mkPost('blur', HDR); this.compPipe = mkPost('composite', this.format);
    this.bg0 = d.createBindGroup({ layout: this.bgl0, entries: [{ binding: 0, resource: { buffer: this.frameBuf } }, { binding: 1, resource: { buffer: this.instBuf } }] });
    this.setRes(400, 300);
    this.ok = true;
  }
  setRes(w, h) {
    if (this.res && this.res[0] === w && this.res[1] === h) return;
    const d = this.device;
    this.res = [w, h];
    const tex = (tw, th, fmt = 'rgba16float') => d.createTexture({ size: [tw, th], format: fmt, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.sceneTex = tex(w, h); this.depthTex = tex(w, h, 'depth24plus');
    const bw = Math.max(64, w >> 1), bh = Math.max(48, h >> 1);
    this.bloomA = tex(bw, bh); this.bloomB = tex(bw, bh);
    this.fracTex = tex(Math.max(100, w >> 1), Math.max(75, h >> 1));
    this.skyBG1 = d.createBindGroup({ layout: this.bgSky1L, entries: [{ binding: 0, resource: this.fracTex.createView() }, { binding: 1, resource: this.linear }] });
    const pb = (buf, srcT, bloomT) => d.createBindGroup({ layout: this.postBGL, entries: [
      { binding: 0, resource: { buffer: buf } }, { binding: 1, resource: srcT.createView() }, { binding: 2, resource: this.linear },
      { binding: 3, resource: bloomT.createView() }, { binding: 4, resource: this.nearest }] });
    this.pbBright = pb(this.postBufs[0], this.sceneTex, this.bloomB);
    this.pbBlurH = pb(this.postBufs[1], this.bloomA, this.bloomA);
    this.pbBlurV = pb(this.postBufs[2], this.bloomB, this.bloomB);
    this.pbComp = pb(this.postBufs[3], this.sceneTex, this.bloomA);
  }
  // mesh: { pos: [], nrm: [], col: [], lines: bool }
  mesh(data) {
    const n = data.pos.length / 3;
    const arr = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      arr.set(data.pos.slice(i * 3, i * 3 + 3), i * 9);
      arr.set(data.nrm.slice(i * 3, i * 3 + 3), i * 9 + 3);
      arr.set(data.col.slice(i * 3, i * 3 + 3), i * 9 + 6);
    }
    const buf = this.device.createBuffer({ size: Math.max(36, arr.byteLength), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.device.queue.writeBuffer(buf, 0, arr);
    const m = { id: this.meshes.length, buf, count: n, lines: !!data.lines, radius: data.radius || 1 };
    this.meshes.push(m);
    return m;
  }
  destroyMesh(m) { if (m && m.buf) { m.buf.destroy(); m.buf = null; } }
  begin() { for (const l of this.lists) l.clear(); this.count = 0; }
  // add an instance. mat: Float32Array(16); color: [r,g,b,a]; p: [mode, emissive, amount, kind]
  draw(mesh, mat, color, p, pass) {
    if (!mesh || !mesh.buf || this.count >= MAX_INST) return;
    if (pass === undefined) pass = mesh.lines ? PASS.LINE : PASS.OPAQUE;
    const list = this.lists[pass];
    let arr = list.get(mesh);
    if (!arr) { arr = []; list.set(mesh, arr); }
    const o = this.count * ISTRIDE;
    this.instData.set(mat, o);
    this.instData[o + 16] = color[0]; this.instData[o + 17] = color[1]; this.instData[o + 18] = color[2]; this.instData[o + 19] = color[3] === undefined ? 1 : color[3];
    this.instData[o + 20] = p ? p[0] : 0; this.instData[o + 21] = p ? p[1] : 0; this.instData[o + 22] = p ? p[2] : 0; this.instData[o + 23] = p ? p[3] : 0;
    arr.push(this.count);
    this.count++;
  }
  // F: frame uniforms object (see shaders COMMON), post: options, view: { x, y, w, h } on the canvas in device px
  end(F, post, view) {
    if (this.capture && this.capBusy && performance.now() - this.capT < 8000) return; // headless: wait for the GPU to catch up
    if (!this.ok) return;
    const d = this.device;
    // reorder instances so each (pass, mesh) range is contiguous
    const order = new Float32Array(this.count * ISTRIDE);
    const draws = [];
    let k = 0;
    this.lists.forEach((list, pass) => {
      for (const [mesh, idx] of list) {
        const first = k;
        for (const i of idx) { order.set(this.instData.subarray(i * ISTRIDE, i * ISTRIDE + ISTRIDE), k * ISTRIDE); k++; }
        draws.push({ pass, mesh, first, n: idx.length });
      }
    });
    if (k) d.queue.writeBuffer(this.instBuf, 0, order, 0, k * ISTRIDE);
    this.writeFrame(F);
    const [w, h] = this.res;
    const pd = (i, a, b, c, dd) => d.queue.writeBuffer(this.postBufs[i], 0, new Float32Array([...a, ...b, ...c, ...dd]));
    pd(0, [w, h, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    pd(1, [w, h, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0]);
    pd(2, [w, h, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]);
    pd(3, [w, h, post.bloom, F.time], [post.dither ? 1 : 0, post.crt ? 1 : 0, post.damage || 0, post.flash || 0],
      [post.overdrive || 0, post.desat || 0, view.x, view.y], [view.w, view.h, 0, 0]);
    const enc = d.createCommandEncoder();
    if (F.fractal > 0) {
      const fp = enc.beginRenderPass({ colorAttachments: [{ view: this.fracTex.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      fp.setPipeline(this.fracPipe); fp.setBindGroup(0, this.bg0); fp.draw(3); fp.end();
    }
    const rp = enc.beginRenderPass({
      colorAttachments: [{ view: this.sceneTex.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
      depthStencilAttachment: { view: this.depthTex.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
    });
    rp.setPipeline(this.skyPipe); rp.setBindGroup(0, this.bg0); rp.setBindGroup(1, this.skyBG1); rp.draw(3);
    let cur = -1;
    for (const dr of draws) {
      if (dr.pass !== cur) { cur = dr.pass; rp.setPipeline(this.pipes[cur]); rp.setBindGroup(0, this.bg0); }
      rp.setVertexBuffer(0, dr.mesh.buf);
      rp.draw(dr.mesh.count, dr.n, 0, dr.first);
    }
    rp.end();
    const pass = (pipe, bg, target, vp) => {
      const p = enc.beginRenderPass({ colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      p.setPipeline(pipe); p.setBindGroup(0, bg); if (vp) p.setViewport(vp.x, vp.y, vp.w, vp.h, 0, 1); p.draw(3); p.end();
    };
    pass(this.brightPipe, this.pbBright, this.bloomA.createView());
    pass(this.blurPipe, this.pbBlurH, this.bloomB.createView());
    pass(this.blurPipe, this.pbBlurV, this.bloomA.createView());
    if (this.capture) {
      const cw = this.canvas.width, ch = this.canvas.height;
      if (!this.capTex || this.capTex.width !== cw || this.capTex.height !== ch) {
        this.capTex = d.createTexture({ size: [cw, ch], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
        this.capBpr = Math.ceil(cw * 4 / 256) * 256; this.capBuf = d.createBuffer({ size: this.capBpr * ch, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        this.capCanvas.width = cw; this.capCanvas.height = ch;
      }
      pass(this.compPipe, this.pbComp, this.capTex.createView(), view);
      if (this.capBusy && performance.now() - this.capT > 8000) { // a readback that never resolved: start over with a fresh buffer
        this.capBuf = d.createBuffer({ size: this.capBpr * ch, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }); this.capBusy = false;
      }
      const grab = !this.capBusy;
      if (grab) enc.copyTextureToBuffer({ texture: this.capTex }, { buffer: this.capBuf, bytesPerRow: this.capBpr }, [cw, ch]);
      d.queue.submit([enc.finish()]);
      if (grab) {
        this.capBusy = true; this.capT = performance.now(); const buf = this.capBuf;
        buf.mapAsync(GPUMapMode.READ).then(() => { if (buf !== this.capBuf) return;
          const src = new Uint8Array(this.capBuf.getMappedRange()); const img = new ImageData(cw, ch);
          for (let y = 0; y < ch; y++) img.data.set(src.subarray(y * this.capBpr, y * this.capBpr + cw * 4), y * cw * 4);
          this.capBuf.unmap(); this.capCanvas.getContext("2d").putImageData(img, 0, 0); this.capBusy = false; this.capDone = (this.capDone || 0) + 1;
        });
      }
      return;
    }
    pass(this.compPipe, this.pbComp, this.ctx.getCurrentTexture().createView(), view);
    d.queue.submit([enc.finish()]);
  }
  writeFrame(F) {
    const a = this.frameData;
    a.set(F.viewProj, 0); a.set(F.view, 16);
    const v4 = (o, v, w) => { a[o] = v[0]; a[o + 1] = v[1]; a[o + 2] = v[2]; a[o + 3] = w; };
    v4(32, F.camPos, F.time); v4(36, F.camRight, F.beatPhase); v4(40, F.camUp, F.kick); v4(44, F.fog, F.fogDensity);
    v4(48, F.skyTop, F.layer); v4(52, F.skyHorizon, F.horizonGlow); v4(56, F.skyBottom, F.skyMode);
    v4(60, F.palA, 0); v4(64, F.palB, 0); v4(68, F.palC, 0); v4(72, F.lightDir, F.ambient);
    a[76] = this.res[0]; a[77] = this.res[1]; a[78] = F.wobble ? 1 : 0; a[79] = F.fractal || 0;
    a[80] = F.sun || 0; a[81] = F.skyGrid || 0; a[82] = F.glow ?? 1; a[83] = F.under || 0;
    v4(84, F.camFwd, F.tanHalfFov);
    a[88] = F.aspect; a[89] = F.unfold || 0; a[90] = F.drift || 0; a[91] = F.collapse || 0;
    this.device.queue.writeBuffer(this.frameBuf, 0, a, 0, 92);
  }
}
