# DEEPLINK

*1996, as imagined in 1996.* A high-speed 3D flight shooter through cyberspace, driven by mid-90s trance and hard techno,
with the story told in black-and-white European comic pages. Theo Brandt, a broke arcade champion, becomes the test pilot
of CEREBRA's neural VR rig — every dive makes him more than human, and every dive makes coming back harder.
Design: `docs/deeplink_game_bible.md` (+ `deeplink_panel_prompts.md`, `deeplink_soundtrack.md`).

## Play

- **Windows:** double-click `run.bat` (needs Python 3). It serves the folder on http://localhost:8000 and opens the game.
- **Linux / macOS:** `./run.sh`.
- Needs **WebGPU**: a current Chrome or Edge.

### Controls (remappable in OPTIONS › CONTROLS)

| Action | Keyboard + mouse | Gamepad |
|---|---|---|
| Steer | WASD / arrows / mouse | left stick |
| Fire (pulse) | Space / left mouse / J | RT |
| Lock-on: hold, sweep the reticle over targets (up to 8), release | right mouse / K | LT |
| Roll (dodges, deflects small shots back) | Q / E | LB / RB |
| **Shift worlds** (A-side ↔ B-side; on the beat = clean shift) | Shift / middle mouse | X |
| Boost (uses Flow, breaks weak firewalls) | C / Tab | A |
| Brake | Ctrl | B |
| Neural power (equipped active mod) | F | Y |
| Pause | Esc / P | Start |

**One-key mode** (OPTIONS › GAME › Control mode): the autopilot steers, fires and locks; tap any key, click or touch to
shift, hold it to slow time (uses Flow).

Storyboards: click / Space next, ← back, A auto, Esc skip.

## Panel Studio (local only)

Not in the public repository: it needs a local ComfyUI with the generation models.

