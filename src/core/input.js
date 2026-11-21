// Input: keyboard, mouse, gamepad and touch (src/core/touch.js), every action remappable (bible §8)
import { Touch } from './touch.js';
export const ACTIONS = ['up', 'down', 'left', 'right', 'fire', 'lock', 'rollL', 'rollR', 'boost', 'brake', 'power', 'shift', 'pause'];
export const ACTION_NAMES = { up: 'Steer up', down: 'Steer down', left: 'Steer left', right: 'Steer right', fire: 'Fire', lock: 'Lock-on',
  rollL: 'Roll left', rollR: 'Roll right', boost: 'Boost', brake: 'Brake', power: 'Neural power', shift: 'Shift worlds', pause: 'Pause' };
export const DEFAULT_KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  fire: ['Space', 'Mouse0', 'KeyJ'], lock: ['Mouse2', 'KeyK'], rollL: ['KeyQ'], rollR: ['KeyE'], boost: ['KeyC', 'Tab'], shift: ['ShiftLeft', 'ShiftRight', 'Mouse1'],
  brake: ['ControlLeft', 'ControlRight'], power: ['KeyF'], pause: ['Escape', 'KeyP'],
};
// standard gamepad mapping
const PAD = { fire: [7], lock: [6], rollL: [4], rollR: [5], boost: [0], brake: [1], power: [3], shift: [2], pause: [9], up: [12], down: [13], left: [14], right: [15] };

export class Input {
  constructor(canvas, opts) {
    this.opts = opts; this.keys = new Set(); this.prev = {}; this.cur = {}; this.mouse = { x: 0.5, y: 0.5, moved: 0, inside: false };
    this.axis = [0, 0]; this.mouseTarget = null; this.pad = null; this.lastDevice = 'keyboard'; this.listeners = [];
    this.setBindings(opts.keys);
    addEventListener('keydown', e => {
      if (this.capture) { e.preventDefault(); this.capture(e.code); this.capture = null; return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && !isTyping(e)) e.preventDefault();
      if (!isTyping(e)) this.keys.add(e.code); this.lastDevice = 'keyboard';
      for (const f of this.listeners) f(e.code, e);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    const el = canvas; this.el = el;
    // pointer lock during dives: the mouse can't leave the window, the cursor becomes a virtual one moved by the deltas
    this.wantLock = false; this.locked = false; this.lockLostAt = -1e9;
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked; this.locked = document.pointerLockElement === el;
      if (was && !this.locked) { this.lockLostAt = performance.now(); this.keys.clear(); if (this.onLockLost) this.onLockLost(); }
    });
    document.addEventListener('pointerlockerror', () => { this.lockFailed = performance.now(); });
    addEventListener('mousedown', () => { if (this.wantLock && !this.locked) this.lock(); }, true); // any click (Resume…) re-captures
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      if (this.wantLock && !this.locked) return; // the capturing click is not a shot
      this.keys.add('Mouse' + e.button); this.lastDevice = 'mouse';
    });
    addEventListener('mouseup', e => this.keys.delete('Mouse' + e.button));
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('touchstart', e => { this.keys.add('Touch'); this.lastDevice = 'touch'; e.preventDefault(); if (this.onTap) this.onTap(); }, { passive: false });
    addEventListener('touchend', () => this.keys.delete('Touch'));
    this.touch = new Touch(this);
    addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      if (this.locked) { // relative: one window width of travel sweeps the corridor (× sensitivity)
        const k = (this.opts.mouseSens || 1) * 1.6;
        this.mouse.x = Math.min(1, Math.max(0, this.mouse.x + e.movementX / r.width * k));
        this.mouse.y = Math.min(1, Math.max(0, this.mouse.y + e.movementY / r.height * k));
        this.mouse.inside = true;
      } else {
        this.mouse.x = (e.clientX - r.left) / r.width; this.mouse.y = (e.clientY - r.top) / r.height;
        this.mouse.inside = this.mouse.x >= 0 && this.mouse.x <= 1 && this.mouse.y >= 0 && this.mouse.y <= 1;
      }
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { this.mouse.moved = performance.now(); this.lastDevice = 'mouse'; }
    });
  }
  lock() {
    if (this.locked || !this.el.requestPointerLock) return;
    if (this.lockFailed && performance.now() - this.lockFailed < 1200) return; // the browser needs a beat after an Esc
    if (navigator.userActivation && !navigator.userActivation.isActive) return; // only from a click / key press
    const plain = () => { try { const q = this.el.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch (e) { /* */ } };
    try { const q = this.el.requestPointerLock({ unadjustedMovement: true }); if (q && q.catch) q.catch(e => { if (e && e.name === 'NotSupportedError') plain(); }); } catch (e) { plain(); }
  }
  setWantLock(on) {
    if (on === this.wantLock) return;
    this.wantLock = on;
    if (on) { this.mouse.x = 0.5; this.mouse.y = 0.5; this.lock(); } else if (this.locked) document.exitPointerLock();
  }
  onKey(f) { this.listeners.push(f); return () => { this.listeners = this.listeners.filter(g => g !== f); }; }
  setBindings(keys) {
    this.bindings = { ...DEFAULT_KEYS, ...(keys || {}) };
    if ((this.bindings.boost || []).some(k => k.startsWith('Shift'))) this.bindings.boost = DEFAULT_KEYS.boost; // Shift belongs to the world shift now
  }
  update() {
    this.prev = this.cur; this.cur = {};
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    this.pad = pads[0] || null;
    for (const a of ACTIONS) {
      let on = (this.bindings[a] || []).some(k => this.keys.has(k));
      if (this.pad) for (const b of PAD[a] || []) if (this.pad.buttons[b] && this.pad.buttons[b].value > 0.4) { on = true; this.lastDevice = 'pad'; }
      this.cur[a] = on;
    }
    let ax = (this.cur.right ? 1 : 0) - (this.cur.left ? 1 : 0), ay = (this.cur.up ? 1 : 0) - (this.cur.down ? 1 : 0);
    if (this.pad) {
      const sx = this.pad.axes[0] || 0, sy = -(this.pad.axes[1] || 0);
      if (Math.hypot(sx, sy) > 0.18) { ax = sx; ay = sy; this.lastDevice = 'pad'; }
    }
    const tv = this.touch && this.touch.contribute(this.cur);   // on-screen stick and buttons
    if (tv) { ax = tv[0]; ay = -tv[1]; this.lastDevice = 'touch'; }
    if (this.opts.invertY) ay = -ay;
    this.axis = [ax, ay];
    // mouse steering: the cursor is an absolute target in the corridor plane (only while the mouse is the active device)
    this.mouseTarget = (this.opts.mouseSteer && this.lastDevice === 'mouse' && this.mouse.inside)
      ? [(this.mouse.x - 0.5) * 2, -(this.mouse.y - 0.5) * 2 * (this.opts.invertY ? -1 : 1)] : null;
  }
  // one-key mode: Space, Shift, Enter, left click, a tap or any gamepad face button is the key
  oneKey() {
    if (['Space', 'ShiftLeft', 'ShiftRight', 'Enter', 'Mouse0', 'Touch'].some(k => this.keys.has(k))) return true;
    return !!(this.pad && [0, 1, 2, 3, 5, 7].some(b => this.pad.buttons[b] && this.pad.buttons[b].value > 0.4));
  }
  down(a) { return !!this.cur[a]; }
  pressed(a) { return !!this.cur[a] && !this.prev[a]; }
  released(a) { return !this.cur[a] && !!this.prev[a]; }
  any() { return ACTIONS.some(a => this.pressed(a)); }
}
function isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
