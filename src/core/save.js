// Save data (localStorage; every access guarded so a blocked storage never breaks the game)
const KEY = 'deeplink_save_v1';
const OPT = 'deeplink_options_v1';

export const DEFAULT_OPTIONS = {
  difficulty: 'normal', gameSpeed: 1, autoFire: false, autoLock: false, wideGates: false, lowFlash: false, colorBlind: 'off',
  subtitles: true, beatIndicator: true, shake: 1, res: '4:3', hires: false, dither: true, crt: false, wobble: false, bloom: 1,
  musicVol: 0.9, sfxVol: 0.8, mouseSteer: true, invertY: false, keys: null, controlMode: 'standard', mouseSens: 1, touch: 'auto', touchSwap: false,
  trailerSize: 1440, trailerMbps: 80,
};

function read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

export function loadOptions() { return { ...DEFAULT_OPTIONS, ...(read(OPT) || {}) }; }
export function saveOptions(o) { write(OPT, o); }

export function newCampaign() {
  return {
    v: 1, started: Date.now(), layer: 0, stage: 'intro', // stage: intro | board | story | ending | done
    cleared: {},            // dive id -> { rank, score, contractOk }
    contractsPlayed: {},    // dive id -> 'ok' | 'fail' | 'refused'
    drift: 0, mods: {},     // mod id -> tier (1..3)
    equipped: { active: null }, pendingMods: null,
    evidence: 0, fragments: 0, suspicion: 0, lifeline: false, wayOut: false, cleanUpDone: false,
    rel: { lena: 0, pike: 0, weyl: 0, juno: 0 }, choicesDone: {}, seenSeq: {}, seenPanels: {}, ending: null,
  };
}
export function loadCampaign() { return read(KEY); }
export function saveCampaign(c) { write(KEY, c); }
export function clearCampaign() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }

// records across modes (best scores, ranks, unlocks)
const REC = 'deeplink_records_v1';
export function loadRecords() { return { best: {}, ranks: {}, cleared: {}, gallery: {}, endings: {}, ...(read(REC) || {}) }; }
export function saveRecords(r) { write(REC, r); }
