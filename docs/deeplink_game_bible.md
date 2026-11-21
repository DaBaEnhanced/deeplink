# DEEPLINK
## Full Game Bible
### Working Title: **DEEPLINK**

**Genre:** High-speed 3D flight shooter through virtual reality, driven by the music, with a story told in black-and-white European comic storyboards
**Setting:** 1996, as imagined in 1996: corporate neural VR, the early-90s CGI vision of cyberspace
**Inspiration:**
- Look: the VR worlds of *The Lawnmower Man* (1992), early-90s CGI (flat and Gouraud polygons, chrome, checkerboards, fractals, morphing)
- Vibe: *Hackers* (1995), *Johnny Mnemonic* (1995), *Ghost in the Shell* (1995)
- Speed and music: *Wipeout* (1995), *Tempest 2000* (1994)
- Flight: *Space Harrier*, *Star Fox*, *Panzer Dragoon*
- Story pages: European *bande dessinée* in black and white ink

**Soundtrack:** mid-90s trance and hard techno (136–155 BPM), generated with Stable Audio 3. Every dive is one track (about 30 dives and 33 tracks), and **the music drives the level** (§9).
**Stack:** HTML + JS (ES modules), a new WebGPU low-poly 3D renderer, plain-file web deploy (`index.html` entry point)
**Assets:** models in Blender via the Blender MCP; comic pages from AI image bases (ComfyUI / Qwen Image / Grok) with the author's ink finishing; music from Stable Audio 3.
**Companion files:** `deeplink_panel_prompts.md` (storyboard prompts), `deeplink_soundtrack.md` (music prompts).

---

# PART I: VISION

# 1. HIGH CONCEPT

1996. CEREBRA Systems has built the first true neural interface: a helmet, a glove and a chair that put a human mind inside the network.

Theo Brandt is their test pilot. He has the fastest reflexes they have ever measured, a mountain of debt, and nowhere else to be. In the network he flies. He is fast, sharp, almost limitless, and every dive makes him more so.

Outside, his body weakens, the scientists argue, the company sees a weapon, and something that used to be human waits for him in the deepest layer.

> **Every dive makes you more than human. Every dive makes coming back harder.**

---

# 2. DESIGN PILLARS

## 2.1 The Music Is the Level
Each dive is one track. Its tempo sets your speed, its structure sets the level's phases, its drops are the breaches into deeper layers. You feel the music in your hands without playing a rhythm game.

## 2.2 Speed Above All
Very fast, smooth, readable flight at 60 fps (120+ when possible). Dives last 4–6 minutes and restarts are instant.

## 2.3 1996 Cyberspace, Played Straight
The polygon dreams of early-90s CGI: wireframes, chrome, checkerboards, fractals, morphing faces. Sincere and strange, not ironic.

## 2.4 Power Has a Price
Every upgrade is a change in Theo's mind (**Drift**, §12). The more power you take, the more the story turns and the real world darkens.

## 2.5 Ink Between Dives
The real world is black and white, drawn in ink, quiet and heavy. The network is colour, speed and noise. The contrast is the story.

---

# 3. TARGET EXPERIENCE

- **Dive 1:** pure joy. Speed, colour, a drop that opens the world.
- **Mid-game:** mastery and seduction. Powers that make you feel godlike, and a real world that pulls less and less.
- **Late game:** dread. The network is beautiful and wrong; the people outside are losing you.
- **The final dive:** the hardest, fastest track, and a choice.

**Story mode:** 8 layers, each with a story dive and three contract dives (§11): **30 dives** in total, about **23 in a typical first playthrough** (**6–8 hours** with retries). Replay through skipped contracts, different endings, ranks, Remix dives, Free Dive, Endless and Custom Music modes.

---

# PART II: STORY

# 4. THE WORLD

- **1996.** Mobile phones the size of bricks, CRT monitors, pagers, CD-ROMs, the first web pages. And in one corporate campus outside a grey city, the future.
- **CEREBRA Systems:** a neuro-computing company on the edge of bankruptcy and genius. Its product is **DEEPLINK**: a neural immersion rig (helmet, glove, reclining chair, a rack of SGI-style workstations) that lets a mind enter **the Deep**, a shared VR space overlaid on the world's data networks.
- **The Deep** has layers. The surface is a clean, corporate visualisation of data. Deeper down, the visualisation stops being designed and starts being **grown**, by the network and by the minds that have dived into it.

---

# 5. CHARACTERS

## 5.1 Theo Brandt (protagonist)
- **Age 24.** A former arcade champion from the city's poor side, now a bike courier with debts. CEREBRA recruits him because his reaction times are off their charts.
- **Personality:** cocky, funny, lonely, honest. He has never been the best at anything that mattered, until now.
- **Arc:** from a nobody to something more than human, and the choice of what to do with it.

## 5.2 Dr. Lena Aurich (lead scientist)
- **Age 45.** DEEPLINK's inventor. Brilliant, tired, kind, guilty.
- She treats Theo as a person, not a test subject, and is the first to see what the Deep is doing to him.

