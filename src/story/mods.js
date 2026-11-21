// Neural mods (bible §12.2): 3 tiers each; installing adds the mod's Drift, each upgrade adds half of it again.
export const MODS = {
  overclock: { name: 'Overclock', type: 'passive', drift: 5, region: [0.3, 0.32], desc: '+10% fire rate and lock speed (tiers: +10 / +18 / +25%)' },
  peripheral: { name: 'Peripheral', type: 'passive', drift: 5, region: [0.78, 0.5], desc: 'Shows threats behind you (tiers widen the warning time)' },
  long_lock: { name: 'Long Lock', type: 'passive', drift: 8, region: [0.55, 0.22], desc: 'Lock up to 12 targets (tiers: 12 / 14 / 16)' },
  slipstream: { name: 'Slipstream', type: 'passive', drift: 6, region: [0.2, 0.55], desc: 'Data streams give double speed and Flow (tiers: x2 / x2.5 / x3)' },
  dilation: { name: 'Dilation', type: 'active', drift: 10, cost: 40, region: [0.5, 0.45], desc: 'Slow time for 3 s (tiers: 3 / 4 / 5 s)' },
  phase: { name: 'Phase', type: 'active', drift: 10, cost: 35, region: [0.65, 0.68], desc: 'Pass through walls and firewalls for 2 s (2 / 2.6 / 3.2 s)' },
  rewrite: { name: 'Rewrite', type: 'active', drift: 12, cost: 30, region: [0.4, 0.7], desc: 'Turn the targeted enemy into an ally for 10 s (10 / 13 / 16 s)' },
  echo: { name: 'Echo', type: 'active', drift: 12, cost: 45, region: [0.7, 0.3], desc: 'A copy of you flies beside you and mirrors your fire (8 / 11 / 14 s)' },
  foresight: { name: 'Foresight', type: 'passive', drift: 15, region: [0.85, 0.7], late: 3, desc: 'Enemy attack lines are shown a beat early' },
  become: { name: 'Become', type: 'active', drift: 20, cost: 80, region: [0.5, 0.85], late: 5, desc: 'For 5 s you are the network: everything on screen is locked' },
};
export const MOD_IDS = Object.keys(MODS);
export const tierVal = (tier, a, b, c) => [0, a, b, c][tier || 0] || 0;

export function modDrift(id, tier) { const d = MODS[id].drift; return tier <= 1 ? d : Math.round(d / 2); }

// offers: story dive -> 2 new mods; CEREBRA job -> 3 options among new mods and upgrades of installed ones
export function offers(camp, count, R, layer) {
  const installed = camp.mods;
  const fresh = MOD_IDS.filter(id => !installed[id] && (MODS[id].late || 0) <= layer);
  const upgr = MOD_IDS.filter(id => installed[id] && installed[id] < 3);
  const pool = count === 3 ? [...fresh.map(id => ({ id, tier: 1 })), ...upgr.map(id => ({ id, tier: installed[id] + 1 }))] : fresh.map(id => ({ id, tier: 1 }));
  const out = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return out;
}
// effective mod strength in the Deep (stronger at high Drift)
export function modPower(camp) { return 1 + (camp ? camp.drift : 0) / 200; }
