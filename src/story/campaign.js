// Story progression (bible §6, §7, §11.3, §12): layers, contract board rules, rewards, Drift, evidence, fragments,
// Weyl's suspicion, dialogue choices and the three endings.
import { STORY, CONTRACTS, DIVE } from './dives.js';
import { MODS, modDrift } from './mods.js';

export const storyDive = layer => STORY.find(d => d.layer === layer);
export const contractsOf = layer => CONTRACTS.filter(c => c.layer === layer);

export function boardState(camp) {
  const L = camp.layer;
  const cs = contractsOf(L).map(c => ({ ...c, played: camp.contractsPlayed[c.id] || null }));
  const playedAny = cs.some(c => c.played);
  const story = storyDive(L);
  return { layer: L, contracts: cs, story, storyLocked: L >= 1 && L <= 7 && !playedAny };
}
// apply a finished dive (results from DiveSim.results()) to the campaign. returns the rewards to show
export function applyDive(camp, dive, res) {
  const out = { modOffer: 0, evidence: 0, fragment: 0, lore: null, outcome: null, outcomeVariant: null, drift: 0, failed: res.failed };
  if (res.failed) return out;
  if (dive.type === 'story') {
    camp.cleared[dive.id] = { rank: res.rank, score: res.score };
    // Weyl's suspicion: refusing every CEREBRA job of the next layer raises it (checked when the layer closes)
    if (dive.layer >= 1 && dive.layer <= 7) {
      const job = contractsOf(dive.layer).find(c => c.type === 'job');
      camp.suspicion = job && !camp.contractsPlayed[job.id] ? 1 : 0;
      // contracts of this layer close
    }
    if (!dive.final) out.modOffer = 2;
    return out;
  }
  // contracts
  const ok = res.objOk;
  camp.contractsPlayed[dive.id] = res.refused ? 'refused' : ok ? 'ok' : 'fail';
  camp.cleared[dive.id] = { rank: res.rank, score: res.score, ok };
  if (dive.type === 'job') {
    if (ok) { out.modOffer = 3; camp.drift = Math.min(100, camp.drift + 6); out.drift += 6; camp.rel.weyl++; camp.rel.lena--; camp.rel.pike--; }
    if (dive.id === 'clean_up') {
      if (res.refused) { out.outcomeVariant = 'refused'; camp.fragments = Math.min(7, camp.fragments + 1); out.fragment = 1; out.lore = 'Refusing the job, you kept a copy of one file: her first dive log.'; }
      else if (ok) { out.outcomeVariant = 'done'; camp.cleanUpDone = true; }
      out.outcome = 'C4-J-O';
    }
    if (dive.id === 'live_fire' && ok) out.outcome = 'C7-J-O';
  }
  if (dive.type === 'hack' && ok) {
    camp.evidence = Math.min(7, camp.evidence + 1); out.evidence = 1; camp.rel.pike++;
    if (dive.id === 'lifeline') camp.lifeline = true;
    if (dive.id === 'backdoor') camp.backdoor = true;
    if (dive.outcome) out.outcome = dive.outcome;
  }
  if (dive.type === 'signal' && ok) {
    if (!(dive.id === 'junos_diary' && camp.cleanUpDone)) { camp.fragments = Math.min(7, camp.fragments + 1); out.fragment = 1; }
    camp.rel.juno++;
    if (dive.id === 'the_way_out') camp.wayOut = true;
    out.lore = dive.id;
  }
  return out;
}
export function installMod(camp, id, tier) {
  const d = modDrift(id, tier);
  camp.mods[id] = tier; camp.drift = Math.min(100, camp.drift + d);
  if (MODS[id].type === 'active' && !camp.equipped.active) camp.equipped.active = id;
  return d;
}
// the final choice gates: which are open
export function endingOptions(camp) {
  return { ascend: camp.drift >= 60, free: camp.drift < 40 && camp.fragments >= 5 && camp.wayOut };
}
export function resolveEnding(camp, choice) {
  const o = endingOptions(camp);
  if (choice === 'ascend' && o.ascend) return 'ascend';
  if (choice === 'free' && o.free) return 'free';
  return 'come_back';
}
// sequence played after a story dive of the given layer
export const AFTER_STORY = { 0: 'seq0', 1: 'seq1', 2: 'seq2', 3: 'seq3', 4: 'seq4', 5: 'seq5', 6: 'seq6', 7: 'seq7' };
export { DIVE };
