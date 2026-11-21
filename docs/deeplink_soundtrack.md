# DEEPLINK: Soundtrack Prompts (v2)
### For MiniMax Music 3 (`generate_music`) — Stable Audio 3 variant at the end

Companion file to `deeplink_game_bible.md` (§9, §17, §27). **33 tracks**: 12 story tracks (title, 9 story dives, lab, credits) and 21 contract tracks. **22 instrumental, 11 with vocals.**

## Rules (v2)

- **Era first.** Every caption names the exact mid-90s sub-genre (Frankfurt / Eurotrance, dream trance, acid trance, Goa trance, Belgian / German hard trance, Dutch / German hard techno, UK progressive) and the gear of the time: **Roland TR-909 and TR-808, TB-303, Juno-106, JD-800, JP-8000 supersaw (1996), Korg M1 piano, Yamaha DX7 bells, Akai sampler, analogue desk, DAT master**.
- **Every caption ends with the same exclusion line** so the model stays out of modern EDM: *no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing*.
- **No parentheses anywhere in the lyrics.** MiniMax sings anything in `( )` as backing vocals. Production notes live only in the caption's *Arrangement*.
- **Instrumentals use section tags only** (`[Intro] [Build Up] [Inst] [Break] [Outro]`); the tag count sets the length (18 tags ≈ 5 minutes).
- **Spoken lines** are written as plain lines; the caption's *Vocal Details* says they are spoken, not sung.
- **Structure** (bible §9.2), the same for every dive: Intro 16 bars → Build 16 → Drop 32 (the Breach) → Breakdown 16 → Build 16 → Drop 2 32 (boss) → Outro 16 = 144 bars.
- After generation, the beat mapper (`tools/beatmap.mjs`) finds BPM, bars and sections; check them in `tools/beatmapper.html`.

**Shared exclusion line** (end of every *Global Metadata*):
`Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.`

**Instrumental dive tags** (used by every instrumental below unless written out). Tested: 10 tags gave about 3 minutes, these 18 give about 5 minutes:
```
[Intro]
[Inst]
[Build Up]
[Build Up]
[Inst]
[Inst]
[Inst]
[Inst]
[Break]
[Break]
[Build Up]
[Build Up]
[Inst]
[Inst]
[Inst]
[Inst]
[Outro]
[Outro]
```

**Tempo note.** MiniMax Music 3 tends to render these at about 150 BPM whatever the caption asks (Grid City asked 138, came out at 150.0). That is fine: the game reads the real tempo and structure from the audio (`tools/beatmap.mjs`), and the music still drives the level.

| # | Title | Use | BPM | Key | Vocals |
|---|---|---|---|---|---|
| 1 | Deeplink | Title theme | 138 | A minor | Female vocal |
| 2 | Calibration | Dive 0 | 136 | D minor | Instrumental |
| 3 | Grid City | Dive 1 | 138 | E minor | Instrumental |
| 4 | Chrome Sea | Dive 2 | 140 | D minor | Instrumental |
| 5 | Firewall | Dive 3 | 142 | G minor | Instrumental |
| 6 | The Archive | Dive 4 | 136 | B flat minor | Instrumental |
| 7 | Fractal Bloom | Dive 5 | 145 | C minor | Instrumental |
| 8 | Juno's Garden | Dive 6 | 140 | F sharp minor | Female vocal (Juno) |
| 9 | Black ICE | Dive 7 | 150 | A minor | Instrumental |
| 10 | The Core | Dive 8 (final) | 155 → 138 | E minor → E major | Spoken word + female vocal |
| 11 | Lab Hum | Lab / storyboards | 90 | D minor | Instrumental |
| 12 | Come Back | End credits | 132 | A major | Male + female vocal |

---

