# DEEPLINK: Storyboard Panel Prompts
### For ComfyUI / Qwen Image 2.1 / Grok Imagine

Companion file to `deeplink_game_bible.md` (§15, §27). One prompt per storyboard panel, numbered `sequence-panel`, with its aspect ratio and the text the panel engine will letter on top. **Captions and balloons are added by the engine, never generated in the image.**

---

## How to Use

1. **Paste the Style Prefix** before every prompt.
2. Use the **Negative Prompt** where supported.
3. **Generate the reference sheets first** (section R) and use them for consistency (image references, IP-adapter, img2img).
4. **Contract panels** (section *Contract Panels*) are briefings shown on the contract board, and outcome panels shown after key contracts. Ending A has two variant panels (A-01L, A-02F) chosen by the player's contracts.
5. **Drift variants:** panels marked **(DRIFT)** have a high-Drift version. Add the **Drift Suffix** for the version shown when Drift ≥ 50 (bible §12): Theo thinner and paler, digital intrusions in the drawing.
6. **Aspect ratios:**
   - 3:2 standard panel;
   - 16:9 wide;
   - 21:9 establishing strip;
   - 2:3 tall;
   - 1:1 square.
7. **The ink finishing pass** by the author on every panel.

### Style Prefix
```
black and white European comic book art, bande dessinée style, detailed ink drawing with brush and dip pen, confident line weight, cross-hatching, solid black shadows, realistic proportions and faces, carefully drawn hands, detailed backgrounds, 1996 setting, rain and fluorescent light, CRT screens drawn as glowing white, pure black ink on white paper, no grey wash, no colour, no text, no speech bubbles, no watermark,
```

### Drift Suffix (DRIFT panels, high-Drift version)
```
, with subtle digital intrusions drawn in ink: thin perspective grid lines across the scene, a few pixel-stepped edges on the contours, wireframe outlines bleeding out of the character, the character noticeably thinner and paler with dark rings under the eyes
```

### Negative Prompt
```
colour, colored, grey gradient, sepia, manga style, anime eyes, chibi, 3D render, CGI, photograph, text, letters, speech bubble, watermark, signature, extra fingers, deformed hands, blurry
```

---

## R. Reference Sheets

### R-01 · 3:2 · Theo Brandt
**Prompt:** character model sheet of Theo Brandt, a lean 24-year-old man with messy dark hair, stubble and sharp restless eyes, worn denim jacket over a faded band t-shirt, cargo trousers, fingerless cycling gloves, a courier bag; front, three-quarter, side and back views, plus four expressions (cocky grin, wonder, exhaustion, fear), white background

### R-02 · 3:2 · Dr. Lena Aurich and Conrad Weyl
**Prompt:** character model sheet: Dr. Lena Aurich, a 45-year-old woman with short grey-streaked hair, thin wire glasses, a lab coat over a turtleneck, a tired kind face, holding a clipboard; Conrad Weyl, a man in his fifties with slicked-back grey hair, an expensive double-breasted suit, a calm controlled smile; front and three-quarter views, white background

### R-03 · 3:2 · Pike and Hollis
**Prompt:** character model sheet: Isaac "Pike" Delgado, a heavyset young Latino man with long curly hair in a ponytail, round glasses, an oversized flannel shirt, a headset; Hollis, a broad security chief in his forties with a crew cut, dark suit, earpiece, stern face; front and three-quarter views, white background

### R-04 · 3:2 · Juno Marsh
**Prompt:** character sheet of Juno Marsh: left, as a human, a thin pale woman in her late twenties with a shaved head and short regrowing hair, lying in a hospital bed with electrodes on her scalp; right, Juno in the virtual world, a tall luminous female figure drawn as white light against black, hair made of flowing lines, a serene vast face, white background for the left half and solid black for the right half