`panel_studio.bat` (or `python tools/panel_studio.py`) opens a local page at http://127.0.0.1:8778 that talks to ComfyUI
(http://127.0.0.1:8188, `--server` to change): every storyboard panel by section with the picture in the game, its
reference images in order (image 1, image 2 …: add, remove, reorder, add a note, replace here or in every panel that uses
it; ✂ cuts one character out of a sheet into `art/panels/refs/`), the editable prompt and the exact final prompt /
engine / images it will send, generate ×N variants, compare in a lightbox, pick, and **Send pick to game**
(copies it to `assets/panels/`, keeping the shipped picture in `art/panels/original/` with a restore button). Engines:
Qwen Image 2.1 (text only), Flux.2 Dev (+Turbo) with references, FLUX 3 Klein. Work files live in `art/panels/regen/`.

## Trailer

OPTIONS → **▶ Trailer** plays a ~100 s trailer; **● Record trailer** plays it and saves `deeplink_trailer_<date>.mp4`, recorded
as in TheLostsTB: WebCodecs H.264 + AAC muxed into a seekable MP4 (constant 60 fps, the audio as the master clock, key frame
every 2 s, AAC 256 kbps; MediaRecorder only where WebCodecs is missing). Size and bitrate are in OPTIONS → Video
(1080 / 1440 / 2160 lines, 40 / 80 / 150 Mbps; default 1440 at 80 Mbps). Keep the tab in front while it records;
Esc stops. It runs on ONE song, the title theme (one continuous stretch: intro tail → build → chorus → vocal breakdown →
build → chorus → logo), and cuts storyboard panels, a countdown, autopilot gameplay (each clip's clock is scaled so its beats
land on the theme's beats; the SHIFT shots flip the theme between trance and hard techno with the world), title cards and
the bosses. The edit is `src/trailer/edit.js` (shots in bars from the theme's first drop); `?trailer=play&at=<bar>` starts
it at a given bar for testing.

## Touch (phones and tablets)

On a touch screen the game shows its own controls during a dive (after Vertebra's): a floating thumb stick on one half of
the screen (it appears where the thumb lands and trails it) and buttons on the other — **FIRE**, **SHIFT**, **LOCK** (hold,
sweep, release), **POWER** (glows when the Neural power is charged), **BOOST** and **II** (pause). Auto-fire is on while the touch
controls are shown (one thumb is on the stick) and off otherwise, unless set in OPTIONS → Access. Storyboards: tap the picture to turn the page, **SKIP**, **AUTO**. One-key mode:
the whole screen is the key. The game asks to go fullscreen and landscape on the first touch, and asks to turn the device
sideways in portrait. OPTIONS → Controls: *Touch controls* (Auto / On / Off) and *Touch layout* (stick left or right). The
menus are ordinary buttons and work with taps; the tutorial names the on-screen buttons instead of keys.

## SHIFT (GitHub Game Off 2026)

Every layer of the Deep has its own shadow copy laid over the same corridor: the **A-side** and the **B-side** — nine
shadow layers that exist only as B-sides: **Static** (Calibration: dead TVs and test cards), **The Graveyard** (Grid City:
toppled servers and terminals), **The Trench** (Chrome Sea: the floor of the sea, a giant's ribcage, jellyfish, a drowned
colonnade), **Cold Storage** (Firewall Canyons: the canyon frozen, icicles, frozen flames, aurora), **The Ashes** (The
Archive burned: charred shelves, burning windows, pages rising in embers), **Recursion** (Fractal Bloom: a corridor of
doorways each turned a quarter with gold script and lamps, staircases on every wall, stair-blocks that turn a quarter
on every bar, Droste sculptures of doorways inside doorways, a chequered floor below and above, impossible triangles), **Negative** (Juno's Garden in black ink on
white), **The Hive** (Black ICE: an ICE honeycomb) and **Event Horizon** (The Core: the same final collapse, into a black hole
— the wreckage stretches toward it and its ring grows as the Deep falls apart).
Absorbing hollow shots of your colour fills the **weapon** bar: each full bar adds a line of fire (twin → three → a fan →
a fan with vertical spread → the full fan, level 5). A hit drains it by difficulty: nothing on Easy, one absorbed shot's
worth on Normal, half a level on Hard, a whole level on Deep.
Shift flips you between them: the new world sweeps out from the ship in one wave, the palette follows, and the music flips
too — the same track crossfades between a trance treatment (A: airy, echo) and a hard-techno one (B: saturated, heavy)
so it can never drift out of time.

- **Polarity.** ICE, its shots, gates and firewalls each belong to one world. Things from the other world
  are ghosts: you can't hit them and they can't touch you — but their shots are solid and they hurt. Shots from your own
  world are hollow and **absorbed** as Flow. Gate runs flip worlds every beat; firewalls of the other world are open air.
- **Clean shift.** Shift within ~95 ms of a beat: Sync up, a short guard that absorbs anything. Off-beat shifts glitch.
- **Chains.** Three kills in a row from the same world: a doubling bonus (100, 200, 400 … 25 600).
- Bosses live in both worlds and fire one bar in A-side shots, the next in B-side shots.


Shifting is required, not optional: a boss's core flips colour every two bars (a ring around it, the boss bar and
"CORE A/B-SIDE · MATCHED / SHIFT TO MATCH" show it; the ring flickers on the beat before the flip). Only shots fired
from the world of its colour hurt it (the wrong world sparks off: "WRONG COLOUR · SHIFT"), and two of every three of
its shots are its colour (absorbed when you match). Contract objectives (packets, nodes, objective rings) come in pairs
from alternating worlds, half in each, so the 70% target needs both; markers for the other world read "SHIFT".

## What is in the game

- **The music is the level.** Each dive is one track. Its tempo sets the speed, its sections set the phases (Intro, Build with
  a gate run on the snare roll, Drop = **Breach**, Breakdown, Build, **Drop 2 = the boss**, Outro), enemy waves spawn and
  fire on beats and bars, the world pulses with the kick. The beat clock is the AudioContext clock. On-beat actions build
  **Sync** (×1–×8, Overdrive at ×8); hits filter the music and losing Sync drops the lead out. Never required: not a
  rhythm game.
- **30 dives:** 9 story dives (Calibration, Grid City, Chrome Sea, Firewall Canyons, The Archive, Fractal Bloom, Juno's
  Garden, Black ICE, The Core) and 21 contracts (CEREBRA jobs, Pike's hacks, Signals) with objectives (survive, collect,
  destroy, rings, follow, ride the streams), each with its own track.
- **9 layer kits** in early-90s CGI: wireframe grid void, a tower city that rises from the grid on the drop, a chrome
  checkerboard sea with mirrored pyramids (and a dive under it), red glyph canyons with firewalls closing on the beat, a
  library of floating glass files, ray-marched fractals, Juno's organic garden, the black military network with red
  scanning lasers, and the Core where every layer collapses into a white sun.
- **ICE:** Pinger, Tracer, Shutter, Mirror Kite, Splitter, Scanner, Worm, Glyph Swarm, Gatekeeper, Corruptor, Hunter, Echo
  Diver, Bloom, Weyl's Agents. **Bosses:** the Auditor, the Leviathan, the Warden, the Librarian, the Seed, Juno (a chase),
  HOLLIS-9, the Deep Itself — phases on section thirds, the final hit lands on the last downbeat.
- **Drift and 10 neural mods** (3 tiers): Overclock, Peripheral, Long Lock, Slipstream, Dilation, Phase, Rewrite, Echo,
  Foresight, Become. Drift changes the avatar (human → abstract → geometry), the comic pages (grid intrusions, stepped
  borders, drift variants of key panels) and which endings are open.
- **The lab:** storyboards, brain-scan mod screen, contract board, Pike's evidence folder, the pressed glass flower of Juno
  fragments, dialogue choices. **Three endings** (Come Back with its variants, Ascend, Free Her) chosen by flying through
  a gate at the end of the Core.
- **Modes:** Story, Free Dive (any mods, no Drift, Remix toggle), Remix (+6 BPM, more ICE), Endless Deep, Custom Music (load
  your own track: tempo / beat / section analysis builds a dive), Time Attack (boss rush from the second drop), Gallery,
  Credits.
- **Look:** 400 × 300 (or 480 × 270) internal resolution, integer-scaled, ordered dither to 15-bit colour, flat / Gouraud
  shading, chrome env maps, checkerboards, fog, bloom; options for a clean high-res mode, CRT filter and vertex wobble.
- **Accessibility:** remapping, auto-fire, auto-lock, wider gates, game speed 70–100%, low-flash mode, screen-shake slider,
  colour-blind bullet colours, subtitles for every radio line, visual beat indicator, four difficulties (Deep = one hit).

## Assets

| What | Where | How |
|---|---|---|
| Storyboard panels | `assets/panels/<id>.png` (`<id>_D.png` = high-Drift variant; `C4-J-O_done/_refused.png`) | Prompts: `docs/deeplink_panel_prompts.md`. Missing art shows a hatched placeholder with the prompt. Ink-finish and overwrite freely. |
| Music | `assets/music/<track id>.mp3` (ids in `data/music.json`) | Prompts: `docs/deeplink_soundtrack.md` (v2). Without a file the procedural trance / hard-techno arrangement plays at the asked tempo. Remix: `<id>_remix.mp3` (else +6% playback). |
| Beat maps | `data/tracks/<id>.json` | `node tools/beatmap.mjs` (needs ffmpeg) analyses every file; fix by hand in `tools/beatmapper.html` (maps marked edited are never overwritten). Without a map the game analyses the file at load. |
| Sound effects | `assets/sfx/<name>.(mp3|wav)` | Every sound has a synth fallback; a file with the same name replaces it (`breach`, `explode`, `modem`, `disconnect`, `lab_ambience`, `shot`, `lock`, `gate`, …). |

Local only (ComfyUI pipeline, not in the public repository): `python tools/collect_assets.py <ComfyUI output\mcp>` copies generated panels (`dl_*`), music (`dlv2_*`) and sound effects
(`dlsfx_*`) into place; `tools/make_jobs.py` rebuilds the generation job list from the two prompt files.

## Release build

`python tools/build_dist.py` (needs Pillow) writes `release/`: `web/` (static build for any web host, with
`assets/manifest.json` since static hosts can't list folders), `deeplink_itch.zip` (the same, for itch.io HTML5 uploads),
`source/` (the public repository) and the soundtrack folder + zip. Panels are converted to WebP (quality 90) to stay
under itch.io's 500 MB limit; `--png` keeps the PNGs.

## Bosses and ICE (procedural rigs)

Every boss and most ICE are built in code: `src/render/creatures.js` makes the parts (chamfered plates, lathed bodies,
tubes, petals, ribbed segments, articulated limbs) and `src/dive/creatures.js` draws them as rigs animated from the sim's
state: the Auditor's shell slides open around an eye inside a gyroscope of ruler rings, the Leviathan's jaw opens on its
volley and its fins beat along a ribbed chrome body, the Warden is a gilded mask on a brick firewall whose mortar glows
with the kick (crown of flames, lidded eyes that open on their beat), the Librarian is a lamp in an armillary with an
orbit of books and a tome that turns a page every bar, the Seed opens three whorls of petals inside fractal vines,
Hollis-9 is an articulated android (head tracks you, the arm comes up to fire, coat tails stream, afterimages on the
blink), the Deep is an eye that blinks on the off-beat among tentacles. Hit boxes and patterns are untouched.
Debug: `?dive=<id>&bot&from=drop2&viewcam=<boss or enemy type>&viewdist=<m>&isolate&hires` orbits the camera around it
(`isolate` hides the world).

## Tools and debug

| | |
|---|---|
| `tools/beatmapper.html` | waveform, beats, bars and sections; drag / retype / add / delete sections, metronome, save |
| `tools/kitlab.html` | fly any layer kit, before / after the Breach, spawn any enemy wave or boss |
| `index.html?dive=<id>&from=<s or section>&bot&mods` | jump into a dive (`from=drop2` for the boss), autopilot, test mods |
| `index.html?seq=<intro, seq0…seq7, end_come_back, end_ascend, end_free, panel id>&drift=60` | play a storyboard sequence |
| `index.html?lab=<layer>&drift=<n>` | open the lab at a layer with a test campaign |
| `index.html?unlock` | unlock every dive, mode and gallery panel |
| `test/flow.py`, `test/sheet.sh`, `test/bosses.sh` | headless smoke tests (WebGPU on SwiftShader, add `?capture`) |

## Code map

```
src/core     input (remappable, gamepad), save, math, rng
src/audio    audio (music player, beat clock, adaptive mix, synth SFX), procmusic (procedural tracks), analysis (beats/sections)
src/dive     path (music-locked distance), layers (9 kits), world (props), builder (script from the beat map), view, session
src/sim      dive (flight, weapons, lock-on, meters, objectives, ranks), enemies, bosses (beat coroutines), bot
src/render   renderer (WebGPU passes), shaders (WGSL), meshes + lib (procedural low-poly library)
src/story    dives (30), mods, campaign (rewards, Drift, endings), sequences (storyboard pages, choices, lore)
src/panels   storyboard page player
src/ui       hud, screens (boot, title, menus, options, lab, results, modes)
```

## License

MIT (see `LICENSE`). Fonts: SIL Open Font License 1.1.