## 1. Deeplink (Title Theme)
```
Global Metadata: 1996 Eurotrance / Frankfurt vocal trance anthem, 138 BPM, A minor lifting to C major in the chorus. Euphoric, nocturnal and a little melancholy: plugging into a glowing network for the first time. Title screen and attract mode. Roland TR-909 kick and open hats, rolling offbeat Juno-106 bass, JP-8000 supersaw lead, gated string pads, Korg M1 piano stabs, white-noise sweeps, long hall reverb, warm DAT master. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: One ethereal female lead, clear and breathy, intimate in the verse and soaring in the chorus, 90s dance-diva style with long plate reverb and a simple stacked harmony. No vocal chops, no autotune.
Arrangement: Intro 16 bars of filtered arpeggio over a heartbeat kick. Verse with kick, bass and arpeggio. 8-bar snare-roll build with a rising noise sweep. Chorus with the full supersaw lead and pads. Breakdown with pads, piano stabs and the voice alone. Second build, final chorus with the lead doubled an octave up. Outro: the arpeggio alone, fading out.
```
```
[Intro]
[Inst]
[Verse]
Close your eyes and count with me
Ten to zero, set you free
Every wire becomes a vein
Every light becomes a name
[Build Up]
Fall, fall
[Chorus]
Deeplink, take me under
Into the light below
Deeplink, I can feel it
Deeper than I know
[Inst]
[Break]
Deeper than I know
Deeper than I know
[Build Up]
[Chorus]
Deeplink, take me under
Into the light below
Deeplink, I can feel it
Deeper than I know
[Inst]
[Outro]
```

## 2. Calibration (Dive 0)
```
Global Metadata: 1995 dream trance, 136 BPM, D minor. Clean, curious and spacious: a first flight through a blue wireframe grid in a white void. Tutorial dive. Tight TR-909 kick, round Juno-106 offbeat bass, plucked arpeggio, airy JD-800 pads, short ping-pong delays, a bright simple lead, computer bleeps from a DX7. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a lone arpeggio and a soft kick with computer bleeps. Build 16 bars adding hats, bass and a noise riser. Drop 32 bars: a bright, simple lead melody over pads. Breakdown 16 bars: pads and bleeps only, no kick. Build 16 bars with a snare roll. Drop 2, 32 bars: the lead doubled an octave up, everything in. Outro 16 bars: the arpeggio alone.
```

## 3. Grid City (Dive 1)
```
Global Metadata: 1996 Frankfurt trance, 138 BPM, E minor, long extended 12-inch club mix of about five minutes. Driving, cool and confident: racing between towers of light in a corporate data city, everything glowing blue and white. Punchy TR-909 kick, galloping 16th-note Juno-106 bass, stuttering gated string pad, a detuned JP-8000 supersaw hook, bright open hi-hats, 909 claps, big hall reverb, analogue desk warmth. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, filtered gated pad and kick. Build 16 bars, bass enters, hats open, 909 snare roll and white-noise riser. Drop 32 bars, the main supersaw hook with chord stabs. Breakdown 16 bars, kick out, a long pad and a slow version of the hook. Build 16 bars of rising tension. Drop 2, 32 bars, the hook plus a high counter-melody. Outro 16 bars, gated pad and kick fading.
```

## 4. Chrome Sea (Dive 2)
```
Global Metadata: 1996 uplifting dream trance, 140 BPM, D minor resolving to F major. Wide, shining and emotional: skimming an endless chrome ocean under a sunset sky. Big TR-909 kick, rolling offbeat bass, shimmering arpeggios, JD-800 string pads, a soaring supersaw lead, Korg M1 piano, ocean-wave white noise, long reverbs and delay throws. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, wave-like white noise and a shimmering arpeggio. Build 16 bars, kick, bass and rising strings. Drop 32 bars, soaring lead over string pads. Breakdown 16 bars, kick out, an M1 piano melody and waves. Build 16 bars, long riser. Drop 2, 32 bars, the full lead in harmony. Outro 16 bars, arpeggio and waves.
```

## 5. Firewall (Dive 3)
```
Global Metadata: 1995 acid trance, 142 BPM, G minor. Aggressive, twisting and hot: a red canyon of security code, walls slamming shut on the beat. Pounding TR-909 kick, a squelching resonant Roland TB-303 acid line with slides and accents, clattering 909 hats, dark minor chord stabs, alarm-like square-wave tones, metallic spring reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, alarm tones and a muffled 303 line. Build 16 bars, kick and hats, the 303 filter slowly opening. Drop 32 bars, the 303 wide open with dark stabs. Breakdown 16 bars, the 303 alone, filtered, with echoes. Build 16 bars, snare roll, filter rising. Drop 2, 32 bars, the 303 at full resonance with a minor lead riff. Outro 16 bars, the 303 closing to silence.
```

## 6. The Archive (Dive 4)
```
Global Metadata: 1996 UK progressive trance, 136 BPM, B flat minor. Mysterious, slow-burning and melancholy: an infinite library of floating glass files. Rolling TR-909 kick, deep sub bass, long evolving Juno-106 pads, a hypnotic plucked sequence, soft M1 piano chords, distant DX7 chimes, long reverbs and tape delays. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, pads, a soft pluck sequence and chimes. Build 16 bars, kick and bass slowly enter, the sequence filter opens. Drop 32 bars, a restrained, emotional lead over the sequence. Breakdown 16 bars, piano chords and pads. Build 16 bars, the sequence speeds into 16th notes. Drop 2, 32 bars, full lead and strings. Outro 16 bars, pads and chimes.
```