### R-05 · 21:9 · The DEEPLINK rig and lab
**Prompt:** design sheet of the DEEPLINK neural immersion rig in a 1996 research lab: a padded reclining chair, a bulky helmet with a dark visor and dozens of cables, a data glove, tall racks of workstation computers with CRT monitors, an observation window, fluorescent ceiling lights, cables on the floor

### R-06 · 21:9 · The avatar
**Prompt:** design sheet of a humanoid figure made of light flying like a diver with arms swept back, drawn in white ink lines on solid black, wireframe body with a bright core and long light trails, three stages from left to right: still recognisably human, partly abstract, almost pure geometry

---

## INTRO

### I-01 · 21:9 · The city
**Prompt:** establishing shot of a grey 1996 city at night in heavy rain, wet streets, neon shop signs drawn in white, elevated train tracks, a lone bicycle courier crossing a puddled intersection under a streetlight
**Text:** Caption: "1996. THE FUTURE WAS STILL LOADING."

### I-02 · 3:2 · The arcade
**Prompt:** crowded arcade hall at night, rows of cabinets glowing, Theo (lean, messy dark hair, denim jacket, fingerless gloves) at a flight-game cabinet, a crowd of teenagers watching over his shoulders, his hands a blur on the controls
**Text:** Kid: "He's never lost on this one." / Caption: "THEO BRANDT. BEST HANDS IN THE CITY. NOTHING ELSE TO SHOW FOR IT."

### I-03 · 3:2 · Pike
**Prompt:** Pike (heavyset, curly ponytail, round glasses, flannel shirt) leaning on the cabinet beside Theo, both grinning, a high score on the screen drawn as white glow
**Text:** Pike: "Again? You're bad for business, man." / Theo: "I'm bad for everyone's business."

### I-04 · 3:2 · The debt
**Prompt:** a cramped apartment at night, Theo sitting on a mattress on the floor, a pile of unpaid bills and final notices in his hands, rain on the window, a courier bag dropped by the door
**Text:** Caption: "THE COURIER JOB PAID FOR THE BIKE. NOT THE REST."

### I-05 · 16:9 · The offer
**Prompt:** inside the arcade, Conrad Weyl (fifties, slicked-back grey hair, double-breasted suit) standing beside Theo's cabinet among the kids, holding out a business card, perfectly out of place
**Text:** Weyl: "Mr. Brandt. Your reaction times are… unusual. I'd like to pay you for them."

### I-06 · 21:9 · CEREBRA campus
**Prompt:** a modernist corporate research campus outside the city on a grey morning, concrete and dark glass buildings, a satellite dish, a parking lot with a few cars, a bicycle chained by the entrance, a sign with an abstract brain logo
**Text:** Caption: "CEREBRA SYSTEMS. THREE MONTHS FROM BANKRUPTCY. THREE MINUTES FROM THE FUTURE."

### I-07 · 3:2 · Lena
**Prompt:** a corridor of the lab, Dr. Lena Aurich (short grey-streaked hair, wire glasses, lab coat) shaking Theo's hand, studying him with a mix of warmth and worry, fluorescent lights overhead
**Text:** Lena: "Lena Aurich. I built the thing you're about to sit in. Ask me anything." / Theo: "Does it hurt?" / Lena: "Not yet."

### I-08 · 21:9 · The rig
**Prompt:** wide view of the DEEPLINK lab: the padded reclining chair under a ring of lights, the bulky cabled helmet hanging above it, racks of tall workstations with CRT monitors, technicians at consoles, an observation window where Weyl watches
**Text:** —

### I-09 · 2:3 · Helmet on
**Prompt:** close-up of Theo lying in the reclining chair as Lena lowers the heavy helmet over his head, cables everywhere, his hand in the data glove gripping the armrest, his eyes looking up at her
**Text:** Lena: "Count back from ten, Theo."

### I-10 · 1:1 · Ten
**Prompt:** extreme close-up of Theo's eye through the open visor, the reflection of a CRT screen glowing in the pupil
**Text:** Theo: "Ten… nine…"

