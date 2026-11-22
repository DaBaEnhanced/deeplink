// Screens (bible §12.3, §18): boot sequence, title and attract mode, the 1996 desktop menus, options (game, video, audio,
// controls, accessibility), the lab (storyboards, brain-scan mod screen, contract board, evidence and fragment trackers,
// dialogue choices), results, pause / disconnection, Free Dive, Remix, Endless Deep, Custom Music, Time Attack, gallery,
// credits, and the story flow that ties it all together.
import { STORY, CONTRACTS, DIVE, LAYER_NAMES, TYPE_NAMES, REWARD_TEXT, WEIGHT_TEXT } from '../story/dives.js';
import { MODS, MOD_IDS, offers, modDrift } from '../story/mods.js';
import { SEQUENCES, endingSequence, single, CHOICES, LORE } from '../story/sequences.js';
import { boardState, applyDive, installMod, endingOptions, resolveEnding, AFTER_STORY, storyDive } from '../story/campaign.js';
import { newCampaign, loadCampaign, saveCampaign, clearCampaign, DEFAULT_OPTIONS } from '../core/save.js';
import { ACTIONS, ACTION_NAMES, DEFAULT_KEYS } from '../core/input.js';
import { KITS } from '../dive/layers.js';
import { rng } from '../core/rng.js';
import { panelImage } from '../panels/player.js';
import { features, analyse, finishMap } from '../audio/analysis.js';

const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIT_OF_LAYER = ['calibration', 'grid_city', 'chrome_sea', 'firewall', 'archive', 'fractal', 'garden', 'black_ice', 'core'];

