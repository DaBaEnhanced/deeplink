// On-screen touch controls (after Vertebra's): a floating thumb stick on one half of the screen, action buttons on the
// other. Feeds Input through held actions and an analogue vector; a DOM overlay, so it stays crisp at any size.
// Contexts: 'game' (a dive: stick + FIRE / SHIFT / LOCK / POWER / BOOST / pause), 'story' (storyboards: tap to turn the
// page, SKIP, AUTO), 'onekey' (one-key mode: the whole screen is the key, only pause), 'menu' (the DOM menus: nothing).
const CSS = `
#dltouch{position:fixed;inset:0;pointer-events:none;z-index:40;user-select:none;-webkit-user-select:none;touch-action:none;font-family:VT323,ui-monospace,Menlo,Consolas,monospace}
#dltouch.off{display:none}
#dltouch .zone{position:absolute;top:0;bottom:0;pointer-events:auto;touch-action:none}
#dltouch .zone.hide{display:none}
#dltouch .base,#dltouch .knob{position:absolute;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}
#dltouch .base{width:30vh;height:30vh;border:2px solid rgba(64,240,255,.4);background:radial-gradient(circle,rgba(0,20,30,.35) 40%,rgba(0,0,0,.12));box-shadow:inset 0 0 2vh rgba(0,0,0,.6),0 0 2vh rgba(64,240,255,.15)}
#dltouch .knob{width:13vh;height:13vh;background:radial-gradient(circle at 35% 30%,#e8ffff,#3ad0e8 55%,#06485a);border:2px solid rgba(0,0,0,.7);box-shadow:0 0 2.5vh rgba(64,240,255,.55)}
#dltouch.idle .base,#dltouch.idle .knob{opacity:.35}
#dltouch .base.hide,#dltouch .knob.hide{display:none}
#dltouch .btn{position:absolute;pointer-events:auto;touch-action:none;border-radius:50%;display:flex;align-items:center;justify-content:center;
 color:#dffcff;font-size:3vh;letter-spacing:.06em;text-shadow:0 0 1vh rgba(64,240,255,.8),0 1px 0 #000;
 background:radial-gradient(circle at 40% 30%,rgba(20,70,90,.7),rgba(0,12,20,.65) 70%);border:2px solid rgba(64,240,255,.55);
 box-shadow:inset 0 0 1.5vh rgba(0,0,0,.7),0 0 1vh rgba(0,0,0,.5);transform:translate(-50%,50%)}
#dltouch .btn.big{font-size:3.6vh;background:radial-gradient(circle at 40% 30%,rgba(40,170,200,.8),rgba(0,40,60,.75) 70%);border-color:rgba(140,250,255,.85)}
#dltouch .btn.shift{font-size:3.2vh;color:#ffe6fa;text-shadow:0 0 1vh rgba(255,80,200,.9),0 1px 0 #000;background:radial-gradient(circle at 40% 30%,rgba(190,40,150,.8),rgba(50,0,40,.75) 70%);border-color:rgba(255,120,220,.85)}
#dltouch .btn.on{filter:brightness(1.7);border-color:#ffffff}
#dltouch .btn.ready{animation:dlglow .5s ease-in-out infinite alternate;border-color:#ffe060}
#dltouch .btn.small{font-size:2.4vh}
#dltouch .btn.hide{display:none}
@keyframes dlglow{from{box-shadow:0 0 1vh rgba(255,224,96,.4)}to{box-shadow:0 0 3.5vh rgba(255,224,96,.95)}}
#dlrot{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;text-align:center;background:#000;color:#9ff;font:28px/1.4 VT323,ui-monospace,monospace;padding:24px}
@media (orientation:portrait){#dltouch.on~#dlrot{display:flex}}
`;
// [actions, key code sent to the key listeners, label, x from the outer edge (vh), y from the bottom (vh), size (vh), class, contexts]
const BUTTONS = [
  [['fire'], null, 'FIRE', 18, 14, 25, 'big', 'game'],
  [['shift'], null, 'SHIFT', 44, 8, 19, 'shift', 'game'],
  [['lock'], null, 'LOCK', 42, 30, 15, '', 'game'],
  [['power'], null, 'POWER', 20, 44, 14, 'small', 'game'],
  [['boost'], null, 'BOOST', 66, 6, 13, 'small', 'game'],
  [[], 'Escape', 'SKIP', 18, 14, 18, '', 'story'],
  [[], 'KeyA', 'AUTO', 40, 8, 14, 'small', 'story'],
  [[], 'Escape', 'II', 9, 78, 11, 'small', 'game onekey'],
];

