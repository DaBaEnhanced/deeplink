// Storyboard sequences (bible §6, §7, §15.2) built from the panel ids of deeplink_panel_prompts.md. Each page is a list
// of rows; each row a list of panels. Variant panels are picked from the campaign state.
const P = (...ids) => ids.map(id => (typeof id === 'string' ? { id } : id));

export const SEQUENCES = {
  intro: { title: 'DEEPLINK', pages: [
    { rows: [P('I-01'), P('I-02', 'I-03')] },
    { rows: [P('I-04', 'I-05'), P('I-06')] },
    { rows: [P('I-07', 'I-09'), P('I-08')] },
    { rows: [P('I-10', 'I-11')] },
  ] },
  seq0: { pages: [{ rows: [P('0-01', '0-02'), P('0-03')] }] },
  seq1: { pages: [{ rows: [P('1-01'), P('1-02', '1-03')] }] },
  seq2: { pages: [{ rows: [P('2-01', '2-02')] }, { rows: [P('2-03', '2-04')] }] },
  seq3: { pages: [{ rows: [P('3-01'), P('3-02', '3-03', '3-04')] }] },
  seq4: { pages: [{ rows: [P('4-01'), P('4-02')] }, { rows: [P('4-03', '4-04')] }] },
  seq5: { pages: [{ rows: [P('5-01', '5-02'), P('5-03')] }] },
  seq6: { pages: [{ rows: [P('6-01'), P('6-02', '6-03')] }, { rows: [P('6-04')] }] },
  seq7: { pages: [{ rows: [P('7-01'), P('7-02', '7-03')] }, { rows: [P('7-04', '7-05')] }] },
};
export function endingSequence(kind, camp) {
  if (kind === 'ascend') return { pages: [{ rows: [P('B-01'), P('B-02', 'B-04')] }, { rows: [P('B-03'), P('B-05')] }, { rows: [P('B-06')] }] };
  if (kind === 'free') return { pages: [{ rows: [P('C-01'), P('C-02', 'C-03')] }, { rows: [P('C-04'), P('C-05')] }, { rows: [P('C-06')] }] };
  const a1 = camp.lifeline ? 'A-01L' : 'A-01', a2 = camp.evidence >= 5 ? 'A-02' : 'A-02F';
  return { pages: [{ rows: [P(a1), P(a2, 'A-03')] }, { rows: [P('A-04'), P('A-05')] }, { rows: [P('A-06')] }] };
}
// one-panel sequences (contract briefings and outcomes, endings' variants)
export function single(id, variant) { return { pages: [{ rows: [[{ id, img: variant ? `${id}_${variant}` : id, variant }]] }] }; }

// dialogue choices in the lab (bible §12.3): shift relationships and some Drift
export const CHOICES = {
  1: { who: 'Lena', panel: 'I-07', q: 'How do you feel after the dives, Theo? Honestly.', a: [
    { t: 'Never better. Faster every time.', rel: { lena: -1 }, drift: 3 }, { t: "Tired. Like I left something down there.", rel: { lena: 1 } }] },
  2: { who: 'Pike', panel: '2-03', q: "You didn't come to the arcade on Friday. Or Saturday. What's going on?", a: [
    { t: "I don't need the arcade anymore.", rel: { pike: -1 }, drift: 3 }, { t: "Sorry. Friday. I'll be there.", rel: { pike: 1 } }] },
  3: { who: 'Weyl', panel: '1-02', q: 'Synaptec will recover. Or it won\'t. Either way, you were superb.', a: [
    { t: "It felt good. Give me the next one.", rel: { weyl: 1, lena: -1 }, drift: 4 }, { t: "Don't send me after people again.", rel: { weyl: -1, lena: 1 } }] },
  4: { who: 'Lena', panel: '4-04', q: "I should have told you about Juno. Will you keep diving?", a: [
    { t: "I'll keep diving. I'll find her.", rel: { lena: 1, juno: 1 } }, { t: "Only if you stop lying to me.", rel: { lena: 1 } }] },
  5: { who: 'Juno', panel: '5-02', q: 'Theo. You heard me. Will you come down again?', a: [
    { t: "Yes. Wait for me.", rel: { juno: 1 }, drift: 4 }, { t: "I'm coming to bring you back up.", rel: { juno: 1, lena: 1 } }] },
  6: { who: 'Pike', panel: '6-03', q: "They're bringing in generals, man. Are you with me on this?", a: [
    { t: "I'm with you. Burn it down.", rel: { pike: 2, weyl: -2 } }, { t: "I don't know anymore. She asked me to stay.", rel: { juno: 1 }, drift: 5 }] },
  7: { who: 'Lena', panel: '7-03', q: "Whatever is down there, Theo — do you still want to come back?", a: [
    { t: "Yes. I want to come back.", rel: { lena: 1 } }, { t: "I don't know if there's a me to come back.", drift: 6 }] },
};
// lore pages (signals): Juno's journal fragments
export const LORE = {
  ghost_packet: "PACKET 0x1F3 — a voice sample, 4 seconds, no sender. A woman humming. The checksum is a date three years ago.",
  drowned_signal: "Dive log, Subject 01, week 6: 'Under the sea layer there's another sea. Lena says it's compression artefacts. It sings.'",
  burn_marks: "Security log, Synaptec: unknown intrusion, 03:12. Every firewall it passed is scorched. It was running away, not in.",
  junos_diary: "Day forty. They say I'm the best they've had. Day ninety. I don't want to come back up. Up there everything is so heavy.",
  seedling: "The first thing she made: a flower with six petals, eleven polygons. Under it, in the file comments: 'for Mum'.",
  her_memories: "A window over the river. A dog called Biscuit who waited by the door. A summer by the sea. Her name, said by someone who loved her.",
  the_way_out: "Inside the military ICE, a path no one built: a human heartbeat, slowed to one beat a minute, still keeping time.",
};