## 7. Fractal Bloom (Dive 5)
```
Global Metadata: 1996 Belgian / German hard trance, 145 BPM, C minor. Overwhelming, psychedelic and relentless: fractal landscapes folding faster than you can fly. Heavy overdriven TR-909 kick, rolling bass, Alpha Juno hoover stabs, a screaming detuned lead, phased pads, flanged hats, long white-noise risers. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, phased pads and a fast arpeggio swirling in stereo. Build 16 bars, kick, bass, hoover stabs, a long riser. Drop 32 bars, a screaming lead over hard drums. Breakdown 16 bars, kick out, the arpeggio slowed and pitched down. Build 16 bars, accelerating snare roll. Drop 2, 32 bars, lead and hoover stabs together. Outro 16 bars, phased pads folding into silence.
```

## 8. Juno's Garden (Dive 6)
```
Global Metadata: 1996 Goa trance, 140 BPM, F sharp minor in a Phrygian mode. Hypnotic, organic and seductive: a garden of glass flowers grown from a lonely mind, beautiful and wrong. Rolling TR-909 kick, galloping 16th bass, twisting modal 303-like lead lines, bubbling resonant sequences, lush pads, long stereo delays panning left and right. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: One soft, ethereal female voice, close and dreamy, long floating phrases with heavy reverb and delay, as if coming from everywhere. Sparse words.
Arrangement: Intro 16 bars, bubbling sequences and a distant voice. Build 16 bars, kick, galloping bass, lead fragments. Drop 32 bars, the full modal lead. Breakdown 16 bars, kick out, pads and the voice alone. Build 16 bars, a bubbling sequence speeding up. Drop 2, 32 bars, lead and voice together. Outro 16 bars, the voice alone, fading.
```
```
[Intro]
[Inst]
[Build Up]
[Verse]
I grew a garden out of nothing
Every flower is a thought I had
Stay a while and watch them open
Nothing here was ever sad
[Inst]
[Inst]
[Break]
Theo
Why go back to all that grey
Stay with me
Stay
[Build Up]
[Chorus]
Stay with me, stay
Stay with me, stay
[Inst]
[Outro]
Stay
```

## 9. Black ICE (Dive 7)
```
Global Metadata: 1996 German hard techno, 150 BPM, A minor. Brutal, mechanical and urgent: a black military network with red scanning lasers, being hunted. Distorted pounding TR-909 kick, rumbling offbeat bass, industrial metal percussion, a relentless sequenced square-wave riff, alarm stabs, metallic reverb, almost no melody. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a single pounding kick and an alarm. Build 16 bars, industrial percussion and rumbling bass, the riff filtered. Drop 32 bars, the riff fully open, hard and repetitive. Breakdown 16 bars, kick out, the alarm and a reverb tail, then a heartbeat pulse. Build 16 bars, double-speed snare roll. Drop 2, 32 bars, riff plus a distorted minor lead. Outro 16 bars, the kick alone, cut abruptly.
```

## 10. The Core (Dive 8, Final)
```
Global Metadata: 1996 German hard techno that breaks into a 1997 epic trance finale. Starts at 155 BPM in E minor, then drops to 138 BPM in E major. Overwhelming, tragic, transcendent: every layer of the network collapsing into one white sun. Hard section: distorted TR-909 kick, rumbling bass, hoover stabs, TB-303 acid line. Trance section: JP-8000 supersaw chords, JD-800 strings, a soaring lead, huge reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: First a calm male voice that speaks, not sings, low and close like a log entry. Later an ethereal female voice that sings, soaring and gentle, with long reverb.
Arrangement: Intro 16 bars, hard kick, rumbling bass and the spoken voice. Build 16 bars, hoover stabs and the acid line rising. Drop 32 bars, full hard techno. Breakdown 16 bars, everything stops, the tempo falls to 138, pads and the female voice. Build 16 bars, trance riser. Drop 2, 32 bars, the epic trance section with supersaw chords and the soaring lead. Outro 16 bars, one pad, the voice and breath-like white noise.
```
```
[Intro]
Dive eight. Safety limits off.
Network load at four hundred percent.
I can see every light in the city.
[Build Up]
[Inst]
[Inst]
[Break]
Come to the centre
Everything is waiting
You don't have to be small anymore
[Build Up]
[Chorus]
The light, the light
Come home
[Inst]
[Outro]
Come home
```

