// Beat mapper, first pass (bible §20): decodes each track in assets/music with ffmpeg, finds tempo, beats, bars and the
// Intro / Build / Drop / Breakdown / Build / Drop 2 / Outro sections, writes data/tracks/<id>.json.
//   node tools/beatmap.mjs [id ...] [--force]
// Hand-correct the result in tools/beatmapper.html. Existing maps marked "edited": true are never overwritten.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { features, analyse } from '../src/audio/analysis.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const music = JSON.parse(readFileSync(join(ROOT, 'data', 'music.json'), 'utf8'));
const byId = Object.fromEntries(music.map(m => [m.id, m]));
const args = process.argv.slice(2), force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
const dir = join(ROOT, 'assets', 'music');
mkdirSync(join(ROOT, 'data', 'tracks'), { recursive: true });
const files = existsSync(dir) ? readdirSync(dir).filter(f => /\.(mp3|ogg|wav|flac|opus|m4a)$/i.test(f)) : [];
for (const f of files) {
  const id = f.replace(/\.\w+$/, '');
  if (only.length && !only.includes(id)) continue;
  const out = join(ROOT, 'data', 'tracks', id + '.json');
  if (existsSync(out)) { const old = JSON.parse(readFileSync(out, 'utf8')); if (old.edited || !force) { console.log('skip', id, old.edited ? '(edited)' : '(exists, use --force)'); continue; } }
  const sr = 22050;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', join(dir, f), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const base = byId[id.replace(/_remix$/, '')] || {};
  const t0 = Date.now();
  const map = analyse(features(pcm, sr), { bpm: base.bpm ? base.bpm * (id.endsWith('_remix') ? 1.06 : 1) : undefined, bpm2: base.bpm2 });
  map.id = id; map.file = f;
  writeFileSync(out, JSON.stringify(map, null, 1));
  console.log(`${id}: ${map.bpm} BPM (asked ${base.bpm || '?'}), ${map.length.toFixed(1)} s, sections ${map.sections.map(s => s.type[0].toUpperCase() + '@' + s.t.toFixed(1)).join(' ')}  [${Date.now() - t0} ms]`);
}