### I-11 · 16:9 · The fall
**Prompt:** Theo's body in the chair seen from above, dissolving at the edges into thin perspective grid lines that fall away into a black void, as if the drawing itself opens into depth
**Text:** Theo: "…eight…"

---

## SEQUENCE 0: AFTER CALIBRATION

### 0-01 · 3:2 · Gasping awake
**Prompt:** Theo sitting up in the reclining chair, helmet pushed back, gasping and laughing at the same time, sweat on his face, technicians staring at their monitors
**Text:** Theo: "Again. Put me back. Now."

### 0-02 · 3:2 · The numbers
**Prompt:** a technician turning a CRT monitor toward Lena, columns of numbers glowing white, Lena's face lit from below, surprised
**Text:** Technician: "Doctor… that's four times the last subject." / Lena: "Which subject?" / Technician: "…Sorry."

### 0-03 · 16:9 · Weyl watches
**Prompt:** behind the observation glass, Conrad Weyl watching Theo laugh in the chair below, his reflection overlaid on the glass, a thin satisfied smile
**Text:** Weyl: "Schedule him daily."

---

## SEQUENCE 1: AFTER GRID CITY

### 1-01 · 16:9 · Records
**Prompt:** a wall of CRT monitors in the lab all showing the same high-score style readout, the team clapping, Theo in the chair raising a gloved fist, Lena not clapping
**Text:** Caption: "EVERY RECORD THEY HAD. IN ONE AFTERNOON."

### 1-02 · 3:2 · The cheque
**Prompt:** Weyl handing Theo an envelope in a bright corporate office with a window over the campus, Theo holding it like it might bite
**Text:** Weyl: "A bonus. Your debts are… handled." / Theo: "Just like that?" / Weyl: "Just like that."

### 1-03 · 3:2 (DRIFT) · Closing his eyes
**Prompt:** Theo lying on his mattress at night, eyes closed, and over his face and the dark room a faint drawn perspective grid of glowing lines, like the city of data still behind his eyelids
**Text:** Caption: "WHEN I CLOSED MY EYES, THE CITY WAS STILL THERE."

---

## SEQUENCE 2: AFTER CHROME SEA

### 2-01 · 3:2 · No sleep
**Prompt:** a dawn kitchen, Theo at a small table with untouched coffee, staring at the tiles of the floor as if they were moving like waves, the light grey and cold
**Text:** Caption: "I STOPPED SLEEPING. I DIDN'T MISS IT."

### 2-02 · 16:9 (DRIFT) · Without looking
**Prompt:** the arcade, Theo playing a game with his eyes closed and his head turned away from the screen, hands moving perfectly, Pike beside him staring, the crowd gone silent
**Text:** Pike: "…Theo. You're not even looking."

### 2-03 · 3:2 · Pike worries
**Prompt:** outside the arcade under the rain, Pike holding Theo by the shoulder, Theo smiling distractedly, neon reflections in puddles
**Text:** Pike: "What are they doing to you in there?" / Theo: "Making me better."

### 2-04 · 3:2 · The briefing
**Prompt:** a dark conference room, Weyl standing by a projection screen showing the blueprint of a rival company's network as a glowing diagram, Theo and Lena seated, Hollis by the door
**Text:** Weyl: "A competitor stole our research. I want it back. Tonight." / Lena: "That's not a test, Conrad. That's a crime."

---

## SEQUENCE 3: AFTER FIREWALL CANYONS

### 3-01 · 16:9 · Headline
**Prompt:** a newspaper on a lab desk with a large headline about a rival tech company's catastrophic system failure (the headline area left blank for lettering), a coffee cup on it, Lena's hand clenched beside it
**Text:** Headline (lettered): "SYNAPTEC SYSTEMS CRASH: RESEARCH LOST" / Lena: "You erased three years of their work."

### 3-02 · 3:2 · Theo shrugs
**Prompt:** Theo leaning against a rack of computers, arms folded, unbothered, Lena facing him angry, fluorescent light harsh
**Text:** Theo: "It was easy, Lena. It was like… they wanted out."