// set an element's background to a panel image as soon as it has loaded (images load asynchronously: reading
// panelImage(id).img right away left portraits / thumbnails blank when the file was not in the cache yet)
// "— 9 of 24 (twice as many on Easy / Normal)" for counted objectives, "— at least 55%" for the others
function objBrief(o, diff) {
  if (!['collect', 'destroy', 'gates'].includes(o.kind)) return o.need ? ` — at least ${Math.round(o.need * 100)}%` : '';
  const easier = !diff || diff === 'easy' || diff === 'normal', mult = easier ? (o.kind === 'destroy' ? 1.5 : 2) : 1;
  const n = Math.round((o.n || 10) * mult), need = Math.max(1, Math.ceil((o.n || 10) * (o.need || 0.7)));
  return ` — ${need} of ${n}${easier ? ' (extra ones on Easy / Normal)' : ''}`;
}
function bgPanel(el, id, extra = () => true) {
  if (!el) return; const im = panelImage(id);
  const set = () => { if (im.img) { if (extra()) el.style.backgroundImage = `url(${im.img.src})`; } else if (!im.tried) setTimeout(set, 120); };
  set();
}
export class Screens {
  constructor(game) { this.g = game; this.ui = game.ui; this.keyHandlers = []; this.idle = 0; }
  clear() { this.ui.innerHTML = ''; this.keyHandlers = []; this.canvasDraw = null; }
  onKey(code) { for (const f of [...this.keyHandlers]) f(code); }
  update(dt) {
    if (this.state === 'title') { this.idle += dt; if (this.idle > 28 && !this.g.dive) this.attract(); }
  }
  win(title, body, o = {}) {
    const w = h(`<div class="win ${o.center === false ? '' : 'center'}" style="${o.style || ''}"><div class="tb"><span>${esc(title)}</span>${o.close ? '<span class="x">×</span>' : ''}</div><div class="body"></div></div>`);
    const b = w.querySelector('.body'); if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    if (o.close) w.querySelector('.x').onclick = o.close;
    (o.parent || this.ui).appendChild(w);
    return w;
  }
  button(parent, label, fn, o = {}) {
    const b = h(`<button class="btn ${o.inline ? 'inl' : ''}">${label}</button>`);
    if (o.disabled) b.disabled = true;
    b.onclick = () => { this.g.audio.unlock(); this.g.audio.play('ui_ok'); fn(); };
    b.onmouseenter = () => this.g.audio.play('ui_move');
    parent.appendChild(b); return b;
  }
  toast(text, dur = 2.5) {
    let t = document.getElementById('toast'); if (t) t.remove();
    t = h(`<div id="toast">${esc(text)}</div>`); this.ui.appendChild(t);
    setTimeout(() => t.remove(), dur * 1000);
  }
  loading(text) { this.clear(); this.ui.appendChild(h(`<div class="center" style="font-size:34px;color:#9ff">${esc(text)}<br><span style="font-size:22px;color:#888">LINKING…</span></div>`)); }
  // ============================================================================================ boot
  boot() {
    this.clear(); this.state = 'boot';
    const el = h('<div id="boot"></div>'); this.ui.appendChild(el);
    el.textContent = 'CEREBRA SYSTEMS  BIOS v2.04\n(C) 1994-1996 CEREBRA SYSTEMS GmbH\n\nCLICK, TAP OR PRESS ANY KEY TO POWER ON_';
    const go = () => {
      if (this.state !== 'boot') return; this.state = 'boot2'; this.g.audio.unlock(); this.g.audio.play('boot');
      const lines = ['CEREBRA SYSTEMS  BIOS v2.04', '(C) 1994-1996 CEREBRA SYSTEMS GmbH', '', 'CPU : MIPS R4400 150 MHz  x4', 'MEMORY TEST : ', '', 'Detecting IDE drives ... DLINK-HD 2.1 GB', 'Detecting neural interface ... DEEPLINK RIG MK III  OK', 'Helmet ........ OK', 'Data glove .... OK', 'Chair ......... OK', '', 'Loading DLINK.SYS', 'Loading DEEP.DRV', 'Dialing the Deep ...', '', 'C:\\> DEEPLINK.EXE'];
      let i = 0, mem = 0;
      const tick = () => {
        if (this.state !== 'boot2') return;
        if (i === 4 && mem < 65536) { mem += 4096; el.textContent = lines.slice(0, 4).join('\n') + '\n' + lines[4] + mem + ' KB'; setTimeout(tick, 18); return; }
        if (i === 14) this.g.audio.play('modem');
        i++; el.textContent = lines.slice(0, i).join('\n').replace(lines[4], lines[4] + '65536 KB OK');
        if (i < lines.length) setTimeout(tick, i === 14 ? 1600 : 90 + Math.random() * 120); else setTimeout(() => { if (this.state === 'boot2') this.title(); }, 700);
      };
      tick();
    };
    this.keyHandlers.push(() => (this.state === 'boot' ? go() : this.state === 'boot2' ? this.title() : 0));
    el.onclick = () => (this.state === 'boot' ? go() : this.title());
  }
  // ============================================================================================ title
  async title() {
    this.g.endDive(); this.clear(); this.state = 'title'; this.idle = 0; this.g.state = 'menu';
    const t = h(`<div id="title"><div class="bg"></div><div class="logo">DEEPLINK</div><div class="sub">1 9 9 6</div><div class="press">${matchMedia('(hover: none) and (pointer: coarse)').matches ? 'TAP TO START' : 'PRESS ANY KEY'}</div></div>`);
    this.ui.appendChild(t);
    const bg = panelImage('T-01'); const setBg = () => { if (bg.img) t.querySelector('.bg').style.backgroundImage = `url(${bg.img.src})`; else if (!bg.tried) setTimeout(setBg, 200); }; setBg();
    this.playMenuMusic('deeplink');
    const go = () => { if (this.state === 'title') this.menu(); };
    this.keyHandlers.push(go); t.onclick = go;
  }
  async playMenuMusic(id) {
    const a = this.g.audio; a.unlock();
    if (this.menuMusic === id && a.music) return;
    this.menuMusic = id;
    const loaded = await a.loadTrack(this.g.music[id]);
    if (this.menuMusic !== id) return;
    a.playMusic(loaded, { loop: true });
  }
  async attract() {
    if (this.attracting) return; this.attracting = true;
    const kits = ['calibration', 'grid_city', 'chrome_sea', 'firewall', 'fractal', 'black_ice'];
    const kit = kits[Math.floor(Math.random() * kits.length)];
    const dive = STORY.find(s => s.kit === kit);
    this.menuMusic = null;
    const s = await this.g.startDive({ dive: { ...dive, radio: [], tips: [] }, mode: 'attract', bot: true, invulnerable: true, from: 20 + Math.random() * 40, onEnd: () => this.title() });
    s.attract = true; this.attracting = false; this.state = 'attract';
    this.keyHandlers.push(() => { if (this.state === 'attract') { this.g.endDive(); this.title(); } });
  }
  // ============================================================================================ menu
  menu() {
    this.g.endDive(); this.clear(); this.state = 'menu'; this.g.state = 'menu';
    this.playMenuMusic('deeplink');
    this.ui.appendChild(h(`<div id="title" style="justify-content:flex-start;padding-top:6vh"><div class="bg" style="opacity:.25"></div><div class="logo" style="font-size:min(12vw,130px)">DEEPLINK</div></div>`));
    bgPanel(this.ui.querySelector('#title .bg'), 'T-01');
    const camp = loadCampaign();
    const w = this.win('DEEPLINK.EXE', '', { style: 'width:420px;top:62%' });
    const b = w.querySelector('.body');
    const rec = this.g.records;
    if (camp && camp.stage !== 'done') this.button(b, `▶ Continue story <span class="muted">— layer ${camp.layer}: ${LAYER_NAMES[camp.layer]}</span>`, () => this.continueStory());
    this.button(b, camp && camp.stage !== 'done' ? 'New story' : '▶ Story', () => { if (camp && camp.stage !== 'done' && !confirmBox()) return; clearCampaign(); const c = newCampaign(); saveCampaign(c); this.continueStory(); });
    const anyCleared = Object.keys(rec.cleared).length > 0;
    this.button(b, 'Free Dive', () => this.freeDive(), { disabled: !anyCleared });
    this.button(b, 'Endless Deep', () => this.endless(), { disabled: !anyCleared });
    this.button(b, 'Custom Music <span class="muted">(experimental)</span>', () => this.customMusic());
    this.button(b, 'Time Attack', () => this.timeAttack(), { disabled: !STORY.some(s => s.boss && rec.cleared[s.id]) });
    this.button(b, 'Gallery', () => this.gallery());
    this.button(b, 'Options', () => this.options(() => this.menu()));
    this.button(b, 'Credits', () => this.credits(false));
    this.keyHandlers.push(c => { if (c === 'Escape') this.title(); });
    function confirmBox() { return window.confirm('Start a new story? The current one will be lost.'); }
  }
  // ============================================================================================ options
  options(back) {
    this.clear(); const o = this.g.opts;
    const tabs = { Game: '', Video: '', Audio: '', Controls: '', Access: '' };
    const w = this.win('OPTIONS', `<div class="tabs">${Object.keys(tabs).map((t, i) => `<div class="tab ${i ? '' : 'on'}" data-t="${t}">${t}</div>`).join('')}</div><div class="tabpane"></div><div class="row" style="margin-top:8px"></div>`, { style: 'width:min(640px,94vw)' });
    const pane = w.querySelector('.tabpane');
    const sel = (key, label, choices) => `<label class="opt">${label}<select data-k="${key}">${choices.map(([v, l]) => `<option value="${v}" ${String(o[key]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    const chk = (key, label) => `<label class="opt">${label}<input type="checkbox" data-k="${key}" ${o[key] ? 'checked' : ''}></label>`;
    const rng_ = (key, label, a, b, st) => `<label class="opt">${label}<input type="range" data-k="${key}" min="${a}" max="${b}" step="${st}" value="${o[key]}"></label>`;
    const render = (t) => {
      w.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.dataset.t === t));
      if (t === 'Game') pane.innerHTML = sel('difficulty', 'Difficulty', [['easy', 'Easy (more integrity, assists)'], ['normal', 'Normal'], ['hard', 'Hard (more ICE, faster)'], ['deep', 'Deep (one hit disconnects)']]) + rng_('gameSpeed', 'Game speed (70–100%)', 0.7, 1, 0.05) + sel('controlMode', 'Control mode', [['standard', 'Standard'], ['onekey', 'One-key (autopilot flies; tap = Shift, hold = slow time)']]) + chk('mouseSteer', 'Mouse steering') + rng_('mouseSens', 'Mouse sensitivity', 0.4, 2.5, 0.1) + chk('invertY', 'Invert vertical');
      if (t === 'Video') pane.innerHTML = sel('res', 'Internal resolution', [['auto', 'Fill the screen (auto)'], ['4:3', '400 × 300 (4:3)'], ['16:9', '480 × 270 (16:9)']]) + chk('hires', 'Clean high-res mode') + chk('dither', '15-bit ordered dither') + chk('crt', 'CRT filter') + chk('wobble', 'Vertex wobble (mid-90s console)') + rng_('bloom', 'Bloom', 0, 1.5, 0.1) + sel('trailerSize', 'Trailer video size', [[1080, '1920 × 1080'], [1440, '2560 × 1440'], [2160, '3840 × 2160']]) + sel('trailerMbps', 'Trailer video bitrate', [[40, '40 Mbps'], [80, '80 Mbps'], [150, '150 Mbps']]);
      if (t === 'Audio') pane.innerHTML = rng_('musicVol', 'Music', 0, 1, 0.05) + rng_('sfxVol', 'Effects', 0, 1, 0.05);
      if (t === 'Access') pane.innerHTML = chk('autoFire', 'Auto-fire') + chk('autoLock', 'Auto-lock') + chk('wideGates', 'Wider gates and openings') + chk('lowFlash', 'Low-flash mode (breaches, Overdrive)') + rng_('shake', 'Screen shake', 0, 1, 0.1) + sel('colorBlind', 'Colour-blind bullets', [['off', 'Off'], ['protan', 'Protanopia'], ['deutan', 'Deuteranopia'], ['tritan', 'Tritanopia']]) + chk('subtitles', 'Subtitles for all voices') + chk('beatIndicator', 'Visual beat indicator');
      if (t === 'Controls') {
        const keys = { ...DEFAULT_KEYS, ...(o.keys || {}) };
        pane.innerHTML = sel('touch', 'Touch controls', [['auto', 'Auto (on a touch screen)'], ['on', 'On'], ['off', 'Off']]) + sel('touchSwap', 'Touch layout', [['false', 'Stick left, buttons right'], ['true', 'Stick right, buttons left']]) + '<div class="muted" style="font-size:18px">Click a binding, then press a key (Esc cancels). Gamepads use the standard layout: left stick, RT fire, LT lock, LB/RB roll, X shift worlds, A boost, B brake, Y power.</div>' +
          ACTIONS.map(a => `<label class="opt">${ACTION_NAMES[a]}<button class="btn inl" data-bind="${a}" style="min-width:260px">${(keys[a] || []).join(' / ')}</button></label>`).join('') + '<button class="btn inl" data-reset>Reset controls</button>';
        pane.querySelectorAll('[data-bind]').forEach(btn => btn.onclick = () => {
          btn.textContent = '…press a key…';
          this.g.input.capture = (code) => { if (code !== 'Escape') { o.keys = { ...(o.keys || {}), [btn.dataset.bind]: [code, ...((keys[btn.dataset.bind] || []).filter(k => k.startsWith('Mouse')))] }; this.g.saveOptions(); } render('Controls'); };
        });
        pane.querySelector('[data-reset]').onclick = () => { o.keys = null; this.g.saveOptions(); render('Controls'); };
      }
      pane.querySelectorAll('[data-k]').forEach(inp => inp.onchange = () => {
        const k = inp.dataset.k; o[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? +inp.value : inp.value; this.g.saveOptions();
      });
    };
    w.querySelectorAll('.tab').forEach(x => x.onclick = () => render(x.dataset.t));
    render('Game');
    const row = w.querySelector('.row');
    this.button(row, 'OK', () => back(), { inline: true });
    this.button(row, 'Defaults', () => { Object.assign(o, DEFAULT_OPTIONS); this.g.saveOptions(); this.options(back); }, { inline: true });
    if (!this.g.dive) { // the trailer: ~100 s on the title theme; Record saves it as a 1080p video file
      this.button(row, '▶ Trailer', () => this.g.startTrailer(false, () => this.options(back)), { inline: true });
      this.button(row, '● Record trailer', () => this.g.startTrailer(true, () => this.options(back)), { inline: true });
    }
    this.keyHandlers.push(c => { if (c === 'Escape') back(); });
  }
  // ============================================================================================ pause / fail / results
  pause() {
    const d = this.g.dive; if (!d || d.attract || this.pauseEls) return;
    d.pause();
    const bgEl = h('<div class="modal-bg"></div>'); this.ui.appendChild(bgEl);
    const w = this.win('PAUSED', '', { style: 'width:360px' }); const b = w.querySelector('.body');
    this.pauseEls = [bgEl, w];
    this.button(b, 'Resume', () => this.closePause());
    this.button(b, 'Reconnect at section start', () => { this.closePause(true); d.reconnect(); });
    this.button(b, 'Restart dive', () => { this.closePause(true); d.restart(); });
    this.button(b, 'Options', () => { this.closePause(true); this.options(() => { this.clear(); this.pause(); }); });
    this.button(b, 'Abort dive', () => { this.closePause(true); const cb = this.abortTo; this.g.endDive(); this.g.audio.resume(); (cb || (() => this.menu()))(); });
  }
  closePause(keep) { if (this.pauseEls) this.pauseEls.forEach(e => e.remove()); this.pauseEls = null; if (!keep && this.g.dive) this.g.dive.resume(); }
  disconnected(d, retryCb, quitCb) {
    this.clear();
    const w = this.win('DISCONNECTED', '<div style="font-size:30px;color:#a00;text-align:center">— LINK LOST —</div><div class="muted" style="text-align:center">Integrity reached zero.</div>', { style: 'width:400px' });
    const b = w.querySelector('.body');
    this.button(b, 'Reconnect at section start', () => { this.clear(); d.reconnect(); });
    this.button(b, 'Restart dive', () => { this.clear(); d.restart(); });
    this.button(b, 'Abort', () => { this.g.endDive(); quitCb(); });
  }
  results(res, s, cfg, next) {
    const d = cfg.dive;
    if (res.failed) { this.disconnected(s, null, () => (next ? next(null) : this.menu())); s.onEnd = (r) => this.results(r, s, cfg, next); return; }
    this.g.audio.stopMusic(1.5);
    this.clear();
    const rec = this.g.records;
    const key = d.id + (cfg.remix ? '_remix' : '');
    const prevBest = rec.best[key] || 0; if (res.score > prevBest) rec.best[key] = res.score;
    const order = ['D', 'C', 'B', 'A', 'S', 'SS'];
    if (!rec.ranks[key] || order.indexOf(res.rank) > order.indexOf(rec.ranks[key])) rec.ranks[key] = res.rank;
    rec.cleared[d.id] = rec.ranks[key]; this.g.saveRecords();
    const obj = d.objective;
    const objLine = obj ? `<div class="stat"><span>${esc(obj.label)}</span><span style="color:${res.objOk ? '#060' : '#a00'}">${res.refused ? 'REFUSED' : res.objOk ? 'COMPLETE' : 'FAILED'} (${Math.round(res.objVal * 100)}%)</span></div>` : '';
    const body = `<div class="row" style="align-items:flex-start;gap:20px"><div><div class="rank">${res.rank}</div><div style="text-align:center">${res.score > prevBest ? 'NEW BEST' : 'BEST ' + prevBest}</div></div><div style="flex:1;min-width:300px">
      <div class="stat"><span>SCORE</span><span>${res.score}</span></div><div class="stat"><span>ICE DESTROYED</span><span>${Math.round(res.killPct * 100)}%</span></div>
      <div class="stat"><span>GATES</span><span>${Math.round(res.gatePct * 100)}%</span></div><div class="stat"><span>HITS TAKEN</span><span>${res.hits}</span></div>
      <div class="stat"><span>AVERAGE SYNC</span><span>×${res.avgSync.toFixed(1)}</span></div><div class="stat"><span>BEST LOCK CHAIN</span><span>${res.chain}</span></div><div class="stat"><span>CLEAN SHIFTS</span><span>${res.cleanShifts || 0}/${res.shifts || 0}</span></div><div class="stat"><span>ABSORBED · WORLD CHAIN</span><span>${res.absorbed || 0} · ×${res.sideChain || 0}</span></div>
      ${res.boss ? `<div class="stat"><span>BOSS</span><span>${res.boss === 'juno' ? `CHASE ${Math.round((res.chase || 0) * 100)}%` : res.bossKilled ? 'DESTROYED ON THE DOWNBEAT' : 'ESCAPED'}</span></div>` : ''}
      ${res.secrets ? `<div class="stat"><span>SECRETS</span><span>${res.secrets}</span></div>` : ''}${objLine}</div></div>`;
    const w = this.win(`DIVE COMPLETE — ${d.title.toUpperCase()}`, body, { style: 'width:min(720px,94vw)' });
    const row = h('<div class="row" style="margin-top:10px"></div>'); w.querySelector('.body').appendChild(row);
    if (next) this.button(row, 'Continue', () => next(res), { inline: true });
    else {
      this.button(row, 'Dive again', () => this.g.startDive({ ...cfg, from: 0 }), { inline: true });
      this.button(row, 'Menu', () => this.menu(), { inline: true });
    }
  }
  // ============================================================================================ story
  campaign() { return loadCampaign() || newCampaign(); }
  save(c) { saveCampaign(c); }
  async playSeq(seq, done, drift = 0, music = 'lab_hum') {
    this.clear(); this.g.endDive(); this.g.state = 'story';
    if (music) this.playMenuMusic(music);
    this.g.audio.ambience(true);
    for (const pg of seq.pages) for (const r of pg.rows) for (const p of r) this.g.records.gallery[p.id] = 1;
    this.g.saveRecords();
    const hint = h('<div style="position:absolute;right:12px;top:8px;pointer-events:auto"></div>'); this.ui.appendChild(hint);
    this.button(hint, 'Skip ▸▸', () => this.g.panels.skip(), { inline: true });
    this.g.panels.play(seq, { drift, onDone: () => { this.g.state = 'menu'; this.clear(); done(); } });
  }
  continueStory() {
    const c = this.campaign();
    if (c.stage === 'intro') return this.playSeq(SEQUENCES.intro, () => { c.stage = 'story'; this.save(c); this.runStoryDive(c, storyDive(0)); }, 0, 'deeplink');
    if (c.stage === 'ending') return this.ending(c);
    this.lab(c);
  }
  runStoryDive(c, dive) {
    this.abortTo = () => this.lab(this.campaign());
    const cfg = { dive, mode: 'story', camp: c, mods: c.mods, drift: c.drift, equipped: c.equipped.active, suspicion: c.suspicion && dive.layer > 1, choices: endingOptions(c) };
    cfg.onEnd = (res, s) => this.results(res, s, cfg, (r) => { if (!r) return this.lab(this.campaign()); this.afterStory(c, dive, r); });
    if (dive.final && !c.backdoor) { cfg.suspicion = true; this.toast("No backdoor: CEREBRA's ICE is waiting at full strength.", 4); }
    this.g.startDive(cfg).then(s => { s.label = dive.layer === 0 ? 'DIVE 00' : `DIVE ${String(dive.layer).padStart(2, '0')} · LAYER ${dive.layer}`; });
  }
  afterStory(c, dive, res) {
    applyDive(c, dive, res);
    if (dive.final) { c.ending = resolveEnding(c, res.choice || 'come_back'); c.stage = 'ending'; this.save(c); return this.ending(c); }
    const seq = SEQUENCES[AFTER_STORY[dive.layer]];
    const nextLayer = dive.layer + 1;
    const then = () => this.modOffer(c, 2, () => { c.layer = nextLayer; c.stage = 'board'; this.save(c); this.dialogue(c, nextLayer, () => this.lab(c)); });
    this.save(c);
    this.playSeq(seq, then, c.drift);
  }
  runContract(c, dive) {
    this.abortTo = () => this.lab(this.campaign());
    const cfg = { dive, mode: 'story', camp: c, mods: c.mods, drift: c.drift, equipped: c.equipped.active };
    cfg.onEnd = (res, s) => this.results(res, s, cfg, (r) => { if (!r) return this.lab(this.campaign()); this.afterContract(c, dive, r); });
    this.g.startDive(cfg).then(s => { s.label = `${TYPE_NAMES[dive.type].toUpperCase()} · ${dive.who.toUpperCase()}`; });
  }
  afterContract(c, dive, res) {
    const out = applyDive(c, dive, res); this.save(c);
    const steps = [];
    if (out.outcome && (res.objOk || res.refused)) steps.push(done => this.playSeq(single(out.outcome, out.outcomeVariant), done, c.drift));
    if (out.evidence) steps.push(done => { this.toast(`+1 EVIDENCE  (${c.evidence}/7 in Pike's folder)`, 3); done(); });
    if (out.fragment) steps.push(done => { this.toast(`+1 JUNO FRAGMENT  (${c.fragments}/7)`, 3); done(); });
    if (out.lore) steps.push(done => this.lore(out.lore, done));
    if (out.modOffer) steps.push(done => this.modOffer(c, 3, done));
    if (!res.objOk && !res.refused) steps.push(done => { this.toast('Contract failed — no reward. You can retry it from the board.', 3); done(); });
    const run = () => { const s = steps.shift(); if (s) s(run); else { this.save(c); this.lab(c); } };
    run();
  }
  lore(id, done) {
    this.clear(); this.g.state = 'menu';
    const text = LORE[id] || id;
    const w = this.win('JUNO FRAGMENT', `<div class="sunk" style="font-family:'Patrick Hand';font-size:26px;line-height:1.25;max-width:560px">${esc(text)}</div>`, { style: 'width:min(620px,92vw)' });
    this.button(w.querySelector('.body'), 'Keep it', () => done());
  }
  modOffer(c, count, done) {
    const R = rng(Date.now() & 0xffff);
    const list = offers(c, count, R, c.layer);
    if (!list.length) return done();
    this.clear(); this.g.state = 'menu';
    const w = this.win(count === 3 ? 'CEREBRA PAYS: CHOOSE A MOD' : 'NEURAL MOD AVAILABLE', `<div class="muted" style="font-size:19px">Every mod changes Theo's mind. Current Drift: <b>${c.drift}</b></div><div class="row" style="align-items:stretch;margin-top:8px"></div>`, { style: 'width:min(900px,96vw)' });
    const row = w.querySelector('.row');
    for (const o of list) {
      const m = MODS[o.id]; const dd = modDrift(o.id, o.tier);
      const card = h(`<div class="modcard"><h3>${m.name}${o.tier > 1 ? ' ' + 'I'.repeat(o.tier) : ''}</h3><div class="tag">${m.type}</div><p>${esc(m.desc)}</p>${m.cost ? `<p>Cost: ${m.cost} Flow</p>` : ''}<p style="color:#a0f"><b>+${dd} DRIFT</b> → ${Math.min(100, c.drift + dd)}</p></div>`);
      card.onclick = () => { this.g.audio.play('ui_ok'); installMod(c, o.id, o.tier); this.save(c); done(); };
      row.appendChild(card);
    }
    this.button(w.querySelector('.body'), 'Decline (no Drift)', () => done());
  }
  dialogue(c, layer, done) {
    const ch = CHOICES[layer]; if (!ch || c.choicesDone[layer]) return done();
    this.clear(); this.g.state = 'menu';
    const w = this.win(`${ch.who.toUpperCase()}`, `<div class="row" style="align-items:flex-start"><div class="portrait" style="width:240px;height:160px;border:2px solid #000;background:#ccc center/cover;filter:grayscale(1)"></div><div style="flex:1;font-family:'Comic Neue';font-weight:700;font-size:22px;text-transform:uppercase" class="sunk">${esc(ch.q)}</div></div><div class="opts" style="margin-top:8px"></div>`, { style: 'width:min(760px,94vw)' });
    bgPanel(w.querySelector('.portrait'), ch.panel);
    const o = w.querySelector('.opts');
    for (const a of ch.a) this.button(o, `“${esc(a.t)}”${a.drift ? ` <span class="muted">(+${a.drift} Drift)</span>` : ''}`, () => {
      for (const k in a.rel || {}) c.rel[k] = (c.rel[k] || 0) + a.rel[k];
      if (a.drift) c.drift = Math.min(100, c.drift + a.drift);
      c.choicesDone[layer] = a.t; this.save(c); done();
    });
  }
  // ---------------------------------------------------------------------------------------------- lab
  lab(c) {
    this.g.endDive(); this.clear(); this.state = 'lab'; this.g.state = 'menu';
    this.playMenuMusic('lab_hum'); this.g.audio.ambience(true);
    const st = boardState(c);
    const el = h(`<div id="lab"><div class="bg"></div><div class="hdr"><span>CEREBRA SYSTEMS · DEEPLINK PROGRAMME</span><span>LAYER ${c.layer} — ${LAYER_NAMES[c.layer].toUpperCase()}</span></div></div>`);
    this.ui.appendChild(el);
    const bg = panelImage('T-02'); const setBg = () => { if (bg.img) el.querySelector('.bg').style.backgroundImage = `url(${bg.img.src})`; else if (!bg.tried) setTimeout(setBg, 200); }; setBg();
    // brain scan / mods
    const mw = this.win('NEURAL MAP — T. BRANDT', '', { center: false, style: 'left:16px;top:54px;width:min(360px,30vw)', parent: el });
    const mb = mw.querySelector('.body');
    const cv = document.createElement('canvas'); cv.width = 330; cv.height = 220; cv.style.width = '100%'; cv.style.background = '#000'; mb.appendChild(cv);
    this.brain = { cv, c, t: 0 };
    mb.appendChild(h(`<div style="margin-top:6px">DRIFT ${c.drift}/100<div class="meter"><i style="width:${c.drift}%"></i><b style="left:40%"></b><b style="left:60%"></b></div><div class="muted" style="font-size:16px">under 40: she can be freed · 60+: he can ascend</div></div>`));
    const modsList = MOD_IDS.filter(id => c.mods[id]);
    mb.appendChild(h(`<div style="font-size:18px;margin-top:6px">${modsList.length ? modsList.map(id => `${MODS[id].name} ${'I'.repeat(c.mods[id])}`).join(' · ') : '<span class="muted">No mods installed.</span>'}</div>`));
    const actives = modsList.filter(id => MODS[id].type === 'active');
    if (actives.length) {
      const s = h(`<label class="opt">Neural power [F]<select>${actives.map(id => `<option value="${id}" ${c.equipped.active === id ? 'selected' : ''}>${MODS[id].name}</option>`).join('')}</select></label>`);
      s.querySelector('select').onchange = e => { c.equipped.active = e.target.value; this.save(c); };
      mb.appendChild(s);
    }
    // contract board
    const bw = this.win('CONTRACT BOARD', '', { center: false, style: 'left:calc(min(360px,30vw) + 32px);top:54px;width:min(560px,40vw);max-height:calc(100vh - 140px);overflow:auto', parent: el });
    const bb = bw.querySelector('.body');
    if (st.contracts.length) bb.appendChild(h(`<div class="muted" style="font-size:18px;margin-bottom:6px">Play at least one contract to unlock the story dive. Contracts close when the story dive is cleared.</div>`));
    for (const ct of st.contracts) {
      const status = ct.played ? { ok: '✔ DONE', fail: '✖ FAILED — retry', refused: '✖ REFUSED' }[ct.played] : '';
      const card = h(`<div class="card ${ct.played === 'ok' || ct.played === 'refused' ? 'done' : ''}"><div class="th"></div><div><h3>${esc(ct.title)}</h3><span class="tag ${ct.type}">${TYPE_NAMES[ct.type]}</span> <span class="muted">${esc(ct.who)} · ♪ ${esc(this.g.music[ct.track]?.title || '')}</span><div>${esc(ct.desc)}</div><div class="muted" style="font-size:16px">${REWARD_TEXT[ct.type]} — ${WEIGHT_TEXT[ct.type]}</div><b>${status}</b></div></div>`);
      bgPanel(card.querySelector('.th'), ct.briefing);
      card.onclick = () => { if (ct.played === 'ok' || ct.played === 'refused') return this.toast('Already done.'); this.g.audio.play('ui_ok'); this.briefing(c, ct); };
      bb.appendChild(card);
    }
    const sd = st.story;
    const sc = h(`<div class="card" style="${st.storyLocked ? 'opacity:.45' : ''}"><div class="th" style="background:#000;display:flex;align-items:center;justify-content:center;color:#9ff;font-size:36px;filter:none">${sd.layer}</div><div><h3>${esc(sd.title)}</h3><span class="tag story">STORY DIVE</span> <span class="muted">♪ ${esc(this.g.music[sd.track]?.title || '')}</span><div>${sd.final ? 'The Core. Every layer collapsing into one. The choice.' : 'The layer\'s story dive: boss, breach into the next layer.'}</div><b>${st.storyLocked ? 'LOCKED — play a contract first' : '▶ DIVE'}</b></div></div>`);
    sc.onclick = () => { if (st.storyLocked) return this.toast('Play at least one contract first.'); this.g.audio.play('ui_ok'); this.runStoryDive(c, sd); };
    bb.appendChild(sc);
    // trackers
    const tw = this.win('CASE FILES', '', { center: false, style: 'right:16px;top:54px;width:min(300px,24vw)', parent: el });
    const tb = tw.querySelector('.body');
    tb.appendChild(h(`<div>PIKE'S FOLDER — EVIDENCE<div class="slots">${Array.from({ length: 7 }, (_, i) => `<i class="${i < c.evidence ? 'on' : ''}"></i>`).join('')}</div><div class="muted" style="font-size:16px">5+ to bring Weyl down</div></div>`));
    const fc = document.createElement('canvas'); fc.width = 200; fc.height = 120; fc.style.cssText = 'width:100%;background:#fff;border:2px solid #000;margin-top:8px'; tb.appendChild(h('<div style="margin-top:8px">PRESSED GLASS FLOWER — JUNO FRAGMENTS</div>')); tb.appendChild(fc);
    drawFlower(fc, c.fragments);
    tb.appendChild(h(`<div style="font-size:18px;margin-top:6px">Lena ${sign(c.rel.lena)} · Pike ${sign(c.rel.pike)} · Weyl ${sign(c.rel.weyl)}${c.layer >= 5 ? ` · Juno ${sign(c.rel.juno)}` : ''}</div>`));
    // bottom buttons
    const bot = h('<div style="position:absolute;left:16px;bottom:14px;display:flex;gap:8px"></div>'); el.appendChild(bot);
    const lastSeq = c.layer > 0 ? SEQUENCES[AFTER_STORY[c.layer - 1]] : SEQUENCES.intro;
    this.button(bot, '◄ Storyboards', () => this.playSeq(lastSeq, () => this.lab(c), c.drift), { inline: true });
    this.button(bot, 'Options', () => this.options(() => this.lab(c)), { inline: true });
    this.button(bot, 'Save & quit to menu', () => { this.save(c); this.g.audio.ambience(false); this.menu(); }, { inline: true });
    this.canvasDraw = (g, W, H, dt) => this.drawBrain(dt);
    this.keyHandlers.push(code => { if (code === 'Escape') { this.save(c); this.g.audio.ambience(false); this.menu(); } });
  }
  drawBrain(dt) {
    const B = this.brain; if (!B || !B.cv.isConnected) return;
    B.t += dt; const g = B.cv.getContext('2d'), W = B.cv.width, H = B.cv.height, c = B.c;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2a6'; g.lineWidth = 1;
    // side-view brain outline (scanlines)
    for (let y = 20; y < H - 20; y += 4) { const k = (y - 20) / (H - 40); const w = Math.sqrt(Math.max(0, 1 - Math.pow(k * 2 - 1, 2))) * (W * 0.42) * (k > 0.75 ? 0.8 : 1); g.globalAlpha = 0.35; g.beginPath(); g.moveTo(W / 2 - w, y); g.lineTo(W / 2 + w * (k > 0.7 ? 0.7 : 1), y); g.stroke(); }
    g.globalAlpha = 1;
    for (const id of MOD_IDS) {
      const m = MODS[id], tier = c.mods[id]; const [rx, ry] = m.region;
      const x = W * 0.12 + rx * W * 0.76, y = 20 + ry * (H - 40);
      if (!tier) { g.strokeStyle = '#143'; g.strokeRect(x - 3, y - 3, 6, 6); continue; }
      const r = 8 + tier * 5 + Math.sin(B.t * 3 + rx * 10) * 2;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, m.type === 'active' ? '#fff' : '#9ff'); gr.addColorStop(1, 'rgba(0,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9ff'; g.font = '13px VT323'; g.fillText(m.name.toUpperCase(), x + r * 0.6, y - r * 0.6);
    }
    // drift static
    g.fillStyle = `rgba(255,255,255,${(c.drift / 400).toFixed(3)})`; for (let i = 0; i < c.drift; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 1);
    g.fillStyle = '#2a6'; g.font = '14px VT323'; g.fillText(`EEG ${(40 + c.drift * 0.6 + Math.sin(B.t * 5) * 3).toFixed(1)} Hz`, 6, H - 6);
  }
  briefing(c, ct) {
    this.clear(); this.g.state = 'menu';
    const def = this.g.panelDefs[ct.briefing] || { text: [] };
    const lines = def.text.map(t => `<div style="font-family:'Comic Neue';font-weight:700;text-transform:uppercase;font-size:20px">${t.kind === 'caption' ? '' : esc(t.who) + ': '}${esc(t.text)}</div>`).join('');
    const w = this.win(`${TYPE_NAMES[ct.type].toUpperCase()} — ${ct.title.toUpperCase()}`, `<div style="width:min(760px,86vw);aspect-ratio:${(def.aspect || '3:2').replace(':', '/')};max-height:52vh;background:#ccc center/contain no-repeat;border:2px solid #000" class="brief"></div><div class="sunk" style="margin-top:8px">${lines}<div style="margin-top:6px">${esc(ct.desc)}</div><div class="muted" style="font-size:18px">Objective: ${esc(ct.objective.label)}${objBrief(ct.objective, this.g.opts.difficulty)} · Reward: ${REWARD_TEXT[ct.type]} · ${WEIGHT_TEXT[ct.type]}</div></div><div class="row" style="margin-top:8px"></div>`, { style: 'width:min(800px,94vw)' });
    bgPanel(w.querySelector('.brief'), ct.briefing);
    const row = w.querySelector('.row');
    this.button(row, '▶ DIVE', () => this.runContract(c, DIVE[ct.id]), { inline: true });
    this.button(row, 'Back', () => this.lab(c), { inline: true });
    this.keyHandlers.push(code => { if (code === 'Escape') this.lab(c); });
  }
  ending(c) {
    const seq = endingSequence(c.ending, c);
    this.g.records.endings[c.ending] = 1; this.g.saveRecords();
    this.playSeq(seq, () => { c.stage = 'done'; this.save(c); this.credits(true); }, c.ending === 'ascend' ? 100 : c.drift, 'come_back');
  }
  // ============================================================================================ modes
  diveList(filter) { const rec = this.g.records; const open = d => rec.unlocked || rec.cleared[d.id] || (d.type !== 'story' && rec.cleared[storyDive(d.layer).id]); return [...STORY, ...[...CONTRACTS].sort((a, b) => a.layer - b.layer)].filter(open).filter(filter || (() => true)); }
  freeDive() {
    this.clear();
    const rec = this.g.records;
    const w = this.win('FREE DIVE', '<div class="muted" style="font-size:18px">Any unlocked dive, any mods, no Drift. Remix: the harder, faster version (+6 BPM, more ICE).</div><div class="row" style="align-items:flex-start;gap:14px"><div class="list sunk" style="width:360px;max-height:56vh;overflow:auto"></div><div class="mods" style="flex:1"></div></div><div class="row act" style="margin-top:8px"></div>', { style: 'width:min(860px,96vw)' });
    const list = w.querySelector('.list'), mods = w.querySelector('.mods');
    let chosen = null, remix = false;
    const pick = { overclock: 1, long_lock: 1, dilation: 1 }; let equip = 'dilation';
    for (const d of this.diveList()) {
      const b = h(`<button class="btn" style="font-size:19px">${d.layer}. ${esc(d.title)} <span class="muted">${d.type === 'story' ? '' : TYPE_NAMES[d.type]} ${rec.ranks[d.id] || ''}</span></button>`);
      b.onclick = () => { list.querySelectorAll('.btn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); chosen = d; this.g.audio.play('ui_move'); };
      list.appendChild(b);
    }
    const drawMods = () => {
      mods.innerHTML = '<div>MODS (click to cycle tier)</div>';
      for (const id of MOD_IDS) { const b = h(`<button class="btn" style="font-size:18px">${MODS[id].name} — ${pick[id] ? 'I'.repeat(pick[id]) : 'off'}${MODS[id].type === 'active' && equip === id ? ' [F]' : ''}</button>`); b.onclick = () => { pick[id] = ((pick[id] || 0) + 1) % 4; if (MODS[id].type === 'active' && pick[id]) equip = id; drawMods(); }; mods.appendChild(b); }
      const rb = h(`<label class="opt">Remix<input type="checkbox" ${remix ? 'checked' : ''}></label>`); rb.querySelector('input').onchange = e => remix = e.target.checked; mods.appendChild(rb);
    };
    drawMods();
    const act = w.querySelector('.act');
    this.button(act, '▶ DIVE', () => { if (!chosen) return this.toast('Pick a dive.'); const m = {}; for (const k in pick) if (pick[k]) m[k] = pick[k]; this.abortTo = () => this.freeDive(); this.g.startDive({ dive: chosen, mode: 'free', mods: m, drift: 0, equipped: pick[equip] ? equip : null, remix }); }, { inline: true });
    this.button(act, 'Back', () => this.menu(), { inline: true });
    this.keyHandlers.push(code => { if (code === 'Escape') this.menu(); });
  }
  endless() {
    this.clear();
    const w = this.win('ENDLESS DEEP', '<div class="muted" style="font-size:18px">Procedurally assembled layers on any track, faster and denser every loop.</div><label class="opt">Track<select class="tr"></select></label><div class="row act"></div>', { style: 'width:520px' });
    const sel = w.querySelector('.tr');
    for (const m of Object.values(this.g.music)) if (m.id !== 'lab_hum') sel.appendChild(h(`<option value="${m.id}">${esc(m.title)} — ${m.bpm} BPM</option>`));
    const act = w.querySelector('.act');
    this.button(act, '▶ DIVE', () => this.endlessLoop(sel.value, 0, 0), { inline: true });
    this.button(act, 'Back', () => this.menu(), { inline: true });
  }
  endlessLoop(trackId, loop, total) {
    const kitId = KIT_OF_LAYER[1 + (loop % 7)];
    const base = STORY.find(s => s.kit === kitId);
    const dive = { ...base, id: 'endless_' + loop, title: `Endless Deep · Loop ${loop + 1}`, boss: loop % 2 ? base.boss : null, radio: [], tips: [], type: 'endless' };
    this.abortTo = () => this.menu();
    this.g.startDive({ dive, mode: 'endless', track: this.g.music[trackId], mods: { overclock: 2, long_lock: 1 }, endlessLoop: loop, seed: 'L' + loop, onEnd: (res, s) => {
      if (res.failed) { this.clear(); const w = this.win('ENDLESS DEEP — DISCONNECTED', `<div class="stat"><span>LOOPS</span><span>${loop}</span></div><div class="stat"><span>TOTAL SCORE</span><span>${total + res.score}</span></div>`, { style: 'width:420px' }); this.button(w.querySelector('.body'), 'Menu', () => this.menu()); const k = 'endless_' + trackId; if ((this.g.records.best[k] || 0) < total + res.score) { this.g.records.best[k] = total + res.score; this.g.saveRecords(); } return; }
      this.toast(`LOOP ${loop + 1} CLEARED — FASTER`, 2); this.endlessLoop(trackId, loop + 1, total + res.score);
    } }).then(s => { s.label = `ENDLESS DEEP · LOOP ${loop + 1}`; });
  }
  customMusic() {
    this.clear();
    const w = this.win('CUSTOM MUSIC (EXPERIMENTAL)', `<div class="muted" style="font-size:18px">Load a track from your computer. The game finds its tempo, beats and sections and builds a dive from a layer kit. Works best with 4/4 dance music at 120–160 BPM.</div><label class="opt">File<input type="file" accept="audio/*"></label><label class="opt">Layer kit<select class="kit">${Object.keys(KITS).map(k => `<option value="${k}">${KITS[k].name}</option>`).join('')}</select></label><label class="opt">Boss<select class="boss"><option value="">None</option><option value="auditor">The Auditor</option><option value="leviathan">The Leviathan</option><option value="warden">The Warden</option><option value="seed">The Seed</option><option value="hollis9">HOLLIS-9</option></select></label><div class="status muted"></div><div class="row act"></div>`, { style: 'width:560px' });
    const act = w.querySelector('.act'); const st = w.querySelector('.status');
    this.button(act, '▶ ANALYSE & DIVE', async () => {
      const f = w.querySelector('input[type=file]').files[0]; if (!f) return this.toast('Choose a file.');
      st.textContent = 'Decoding…'; this.g.audio.unlock();
      try {
        const buf = await this.g.audio.ctx.decodeAudioData(await f.arrayBuffer());
        st.textContent = 'Analysing beats and structure…'; await new Promise(r => setTimeout(r, 30));
        let map;
        try { map = this.g.audio.analyseBuffer(buf, {}); } catch (e) { map = null; }
        if (!map || !map.bpm || !isFinite(map.bpm)) { const { templateMap } = await import('../audio/analysis.js'); map = templateMap(140); st.textContent = 'Analysis failed: fixed 140 BPM fallback.'; }
        finishMap(map); map.length = Math.min(map.length, buf.duration);
        const kit = w.querySelector('.kit').value; const boss = w.querySelector('.boss').value || null;
        const track = { id: 'custom', title: f.name.replace(/\.\w+$/, ''), bpm: map.bpm, key: 'A minor', caption: '' };
        const base = STORY.find(s => s.kit === kit) || STORY[1];
        this.abortTo = () => this.customMusic();
        this.g.startDive({ dive: { ...base, id: 'custom_' + f.name, title: track.title, boss, radio: [], tips: [] }, mode: 'custom', track, loaded: { url: 'local', buffer: buf, map, track }, mods: { overclock: 1, long_lock: 1, dilation: 1 }, equipped: 'dilation' });
      } catch (e) { st.textContent = 'Could not decode this file: ' + e.message; }
    }, { inline: true });
    this.button(act, 'Back', () => this.menu(), { inline: true });
  }
  timeAttack() {
    this.clear();
    const rec = this.g.records;
    const w = this.win('TIME ATTACK', '<div class="muted" style="font-size:18px">Straight into the second drop with fixed mods (Overclock II, Long Lock I, Dilation I). Kill the boss as fast as you can — no assisted final hit.</div><div class="list"></div><div class="row act"></div>', { style: 'width:560px' });
    const list = w.querySelector('.list');
    for (const d of STORY.filter(s => s.boss && s.boss !== 'juno' && (rec.cleared[s.id] || rec.unlocked))) {
      const best = rec.best['ta_' + d.id];
      this.button(list, `${esc(d.title)} — ${esc(d.boss.toUpperCase())} <span class="muted">${best ? 'best ' + best.toFixed(2) + ' s' : ''}</span>`, () => {
        this.abortTo = () => this.timeAttack();
        const cfg = { dive: d, mode: 'timeattack', timeAttack: true, mods: { overclock: 2, long_lock: 1, dilation: 1 }, equipped: 'dilation' };
        cfg.onEnd = (res, s) => {
          const t0 = s.map.sections.find(x => x.type === 'drop2')?.t || 0;
          const time = s.sim.bossDownT ? s.sim.bossDownT - t0 : null;
          this.g.audio.stopMusic(1); this.clear();
          const k = 'ta_' + d.id; if (time && (!rec.best[k] || time < rec.best[k])) { rec.best[k] = time; this.g.saveRecords(); }
          const ww = this.win('TIME ATTACK', `<div class="rank" style="font-size:80px">${time ? time.toFixed(2) + 's' : '—'}</div><div style="text-align:center">${time ? 'BOSS DOWN' : res.failed ? 'DISCONNECTED' : 'BOSS ESCAPED'}</div>`, { style: 'width:420px' });
          const r = h('<div class="row"></div>'); ww.querySelector('.body').appendChild(r);
          this.button(r, 'Again', () => this.g.startDive(cfg), { inline: true }); this.button(r, 'Back', () => this.timeAttack(), { inline: true });
        };
        this.g.startDive(cfg);
      });
    }
    this.button(w.querySelector('.act'), 'Back', () => this.menu(), { inline: true });
  }
  gallery() {
    this.clear();
    const rec = this.g.records;
    const w = this.win('GALLERY', '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;max-height:70vh;overflow:auto"></div><div class="row act" style="margin-top:6px"></div>', { style: 'width:min(1100px,96vw)' });
    const grid = w.querySelector('.grid');
    for (const id of Object.keys(this.g.panelDefs)) {
      const seen = rec.gallery[id] || id.startsWith('R-') || id.startsWith('T-');
      const img = id === 'C4-J-O' ? 'C4-J-O_done' : id, im = panelImage(img);   // the two-outcome panel is drawn as two pictures
      const c = h(`<div style="aspect-ratio:3/2;border:2px solid #000;background:#555 center/cover;cursor:${seen ? 'pointer' : 'default'};font-size:16px;color:#fff;display:flex;align-items:flex-end;padding:2px" title="${id}">${id}${seen ? '' : ' ?'}</div>`);
      const set = () => { if (im.img && seen) c.style.backgroundImage = `url(${im.img.src})`; else if (!im.tried) setTimeout(set, 300); }; set();
      if (seen) c.onclick = () => this.playSeq({ pages: [{ rows: [[{ id, img, variant: img !== id ? 'done' : undefined }]] }] }, () => this.gallery(), 0, null);
      grid.appendChild(c);
    }
    const ends = ['come_back', 'ascend', 'free'].map(e => `${e.replace('_', ' ').toUpperCase()}: ${rec.endings[e] ? '✔' : '—'}`).join(' · ');
    w.querySelector('.act').appendChild(h(`<span style="flex:1">${ends}</span>`));
    this.button(w.querySelector('.act'), 'Back', () => this.menu(), { inline: true });
    this.keyHandlers.push(code => { if (code === 'Escape') this.menu(); });
  }
  credits(fromEnding) {
    this.g.endDive(); this.clear(); this.g.state = 'menu'; this.g.audio.ambience(false);
    this.playMenuMusic('come_back');
    const el = h(`<div id="credits"><div class="roll"></div></div>`); this.ui.appendChild(el);
    const roll = el.querySelector('.roll');
    roll.innerHTML = `<div style="font-size:90px;color:#9ff">DEEPLINK</div><br>a game by D.B. Waldtier<br><br>DESIGN, STORY, INK FINISHING<br>D.B. Waldtier<br><br>ENGINE<br>HTML · JavaScript · WebGPU<br><br>MUSIC<br>mid-90s trance and hard techno<br>generated from the DEEPLINK soundtrack prompts<br><br>STORYBOARDS<br>AI bases from the DEEPLINK panel prompts<br><br>FONTS<br>VT323 · Special Elite · Comic Neue · Patrick Hand (SIL OFL)<br><br>THANKS<br>everyone who ever lost at an arcade and laughed<br><br><br>${fromEnding ? 'Come back.' : ''}<br><br><br><br>`;
    let y = innerHeight; const tick = () => { if (!roll.isConnected) return; y -= 0.6; roll.style.top = y + 'px'; if (y < -roll.offsetHeight) return this.menu(); requestAnimationFrame(tick); }; tick();
    const go = () => this.menu(); this.keyHandlers.push(c => { if (c === 'Escape' || c === 'Enter' || c === 'Space') go(); }); el.onclick = go;
  }
  // ============================================================================================ debug
  debugSeq(id) {
    this.g.audio.unlock();
    const camp = newCampaign(); camp.lifeline = true; camp.evidence = 6;
    const seq = SEQUENCES[id] || (id.startsWith('end_') ? endingSequence(id.slice(4), camp) : single(id));
    this.playSeq(seq, () => this.menu(), +(this.g.params.get('drift') || 0));
  }
  debugLab(layer) {
    const c = newCampaign(); c.layer = layer; c.stage = 'board'; c.drift = +(this.g.params.get('drift') || layer * 8);
    c.mods = { overclock: 2, dilation: 1, long_lock: 1 }; c.equipped.active = 'dilation'; c.evidence = Math.min(7, layer); c.fragments = Math.max(0, layer - 1);
    if (layer >= 8 || this.g.params.has('full')) { c.evidence = 7; c.fragments = 7; c.wayOut = true; c.lifeline = true; }   // the final layer: every ending reachable (drift picks ascend / free)
    saveCampaign(c); this.lab(c);
  }
}
function sign(v) { return v > 0 ? '+'.repeat(Math.min(3, v)) : v < 0 ? '−'.repeat(Math.min(3, -v)) : '='; }
function drawFlower(cv, n) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 4;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    g.save(); g.translate(cx, cy); g.rotate(a);
    g.beginPath(); g.ellipse(0, -26, 11, 24, 0, 0, Math.PI * 2);
    g.fillStyle = i < n ? 'rgba(255,160,220,0.75)' : 'rgba(0,0,0,0.04)'; g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 1.2; g.setLineDash(i < n ? [] : [3, 3]); g.stroke(); g.restore();
  }
  g.setLineDash([]); g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.stroke();
  g.fillStyle = '#000'; g.font = '16px VT323'; g.fillText(`${n}/7`, 6, H - 6);
}