export class Touch {
  constructor(input) {
    this.input = input;
    this.held = new Map();          // pointerId -> actions
    this.latched = new Set();
    this.stick = null;              // {id, ox, oy}
    this.vec = [0, 0];
    this.mode = 'auto'; this.swap = false; this.ctx = 'menu';
    // Auto: on only where touch is the main input (phones, tablets: no hover, coarse pointer). A Windows PC with a
    // touchscreen or a touchpad reports touch points too, so there they appear only after an actual touch.
    this.active = matchMedia('(hover: none) and (pointer: coarse)').matches;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = this.root = document.createElement('div'); root.id = 'dltouch';
    const zone = this.zone = document.createElement('div'); zone.className = 'zone';
    const base = this.base = document.createElement('div'); base.className = 'base';
    const knob = this.knob = document.createElement('div'); knob.className = 'knob';
    root.append(zone, base, knob);
    this.btns = BUTTONS.map(([acts, code, label, x, y, s, cls, ctx]) => {
      const b = document.createElement('div'); b.className = 'btn ' + cls; b.textContent = label;
      Object.assign(b.style, { width: s + 'vh', height: s + 'vh', bottom: (y + 3) + 'vh' });
      const o = { el: b, acts, code, x, ctx: ctx.split(' '), label };
      b.addEventListener('pointerdown', (e) => {
        this.first(e); b.setPointerCapture(e.pointerId); this.held.set(e.pointerId, acts); for (const a of acts) this.latched.add(a); b.classList.add('on');
        if (code) for (const f of this.input.listeners) f(code, e);       // Escape (pause / skip), A (auto pages)
        if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(8); } catch (_) { /* */ }
      });
      const up = (e) => { this.held.delete(e.pointerId); b.classList.remove('on'); e.stopPropagation(); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      root.appendChild(b); return o;
    });
    zone.addEventListener('pointerdown', (e) => {
      this.first(e); if (this.stick) return;
      zone.setPointerCapture(e.pointerId);
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; this.moveStick(e); root.classList.remove('idle');
    });
    zone.addEventListener('pointermove', (e) => { if (this.stick && e.pointerId === this.stick.id) this.moveStick(e); });
    const end = (e) => { if (this.stick && e.pointerId === this.stick.id) { this.stick = null; this.vec = [0, 0]; root.classList.add('idle'); this.layout(); } e.stopPropagation(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    const rot = document.createElement('div'); rot.id = 'dlrot'; rot.textContent = 'Turn your device sideways to dive.';
    document.body.append(root, rot);
    const hide = () => { if (this.mode === 'auto' && this.active) { this.active = false; this.apply(); } };
    addEventListener('keydown', hide);
    addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { if (!this.active && this.mode === 'auto') { this.active = true; this.apply(); } }
      else if (e.pointerType === 'mouse' || e.pointerType === 'pen') hide();   // a mouse click hides them again
    }, true);
    addEventListener('gamepadconnected', hide);
    addEventListener('resize', () => this.layout());
    this.apply();
  }
  first(e) {
    e.preventDefault(); e.stopPropagation();
    this.input.lastDevice = 'touch';
    if (this.input.onFirstTouch) this.input.onFirstTouch();
    if (!this.fs && document.documentElement.requestFullscreen && matchMedia('(pointer: coarse)').matches) {
      this.fs = true;
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    }
  }
  moveStick(e) {
    const s = this.stick, R = innerHeight * 0.13;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy);
    if (m > R) { s.ox += dx * (1 - R / m); s.oy += dy * (1 - R / m); dx = e.clientX - s.ox; dy = e.clientY - s.oy; }   // the base trails the thumb
    this.vec = [dx / R, dy / R];
    this.base.style.left = s.ox + 'px'; this.base.style.top = s.oy + 'px';
    this.knob.style.left = (s.ox + dx) + 'px'; this.knob.style.top = (s.oy + dy) + 'px';
  }
  configure(mode, swap) { mode = mode || 'auto'; swap = !!swap; if (mode === this.mode && swap === this.swap) return; this.mode = mode; this.swap = swap; this.apply(); }
  shown() { return this.mode === 'on' || (this.mode === 'auto' && this.active); }
  apply() {
    const on = this.shown();
    this.root.className = (on ? 'on' : 'off') + (this.stick ? '' : ' idle');
    if (!on) { this.held.clear(); this.stick = null; this.vec = [0, 0]; }
    this.layout();
  }
  // ctx: 'game' | 'story' | 'onekey' | 'menu'; ready: Neural power charged
  setContext(ctx, ready) {
    if (ctx !== this.ctx) { this.ctx = ctx; this.held.clear(); if (ctx !== 'game') { this.stick = null; this.vec = [0, 0]; } this.layout(); }
    const b = this.btns[3].el; b.style.opacity = ready === null ? '0.35' : ''; if (b.classList.contains('ready') !== !!ready) b.classList.toggle('ready', !!ready);
  }
  layout() {
    const btnSide = this.swap ? 'left' : 'right', stickSide = this.swap ? 'right' : 'left', vh = innerHeight / 100, game = this.ctx === 'game';
    for (const b of this.btns) {
      b.el.classList.toggle('hide', !b.ctx.includes(this.ctx));
      const px = b.x * vh;
      b.el.style.left = (btnSide === 'left' ? px : innerWidth - px) + 'px';
    }
    this.zone.classList.toggle('hide', !game); this.base.classList.toggle('hide', !game); this.knob.classList.toggle('hide', !game);
    Object.assign(this.zone.style, stickSide === 'right' ? { left: '50vw', right: '0' } : { left: '0', right: '50vw' });
    if (!this.stick) {
      const x = stickSide === 'right' ? innerWidth - 24 * vh : 24 * vh, y = innerHeight - 26 * vh;
      this.base.style.left = this.knob.style.left = x + 'px'; this.base.style.top = this.knob.style.top = y + 'px';
    }
  }
  // merged into Input.update(): held / tapped actions, and the stick as an analogue vector (y down)
  contribute(cur) {
    if (!this.shown()) return null;
    for (const acts of this.held.values()) for (const a of acts) cur[a] = true;
    for (const a of this.latched) cur[a] = true;
    this.latched.clear();
    const [x, y] = this.vec, m = Math.hypot(x, y);
    if (m < 0.12) return null;
    const k = Math.min(1, (m - 0.12) / 0.88) / m;   // a small dead zone, then linear
    return [Math.max(-1, Math.min(1, x * k)), Math.max(-1, Math.min(1, y * k))];
  }
}