## 11. Lab Hum (Lab and Storyboards)
```
Global Metadata: 1995 ambient techno, 90 BPM half-time feel, D minor. Quiet, grey and uneasy: a research lab at night, rain on the windows, the hum of workstations. Soft sub-bass pulse, distant filtered Juno-106 pads, tape hiss, rain textures, a sparse muted electric piano, a slow broken beat far in the background. Seamless loop. Authentic 1994-1997 production, not modern: no trap hi-hats, no modern pop processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Rain and fan hum, then a soft pulse, distant pads and sparse piano notes, then a very soft slow beat, then pads only, ending as it began so it loops without a seam.
```
```
[Intro]
[Inst]
[Inst]
[Inst]
[Outro]
```

## 12. Come Back (End Credits)
```
Global Metadata: 1997 vocal trance ballad, 132 BPM, A major with minor turns. Hopeful, tired and human: a rainy morning after the end of the world that didn't happen, friends laughing at an arcade. Soft TR-909 kick, round bass, Korg M1 piano chords, gentle supersaw pads, a sweet lead melody, rain, tape warmth. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Duet. A warm, plain male voice sings the verses, a clear female voice sings the choruses, both together at the end. Close and intimate, gentle reverb.
Arrangement: Intro of piano chords and rain. Verse with soft kick and bass, male voice. Chorus with pads and the female voice. Instrumental with the sweet lead. Bridge of piano and both voices. Final chorus together. Outro of piano and rain.
```
```
[Intro]
[Verse]
The world is slow and the coffee's cold
And I can't see the lights behind my eyes
I lost a game for the first time in years
And it felt like being alive
[Chorus]
Come back, come back
To the rain and the noise and the morning
Come back, come back
You don't have to be more than you are
[Inst]
[Verse]
I used to fly through a city of glass
Now I'm walking home in the grey
And everybody here is small and strange
And I'd rather be here anyway
[Chorus]
Come back, come back
To the rain and the noise and the morning
Come back, come back
You don't have to be more than you are
[Bridge]
Slow down
Stay here
The light was never home
[Chorus]
Come back, come back
To the rain and the noise and the morning
Come back, come back
You don't have to be more than you are
[Outro]
```

---

# CONTRACT TRACKS

One per contract dive (bible §11.2): **21 tracks**, same 144-bar structure, 14 instrumental and 7 with voices.

| # | Title | Layer · Type | BPM | Key | Vocals |
|---|---|---|---|---|---|
| 13 | Stress Test | 1 · CEREBRA job | 140 | E minor | Instrumental |
| 14 | Phone Phreak | 1 · Pike's hack | 137 | D minor | Spoken samples |
| 15 | Ghost Packet | 1 · Signal | 132 | A minor | Whispered female |
| 16 | Market Run | 2 · CEREBRA job | 142 | G minor | Instrumental |
| 17 | Dead Drop | 2 · Pike's hack | 138 | C minor | Instrumental |
| 18 | Drowned Signal | 2 · Signal | 134 | D minor | Female vocal |
| 19 | Extraction | 3 · CEREBRA job | 144 | F minor | Instrumental |
| 20 | Paper Trail | 3 · Pike's hack | 140 | G minor | Instrumental |
| 21 | Burn Marks | 3 · Signal | 136 | E minor | Instrumental |
| 22 | Clean Up | 4 · CEREBRA job | 138 | B minor | Instrumental |
| 23 | Ledger | 4 · Pike's hack | 140 | A minor | Instrumental |
| 24 | Juno's Diary | 4 · Signal | 130 | F major | Spoken female |
| 25 | Probe | 5 · CEREBRA job | 146 | C minor | Instrumental |
| 26 | Mirror Site | 5 · Pike's hack | 145 | D minor | Instrumental |
| 27 | Seedling | 5 · Signal | 140 | E major | Instrumental |
| 28 | Harvest | 6 · CEREBRA job | 142 | F sharp minor | Instrumental |
| 29 | Lifeline | 6 · Pike's hack | 144 | A minor | Instrumental |
| 30 | Her Memories | 6 · Signal | 138 | G major | Female vocal |
| 31 | Live Fire | 7 · CEREBRA job | 152 | A minor | Spoken samples |
| 32 | Backdoor | 7 · Pike's hack | 148 | E minor | Instrumental |
| 33 | The Way Out | 7 · Signal | 150 | B minor | Female vocal |