### 3-03 · 2:3 (DRIFT) · Traffic
**Prompt:** Theo standing at a window high above a city intersection at rush hour, looking down at the traffic, faint lines drawn between the cars predicting their paths, his lips moving as he counts
**Text:** Caption: "THE LIGHTS WOULD CHANGE IN FOUR SECONDS. THE RED CAR WOULD TURN. I KNEW."

### 3-04 · 3:2 · The file name
**Prompt:** Theo alone at a terminal late at night in the lab, the CRT showing a directory listing with one entry highlighted, his face lit white, curious
**Text:** Screen (lettered): "SUBJECT_01 / MARSH, J. / ACCESS DENIED" / Theo: "Subject one?"

---

## SEQUENCE 4: AFTER THE ARCHIVE

### 4-01 · 21:9 · The sealed door
**Prompt:** a long dim basement corridor of the lab, Theo walking toward a heavy sealed door with a keypad, cables running along the ceiling, a single fluorescent tube flickering
**Text:** —

### 4-02 · 16:9 · Juno
**Prompt:** inside a quiet medical room, Juno Marsh (thin, pale, shaved head with short regrowth) lying in a hospital bed with electrodes on her scalp, monitors beeping softly, Theo standing at the foot of the bed in shock
**Text:** Caption: "SHE HAD BEEN DIVING FOR THREE YEARS. SHE HAD NEVER COME BACK."

### 4-03 · 3:2 · Lena's confession
**Prompt:** Lena in the doorway of the medical room, glasses in her hand, face full of guilt, Theo turning toward her, Juno's bed between them
**Text:** Lena: "Juno was the first. She went deeper than we designed. Her mind is still in there. Somewhere."

### 4-04 · 3:2 · Why
**Prompt:** close two-shot of Theo and Lena in the dim room, Theo's face hard, Lena's eyes wet
**Text:** Theo: "Why didn't you tell me?" / Lena: "Because you'd have gone looking for her."

---

## SEQUENCE 5: AFTER FRACTAL BLOOM

### 5-01 · 3:2 · Shaken
**Prompt:** Theo pulling off the helmet in the chair, shaking, a technician steadying him, monitors behind showing white static
**Text:** Theo: "Someone said my name. Down there. Someone said my name."

### 5-02 · 2:3 (DRIFT) · Her voice
**Prompt:** Theo in a bathroom at night, splashing water on his face, looking up into the mirror; in the reflection, behind his shoulder, the faint luminous outline of a woman made of light lines
**Text:** Juno (whisper caption): "Theo."

### 5-03 · 16:9 · At her bedside
**Prompt:** Theo sitting beside Juno's hospital bed at night, holding her thin hand, the room dark except for the green glow of the monitors drawn in white
**Text:** Theo: "Was that you?"

---

## SEQUENCE 6: AFTER JUNO'S GARDEN

### 6-01 · 21:9 · The buyers
**Prompt:** a convoy of black cars arriving at the CEREBRA campus in the rain, men in military coats getting out, Weyl waiting under an umbrella to greet them, Hollis at his side
**Text:** Caption: "THEY DIDN'T COME FOR THE SCIENCE."

### 6-02 · 3:2 · Limits off
**Prompt:** Weyl leaning over a technician's console in the lab, pointing at a row of switches labelled with blank tags, the technician hesitating, Lena being held back by Hollis in the background
**Text:** Weyl: "Remove the safety limits." / Lena: "You'll kill him!" / Weyl: "Then we'll find out how far he can go first."

### 6-03 · 3:2 · Pike's basement
**Prompt:** a cluttered basement full of modems, monitors, cables and pizza boxes, Pike in a headset typing furiously, a printout of the CEREBRA campus pinned on the wall
**Text:** Pike: "Okay, CEREBRA. Let's see who your phone company is."