## 5.3 Conrad Weyl (CEREBRA's director)
- **Age 50s.** The money. Smooth, reasonable, ruthless. Sees in Theo a product: a mind that can enter any network, any bank, any missile system.
- He pushes the dive schedule, cuts the safety limits and brings in the military buyers.

## 5.4 JUNO (Subject 01)
- **Juno Marsh,** the programme's first test subject, three years ago. She went too deep and didn't come back. Her body has been in a coma in the lab ever since.
- **In the Deep** she's alive, in a way: vast, beautiful, frightening. She grew the deep layers out of her own mind.
- She wants Theo to come down to her and stay. She isn't evil. She's lonely, and she sees no reason to be human anymore.

## 5.5 Pike (the friend outside)
- **Isaac "Pike" Delgado,** Theo's old arcade rival and best friend, a phone phreak and hacker with a basement full of modems.
- The voice of the real world: jokes, pizza, worry. Later, Theo's only way to fight CEREBRA from outside.

## 5.6 Hollis (security)
- CEREBRA's head of security, ex-military, practical. Not cruel, but obedient to Weyl.

---

# 6. STORY STRUCTURE

The story runs in **storyboard sequences** (black-and-white comic pages, §15) between dives, plus short in-dive radio lines (Lena, Pike, Weyl, Juno). The table lists the **story dives**, one per layer. Between story dives, each layer also offers three **contract dives** (CEREBRA jobs, Pike's hacks and Juno's Signals: §11.2) with their own briefings and outcomes.

| # | Story dive | Story beat |
|---|---|---|
| — | **Intro** | Theo at the arcade, the courier job, the debt. The recruitment: Weyl's offer. The lab, the chair, the helmet. "Count back from ten." |
| 0 | **Calibration** | The training grid. Pure wonder. Lena on the radio: "Breathe, Theo." |
| 1 | **Grid City** | The corporate surface of the Deep. The first demonstration for CEREBRA's investors. Theo breaks every record. Weyl smiles. |
| 2 | **Chrome Sea** | Beauty and speed. After the dive, Theo can't sleep: he sees the grid when he closes his eyes. Pike notices he's different. |
| 3 | **Firewall Canyons** | A mission: CEREBRA sends him to break a rival company's security. He does it easily. Lena objects. First signs of change: Theo calculates traffic patterns in his head. |
| 4 | **The Archive** | Theo finds files on Subject 01, Juno Marsh, and her comatose body in a sealed room of the lab. Lena admits the truth. |
| 5 | **Fractal Bloom** | The first deep layer: not designed by anyone. A voice calls his name. Juno appears for the first time. |
| 6 | **Juno's Garden** | Juno shows him her world, grown from her mind. She asks him to stay. Back outside, the military buyers arrive; Weyl removes the safety limits. |
| 7 | **Black ICE** | The military network: Weyl sends him to prove the weapon. Theo turns on CEREBRA instead, with Pike's help from outside. Hollis is sent to unplug him. |
| 8 | **The Core** | Theo races Juno, and CEREBRA's counter-attack, to the Core, where the Deep touches every network on Earth. The choice. |
| — | **Endings** | Three endings (§7) |

---

# 7. ENDINGS

The ending depends on the final choice, on **Drift** (§12), on the **evidence** from Pike's hacks and on the **Juno fragments** from Signals (§11.2):

1. **Come Back** (always available): Theo tears himself out of the Deep, losing every power. Last page: a rainy morning, Theo and Pike at the arcade, Theo losing at a game for the first time in years, and laughing.
   - With **5+ evidence**, Weyl is arrested and CEREBRA exposed.
   - With fewer, Weyl walks free, the programme is buried, and the last page carries a quiet threat.
   - With *Lifeline* played, Theo comes back gently instead of tearing out (less memory lost).
2. **Ascend** (Drift 60+): Theo stays. His body stops in the chair. Last page: across the city, every screen, phone and pager shows the same thing at the same moment, an eye opening. The page bleeds from black and white into colour.
3. **Free Her** (Drift under 40, **5+ Juno fragments**, and *The Way Out* played): Theo reaches Juno's human centre and brings her out instead of himself staying, or both of them out, at the cost of his powers and part of his memory. Last page: a hospital window, two people learning to walk again.

---

# PART III---

# PART III: GAMEPLAY

# 8. CONTROLS

| Action | Gamepad | Keyboard + mouse | Notes |
|---|---|---|---|
| Steer | Left stick | WASD / mouse | Free movement in the corridor plane (§10.1) |
| Fire | RT (hold) | Left mouse / Space | Rapid pulse shots |
| **Lock-on** | LT (hold, release) | Right mouse | Sweep the reticle over targets (up to 8), release to fire homing shots |
| **Roll** | LB / RB | Q / E | Barrel roll: dodges and deflects small shots |
| **Boost** | A | Shift | Uses Flow; faster, invulnerable to small debris |
| **Brake** | B | Ctrl | Slows briefly for tight sections |
| **Neural power** | Y | F | The equipped active mod (§12) |
| Pause | Start | Esc | |

Every action is remappable. Assist options: auto-fire, auto-lock, wider hitboxes for gates, a slower game speed (70–100%).