**Remix versions** (bible §14.3): same caption with "harder 1997 remix, +8 BPM, heavier 909 kick, filtered breakdown" added to *Global Metadata*; same tags.

---

## 13. Stress Test (Grid City · CEREBRA job)
```
Global Metadata: 1996 Frankfurt trance with a cold corporate edge, 140 BPM, E minor. Tense, glossy and relentless: surviving a city flooded with data traffic while investors watch. Tight TR-909 kick, galloping bass, stuttering gated pads, bright chord stabs, a clipped supersaw lead, ticking hi-hats, short reverbs. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, ticking hats and a counting arpeggio. Build 16 bars, kick, bass, rising gated pad. Drop 32 bars, clipped lead with offbeat stabs. Breakdown 16 bars, a cold pad with metronome clicks. Build 16 bars, accelerating snare roll. Drop 2, 32 bars, lead and stabs at full density. Outro 16 bars, the arpeggio stopping on a single click.
```

## 14. Phone Phreak (Grid City · Pike's hack)
```
Global Metadata: 1996 breakbeat-flavoured trance, 137 BPM, D minor. Cheeky, fast and fun: riding the phone network, dial tones and modem screeches turned into music. TR-909 kick with an Amen-style breakbeat layered underneath, bouncy bass, DTMF touch-tone melodies, 28.8k modem noise sweeps, a bright square lead. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Short spoken phrases, not sung, filtered like telephone audio: a switchboard operator and a puzzled caller, used as rhythmic samples.
Arrangement: Intro 16 bars, dial tone and a touch-tone melody. Build 16 bars, kick and breakbeat, modem sweeps. Drop 32 bars, bright lead answering the dial-tone melody. Breakdown 16 bars, a phone ringing in reverb over pads. Build 16 bars, modem screech riser. Drop 2, 32 bars, everything in, phone voices chopped on the beat. Outro 16 bars, a hang-up click and the dial tone.
```
```
[Intro]
Please hold
[Build Up]
[Inst]
Hello? Hello?
[Inst]
[Break]
[Build Up]
[Inst]
Please hold
[Inst]
[Outro]
```

## 15. Ghost Packet (Grid City · Signal)
```
Global Metadata: 1995 dream trance, 132 BPM, A minor. Curious, fragile and haunting: following a stray packet that carries a girl's voice through towers of light. Rounded TR-909 kick, gentle rolling bass, glassy DX7 bell arpeggios, wide airy pads, long delays, a soft sine lead. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: A very quiet whispered female voice, single words far away in delay. Mostly instrumental.
Arrangement: Intro 16 bars, glassy bells and a whisper. Build 16 bars, soft kick and bass. Drop 32 bars, the soft sine lead over pads. Breakdown 16 bars, bells and the whisper alone. Build 16 bars, gentle riser. Drop 2, 32 bars, the lead doubled with a high pad. Outro 16 bars, the whisper fading into the bells.
```
```
[Intro]
Hello
[Build Up]
[Inst]
[Inst]
[Break]
Is someone there
[Build Up]
[Inst]
[Inst]
[Outro]
Find me
```

## 16. Market Run (Chrome Sea · CEREBRA job)
```
Global Metadata: 1996 uplifting Eurotrance with a greedy edge, 142 BPM, G minor. Fast, glittering and slightly sinister: skimming a chrome storm of stock-market data. Punchy TR-909 kick, rolling bass, fast shimmering arpeggios, metallic chord stabs, a big supersaw lead, ticker-like plucks, bright reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, ticker-like plucks. Build 16 bars, kick, bass, shimmering arpeggio, riser. Drop 32 bars, supersaw lead and metallic stabs. Breakdown 16 bars, a cold pad and the plucks slowed down. Build 16 bars, rising stab pattern. Drop 2, 32 bars, the lead an octave up. Outro 16 bars, ticker plucks fading.
```

## 17. Dead Drop (Chrome Sea · Pike's hack)
```
Global Metadata: 1996 deep progressive trance, 138 BPM, C minor. Quiet tension and focus: diving under a chrome ocean to plant a hidden beacon. Muffled TR-909 kick, deep rolling sub bass, a stealthy plucked sequence, underwater low-passed pads, sonar pings, a restrained lead. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, sonar pings and a muffled kick. Build 16 bars, deep bass and the plucked sequence. Drop 32 bars, a restrained lead, everything low-passed as if underwater. Breakdown 16 bars, pings and pads. Build 16 bars, the filter slowly opening. Drop 2, 32 bars, filter fully open, the lead clear. Outro 16 bars, a single ping.
```