### 6-04 · 3:2 (DRIFT) · The garden in his head
**Prompt:** Theo sitting on the roof of the lab building at night, knees up, looking at the city lights, and around him drawn flowers made of thin glowing lines growing out of the concrete, which only he can see
**Text:** Theo: "She asked me to stay. And I wanted to."

---

## SEQUENCE 7: AFTER BLACK ICE

### 7-01 · 16:9 · Turned
**Prompt:** the lab in chaos, alarms drawn as radiating lines, every CRT monitor showing the same message (blank for lettering), technicians backing away, Weyl furious at the observation glass
**Text:** Screen (lettered): "NO." / Weyl: "Get him out of that chair!"

### 7-02 · 3:2 · Hollis moves
**Prompt:** Hollis and two security guards running down the lab corridor toward the rig room, guns holstered, heavy boots, cables swinging from the ceiling
**Text:** —

### 7-03 · 3:2 · Lena locks the door
**Prompt:** Lena slamming her keycard into a panel to lock the rig room's door from inside, her back against it, Theo motionless in the chair behind her with the helmet on
**Text:** Lena: "Go, Theo. All the way down. Finish it."

### 7-04 · 3:2 · Pike online
**Prompt:** Pike in his basement with three phones off the hook and a modem screaming, his monitor showing the campus network diagram, sweat on his forehead, grinning
**Text:** Pike: "Theo, I've got you a door into their backbone. You've got about five minutes before they cut the power."

### 7-05 · 2:3 · The last dive
**Prompt:** Theo in the reclining chair, helmet on, his gloved hand gripping the armrest, his body very thin, the cables taut, fists hammering on the locked door in the background
**Text:** Theo (radio caption): "Last dive."

---

## CONTRACT PANELS