---

# 9. THE MUSIC IS THE LEVEL

## 9.1 Track Data
Every track ships with a **beat map** (authored, with an analysis-tool first pass):
```js
Track {
  id, title, bpm, key, length,
  beats: [...],          // beat times (s)
  bars: [...],           // downbeats
  sections: [ { t, type: 'intro'|'build'|'drop'|'breakdown'|'drop2'|'outro', energy: 0..1 } ],
  events: [ { t, kind: 'snare_roll'|'riser'|'kick_return'|'vocal'|'acid_peak', ... } ],
  stems: { kick, bass, lead, pads, fx, vocal }
}
```

## 9.2 What the Music Drives
- **Forward speed** = base speed × (BPM / 140), plus section energy (builds accelerate, breakdowns ease off). The 150+ BPM hard techno dives really are faster.
- **Level phases** follow the sections:
  - **Intro:** entering a layer; few enemies, learning the space.
  - **Build-up:** density and speed rise; the corridor narrows; the snare roll is a "gate run".
  - **Drop:** a **Breach**. The world shatters into the next layer (a scripted transition on the first beat of the drop), the speed jumps and the big set pieces start.
  - **Breakdown:** a calm, strange open space; collectibles, secrets, story voices.
  - **Second drop:** the boss, or the escape.
  - **Outro:** exit through the "surface" to the lab.
- **Spawns on the grid:** enemy waves spawn and fire on beats and bars (quantised to 1/4 or 1/8 notes), so patterns feel musical and readable.
- **The world pulses:** emissive materials, fog colour and corridor rings pulse with the kick; lead synths drive particle bursts; acid lines drive the twisting of geometry.
- **Stems mix with play:** the full mix plays when you are doing well; taking hits filters the music (a low-pass sweep), and losing **Sync** (§10.4) drops the lead stem out until you recover.

## 9.3 Not a Rhythm Game
Hitting the beat is **rewarded, never required**. Shots, rolls and boosts fired on the beat earn **Sync** (§10.4). A player who ignores the beat can still finish every dive.

---

# 10. FLIGHT AND COMBAT

## 10.1 The Flight Model
- The camera and the ship fly along a **spline path** at the speed set by the music. The player moves freely in the **corridor plane** around the path (within bounds that change: tubes, canyons, open fields with soft walls).
- Movement is fast and responsive, with a slight bank on turns, and the camera leans with the ship.
- **Branches:** some sections split the path; the choice changes the route (different set pieces, secrets, risk).

## 10.2 The Avatar
In the Deep, Theo is not a ship but **a body of light**: a humanoid wireframe figure flying like a diver, arms back. It becomes more abstract and luminous as Drift grows (§12). Its silhouette stays readable: a bright core and wings of light trails.

## 10.3 Weapons
- **Pulse:** rapid forward shots (upgradeable spread, rate).
- **Lock-on:** paint up to 8 targets and release homing bolts; locking several targets **on the same beat** multiplies damage.
- **Roll:** deflects small projectiles and sends them back.
- **Boost:** short invulnerability to debris, breaks through weak firewalls.
- **Neural powers** (mods, §12).

## 10.4 Flow, Sync and Integrity
- **Integrity** (health): hits reduce it; the screen and the music distort as it drops. It regenerates slowly while you avoid damage.
- **Flow** (energy): fuels Boost and neural powers; filled by collecting **data packets** and by kills.
- **Sync** (multiplier, 1×–8×): rises with on-beat actions and no-hit streaks; resets on hit. It multiplies score and Flow gain. At 8× the screen goes into **Overdrive** (visual bloom, music at full).

## 10.5 Gates and Obstacles
- **Firewalls:** walls with openings that open and close on the beat.
- **Gates:** rings to fly through for Flow and Sync.
- **Data streams:** rivers of light that carry you faster.
- **Corruption:** zones that drain integrity and invert controls briefly.
- **Collapse:** in Breaches, geometry shatters around you, and you dodge the falling pieces.

---

# 11. LAYERS AND DIVES

The Deep has **8 layers** after Calibration. Each layer has one **story dive** (§11.1) and, in layers 1–7, three **contract dives** (§11.2).

## 11.1 Story Dives