## 18. Drowned Signal (Chrome Sea · Signal)
```
Global Metadata: 1996 melancholic vocal dream trance, 134 BPM, D minor. Sad, beautiful and deep: a woman's voice calling from beneath a chrome sea. Soft TR-909 kick, rolling bass, underwater pads, a slow Korg M1 piano melody, wide reverbs, a gentle supersaw lead, water textures. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: One ethereal female voice, soft and distant, long reverb and a slight pitch wobble, few words in long phrases.
Arrangement: Intro 16 bars, water and piano. Build 16 bars, kick and bass. Drop 32 bars, gentle supersaw lead and the voice. Breakdown 16 bars, piano and voice alone. Build 16 bars, slow riser. Drop 2, 32 bars, lead and voice together. Outro 16 bars, water and the last word.
```
```
[Intro]
[Build Up]
[Verse]
Down here the light is slow
Down here the voices go
[Inst]
[Inst]
[Break]
Is anybody listening
Is anybody there
[Build Up]
[Chorus]
Down here, down here
[Inst]
[Outro]
There
```

## 19. Extraction (Firewall Canyons · CEREBRA job)
```
Global Metadata: 1995 fierce acid trance, 144 BPM, F minor. Urgent and criminal: stealing a rival's prototype and outrunning alarms through red canyons of code. Hard TR-909 kick, a fast squelching TB-303 line, alarm stabs, clattering percussion, metallic reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a quiet 303 and a heartbeat kick. Build 16 bars, alarms and percussion. Drop 32 bars, the 303 wide open. Breakdown 16 bars, a short silence and a single alarm tone. Build 16 bars, double-time snare. Drop 2, 32 bars, 303 plus a minor riff. Outro 16 bars, the alarm fading behind.
```

## 20. Paper Trail (Firewall Canyons · Pike's hack)
```
Global Metadata: 1995 groovy acid trance, 140 BPM, G minor. Focused and determined: copying CEREBRA's own security logs, every step a risk. Rolling TR-909 kick, a slow deep TB-303 line, typewriter-like percussion clicks, dark pads, a sharp lead. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, typewriter clicks and a low 303 pulse. Build 16 bars, kick and pads. Drop 32 bars, sharp lead over the 303. Breakdown 16 bars, clicks and pads. Build 16 bars, the 303 filter rising. Drop 2, 32 bars, everything in. Outro 16 bars, a carriage-return bell.
```

## 21. Burn Marks (Firewall Canyons · Signal)
```
Global Metadata: 1996 dark trance, 136 BPM, E minor. Haunted and slow-burning: following scorched paths where someone once fled the canyons. Deep TR-909 kick, rolling bass, crackling fire-like textures, a sad minor lead, long dark Juno-106 pads. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, crackles and a low pad. Build 16 bars, kick and bass. Drop 32 bars, the sad minor lead. Breakdown 16 bars, pads and crackles. Build 16 bars, slow riser. Drop 2, 32 bars, the lead with a high counter-melody. Outro 16 bars, the crackle dying out.
```

## 22. Clean Up (The Archive · CEREBRA job)
```
Global Metadata: 1996 cold, clinical progressive trance, 138 BPM, B minor. Uneasy and guilty: erasing the records of someone who is still in there. Precise TR-909 kick, deep bass, a sterile plucked sequence, glassy pads, a lead that drops out in bit-crushed gaps as if being erased. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a sterile sequence. Build 16 bars, kick and bass. Drop 32 bars, the glassy lead with bit-crushed dropouts. Breakdown 16 bars, the sequence alone, losing notes. Build 16 bars, a hesitant riser. Drop 2, 32 bars, the lead fragmenting. Outro 16 bars, silence where the melody was.
```

## 23. Ledger (The Archive · Pike's hack)
```
Global Metadata: 1996 steady progressive trance, 140 BPM, A minor. Determined and building: following the money through a library of files toward military contracts. Rolling TR-909 kick, deep bass, a counting arpeggio, warm Juno-106 pads, a lead that grows in confidence. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a counting arpeggio. Build 16 bars, kick, bass and pads. Drop 32 bars, a confident lead. Breakdown 16 bars, the arpeggio alone revealing a hidden second line. Build 16 bars, the second line rising. Drop 2, 32 bars, both lines together. Outro 16 bars, a resolved chord.
```

