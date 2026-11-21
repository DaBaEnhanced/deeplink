// The 30 dives (bible §6, §11): 9 story dives and 21 contracts, with their tracks, layer kits, bosses, objectives,
// radio lines (short, in-dive only: bible §24) and story weight.
export const STORY = [
  { id: 'calibration', layer: 0, kit: 'calibration', track: 'calibration', title: 'Calibration', boss: null,
    enemies: ['pinger', 'tracer', 'splitter'],
    tips: [
      { at: 'intro', bar: 1, text: 'STEER  ·  WASD / ARROWS / MOUSE / LEFT STICK' }, { at: 'intro', bar: 5, text: 'FIRE  ·  SPACE / LEFT MOUSE / RT' },
      { at: 'intro', bar: 9, text: 'FLY THROUGH THE RINGS FOR FLOW AND SYNC' }, { at: 'intro', bar: 13, text: 'LOCK-ON  ·  HOLD RIGHT MOUSE / K / LT, SWEEP OVER TARGETS, RELEASE' },
      { at: 'build', n: 1, bar: 0, text: 'SHIFT  ·  SHIFT / X  —  FLIP BETWEEN THE A-SIDE AND THE B-SIDE WORLD', dur: 5 },
      { at: 'build', n: 1, bar: 3, text: 'ICE LIVES IN ONE WORLD. GHOSTS ARE IN THE OTHER: SHIFT TO HIT THEM', dur: 5 },
      { at: 'build', n: 1, bar: 6, text: 'HOLLOW SHOTS OF YOUR COLOUR ARE ABSORBED  ·  THEY FILL THE WEAPON BAR  ·  SOLID ONES HURT', dur: 5 },
      { at: 'build', n: 1, bar: 9, text: 'SHIFT ON THE BEAT FOR A CLEAN SHIFT  ·  ROLL Q / E  ·  BOOST C  ·  BRAKE CTRL', dur: 5 },
      { at: 'breakdown', bar: 1, text: 'ACTIONS ON THE BEAT RAISE SYNC (×1 – ×8)' }, { at: 'breakdown', bar: 5, text: 'THREE KILLS IN A ROW FROM ONE WORLD: CHAIN BONUS' },
    ],
    radio: [
      { at: 'intro', who: 'Lena', text: 'Breathe, Theo. You are in the training grid. Nothing here can hurt you.', delay: 0.2 },
      { at: 'build1', who: 'Lena', text: "Every layer keeps a shadow copy of itself. You can feel both. Flip between them.", delay: 0.5 },
      { at: 'drop', who: 'Theo', text: 'Oh. Oh, wow.', delay: 0.4 },
      { at: 'breakdown', who: 'Lena', text: 'Feel the pulse? The whole Deep runs on it. Move with it.', delay: 0.3 },
      { at: 'drop2', who: 'Weyl', text: 'Push the numbers, Doctor. I want to see the ceiling.', delay: 0.5 },
      { at: 'outro', who: 'Lena', text: 'Coming up now. Count with me. Ten, nine…', delay: 0.5 },
    ] },
  { id: 'grid_city', layer: 1, kit: 'grid_city', track: 'grid_city', title: 'Grid City', boss: 'auditor',
    radio: [
      { at: 'intro', who: 'Lena', text: "Grid City. CEREBRA's own data, drawn so you can fly it.", delay: 0.3 },
      { at: 'build1', who: 'Weyl', text: 'The investors are watching, Mr. Brandt. Impress them.', delay: 0.5 },
      { at: 'breakdown', who: 'Theo', text: "It's all so clean up here. Like nobody lives in it.", delay: 0.3 },
      { at: 'drop2', who: 'Lena', text: "Security process waking up. It's called the Auditor. Don't let it box you in.", delay: 0.1 },
      { at: 'outro', who: 'Weyl', text: 'Every record. In one afternoon.', delay: 0.5 },
    ] },
  { id: 'chrome_sea', layer: 2, kit: 'chrome_sea', track: 'chrome_sea', title: 'Chrome Sea', boss: 'leviathan',
    radio: [
      { at: 'intro', who: 'Lena', text: 'The exchange backbone. It shouldn\'t look like a sea. It does to you.', delay: 0.3 },
      { at: 'build1', who: 'Pike', text: '(patched in) Theo? It\'s Pike. They let me listen. Man, you sound happy.', delay: 0.5 },
      { at: 'breakdown', who: 'Theo', text: "I'm going under. Lena, there's something down here.", delay: 0.2 },
      { at: 'drop2', who: 'Lena', text: "That's a lot of mass. Theo, that thing is alive in every way that counts.", delay: 0.1 },
      { at: 'outro', who: 'Theo', text: "I don't want to come up yet.", delay: 0.5 },
    ] },
  { id: 'firewall', layer: 3, kit: 'firewall', track: 'firewall', title: 'Firewall Canyons', boss: 'warden', walls: true,
    radio: [
      { at: 'intro', who: 'Weyl', text: "Synaptec's security. Their research belongs to us. Bring it home.", delay: 0.3 },
      { at: 'build1', who: 'Lena', text: "This isn't a test, Conrad. This is a crime.", delay: 0.5 },
      { at: 'breakdown', who: 'Theo', text: 'The walls close on the beat. I can feel when.', delay: 0.3 },
      { at: 'drop2', who: 'Lena', text: "Their guardian process. Theo, it's watching you with all of its eyes.", delay: 0.1 },
      { at: 'outro', who: 'Theo', text: 'It was easy. It was like they wanted out.', delay: 0.5 },
    ] },
  { id: 'archive', layer: 4, kit: 'archive', track: 'the_archive', title: 'The Archive', boss: 'librarian',
    radio: [
      { at: 'intro', who: 'Lena', text: "The Archive. Every file CEREBRA ever wrote. Don't go looking around.", delay: 0.3 },
      { at: 'build1', who: 'Theo', text: 'Subject zero one. Marsh, J. Why is her file locked, Lena?', delay: 0.5 },
      { at: 'breakdown', who: 'Theo', text: "Found it. Juno Marsh. Three years of dives. And then nothing.", delay: 0.2 },
      { at: 'drop2', who: 'Lena', text: 'Theo, get out of there. Please.', delay: 0.1 },
      { at: 'outro', who: 'Theo', text: "She's still in the building. Isn't she.", delay: 0.5 },
    ] },
  { id: 'fractal', layer: 5, kit: 'fractal', track: 'fractal_bloom', title: 'Fractal Bloom', boss: 'seed',
    radio: [
      { at: 'intro', who: 'Lena', text: "Nobody designed this layer. Our maps end here. Be careful.", delay: 0.3 },
      { at: 'breakdown', who: 'Juno', text: 'Theo…', delay: 0.2 },
      { at: 'breakdown', who: 'Theo', text: 'Someone said my name. Lena, someone said my name.', delay: 2.2 },
      { at: 'drop2', who: 'Lena', text: "It's growing faster than you can cut it. Don't let it close around you.", delay: 0.1 },
    ] },
  { id: 'garden', layer: 6, kit: 'garden', track: 'juno_s_garden', title: "Juno's Garden", boss: 'juno',
    radio: [
      { at: 'intro', who: 'Juno', text: "You came. I grew all of this. Do you like it?", delay: 0.3 },
      { at: 'build1', who: 'Lena', text: 'Theo, your vitals are drifting. Stay with my voice.', delay: 0.5 },
      { at: 'breakdown', who: 'Juno', text: 'Why go back to all that grey? Stay with me.', delay: 0.3 },
      { at: 'drop2', who: 'Juno', text: 'Catch me, then. If you want to stay.', delay: 0.1 },
      { at: 'outro', who: 'Theo', text: 'She asked me to stay. And I wanted to.', delay: 0.5 },
    ] },
  { id: 'black_ice', layer: 7, kit: 'black_ice', track: 'black_ice', title: 'Black ICE', boss: 'hollis9',
    radio: [
      { at: 'intro', who: 'Weyl', text: "A military network. Show our guests what you are, Mr. Brandt.", delay: 0.3 },
      { at: 'build1', who: 'Pike', text: "Theo, I'm in their phone lines. Say the word and we burn it all.", delay: 0.5 },
      { at: 'drop', who: 'Theo', text: 'No.', delay: 0.2 },
      { at: 'breakdown', who: 'Weyl', text: 'Hollis. Unplug him.', delay: 0.3 },
      { at: 'drop2', who: 'Lena', text: "That's Hollis's combat avatar. He's flying it himself. Go, Theo!", delay: 0.1 },
    ] },
  { id: 'core', layer: 8, kit: 'core', track: 'the_core', title: 'The Core', boss: 'deep', final: true,
    enemies: ['agent', 'hunter', 'bloom', 'glyph_swarm', 'mirror_kite', 'worm', 'echo_diver', 'corruptor'],
    radio: [
      { at: 'intro', who: 'Theo', text: 'Dive eight. Safety limits off.', delay: 0.2 },
      { at: 'build1', who: 'Pike', text: 'Five minutes before they cut the power. Go, buddy.', delay: 0.5 },
      { at: 'drop', who: 'Lena', text: 'Every layer is collapsing into the next. Keep going down!', delay: 0.2 },
      { at: 'breakdown', who: 'Juno', text: "Come to the centre. You don't have to be small anymore.", delay: 0.3 },
      { at: 'drop2', who: 'Theo', text: 'This is it. The Deep itself.', delay: 0.1 },
      { at: 'outro', who: 'Lena', text: 'Theo — whatever you choose. Choose it yourself.', delay: 0.2 },
    ] },
];