| # | Dive | Track (style, BPM) | Look | Signature set piece | Boss |
|---|---|---|---|---|---|
| 0 | **Calibration** | Trance, 136 | A blue wireframe grid room, white void | Learning flight, lock-on, the first breach | — |
| 1 | **Grid City** | Classic trance, 138 | A corporate data city: towers of light, traffic of packets, a black sky with grid lines | Flying between towers during the drop as they rise from the grid | **The Auditor** (a security cube that unfolds) |
| 2 | **Chrome Sea** | Uplifting trance, 140 | An endless chrome checkerboard ocean, mirrored pyramids, a gradient sky | Skimming waves that reflect the whole world, then diving under the surface | **The Leviathan** (a chrome sea creature made of data) |
| 3 | **Firewall Canyons** | Acid trance, 142 | Red and orange canyons of security code, scrolling glyphs on the walls | Flying through firewalls that close on the beat | **The Warden** (a firewall god with shutter eyes) |
| 4 | **The Archive** | Progressive trance, 136 | An infinite library of floating glass files, dust of light, slow rotation | Searching for Juno's file while the shelves collapse | **The Librarian** (a swarm of documents forming a face) |
| 5 | **Fractal Bloom** | Hard trance, 145 | Raymarched fractal landscapes that grow and fold, impossible colours | A drop that unfolds the fractal into infinity | **The Seed** (a fractal that grows faster than you can shoot) |
| 6 | **Juno's Garden** | Psychedelic (Goa-style) trance, 140 | Organic morphing forms, glass flowers, faces in the sky | Juno's flowers open to the melody; she flies beside you | **None**: Juno herself (a chase, not a fight) |
| 7 | **Black ICE** | Hard techno, 150 | A military network: black geometry, red scanning lasers, no sky | Escaping as CEREBRA's countermeasures hunt you | **HOLLIS-9** (security's combat avatar) |
| 8 | **The Core** | Hard techno into trance, 155 → 138 | Every layer collapsing into one, a white sun at the centre | Racing Juno and the collapsing Deep to the Core | **The Deep Itself**, then the choice |

## 11.2 Contracts

Layers 1–7 each offer **three contract dives**, one of each type. They use the layer's geometry kit with a **different route, set pieces and track** (its own BPM). Contracts are chosen on the **contract board** in the lab (§12.3).

| Type | Who asks | Rewards | Story weight |
|---|---|---|---|
| **CEREBRA job** | Weyl | An extra mod choice (1 of 3) or a mod upgrade (§12.2) | **+Drift**, Weyl's favour; Lena and Pike disapprove |
| **Pike's hack** | Pike | **Evidence** (1 per hack, 7 in total) | Builds the case against CEREBRA; decides how *Come Back* ends (§7) |
| **Signal** | A strange signal (Juno) | A **Juno fragment** (1 per signal, 7 in total) and lore pages | Needed for *Free Her* (§7) |

**Rules:**
- Each layer: play **at least one** contract before its story dive unlocks; play as many as you like. A typical first playthrough plays two per layer.
- Contracts **close** when the layer's story dive is cleared (they come back in Free Dive, without story rewards). What you skipped is a reason for a second playthrough.
- Refusing every CEREBRA job in a layer raises **Weyl's suspicion**: the next story dive has more ICE.

| Layer | CEREBRA job | Pike's hack | Signal |
|---|---|---|---|
| 1. Grid City | **Stress Test**: survive a city flooded with traffic for investors (trance, 140) | **Phone Phreak**: ride the phone backbone to give Pike free long-distance calls, a favour that maps the network for later (trance, 137) | **Ghost Packet**: follow a stray packet carrying a girl's voice through the towers (dreamy trance, 132) |
| 2. Chrome Sea | **Market Run**: skim the stock exchange's chrome storm for insider data (uplifting trance, 142) | **Dead Drop**: plant Pike's hidden beacon under the sea (trance, 138) | **Drowned Signal**: a voice calling from beneath the waves (deep trance, 134) |
| 3. Firewall Canyons | **Extraction**: steal a rival's prototype and outrun the alarms (acid trance, 144) | **Paper Trail**: copy CEREBRA's own security logs (acid trance, 140) | **Burn Marks**: scorched paths where someone fled the canyons long ago (dark trance, 136) |
| 4. The Archive | **Clean Up**: erase the records of Juno's dives (progressive trance, 138) | **Ledger**: find the military contracts in CEREBRA's accounts (progressive trance, 140) | **Juno's Diary**: her own journal files, scattered and burning (slow progressive, 130) |
| 5. Fractal Bloom | **Probe**: map the fractal layer for CEREBRA's engineers (hard trance, 146) | **Mirror Site**: build an off-site copy of the evidence (hard trance, 145) | **Seedling**: Juno's very first creation, small and fragile (psychedelic trance, 140) |
| 6. Juno's Garden | **Harvest**: strip Juno's structures for CEREBRA's labs (psychedelic trance, 142) | **Lifeline**: build Theo an emergency exit route from the Deep (hard trance, 144) | **Her Memories**: Juno's human memories, a city, a family, a dog (Goa-style trance, 138) |
| 7. Black ICE | **Live Fire**: the weapon demonstration for the military buyers, attacking a mock city network (hard techno, 152) | **Backdoor**: Pike's way into CEREBRA's backbone, which the final dive depends on (hard techno, 148) | **The Way Out**: the path to Juno's human centre, hidden inside the military ICE (hard techno, 150) |

**Contract moments:** some contracts carry big story weight. *Clean Up* asks Theo to erase Juno's records (the player can refuse mid-dive by flying into the exit gate, failing the job but keeping a Signal clue). *Live Fire* is the moment the military sees what Theo can do. *Lifeline* gives a gentler *Come Back* scene (§7).

## 11.3 Flow of a Layer