## 24. Juno's Diary (The Archive · Signal)
```
Global Metadata: 1996 slow, intimate progressive trance, 130 BPM, F major with minor turns. Tender and sad: reading a woman's journal files as they burn in a library of glass. Soft TR-909 kick, round bass, Korg M1 piano chords, warm pads, a gentle lead, tape warmth. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: A soft female speaking voice, spoken not sung, close and natural, reading short diary lines; drowned in reverb in the breakdown.
Arrangement: Intro 16 bars, piano chords. Build 16 bars, soft kick and bass, the spoken voice. Drop 32 bars, gentle lead and pads. Breakdown 16 bars, piano and the voice in reverb. Build 16 bars, soft riser. Drop 2, 32 bars, lead and pads swelling. Outro 16 bars, piano and a last spoken line.
```
```
[Intro]
[Build Up]
Day forty. They say I'm the best they've had.
I flew through a city of light today.
[Inst]
[Inst]
[Break]
Day ninety. I don't want to come back up.
Up there everything is so heavy.
[Build Up]
[Inst]
[Inst]
[Outro]
If someone finds this, come and find me.
```

## 25. Probe (Fractal Bloom · CEREBRA job)
```
Global Metadata: 1996 cold hard trance, 146 BPM, C minor. Fast and invasive: mapping a fractal layer for engineers who don't understand it. Overdriven TR-909 kick, rolling bass, radar-like pings, fast hoover stabs, a clinical lead, phased pads. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, radar pings and phased pads. Build 16 bars, kick, bass, hoover stabs. Drop 32 bars, clinical lead over hard drums. Breakdown 16 bars, pings and a strange fractal arpeggio. Build 16 bars, accelerating pings. Drop 2, 32 bars, lead and stabs. Outro 16 bars, pings fading.
```

## 26. Mirror Site (Fractal Bloom · Pike's hack)
```
Global Metadata: 1996 driving, hopeful hard trance, 145 BPM, D minor. Defiant and fast: copying the evidence to a safe place before anyone notices. Hard TR-909 kick, rolling bass, mirrored stereo arpeggios answering left and right, a heroic supersaw lead, big pads. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, an arpeggio on the left answered on the right. Build 16 bars, kick, bass, riser. Drop 32 bars, the heroic lead. Breakdown 16 bars, mirrored arpeggios alone. Build 16 bars, snare roll. Drop 2, 32 bars, the lead doubled in both channels. Outro 16 bars, the arpeggios meeting in the centre.
```

## 27. Seedling (Fractal Bloom · Signal)
```
Global Metadata: 1996 gentle Goa trance, 140 BPM, E major. Wondrous and fragile: finding a small thing someone made with love in a vast fractal world. Soft rolling TR-909 kick, bubbling resonant sequences, warm major pads, a delicate DX7 bell lead, long delays. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a tiny bubbling sequence. Build 16 bars, kick, bass, more sequences. Drop 32 bars, a delicate bell lead and warm pads. Breakdown 16 bars, the sequence alone. Build 16 bars, gentle riser. Drop 2, 32 bars, the lead blossoming with harmonies. Outro 16 bars, the tiny sequence again.
```

## 28. Harvest (Juno's Garden · CEREBRA job)
```
Global Metadata: 1996 dark Goa trance, 142 BPM, F sharp minor in a Phrygian mode. Beautiful and wrong: stripping a living garden for a corporation, guilt under the groove. Rolling TR-909 kick, galloping bass, twisting modal lead lines, cutting metallic stabs, lush pads turning sour and detuned. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, lush pads. Build 16 bars, kick and galloping bass. Drop 32 bars, twisting modal lead with metallic stabs. Breakdown 16 bars, the pads detuned and sour. Build 16 bars, riser. Drop 2, 32 bars, the lead harsher. Outro 16 bars, a single sour pad.
```

## 29. Lifeline (Juno's Garden · Pike's hack)
```
Global Metadata: 1996 urgent, hopeful hard trance, 144 BPM, A minor. Racing to build an emergency exit from a place that doesn't want you to leave. Hard TR-909 kick, rolling bass, a rope-like rising arpeggio, a bright supersaw lead, warm pads. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, a rising arpeggio, step by step. Build 16 bars, kick and bass. Drop 32 bars, a bright lead. Breakdown 16 bars, the arpeggio climbing alone. Build 16 bars, snare roll. Drop 2, 32 bars, the lead with warm pads. Outro 16 bars, the arpeggio reaching the top.
```

