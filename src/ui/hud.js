// In-dive HUD (bible §18): minimal, 90s VR style. Integrity ring around the reticle, Flow bar, Sync multiplier, lock-on
// markers, a beat ring pulsing with the kick, section labels ("BREACH"), the track title, radio subtitles, boss bar,
// contract objective, Peripheral threat markers, choice-gate labels. Drawn on a 2D canvas over the WebGPU view.
import { clamp, lerp } from '../core/math.js';
import { MODS } from '../story/mods.js';

export const HUD_FONT = '"VT323", "Lucida Console", monospace';
const WHO_COL = { Lena: '#9fe8ff', Pike: '#ffd27a', Weyl: '#d0d0d0', Juno: '#ffb0e0', Theo: '#ffffff', Hollis: '#ff9090' };

export class Hud {
  constructor() { this.radioShown = []; }
  draw(g, W, H, sim, view, info) {
    const u = Math.min(W / 400, H / 300); // one internal pixel
    g.save();
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 2.5 * u; g.shadowOffsetX = 0.7 * u; g.shadowOffsetY = 0.7 * u;
    const kick = info.kick || 0;
    // ----------------------------------------------------------------------- reticle + integrity ring
    const P = sim.player;
    const ret = view.project(sim.ps + 60, P.x, P.y);
    const ox = info.view.x, oy = info.view.y, vw = info.view.w, vh = info.view.h;
    const scr = p => [ox + p[0] * vw, oy + p[1] * vh];
    if (ret) {
      const [rx, ry] = scr(ret);
      const R = 11 * u;
      g.lineWidth = 1.5 * u;
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(rx, ry, R, 0, Math.PI * 2); g.stroke();
      const ik = sim.integrity / 100;
      g.strokeStyle = ik > 0.5 ? '#7cf7ff' : ik > 0.25 ? '#ffd040' : '#ff3050';
      g.lineWidth = 2.5 * u; g.beginPath(); g.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ik); g.stroke();
      if (info.beatIndicator) { g.strokeStyle = `rgba(255,255,255,${(0.6 * (1 - sim.beatPhase)).toFixed(3)})`; g.lineWidth = 1 * u; g.beginPath(); g.arc(rx, ry, R + 3 * u + sim.beatPhase * 6 * u, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = sim.lockHeld ? '#ff5050' : '#ffffff'; g.lineWidth = 1 * u;
      g.beginPath(); for (const a of [0, 1, 2, 3]) { const c = Math.cos(a * Math.PI / 2), s = Math.sin(a * Math.PI / 2); g.moveTo(rx + c * 3 * u, ry + s * 3 * u); g.lineTo(rx + c * 6 * u, ry + s * 6 * u); } g.stroke();
      if (sim.locks.length) { g.fillStyle = '#ff6060'; g.font = `${10 * u}px ${HUD_FONT}`; g.textAlign = 'left'; g.fillText(`LOCK ${sim.locks.length}/${sim.maxLocks()}`, rx + R + 4 * u, ry - 6 * u); }
    }
    // lock markers
    for (const l of sim.locks) {
      const e = l.e; if (e.dead || e.gone) continue;
      const p = view.project(e.s, e.x, e.y); if (!p) continue;
      const [x, y] = scr(p); const s = 7 * u;
      g.strokeStyle = '#ff4040'; g.lineWidth = 1.5 * u; g.strokeRect(x - s, y - s, s * 2, s * 2);
      g.beginPath(); g.moveTo(x - s * 1.4, y); g.lineTo(x - s, y); g.moveTo(x + s, y); g.lineTo(x + s * 1.4, y); g.stroke();
    }
    // Peripheral: threats behind you
    if (sim.mod('peripheral')) for (const e of sim.enemies) if (!e.dead && e.d < -2 && e.d > -50) {
      const x = ox + vw / 2 + clamp(e.x / sim.bounds.w, -1, 1) * vw * 0.4, y = oy + vh - 18 * u;
      g.fillStyle = '#ff3050'; g.beginPath(); g.moveTo(x, y + 6 * u); g.lineTo(x - 5 * u, y - 2 * u); g.lineTo(x + 5 * u, y - 2 * u); g.fill();
    }
    if (sim.wrongSide !== undefined && sim.t - sim.wrongSide < 0.6) { // shooting a boss in the wrong world
      g.font = `${10 * u}px ${HUD_FONT}`; g.textAlign = 'center'; g.fillStyle = Math.floor(info.time * 12) % 2 ? '#ffffff' : '#ff60a0';
      g.fillText('WRONG COLOUR  ·  SHIFT', ox + vw / 2, oy + vh * 0.36);
    }
    // objective markers: the packets to collect and the nodes to destroy, bracketed with their distance
    { const obj = sim.dive && sim.dive.objective;
      const mark = (s, x, y, col, label) => {
        const dist = s - sim.ps; if (dist < 6 || dist > 260) return;
        const p = view.project(s, x, y); if (!p) return; const [sx, sy] = scr(p);
        const k = clamp(120 / dist, 0.5, 1.6), z = 7 * u * k, c = 3 * u * k;
        g.globalAlpha = clamp((260 - dist) / 60, 0, 1) * (0.75 + 0.25 * Math.sin(info.time * 8));
        g.strokeStyle = col; g.lineWidth = 1.5 * u; g.beginPath();
        for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(sx + ax * z, sy + ay * (z - c)); g.lineTo(sx + ax * z, sy + ay * z); g.lineTo(sx + ax * (z - c), sy + ay * z); }
        g.stroke();
        g.font = `${8 * u}px ${HUD_FONT}`; g.textAlign = 'center'; g.fillStyle = col; g.fillText(`${label} ${Math.round(dist)}M`, sx, sy - z - 3 * u);
        g.globalAlpha = 1;
      };
      const sideCol = sd => (sd ? '#ff50c8' : '#40f0ff');
      if (obj && obj.kind === 'collect') for (const tk of sim.tokens) if (!tk.got) { const here = tk.side === undefined || tk.side === sim.side; mark(tk.s, tk.x, tk.y, here ? '#ffd040' : sideCol(tk.side), here ? 'FLY THROUGH' : 'SHIFT'); }
      if (obj && obj.kind === 'destroy') for (const e of sim.enemies) if (e.type === 'node' && !e.dead && !e.gone) { const here = sim.sameSide(e); mark(e.s, e.x, e.y, here ? '#ff9040' : sideCol(e.side), here ? 'DESTROY' : 'SHIFT'); }
    }
    // choice gate labels
    for (const gt of sim.gates) if (gt.choice && !gt.passed) {
      const p = view.project(gt.s, gt.x, gt.y + gt.r + 1.5); if (!p) continue; const [x, y] = scr(p);
      g.font = `${Math.round(clamp(260 / Math.max(10, gt.s - sim.ps), 0.6, 2.2) * 10 * u)}px ${HUD_FONT}`; g.textAlign = 'center';
      g.fillStyle = gt.closed ? 'rgba(255,80,80,0.6)' : '#ffffff'; g.fillText(gt.closed ? `${gt.label} (CLOSED)` : gt.label, x, y);
    }
    // ------------------------------------------------------------------------------------ bottom bars
    const pad = 6 * u;
    g.font = `${10 * u}px ${HUD_FONT}`; g.textAlign = 'left';
    // Flow
    const fx = ox + pad, fy = oy + vh - pad - 6 * u, fw = 90 * u, fh = 5 * u;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(fx, fy, fw, fh);
    g.fillStyle = sim.boosting ? '#ffffff' : '#40e0ff'; g.fillRect(fx, fy, fw * sim.flow / 100, fh);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.strokeRect(fx, fy, fw, fh);
    g.fillStyle = '#bff'; g.fillText('FLOW', fx, fy - 5 * u);
    // weapon: level pips and the charge bar (absorbing shots of your colour fills it; a hit costs a level)
    { const wx = fx + fw + 10 * u, ww = 46 * u, lv = sim.wlev || 1, up = info.time !== undefined && sim.t - (sim.wlevT ?? -9) < 0.6;
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(wx, fy, ww, fh);
      g.fillStyle = up ? '#ffffff' : '#ffd040'; g.fillRect(wx, fy, ww * (lv >= 5 ? 1 : sim.wcharge || 0), fh);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.strokeRect(wx, fy, ww, fh);
      for (let k = 1; k <= 5; k++) { g.fillStyle = k <= lv ? '#ffd040' : 'rgba(255,255,255,0.25)'; g.fillRect(wx + (k - 1) * 6 * u, fy + fh + 2 * u, 4 * u, 2 * u); }
      g.fillStyle = up ? '#ffffff' : '#ffe8a0'; g.fillText(lv >= 5 ? 'WEAPON MAX' : `WEAPON LV ${lv}`, wx, fy - 5 * u); }
    // integrity numeric
    g.fillStyle = sim.integrity > 30 ? '#bff' : '#ff4060'; g.fillText(`INTEGRITY ${Math.ceil(sim.integrity)}%`, fx + 38 * u, fy - 5 * u);
    // active power
    if (info.equipped) {
      const m = MODS[info.equipped]; const ready = sim.flow >= m.cost && !(sim.power_.until > sim.t);
      g.fillStyle = ready ? '#ffffff' : 'rgba(255,255,255,0.4)'; g.fillText(`[F] ${m.name.toUpperCase()} ${m.cost}`, fx, fy - 15 * u);
      if (sim.power_.until > sim.t) { g.fillStyle = '#ffe080'; g.fillRect(fx, fy - 11 * u, fw * (sim.power_.until - sim.t) / Math.max(0.1, sim.power_.until - sim.power_.t0), 2 * u); }
    }
    // Sync
    g.textAlign = 'right';
    // with the touch controls on, the right-hand HUD moves up and in, clear of the pause button and the thumb buttons
    const tR = info.touch ? Math.max(0, H * 0.16 - (W - ox - vw)) : 0;
    const sx = ox + vw - pad - tR, sy = info.touch ? oy + pad + 78 * u : oy + vh - pad - 4 * u;
    g.font = `${(sim.overdrive ? 26 : 20) * u * (1 + kick * 0.08)}px ${HUD_FONT}`;
    g.fillStyle = sim.overdrive ? `hsl(${(info.time * 300) % 360},100%,75%)` : '#ffffff';
    g.fillText(`×${sim.sync.toFixed(1)}`, sx, sy - 4 * u);
    g.font = `${10 * u}px ${HUD_FONT}`; g.fillStyle = '#bff'; g.fillText(sim.overdrive ? 'OVERDRIVE' : 'SYNC', sx, sy - 20 * u);
    // SHIFT: which world you are in (a spinning record: A-side / B-side)
    {
      const side = sim.side, col = side ? '#ff4cbf' : '#5cffff', cx = sx - 8 * u, cy = sy - 44 * u, rr = 7 * u;
      const spin = info.time * 4 + (sim.t - sim.shiftT < 0.3 ? (0.3 - (sim.t - sim.shiftT)) * 30 : 0);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = col; g.lineWidth = 1.2 * u; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, cy, rr * 0.6, spin, spin + 1.2); g.stroke(); g.beginPath(); g.arc(cx, cy, rr * 0.6, spin + Math.PI, spin + Math.PI + 1.2); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 1.6 * u, 0, Math.PI * 2); g.fill();
      g.font = `${11 * u}px ${HUD_FONT}`; g.textAlign = 'right'; g.fillText(side ? 'B-SIDE' : 'A-SIDE', cx - rr - 4 * u, cy);
      g.font = `${8 * u}px ${HUD_FONT}`; g.fillStyle = 'rgba(200,240,255,0.6)'; g.fillText(info.shiftKey || '[SHIFT]', cx - rr - 4 * u, cy + 9 * u);
      g.textAlign = 'right';
    }
    // beat dots
    for (let i = 0; i < 4; i++) { const on = (sim.beatIndex % 4 + 4) % 4 === i; g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.25)'; g.fillRect(sx - (4 - i) * 6 * u, sy + 3 * u, 4 * u, 2 * u); }
    // score
    g.font = `${12 * u}px ${HUD_FONT}`; g.textAlign = 'right'; g.fillStyle = '#ffffff';
    g.fillText(String(sim.stats.score).padStart(8, '0'), ox + vw - pad - tR, oy + pad + 4 * u);
    g.font = `${9 * u}px ${HUD_FONT}`; g.fillStyle = 'rgba(200,240,255,0.7)';
    g.fillText(`${info.sectionLabel}`, ox + vw - pad - tR, oy + pad + 14 * u);
    // objective (contracts)
    g.textAlign = 'left';
    const obj = sim.dive.objective;
    if (obj) {
      const S = sim.stats; let v = 0, txt = '';
      if (['collect', 'destroy', 'gates'].includes(obj.kind)) { const need = sim.objNeeded(); v = Math.min(1, S.objHave / need) * (obj.need || 0.7); txt = `${obj.label}  ${S.objHave}/${need}${S.objHave >= need ? '  ✓' : ''}`; }
      else if (obj.kind === 'follow') { v = S.followTotal ? S.followT / S.followTotal : 0; txt = `${obj.label}  ${Math.round(v * 100)}%`; }
      else if (obj.kind === 'stream') { v = S.streamTotal ? S.streamT / S.streamTotal : 0; txt = `${obj.label}  ${Math.round(v * 100)}%`; }
      else { v = sim.integrity / 100; txt = obj.label; }
      g.font = `${10 * u}px ${HUD_FONT}`; g.fillStyle = '#ffd860'; g.fillText(txt, ox + pad, oy + pad + 4 * u);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(ox + pad, oy + pad + 9 * u, 70 * u, 3 * u);
      g.fillStyle = v >= (obj.need || 0.7) ? '#80ff90' : '#ffd860'; g.fillRect(ox + pad, oy + pad + 9 * u, 70 * u * clamp(v, 0, 1), 3 * u);
      g.fillStyle = '#fff'; g.fillRect(ox + pad + 70 * u * (obj.need || 0.7), oy + pad + 8 * u, 1, 5 * u);
    }
    // chase meter
    if (sim.chase && sim.boss && !sim.boss.gone) {
      const v = sim.chase.in / Math.max(1, sim.chase.total);
      g.fillStyle = '#ffb0e0'; g.font = `${10 * u}px ${HUD_FONT}`; g.fillText(`STAY IN HER LIGHT  ${Math.round(v * 100)}%`, ox + pad, oy + pad + 20 * u);
    }
    // boss bar
    const b = sim.boss;
    if (b && !b.dead && !b.gone && b.bossType !== 'juno') {
      const bw = 200 * u, bx = ox + (vw - bw) / 2, by = oy + pad + 14 * u;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(bx, by, bw, 4 * u);
      const pc = b.polar && b.polarity !== undefined ? (b.polarity ? '#ff50c8' : '#40f0ff') : '#ff3070';
      g.fillStyle = b.critical ? (Math.floor(info.time * 8) % 2 ? '#ffffff' : '#ff3040') : b.armored ? '#808090' : pc;
      g.fillRect(bx, by, bw * clamp(b.hp / b.hpMax, 0, 1), 4 * u);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = `${10 * u}px ${HUD_FONT}`; g.fillText(b.name + (b.critical ? '  — CRITICAL' : ''), ox + vw / 2, by - 5 * u);
      if (b.polar && b.polarity !== undefined) { // which world its core is in, and the match / mismatch
        const match = b.polarity === sim.side;
        g.font = `${8 * u}px ${HUD_FONT}`; g.fillStyle = pc;
        g.fillText(`CORE ${b.polarity ? 'B' : 'A'}-SIDE  ·  ${match ? 'MATCHED' : 'SHIFT TO MATCH'}`, ox + vw / 2, by + 13 * u);
      }
    }
    // SHIFT feedback near the reticle: clean / off-beat, polarity chains
    if (ret) {
      const [rx, ry] = scr(ret);
      const age = sim.t - sim.shiftT;
      if (age >= 0 && age < 0.6) {
        g.globalAlpha = clamp(1 - age / 0.6, 0, 1); g.textAlign = 'center'; g.font = `${(sim.shiftClean ? 12 : 10) * u}px ${HUD_FONT}`;
        g.fillStyle = sim.shiftClean ? (sim.side ? '#ff8ad8' : '#9fffff') : '#ff6060';
        g.fillText(sim.shiftClean ? 'CLEAN SHIFT' : 'OFF-BEAT', rx, ry + 20 * u + age * 10 * u); g.globalAlpha = 1;
      }
      const ca = sim.t - sim.chainT;
      if (ca >= 0 && ca < 1.2) {
        g.globalAlpha = clamp((1.2 - ca) * 2, 0, 1); g.textAlign = 'center'; g.font = `${14 * u}px ${HUD_FONT}`;
        g.fillStyle = sim.chainSide ? '#ff6cd0' : '#7fffff';
        g.fillText(`${sim.chainSide ? 'B' : 'A'} CHAIN ×${Math.floor(sim.chainN / 3)}  +${100 * Math.pow(2, Math.min(8, Math.floor(sim.chainN / 3) - 1))}`, rx, ry - 22 * u - ca * 8 * u); g.globalAlpha = 1;
      }
    }
    // off-beat shift: a short glitch across the picture
    { const age = sim.t - sim.shiftT; if (age >= 0 && age < 0.14 && !sim.shiftClean && !info.lowFlash) {
      for (let i = 0; i < 7; i++) { const y = oy + ((Math.sin(i * 91.7 + sim.shiftT * 13) * 0.5 + 0.5) * vh), h = (2 + (i % 3) * 3) * u; g.fillStyle = i % 2 ? 'rgba(255,60,190,0.35)' : 'rgba(80,255,255,0.35)'; g.fillRect(ox + ((i * 37) % 11) * u, y, vw, h); }
    } }
    // ------------------------------------------------------------------------------- titles and tips
    g.textAlign = 'center';
    if (info.titleT < 6) {
      const a = clamp(Math.min(info.titleT, 6 - info.titleT), 0, 1);
      g.globalAlpha = a;
      g.font = `${10 * u}px ${HUD_FONT}`; g.fillStyle = '#bff'; g.fillText(info.diveLabel, ox + vw / 2, oy + vh * 0.3);
      g.font = `${26 * u}px ${HUD_FONT}`; g.fillStyle = '#ffffff'; g.fillText(info.title.toUpperCase(), ox + vw / 2, oy + vh * 0.3 + 16 * u);
      g.font = `${10 * u}px ${HUD_FONT}`; g.fillStyle = '#bff'; g.fillText(`♪ ${info.track}`, ox + vw / 2, oy + vh * 0.3 + 33 * u);
      g.globalAlpha = 1;
    }
    // radio subtitles (typewriter)
    let radioTop = oy + vh;
    if (info.subtitles) {
      const live = sim.radio.filter(r => sim.t - r.t < 3.2 + r.text.length * 0.045).slice(-2);
      let y = oy + vh - 34 * u;
      g.font = `${11 * u}px ${HUD_FONT}`;
      const maxW = vw * 0.86;
      [...live].reverse().forEach(r => {
        const age = sim.t - r.t, n = Math.floor(age * 45);
        const label = r.who.toUpperCase() + ': ';
        const words = r.text.split(' '); const lines = []; let cur = label;
        for (const w of words) { const t = cur + w + ' '; if (g.measureText(t).width > maxW && cur !== label) { lines.push(cur); cur = w + ' '; } else cur = t; }
        lines.push(cur);
        const w = Math.max(...lines.map(l => g.measureText(l).width));
        const x0 = ox + vw / 2 - w / 2, h = lines.length * 12 * u;
        const top = y - h + 6 * u;
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x0 - 5 * u, top - 7 * u, w + 10 * u, h + 2 * u);
        g.textAlign = 'left';
        let shown = 0;
        lines.forEach((l, k) => {
          const ly = top + k * 12 * u;
          if (k === 0) { g.fillStyle = WHO_COL[r.who] || '#fff'; g.fillText(label, x0, ly); }
          const body = k === 0 ? l.slice(label.length) : l, bx = x0 + (k === 0 ? g.measureText(label).width : 0);
          const vis = Math.max(0, Math.min(body.length, n - shown)); shown += body.length;
          g.fillStyle = r.who === 'Juno' ? '#ffd8f0' : '#ffffff'; g.fillText(body.slice(0, vis), bx, ly);
        });
        y = top - 10 * u; radioTop = Math.min(radioTop, top - 7 * u);
      });
    }
    // tips: only the newest small one and the newest big one (a new tip replaces the old one instead of
    // printing over it), kept above the radio subtitles
    { const live = sim.tips.filter(tp => { const age = sim.t - tp.t; return age >= 0 && age <= tp.dur; });
      const small = live.filter(tp => !tp.big), big = live.filter(tp => tp.big);
      for (const tp of [big[big.length - 1], small[small.length - 1]]) {
        if (!tp) continue;
        const age = sim.t - tp.t, a = clamp(Math.min(age * 4, (tp.dur - age) * 2), 0, 1);
        g.globalAlpha = a; g.textAlign = 'center';
        g.font = `${(tp.big ? 22 : 11) * u}px ${HUD_FONT}`;
        const y = tp.big ? oy + vh * 0.42 : Math.min(oy + vh * 0.7, radioTop - 14 * u);
        if (!tp.big) { const w = g.measureText(tp.text).width + 12 * u; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(ox + vw / 2 - w / 2, y - 8 * u, w, 16 * u); }
        g.fillStyle = tp.big ? '#ffffff' : '#ffe890';
        g.fillText(info.touch ? touchText(tp.text) : tp.text, ox + vw / 2, y);
        g.globalAlpha = 1;
      } }
    // damage vignette
    if (sim.integrity < 35) {
      const a = (1 - sim.integrity / 35) * 0.5 * (0.6 + 0.4 * Math.sin(info.time * 6));
      const gr = g.createRadialGradient(ox + vw / 2, oy + vh / 2, vh * 0.3, ox + vw / 2, oy + vh / 2, vh * 0.8);
      gr.addColorStop(0, 'rgba(255,0,40,0)'); gr.addColorStop(1, `rgba(255,0,40,${a.toFixed(3)})`); g.fillStyle = gr; g.fillRect(ox, oy, vw, vh);
    }
    // the captured mouse: a small crosshair where the virtual cursor is (the system cursor is hidden while captured)
    if (info.cursor) {
      const cx = info.cursor[0] * W, cy = info.cursor[1] * H, r = 4 * u;
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1 * u;
      g.beginPath(); g.moveTo(cx - r * 1.8, cy); g.lineTo(cx - r * 0.6, cy); g.moveTo(cx + r * 0.6, cy); g.lineTo(cx + r * 1.8, cy);
      g.moveTo(cx, cy - r * 1.8); g.lineTo(cx, cy - r * 0.6); g.moveTo(cx, cy + r * 0.6); g.lineTo(cx, cy + r * 1.8); g.stroke();
    }
    if (info.needClick) { g.textAlign = 'center'; g.font = `${10 * u}px ${HUD_FONT}`; g.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(info.time * 5)) + ')'; g.fillText('CLICK TO CAPTURE THE MOUSE', W / 2, H * 0.62); }
    g.restore();
  }
}
// the tutorial names keys; on a touch screen name the on-screen controls instead
const TOUCH_WORDS = [['WASD / ARROWS / MOUSE / LEFT STICK', 'THE STICK'], ['SPACE / LEFT MOUSE / RT', 'FIRE (AUTO-FIRE IS ON)'], ['HOLD RIGHT MOUSE / K / LT', 'HOLD LOCK'],
  ['SHIFT / X', 'THE SHIFT BUTTON'], ['ROLL Q / E  ·  BOOST C  ·  BRAKE CTRL', 'BOOST BUTTON']];
function touchText(t) { for (const [a, b] of TOUCH_WORDS) t = t.split(a).join(b); return t; }