1. The previous story dive opens the layer (storyboard page).
2. The **contract board**: 3 contracts with briefings (one storyboard panel each).
3. Play 1–3 contracts (each 4–6 minutes, with its own short outcome panel).
4. The layer's **story dive** (boss, breach into the next layer, story pages).

**Totals:** Calibration + 7 layers × (3 contracts + story dive) + the Core = **30 dives**. A typical first playthrough plays about **23** (2 contracts per layer), for **6–8 hours**.

---

# 12. DRIFT AND NEURAL MODS

## 12.1 Drift
- **Drift** (0–100) is how much the Deep has changed Theo. It rises with every **neural mod** installed or upgraded, with every **CEREBRA job**, and with some story choices; it never goes down.
- **Effects:**
  - more power in the Deep (mods are stronger at high Drift);
  - the avatar becomes more abstract;
  - the storyboards change: Theo looks thinner and paler, his speech gets stranger, people react to him differently, and the panels show more "network" intrusions into the black-and-white world;
  - ending availability (§7).

## 12.2 Neural Mods
Earned after each **story dive** (choose 1 of 2) and from **CEREBRA jobs** (choose 1 of 3, or upgrade an installed mod). Each mod has **3 tiers**: an upgrade strengthens it and adds half its Drift again. Mods are equipped between dives; every mod and upgrade shows its Drift before you choose.

| Mod | Type | Effect | Drift |
|---|---|---|---|
| **Overclock** | Passive | +10% fire rate and lock speed | +5 |
| **Peripheral** | Passive | Shows threats behind you | +5 |
| **Long Lock** | Passive | Lock up to 12 targets | +8 |
| **Slipstream** | Passive | Data streams give double speed and Flow | +6 |
| **Dilation** | Active | Slow time for 3 s | +10 |
| **Phase** | Active | Pass through walls and firewalls for 2 s | +10 |
| **Rewrite** | Active | Turn a locked enemy into an ally for 10 s | +12 |
| **Echo** | Active | A copy of you flies beside you and mirrors your fire | +12 |
| **Foresight** | Passive | Enemy attack lines are shown a beat early | +15 |
| **Become** | Active (late) | For 5 s, you are the network: everything on screen is locked | +20 |

**Choices with weight:** a low-Drift run is harder and opens the *Free Her* ending; a high-Drift run is powerful and pulls toward *Ascend*.