// contracts (bible §11.2): job = CEREBRA (mod reward, +Drift), hack = Pike (evidence), signal = Juno (fragment)
export const CONTRACTS = [
  // layer 1
  { id: 'stress_test', layer: 1, kit: 'grid_city', type: 'job', track: 'stress_test', title: 'Stress Test', who: 'Weyl', briefing: 'C1-J', traffic: true, density: 1.5,
    desc: 'Survive a city flooded with traffic while investors watch.', objective: { kind: 'survive', label: 'SURVIVE' } },
  { id: 'phone_phreak', layer: 1, kit: 'grid_city', type: 'hack', track: 'phone_phreak', title: 'Phone Phreak', who: 'Pike', briefing: 'C1-P', outcome: 'C1-P-O',
    desc: "Ride the phone backbone: stay in the data streams. Pike gets free calls — and a map of the network.", objective: { kind: 'stream', label: 'TIME IN STREAMS', need: 0.42 } },
  { id: 'ghost_packet', layer: 1, kit: 'grid_city', type: 'signal', track: 'ghost_packet', title: 'Ghost Packet', who: 'Signal', briefing: 'C1-S',
    desc: "Follow a stray packet carrying a girl's voice through the towers.", objective: { kind: 'follow', label: 'FOLLOW THE PACKET', need: 0.55 } },
  // layer 2
  { id: 'market_run', layer: 2, kit: 'chrome_sea', type: 'job', track: 'market_run', title: 'Market Run', who: 'Weyl', briefing: 'C2-J',
    desc: "Skim the exchange's chrome storm for insider data.", objective: { kind: 'collect', n: 12, label: 'INSIDER DATA', need: 0.7 } },
  { id: 'dead_drop', layer: 2, kit: 'chrome_sea', type: 'hack', track: 'dead_drop', title: 'Dead Drop', who: 'Pike', briefing: 'C2-P',
    desc: "Plant Pike's hidden beacon under the sea: fly through the beacon rings.", objective: { kind: 'gates', n: 10, label: 'BEACON RINGS', need: 0.7 } },
  { id: 'drowned_signal', layer: 2, kit: 'chrome_sea', type: 'signal', track: 'drowned_signal', title: 'Drowned Signal', who: 'Signal', briefing: 'C2-S',
    desc: 'A voice calling from beneath the waves. Follow it down.', objective: { kind: 'follow', label: 'FOLLOW THE VOICE', need: 0.55 } },
  // layer 3
  { id: 'extraction', layer: 3, kit: 'firewall', type: 'job', track: 'extraction', title: 'Extraction', who: 'Weyl', briefing: 'C3-J', walls: true,
    desc: "Steal a rival's prototype: break its vault nodes and outrun the alarms.", objective: { kind: 'destroy', n: 8, label: 'VAULT NODES', need: 0.7 } },
  { id: 'paper_trail', layer: 3, kit: 'firewall', type: 'hack', track: 'paper_trail', title: 'Paper Trail', who: 'Pike', briefing: 'C3-P', walls: true,
    desc: "Copy CEREBRA's own security logs.", objective: { kind: 'collect', n: 12, label: 'SECURITY LOGS', need: 0.7 } },
  { id: 'burn_marks', layer: 3, kit: 'firewall', type: 'signal', track: 'burn_marks', title: 'Burn Marks', who: 'Signal', briefing: 'C3-S',
    desc: 'Scorched paths where someone fled the canyons long ago. Follow them.', objective: { kind: 'follow', label: 'FOLLOW THE BURN', need: 0.55 } },
  // layer 4
  { id: 'clean_up', layer: 4, kit: 'archive', type: 'job', track: 'clean_up', title: 'Clean Up', who: 'Weyl', briefing: 'C4-J', outcome: 'C4-J-O',
    desc: "Erase the records of Juno's dives. (You can refuse: fly into the red exit gate in the breakdown.)", objective: { kind: 'destroy', n: 10, label: 'FILES ERASED', need: 0.7, refuse: true } },
  { id: 'ledger', layer: 4, kit: 'archive', type: 'hack', track: 'ledger', title: 'Ledger', who: 'Pike', briefing: 'C4-P', outcome: 'C4-P-O',
    desc: "Find the military contracts in CEREBRA's accounts.", objective: { kind: 'collect', n: 12, label: 'CONTRACT FILES', need: 0.7 } },
  { id: 'junos_diary', layer: 4, kit: 'archive', type: 'signal', track: 'juno_s_diary', title: "Juno's Diary", who: 'Signal', briefing: 'C4-S',
    desc: 'Her own journal files, scattered and burning. Save what you can.', objective: { kind: 'collect', n: 10, label: 'DIARY PAGES', need: 0.6 } },
  // layer 5
  { id: 'probe', layer: 5, kit: 'fractal', type: 'job', track: 'probe', title: 'Probe', who: 'Weyl', briefing: 'C5-J',
    desc: "Map the fractal layer for CEREBRA's engineers: fly through the scan rings.", objective: { kind: 'gates', n: 12, label: 'SCAN RINGS', need: 0.7 } },
  { id: 'mirror_site', layer: 5, kit: 'fractal', type: 'hack', track: 'mirror_site', title: 'Mirror Site', who: 'Pike', briefing: 'C5-P',
    desc: 'Build an off-site copy of the evidence: hit the relay nodes.', objective: { kind: 'destroy', n: 8, label: 'RELAYS COPIED', need: 0.7 } },
  { id: 'seedling', layer: 5, kit: 'fractal', type: 'signal', track: 'seedling', title: 'Seedling', who: 'Signal', briefing: 'C5-S',
    desc: "Juno's very first creation, small and fragile. Keep close to it.", objective: { kind: 'follow', label: 'STAY WITH IT', need: 0.55 } },
  // layer 6
  { id: 'harvest', layer: 6, kit: 'garden', type: 'job', track: 'harvest', title: 'Harvest', who: 'Weyl', briefing: 'C6-J',
    desc: "Strip Juno's structures for CEREBRA's labs.", objective: { kind: 'destroy', n: 10, label: 'SAMPLES TAKEN', need: 0.7 } },
  { id: 'lifeline', layer: 6, kit: 'garden', type: 'hack', track: 'lifeline', title: 'Lifeline', who: 'Pike', briefing: 'C6-P', outcome: 'C6-P-O',
    desc: 'Build Theo an emergency exit route from the Deep: fly the rope rings.', objective: { kind: 'gates', n: 12, label: 'ROPE RINGS', need: 0.7 } },
  { id: 'her_memories', layer: 6, kit: 'garden', type: 'signal', track: 'her_memories', title: 'Her Memories', who: 'Signal', briefing: 'C6-S',
    desc: "Juno's human memories: a city, a family, a dog. Gather them.", objective: { kind: 'collect', n: 10, label: 'MEMORIES', need: 0.6 } },
  // layer 7
  { id: 'live_fire', layer: 7, kit: 'black_ice', type: 'job', track: 'live_fire', title: 'Live Fire', who: 'Weyl', briefing: 'C7-J', outcome: 'C7-J-O', density: 1.3,
    desc: 'The weapon demonstration: attack a mock city network while the generals watch.', objective: { kind: 'destroy', n: 10, label: 'CITY NODES', need: 0.7 } },
  { id: 'backdoor', layer: 7, kit: 'black_ice', type: 'hack', track: 'backdoor', title: 'Backdoor', who: 'Pike', briefing: 'C7-P',
    desc: "Pike's way into CEREBRA's backbone. The final dive depends on it.", objective: { kind: 'gates', n: 12, label: 'BACKBONE PORTS', need: 0.7 }, walls: true },
  { id: 'the_way_out', layer: 7, kit: 'black_ice', type: 'signal', track: 'the_way_out', title: 'The Way Out', who: 'Signal', briefing: 'C7-S',
    desc: "The path to Juno's human centre, hidden inside the military ICE.", objective: { kind: 'follow', label: 'FOLLOW THE PATH', need: 0.55 } },
];
for (const s of STORY) s.type = 'story';
export const ALL_DIVES = [...STORY, ...CONTRACTS];
export const DIVE = Object.fromEntries(ALL_DIVES.map(d => [d.id, d]));
export const LAYER_NAMES = ['Calibration', 'Grid City', 'Chrome Sea', 'Firewall Canyons', 'The Archive', 'Fractal Bloom', "Juno's Garden", 'Black ICE', 'The Core'];
export const TYPE_NAMES = { story: 'Story dive', job: 'CEREBRA job', hack: "Pike's hack", signal: 'Signal' };
export const REWARD_TEXT = { job: 'Mod choice (1 of 3) or upgrade · +Drift', hack: '+1 Evidence', signal: '+1 Juno fragment + lore' };
export const WEIGHT_TEXT = { job: "Weyl's favour. Lena and Pike disapprove.", hack: 'Builds the case against CEREBRA.', signal: 'Needed to free her.' };