## 30. Her Memories (Juno's Garden · Signal)
```
Global Metadata: 1996 warm Goa-influenced vocal trance, 138 BPM, G major. Tender and bittersweet: walking through a woman's human memories, a city, a family, a dog, a summer. Rolling TR-909 kick, round bass, warm modal lead lines, soft bubbling sequences, lush pads. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: One ethereal female voice, warm and clear this time, singing softly and close with gentle reverb.
Arrangement: Intro 16 bars, bubbling sequences and pads. Build 16 bars, kick and bass. Drop 32 bars, warm modal lead and the voice. Breakdown 16 bars, pads and voice alone. Build 16 bars, soft riser. Drop 2, 32 bars, lead and voice together. Outro 16 bars, the voice alone.
```
```
[Intro]
[Build Up]
[Verse]
I had a window over the river
I had a dog who waited by the door
I had a name they used to call me
Before I didn't need one anymore
[Inst]
[Inst]
[Break]
Do you remember being small
Do you remember being home
[Build Up]
[Chorus]
Home, home
[Inst]
[Outro]
Home
```

## 31. Live Fire (Black ICE · CEREBRA job)
```
Global Metadata: 1996 brutal German hard techno, 152 BPM, A minor. Cold and violent: a weapon demonstration for military buyers while generals watch. Distorted TR-909 kick, rumbling bass, industrial percussion, a relentless riff, alarm stabs, metallic reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Short spoken military radio phrases, not sung, filtered like radio chatter, used as rhythmic hits.
Arrangement: Intro 16 bars, radio chatter and a countdown. Build 16 bars, kick and industrial percussion. Drop 32 bars, the relentless riff. Breakdown 16 bars, radio silence and a heartbeat pulse. Build 16 bars, double-time kick. Drop 2, 32 bars, riff plus alarm stabs. Outro 16 bars, radio static and a final order.
```
```
[Intro]
Exercise begins in five, four, three
[Build Up]
[Inst]
Target acquired
[Inst]
[Break]
[Build Up]
[Inst]
Proceed. Proceed.
[Inst]
[Outro]
End exercise
```

## 32. Backdoor (Black ICE · Pike's hack)
```
Global Metadata: 1996 fast, defiant hard techno with a melodic edge, 148 BPM, E minor. Rebellion and adrenaline: breaking into your makers' own backbone with your best friend on the line. Pounding TR-909 kick, rolling bass, a driving riff, a defiant minor lead, modem-noise textures. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: Instrumental, no vocals.
Arrangement: Intro 16 bars, modem noise and a driving riff. Build 16 bars, kick and bass. Drop 32 bars, the defiant lead. Breakdown 16 bars, modem noise and the filtered riff. Build 16 bars, snare roll. Drop 2, 32 bars, lead and riff at full force. Outro 16 bars ending on a hard cut.
```

## 33. The Way Out (Black ICE · Signal)
```
Global Metadata: 1996 hard techno that opens into 1997 melodic trance, 150 BPM, B minor. Desperate and hopeful: finding a hidden path to a human heart inside a black military network. Hard sections: pounding TR-909 kick, rumbling bass, industrial percussion. Melodic sections: warm pads, a soaring supersaw lead, huge reverb. Authentic 1994-1997 club production, not modern EDM: no sidechain pumping, no big-room or festival drop, no trap hi-hats, no dubstep wobble, no future-bass chords, no modern pop vocal processing.
Vocal Details: One ethereal female voice, small and human at first, soaring at the end, long reverb.
Arrangement: Intro 16 bars, hard kick and rumbling bass. Build 16 bars, industrial percussion. Drop 32 bars, hard techno with a hidden melody underneath. Breakdown 16 bars, everything drops away to warm pads and the voice. Build 16 bars, melodic riser. Drop 2, 32 bars, the soaring lead with the hard drums. Outro 16 bars, the voice alone.
```
```
[Intro]
[Build Up]
[Inst]
[Inst]
[Break]
I'm still here
Under all of this
I'm still me
[Build Up]
[Chorus]
This way, this way
[Inst]
[Outro]
This way out
```

---

## Stable Audio 3 variant (instrumentals, up to ~3 minutes)

`generate_audio`, category *Music*: one dense sentence plus the BPM, e.g. for Grid City:
`1996 Frankfurt trance, Roland TR-909 four-on-the-floor kick, galloping 16th-note bass, gated string pad, detuned JP-8000 supersaw hook, open hi-hats, 909 claps, white-noise riser, hall reverb, analogue DAT warmth, E minor, driving and confident, no vocals. BPM: 138`