## 12.3 Between Dives: The Lab
A short hub screen in storyboard style:
- the next storyboard sequence;
- the **mod screen** (Theo's brain scan, with installed mods as glowing regions);
- the **contract board**: the layer's three contracts, each with a one-panel briefing, its rewards and its story weight (§11.2);
- a tracker of **evidence** and **Juno fragments** (shown as Pike's folder and as a pressed glass flower);
- a few **dialogue choices** in panels (with Lena, Pike, Weyl, and Juno later), which shift relationships and some Drift.

---

# 13. ENEMIES AND BOSSES

**ICE** (intrusion countermeasures) and other things in the Deep, all early-90s CGI:

| Enemy | Look | Behaviour |
|---|---|---|
| **Pinger** | A small spinning octahedron | Fires single shots on the beat |
| **Tracer** | Wireframe dart | Homes in, dies in one hit |
| **Shutter** | Flat panels that open and close | Blocks paths; vulnerable when open |
| **Mirror Kite** | Chrome triangle | Reflects pulse shots; needs lock-on |
| **Splitter** | Cube | Splits into smaller cubes when hit |
| **Scanner** | A ring with a red beam | Sweeps the corridor; being caught raises alarm (more enemies) |
| **Worm** | A segmented chain of spheres | Snakes through the corridor; head is the weak point |
| **Glyph Swarm** | Floating characters of code | Swarms in patterns, dies to area damage |
| **Gatekeeper** | A huge face on a wall | Opens its mouth on drops; fire inside |
| **Corruptor** | Noise blob | Leaves corruption zones |
| **Hunter** | Black, angular, fast (dive 7) | Chases from behind; must be outrun or rewritten |
| **Echo Diver** | Ghost of a past test subject | Mimics your movement a beat late |
| **Bloom** | Fractal flower | Grows tendrils on the beat |
| **Weyl's Agents** | Chrome humanoids (dive 7–8) | Fly in formation, lock on to you |

**Bosses** (§11 table) are multi-phase and **synchronised with the second drop**: phase changes land on section boundaries, and the final hit always lands on the last big downbeat if the player is close to it (assisted timing). That makes every boss kill feel like the end of a set.

---

# 14. SCORING, RANKS AND MODES

## 14.1 Scoring
Kills × Sync, data packets, gate streaks, lock-on chains (more on-beat locks = more points), no-hit sections, speed (time in streams), and secrets.

## 14.2 Ranks
Per dive, **D to S** (and **SS** for no-hit + full Sync). Ranks unlock Free Dive variants and art in the gallery.

## 14.3 Modes
- **Story:** the 9 dives, storyboards, choices, endings.
- **Free Dive:** any unlocked dive with any mods (no Drift), for score.
- **Endless Deep:** procedurally assembled layers on any track, getting faster each loop.
- **Custom Music:** load your own track (local file). The game analyses the beats and structure (Web Audio, an onset and tempo detector, a section estimate) and builds a dive from the procedural layer kit. This is a natural fit for a game where the music is the level.
- **Time Attack:** fastest clear with fixed mods.
- **Remix:** after clearing a dive, a hard **Remix** version unlocks: the same layer with a remixed, faster version of its track (+6 to +10 BPM), new patterns and harder ICE. Remix tracks are generated from the original prompts with a "harder remix" variation.

**Difficulty:** *Easy* (more integrity, assists on), *Normal*, *Hard* (more ICE, faster patterns), *Deep* (one hit is a disconnection, and Sync decays faster).

---

# PART IV: PRESENTATION

# 15. STORYBOARDS: BLACK-AND-WHITE EURO COMIC

## 15.1 Style
- **European *bande dessinée* in black and white:** confident brush and pen ink, cross-hatching, deep black shadows, detailed backgrounds (labs, streets, the arcade, the city in the rain), precise, realistic faces and hands, and large silent panels.
- **Mood:** grey 1996: rain on windows, fluorescent labs, CRT glow drawn as white light, cables everywhere.
- **The network in the real world:** as Drift grows, small **intrusions** appear in the pages: grid lines over a face, a panel border that pixelates, a reflection that shows the Deep. They are in black and white, except in the *Ascend* ending, which bleeds into colour.
- **Lettering:** classic comic lettering by the engine (hand-lettered font), captions in a typewriter font for lab logs.

## 15.2 Format
- **Pages** of 4–8 panels in classic European grid layouts, shown full screen one page at a time, with panel-by-panel reveal and subtle camera pans.
- **Sequences:** intro (2 pages), between each dive (1–2 pages), endings (2 pages each).
- About **90 panels** in total: the story pages, a briefing panel for each of the 21 contracts and outcome panels for the key ones (plus Drift variants and title art); prompts in `deeplink_panel_prompts.md`.

## 15.3 Production
- AI image bases (ComfyUI, Qwen Image 2.1, Grok Imagine) from the prompt file, with a consistent style prefix and character reference sheets.
- The author's **ink finishing pass** on every panel for consistency (faces, hands, the rig, the lab).
- The panel engine (pages as JSON: panels, image layers, balloons, captions, transitions) can be shared with *Afterglow*'s panel engine.

---

# 16. VISUAL STYLE: THE DEEP

## 16.1 Principles
- **Early-90s CGI, real-time:**
  - low-poly geometry with **flat and Gouraud shading**;
  - **chrome** environment-mapped surfaces;
  - **checkerboard** and grid textures; **fog**;
  - **morphing** meshes; ray-marched **fractals** for the deepest layers;
  - lens flares and light trails.
- **Low internal resolution** (default **400 × 300**, 4:3, with a 16:9 option at 480 × 270), integer-scaled, with **ordered dithering** to a 15-bit colour depth for an authentic early-PC/SGI look. A clean high-res mode is available.
- **Bloom and trails** are part of the style here (unlike *Afterglow*): the Deep glows. They are kept crisp at the low resolution.
- **Optional:** affine texture wobble (a mid-90s console look) and a CRT filter.

## 16.2 Palettes by Layer
| Dive | Palette |
|---|---|
| Calibration | Cyan wireframe on black, white void |
| Grid City | Electric blue, white, magenta packets, black sky |
| Chrome Sea | Chrome, sky gradient (orange to violet), black and white checkers |
| Firewall Canyons | Red, orange, black, scrolling yellow glyphs |
| The Archive | Pale gold, glass, soft white light, deep brown |
| Fractal Bloom | Shifting rainbow fractals, deep purple |
| Juno's Garden | Organic pinks, greens, pearl, faces in the clouds |
| Black ICE | Black, red, white scanlines |
| The Core | All palettes collapsing into white |

## 16.3 The Avatar and Enemies
- **Theo's avatar:** a humanoid of light (wireframe + emissive core + trails) that evolves with Drift: more lines, more glow, fewer human features.
- **Enemies:** simple, iconic polyhedra and chrome forms, each with a clear colour and silhouette; enemy bullets in a reserved high-contrast colour per layer.
- **Bosses:** large, multi-part, morphing models (Blender, via the MCP).

---

# 17. AUDIO

- **Soundtrack (33 tracks:** 9 story dives, 21 contracts, title, lab and credits; Remix versions on top**):** mid-90s **trance** (classic, uplifting, acid, progressive, psychedelic/Goa-influenced) and **hard techno**, 136–155 BPM, analogue character (303 acid lines, supersaws, big reverb pads, 909 drums). Generated with **Stable Audio 3** from `deeplink_soundtrack.md`, with stems for the adaptive mix (§9.2).
- **Beat maps:** each track's BPM, bars and sections are authored (with a first pass from an analysis tool) and checked by ear.
- **SFX:** synthetic and musical: shots pitched to the track's key, lock-on tones that build a chord, breaches with a reverse cymbal and impact, integrity loss as low-pass filtering of the mix.
- **Voices:** short radio lines in dives (Lena, Pike, Weyl, Juno) as text with optional voice; Juno's voice processed with reverb and pitch shimmer.
- **The lab:** quiet ambient sound (fans, rain, the hum of workstations) in storyboard sequences, a sharp contrast with the dives.

---

# 18. USER INTERFACE

- **In-dive HUD (minimal, 90s VR style):**
  - integrity ring around the reticle; Flow bar; Sync multiplier;
  - lock-on markers and a beat indicator (a ring pulsing with the kick);
  - section label on transitions ("BREACH"), the track title at start.
- **Lab screen:** storyboard pages, the brain-scan mod screen, the contract board, the evidence and fragment trackers, dialogue choices.
- **Menus:** a 1996 desktop/OS look (bevelled windows, a CRT glow), with a boot sequence.
- **Accessibility:** remapping; assists; game speed; reduced flashing (important: breaches and Overdrive must have a low-flash mode); colour-blind enemy palettes; subtitles for all voices; a visual beat indicator for players who can't hear the music.

---

# PART V: TECHNOLOGY

# 19. ENGINE

## 19.1 Architecture
```
src/
  core/      loop (fixed-step sim, interpolated render), input, save, rng
  audio/     music player with stems, beat clock (sample-accurate from the AudioContext),
             section events, SFX, analysis (Custom Music)
  dive/      path splines, corridor bounds, spawn scripts on the beat grid, set pieces,
             breaches, branches
  sim/       avatar flight, weapons, lock-on, enemies (coroutine behaviours), bosses,
             collision, scoring, Flow/Sync/Integrity
  story/     Drift, mods, choices, endings, storyboard sequencing
  render/    WebGPU: low-poly meshes, flat/Gouraud, chrome env maps, checkerboards,
             fog, fractal raymarch pass, morph targets, trails, bloom, dither, CRT
  panels/    storyboard page player (shared with Afterglow's panel engine)
  ui/        HUD, lab, menus, accessibility
  editor/    dive editor (§20)
data/        tracks (beat maps), dives, enemies, bosses, mods, story pages
```

## 19.2 Key Techniques
- **The beat clock** comes from the AudioContext time, not the frame clock, so spawns and pulses stay locked to the music at any frame rate.
- **Coroutine behaviours** for enemies and bosses (the scripting style of the Saint Dragon port), with waits in **beats** instead of frames (`yield* beats(2)`).
- **Procedural geometry kits** per layer: city towers, chrome seas (a displaced plane with a mirror shader), canyons, libraries, fractals (ray-marched at low resolution, composited), organic forms (metaballs, morphs).
- **Breach transitions:** the current layer's geometry shatters (pre-fractured meshes) while the next layer fades in, timed to the first beat of the drop.

## 19.3 Performance Targets
- 60 fps minimum at the internal resolution on integrated GPUs; 120+ fps on discrete GPUs.
- Up to 300 enemies and 1,500 projectiles; the fractal pass at 200 × 150 upscaled.
- Load time under 3 seconds per dive (procedural geometry generated at load).

---

# 20. TOOLS

| Tool | Purpose |
|---|---|
| **Beat mapper** | Load a track, auto-detect BPM, beats and sections, correct by hand, export the beat map |
| **Dive editor** | A timeline over the track: path splines, corridor bounds, spawns on the beat grid, set pieces, breach points; test from any bar |
| **Pattern lab** | Write and preview enemy and boss patterns in beats |
| **Layer kit lab** | Tune procedural geometry and palettes per layer |
| **Blender MCP pipeline** | Enemies, bosses, the avatar, set-piece models; export to glTF |
| **Storyboard pipeline** | Prompt file → AI base → ink finishing → page JSON |

---

# 21. MILESTONES

- **M0, Flight + beat clock:** spline flight, corridor bounds, the beat clock locked to a test track, pulses and spawns on the beat. **Find the feel first.**
- **M1, Combat:** pulse, lock-on, roll, boost, integrity/Flow/Sync, 6 enemy types; the Calibration dive.
- **M2, Renderer:** flat/Gouraud, chrome, checkerboards, fog, trails, bloom, dither; Grid City layer kit; the first breach transition.
- **M3, Layers 1–2 + storyboards:** Grid City and Chrome Sea story dives with bosses, and their 6 contracts; the contract board; the intro and first storyboard pages; the lab screen.
- **M4, Drift and mods:** mods, Drift effects on the avatar and pages, choices.
- **M5, Layers 3–5:** canyons, archive, fractal raymarch; bosses; 9 contracts.
- **M6, Layers 6–8 and endings:** Juno's Garden, Black ICE, the Core; 6 contracts; evidence and fragments; three endings with their variants.
- **M7, Modes:** Free Dive, Remix dives, Endless, Custom Music (analysis), Time Attack.
- **M8, Polish:** audio mix and stems, accessibility, balance, performance, the storyboard finishing pass.

---

# 22. MVP SCOPE

- The **intro** storyboard;
- **Calibration** and **Grid City**: the story dive with the Auditor boss and one breach, plus **two contracts** (*Stress Test* and *Ghost Packet*), 4 tracks;
- the contract board;
- pulse, lock-on, roll, boost; Sync;
- 6 enemy types;
- 2 mods with Drift;
- the lab screen and 2 storyboard pages.

It's enough to show the speed, the music lock and the contrast between the ink world and the Deep.

---

# 23. RISKS AND MITIGATIONS

| Risk | Mitigation |
|---|---|
| The music lock feels like a rhythm game | Beat rewards optional; spawns musical but readable; nothing requires timing |
| Speed hurts readability | Corridor bounds, telegraphed patterns, reserved bullet colours, assists |
| Flashing and breaches cause discomfort | A low-flash mode from day one, photosensitivity testing, reduced shake |
| Early-90s CGI looks cheap instead of stylish | Strong art direction per layer, palette discipline, dithering and low resolution as a deliberate look, bloom and trails |
| AI music quality varies between tracks | Generate several candidates per track, choose by ear, keep stems; the beat maps are hand-checked |
| Contracts feel like filler | Each contract has its own route, set pieces, track and story weight; contracts are optional beyond one per layer |
| Storyboard consistency across panels | Character sheets first, a fixed style prefix, the ink finishing pass |
| Custom Music produces bad levels | A clear "experimental" label, conservative generation rules, a fallback to fixed BPM |

---

# 24. FEATURES TO AVOID
- Rhythm-game button prompts.
- Open-world exploration in the Deep (dives are tracks).
- Long text dialogue in dives (radio lines only).
- Colour in the real world (except the *Ascend* ending).
- Gore. The violence is digital; the human cost is shown in the pages.

---

# 25. ONE-SENTENCE PITCH

> In 1996, a broke arcade champion becomes the test pilot of a corporate neural VR rig, diving at the speed of trance and hard techno through cyberspace that makes him more than human, while the black-and-white world outside slowly loses him.

---

# 26. DEVELOPMENT NORTH STAR

Does a feature strengthen one of these?
- The music is the level
- Speed above all
- 1996 cyberspace, played straight
- Power has a price
- Ink between dives

If not, cut it.

---

# 27. COMPANION FILES
- **`deeplink_panel_prompts.md`:** image prompts for every storyboard panel and the character reference sheets, in black-and-white European comic style.
- **`deeplink_soundtrack.md`:** Stable Audio 3 prompts for every track, with BPM and structure to build the beat maps from.

---

## SHIFT — the two worlds (added for GitHub Game Off 2026, theme "SHIFT")

Every layer keeps its own shadow copy over the same corridor: the **A-side** (the layer) and the **B-side**, nine shadow
layers that exist only through the shift: **Static** (Calibration — a dead channel: tumbling CRTs, test cards, walls of
snow, broadcast masts), **The Graveyard** (Grid City — deleted data: toppled server racks, dead terminals, floppies,
gravestones), **The Trench** (Chrome Sea — the sea floor: a giant's ribcage over the path, jellyfish drifting up, a drowned
colonnade and statue heads, light falling in shafts from far above), **Cold Storage** (Firewall Canyons — the canyon frozen:
ice walls with the code stopped inside, icicles, a frozen river, flames frozen mid-flicker, an aurora), **The Ashes** (The
Archive — after the fire: charred shelves, burning windows, pages rising in embers, smoke), **Recursion** (Fractal Bloom —
Escher: a corridor of doorways each turned a quarter, stairs on every wall and ceiling, spiral stairs, impossible triangles),
**Negative** (Juno's Garden — drawn in black ink on white, her face inverted in the sky), **The Hive** (Black ICE — ICE
breeding: a honeycomb tunnel, larvae, hive spheres) and **Event Horizon** (The Core — the same collapse as the Core, into a
black hole instead of a white sun: wreckage stretched toward it, its photon ring growing). **Shift** (Shift / X) flips Theo between them. Lena's line in Calibration introduces it.

- **Seamless:** the new world sweeps outward from the camera in one wave (≈0.3 s), the palette blends, nothing loads, the
  camera never jumps.
- **The music shifts with you:** one track, two live treatments crossfaded on the shift — A-side trance (thinner lows,
  airy top, dotted-eighth echo), B-side hard techno (saturated, heavy lows, biting mids). One source: never out of time.
- **Polarity (Ikaruga):** waves, world ICE, gates and firewalls belong to one world. Other-world things are ghosts (cannot
  be hit, cannot ram you, cannot be locked) but their shots are solid and hurt. Own-world shots are hollow rings and are
  **absorbed** as Flow (+2.5) and score. Bosses exist in both worlds and alternate their shot polarity every bar. Mirror
  kites reflect pulses as other-world shots.
- **Clean shift:** within 95 ms of a beat → Sync +0.3 and a 0.18 s guard that absorbs anything. Off-beat: Sync −0.15 and a
  screen glitch. Rewarded, never required.
- **Gate runs** flip worlds every beat (4 gates); gate lines and firewalls each pick a world.
- **World chains:** three kills in a row from the same world → 100 × 2ⁿ⁻¹ (up to 25 600).
- **One-key mode** (accessibility / one-button play): the autopilot steers, fires and locks; tap = shift, hold = slow time
  (costs Flow).