One **briefing panel** per contract (shown on the contract board, bible §11.2), plus **outcome panels** for the contracts with the most story weight. IDs: `C<layer>-J` (CEREBRA job), `C<layer>-P` (Pike's hack), `C<layer>-S` (Signal); outcomes end in `-O`. In story order, each layer's contract panels come after the previous story sequence and before the layer's story dive.

### C1-J · 3:2 · Stress Test
**Prompt:** a glass-walled observation gallery above the DEEPLINK lab, a row of investors in suits watching, Weyl gesturing toward Theo in the chair below like a salesman, CRT monitors showing traffic graphs
**Text:** Weyl: "Gentlemen, watch what one mind can carry."

### C1-P · 3:2 · Phone Phreak
**Prompt:** a phone booth on a rainy street at night, Pike squeezed inside it with a handset and a small electronic box wired to the phone, waving through the glass at Theo who is laughing
**Text:** Pike: "One little favour. Free long-distance for life. And a map of the whole phone network, while you're in there."

### C1-P-O · 3:2 · The map
**Prompt:** Pike's basement, a huge printout of a phone network diagram unrolled across the floor, Pike on his knees with a marker, astonished
**Text:** Pike: "Theo... you didn't just get me free calls. This is the whole city."

### C1-S · 2:3 · Ghost Packet
**Prompt:** Theo alone in the lab late at night, the helmet in his lap, a CRT monitor beside him showing static, and in the static the faint suggestion of a woman's face drawn in white dots
**Text:** Caption: "SOMETHING IN THE CITY WAS CARRYING A VOICE. NOBODY HAD SENT IT."

### C2-J · 3:2 · Market Run
**Prompt:** Weyl in his office at night with a stock ticker scrolling on a CRT behind him, handing Theo a sheet of paper with a list of company names
**Text:** Weyl: "I'd like to know what these companies will announce tomorrow. Before they do."

### C2-P · 3:2 · Dead Drop
**Prompt:** Pike and Theo in a late-night diner booth, Pike sliding a floppy disk across the table under a napkin, rain on the window, a waitress in the background
**Text:** Pike: "Hide this somewhere deep. If they ever turn on you, it's your way to call me."

### C2-S · 2:3 · Drowned Signal
**Prompt:** Theo in the shower with his eyes closed, water running down his face, and in the falling water faint lines like a chrome ocean surface drawn in ink
**Text:** Caption: "UNDER THE SEA, SOMEONE WAS CALLING."

### C3-J · 3:2 · Extraction
**Prompt:** a dark conference room, Weyl and Hollis with a projection of a rival company's prototype as a glowing wireframe, Theo in a chair with his feet on the table
**Text:** Weyl: "It's ours, technically. They just don't know it yet."

### C3-P · 3:2 · Paper Trail
**Prompt:** Pike in his basement on the phone, a wall covered in printouts and red string, his face serious for the first time
**Text:** Pike: "I need their security logs, Theo. All of them. Something's wrong in that building."

### C3-S · 2:3 · Burn Marks
**Prompt:** Theo looking at his own hands under a desk lamp in the lab, the skin of his palms faintly marked with lines like scorch marks in the shape of circuits, Lena out of focus behind him
**Text:** Caption: "SOMEONE HAD RUN THROUGH THOSE CANYONS BEFORE ME. AND BURNED ALL THE WAY."

### C4-J · 3:2 · Clean Up
**Prompt:** Weyl leaning close to Theo in an empty corridor, speaking quietly, a hand on his shoulder, fluorescent light flickering above
**Text:** Weyl: "There are some old files in the Archive. Embarrassing ones. Make them go away."

### C4-J-O · 3:2 · Refused or done
**Prompt:** two versions side by side: on the left, Theo pulling off the helmet and looking straight at Weyl through the observation glass with defiance; on the right, Theo pulling off the helmet and looking at the floor in shame
**Text:** Left (refused): Theo: "I couldn't find them." / Right (done): Caption: "I DELETED HER. ALMOST ALL OF HER."
**Note:** the engine shows the half that matches the player's outcome; generate the two halves as separate images.

### C4-P · 3:2 · Ledger
**Prompt:** Pike in his basement, holding up a printout of a bank statement to the light, Theo beside him, both looking at a long column of numbers
**Text:** Pike: "Follow the money. It always goes somewhere with a flag on it."

### C4-P-O · 3:2 · The buyers
**Prompt:** Pike's basement, a printout with a government seal and columns of figures pinned to the wall, Pike and Theo staring at it in silence
**Text:** Pike: "These aren't investors, Theo. These are generals."

### C4-S · 2:3 · Juno's Diary
**Prompt:** Theo lying on his mattress at night reading a printout by flashlight, the pages full of handwriting, his face moved
**Text:** Juno (caption, handwritten): "Day ninety. I don't want to come back up."

### C5-J · 3:2 · Probe
**Prompt:** a team of CEREBRA engineers around a whiteboard covered in fractal diagrams, arguing, Weyl watching with folded arms, Theo looking bored in the corner
**Text:** Engineer: "We need a map of it. We don't even know what it is."

### C5-P · 3:2 · Mirror Site
**Prompt:** Pike carrying a heavy computer tower up the stairs of an old apartment building at night, a friend's door open at the top, a cat watching
**Text:** Pike (on the phone): "Copy everything here. If they come for my basement, the truth survives."

### C5-S · 1:1 · Seedling
**Prompt:** close-up of Juno's hand on her hospital blanket, and beside it on the sheet a tiny flower drawn in glowing white lines that only Theo can see
**Text:** Caption: "THE FIRST THING SHE EVER MADE IN THERE WAS SMALL."

### C6-J · 3:2 · Harvest
**Prompt:** Weyl and two men in military coats in the observation gallery, looking down at Theo in the chair, one of them holding a clipboard with blank pages
**Text:** Weyl: "Bring us samples of her garden. Whatever she grows, we'll learn to build."

### C6-P · 3:2 · Lifeline
**Prompt:** Lena and Pike meeting secretly in a rainy parking lot at night beside Pike's old car, Lena handing over a folded diagram, both nervous
**Text:** Lena: "If he goes too deep, he needs a way back. Build it with him."

### C6-P-O · 2:3 · A rope
**Prompt:** Theo in the chair, helmet on, and drawn from the helmet a single thin white line running out of the lab, through the walls and across the city to Pike's basement window
**Text:** Caption: "A WAY HOME. JUST IN CASE."

### C6-S · 3:2 · Her Memories
**Prompt:** Theo standing in front of an old photograph pinned in Juno's medical room: a young Juno smiling by a river with a big shaggy dog, the photo held by a single pin
**Text:** Theo: "She had a dog."

### C7-J · 21:9 · Live Fire
**Prompt:** a dark military command room inside the CEREBRA campus, generals and officers watching a wall of CRT monitors showing a city network diagram, Weyl standing beside them proudly, Theo seen on one monitor in the chair
**Text:** General: "Show us what it does to a city."

### C7-J-O · 3:2 · Applause
**Prompt:** the generals applauding, Weyl shaking hands, and on a monitor in the corner a frame of Theo in the chair with his eyes open and empty, Lena turning away
**Text:** Caption: "THEY CLAPPED. I DIDN'T REMEMBER DOING IT."

### C7-P · 3:2 · Backdoor
**Prompt:** Pike in his basement with three phones off the hook, a soldering iron, the phone network map from earlier pinned on the wall, circling a node in red
**Text:** Pike: "Your free calls are about to pay off, buddy. That's our door into their backbone."

### C7-S · 2:3 · The Way Out
**Prompt:** Theo at Juno's bedside, holding her hand, and from their joined hands a thin path of white light winding away into darkness across the whole page
**Text:** Juno (whisper caption): "I'm still here. This way."

---

## ENDING A: COME BACK

### A-01 · 16:9 · Tearing out
**Prompt:** Theo in the chair arching up as he rips the helmet off his own head, cables snapping, sparks drawn as bursts of lines, Lena reaching for him, the door finally bursting open behind her
**Text:** Theo: "Not without me."

### A-01L · 16:9 · Lifeline variant (if *Lifeline* was played)
**Prompt:** Theo in the chair, helmet still on, his body relaxing as a thin white line drawn from the helmet leads out of the lab, Lena gently lifting the visor, Theo opening his eyes calmly
**Text:** Theo: "I followed the rope home."

### A-02 · 3:2 · Arrest
**Prompt:** the campus forecourt at dawn in the rain, police cars and news vans, Weyl in handcuffs being led to a car, his suit soaked, his face blank; Hollis watching with his hands open at his sides
**Text:** Caption: "PIKE SENT EVERYTHING TO EVERY NEWSROOM IN THE COUNTRY. ALL AT ONCE."

### A-02F · 3:2 · Weyl walks free (if evidence is under 5)
**Prompt:** the campus forecourt on a grey morning, Weyl getting into a black car with a lawyer, untouched, giving a small nod toward the camera as the door closes, a few reporters held back
**Text:** Caption: "WE DIDN'T HAVE ENOUGH. HE WALKED OUT SMILING."

### A-03 · 3:2 · Lena and Juno
**Prompt:** Lena sitting by Juno's hospital bed, holding her hand, monitors calm, morning light through the window
**Text:** Lena: "We'll find a way to bring you home. Slowly. Properly."

### A-04 · 3:2 · Ordinary
**Prompt:** Theo walking out of the campus gate with a blanket around his shoulders, thin and tired, Pike waiting by his old car with two coffees
**Text:** Pike: "You look terrible." / Theo: "I feel slow." / Pike: "Welcome back."

### A-05 · 21:9 · The arcade, again
**Prompt:** the arcade on a rainy morning, Theo at a cabinet, Pike beside him, Theo's on-screen game clearly lost, both laughing hard, a few kids grinning
**Text:** Caption: "I LOST. FIRST TIME IN SIX YEARS." / Theo: "Again."

### A-06 · 1:1 · Last panel
**Prompt:** close-up of Theo's hand dropping a coin into the arcade slot, the coin catching the light
**Text:** —

---

## ENDING B: ASCEND

### B-01 · 16:9 · The body stops
**Prompt:** the rig room as the door bursts open, Hollis and guards rushing in, Lena kneeling by the chair, Theo's body perfectly still under the helmet, the monitors all showing a flat line drawn as a single white stroke
**Text:** Lena: "He's gone." / Technician: "No… look at the network load."

### B-02 · 3:2 · Every screen
**Prompt:** a wall of every CRT monitor in the lab lighting up at once with the same image of a single open eye drawn in white lines, the staff frozen in silhouette
**Text:** —

### B-03 · 21:9 · The city wakes
**Prompt:** the grey city at night seen from above, and in every window, shop front, phone booth and billboard the same eye glowing, thousands of points of light forming a pattern across the whole city
**Text:** Caption: "AT 4:12 A.M., EVERY SCREEN IN THE COUNTRY OPENED ITS EYES."

### B-04 · 3:2 · Pike's basement
**Prompt:** Pike in his basement surrounded by monitors all showing the eye, his pager buzzing on the desk, a phone ringing, Pike staring with tears in his eyes and a sad smile
**Text:** Pike: "Show-off."

### B-05 · 3:2 · Weyl
**Prompt:** Weyl alone in his dark office, his own computer screen showing the eye looking at him, his hand frozen on the phone, fear on his face for the first time
**Text:** Theo (screen caption): "Hello, Conrad."

### B-06 · 21:9 · Into colour
**Prompt:** the final panel, the city skyline at sunrise, the black-and-white ink drawing dissolving from the right side into a full-colour digital landscape of glowing grids and chrome light, two luminous figures of light flying together over the boundary
**Text:** —
**Note:** this is the only panel in the game that is not black and white. Generate it without the Style Prefix's "no colour" clause, or colour the right half in the finishing pass.

---

## ENDING C: FREE HER

### C-01 · 16:9 · Reaching her
**Prompt:** a black space drawn with sparse white lines, a figure of light (Theo) reaching into a vast luminous woman made of flowing lines (Juno), and at her centre a small, curled, human figure of a woman
**Text:** Theo: "There you are. The real you."

### C-02 · 3:2 · Two awake
**Prompt:** two hospital beds side by side in the lab's medical room, Theo and Juno both waking at the same moment, both pulling off electrodes, Lena between them with her hands over her mouth
**Text:** Lena: "Oh my God."

### C-03 · 3:2 · Forgetting
**Prompt:** Theo sitting up in his bed, looking at his hands as if they were strange, a nurse checking his pupils with a pen light
**Text:** Theo: "I can't remember the way down. I can't remember any of it." / Lena: "Good."

### C-04 · 3:2 · Justice
**Prompt:** the campus forecourt at dawn, police and news vans, Weyl being led away in handcuffs, Pike in the crowd holding up a stack of printouts like a trophy
**Text:** Caption: "PIKE DID THE REST."

### C-05 · 21:9 · Learning to walk
**Prompt:** a hospital rehabilitation room with parallel bars, morning light through tall windows, Juno and Theo each holding a bar, taking slow steps toward each other, both weak, both smiling, Lena and Pike watching from the doorway
**Text:** Juno: "It's so slow out here." / Theo: "Yeah. I like it."

### C-06 · 1:1 · Last panel
**Prompt:** close-up of two hands, one thin and pale, one with a fingerless cycling glove, touching fingertips on a parallel bar
**Text:** —

---

## TITLE AND MENU ART (OPTIONAL)

### T-01 · 16:9 · Title card
**Prompt:** Theo lying in the DEEPLINK chair with the helmet on, drawn in black and white ink, and from the helmet a fan of perspective grid lines exploding outward across the whole image into a deep black void, strong composition with empty space at the top for a logo

### T-02 · 21:9 · Menu background
**Prompt:** wide view of the dark DEEPLINK lab at night, empty chair under a single ring of light, CRT monitors glowing, cables on the floor, rain on the observation window, quiet and ominous
