// The trailer edit (src/trailer/trailer.js), cut to ONE song: the title theme "Deeplink" (data/tracks/deeplink.json).
// `at` is in bars from the theme's first drop (bar = 240 / bpm of the map, ≈ 1.66 s); a shot lasts until the next one.
// The window START..END is one continuous stretch of the song (≤ 100 s): intro tail, build, chorus, vocal breakdown,
// second build, second chorus, and the logo over the first bars of the next breakdown.
// Kinds:
//   panel — one storyboard panel full frame, slow push-in: { id, keep:[text indices] | say:[[who, kind, text]], zoom:[a,b], focus:[x,y] }
//   card  — black title card: { lines: [[text, style]] }  style: kicker | big | small | type (typed on)
//   count — the countdown, one number per beat: { from: 7 }
//   clip  — gameplay, autopilot, game music off, sfx on: { dive, from:[section, bars in], hud, title, side (start on the
//           B-side), shift (force a shift every N beats; the theme flips trance ⇄ hard techno with it), warm (s of pre-roll) }
//   logo  — the title over a dimmed clip: { dive, from, side }
// fx on any shot: flash | fade (from black) | glitch | static (TV snow burst)
export const TRAILER_TRACK = 'deeplink';
export const START = -13;   // bars: first frame
export const END = 47;      // bars: last frame (the music fades over the last 2 bars)

export const TRAILER = [
  // ---- cold open (intro tail): the city, the boy, the offer
  { at: -13, kind: 'panel', id: 'I-01', fx: 'fade', zoom: [1, 1.1] },
  { at: -10.5, kind: 'panel', id: 'I-02', keep: [1], zoom: [1.04, 1.12] },
  // ---- build: the rig, the count
  { at: -8, kind: 'panel', id: 'I-05', fx: 'flash', zoom: [1.1, 1.02] },
  { at: -6, kind: 'panel', id: 'I-07', keep: [1, 2] },
  { at: -4.5, kind: 'panel', id: 'I-09', zoom: [1, 1.15], focus: [0.5, 0.35] },
  { at: -3.5, kind: 'panel', id: 'I-10', zoom: [1.1, 1.25] },
  { at: -2.75, kind: 'panel', id: 'I-11', fx: 'glitch', zoom: [1, 1.3] },
  { at: -2, kind: 'count', from: 7 },
  // ---- chorus: "Deeplink, take me under"
  { at: 0, kind: 'clip', dive: 'grid_city', from: ['drop', 4], hud: true, title: true, fx: 'flash' },
  { at: 2, kind: 'clip', dive: 'chrome_sea', from: ['drop', 6], hud: true, fx: 'flash' },
  { at: 3.5, kind: 'clip', dive: 'firewall', from: ['drop', 4], hud: true },
  { at: 5, kind: 'clip', dive: 'archive', from: ['drop', 8], hud: true, side: 1, fx: 'glitch' },
  { at: 6.5, kind: 'clip', dive: 'fractal', from: ['drop', 6], hud: true },
  // ---- vocal breakdown: "deeper than I know" — the story
  { at: 8, kind: 'panel', id: '1-02', keep: [0], fx: 'flash' },
  { at: 10, kind: 'clip', dive: 'chrome_sea', from: ['breakdown', 2], hud: false },
  { at: 12, kind: 'panel', id: '3-04', fx: 'glitch', zoom: [1.02, 1.12] },
  { at: 13.5, kind: 'panel', id: '4-02' },
  { at: 15.5, kind: 'clip', dive: 'garden', from: ['breakdown', 2], hud: false, fx: 'fade' },
  { at: 17.5, kind: 'panel', id: '5-02', zoom: [1.05, 1.2] },
  { at: 18.5, kind: 'panel', id: '6-02', keep: [0, 1], fx: 'flash' },
  { at: 20, kind: 'clip', dive: 'black_ice', from: ['drop', 2], hud: false, side: 1 },
  { at: 21.5, kind: 'panel', id: '7-03' },
  { at: 23, kind: 'card', lines: [['ONE MIND', 'kicker'], ['TWO WORLDS', 'big']], fx: 'static' },
  // ---- second build: SHIFT, on the beat
  { at: 24, kind: 'card', lines: [['PRESS', 'kicker'], ['SHIFT', 'big'], ['and the music flips with the world', 'small']], fx: 'glitch' },
  { at: 25, kind: 'clip', dive: 'grid_city', from: ['drop', 10], hud: true, shift: 4 },
  { at: 27, kind: 'clip', dive: 'firewall', from: ['drop', 10], hud: true, shift: 2 },
  { at: 29, kind: 'clip', dive: 'black_ice', from: ['drop', 6], hud: true, shift: 1 },
  { at: 31, kind: 'card', lines: [['DEEPER', 'big']], fx: 'static' },
  // ---- second chorus: the bosses
  { at: 32, kind: 'clip', dive: 'grid_city', from: ['drop2', 2], warm: 3, hud: true, fx: 'flash' },
  { at: 33.5, kind: 'clip', dive: 'chrome_sea', from: ['drop2', 2], warm: 3, hud: true, fx: 'flash' },
  { at: 35, kind: 'clip', dive: 'firewall', from: ['drop2', 2], warm: 3, hud: true, side: 1 },
  { at: 36.5, kind: 'clip', dive: 'archive', from: ['drop2', 2], warm: 3, hud: true, fx: 'flash' },
  { at: 38, kind: 'clip', dive: 'fractal', from: ['drop2', 2], warm: 3, hud: true },
  { at: 39, kind: 'clip', dive: 'black_ice', from: ['drop2', 2], warm: 3, hud: true, side: 1, fx: 'glitch' },
  { at: 40.5, kind: 'panel', id: '7-05', fx: 'flash', zoom: [1.05, 1.2] },
  { at: 41.25, kind: 'clip', dive: 'core', from: ['drop2', 2], warm: 3, hud: true, fx: 'flash' },
  // ---- the title
  { at: 42, kind: 'logo', dive: 'core', from: ['drop', 4], hud: false, fx: 'flash' },
];
