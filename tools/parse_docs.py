"""Parses the companion files into game data.

    python tools/parse_docs.py

docs/deeplink_panel_prompts.md -> data/panels.json   (every panel: id, aspect, title, prompt, text lines, drift flag)
docs/deeplink_soundtrack.md    -> data/music.json    (every track: n, id, title, bpm, key, vocals, caption, lyrics)
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def slug(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


def parse_text(t):
    """'Pike: "Again?" / Theo: "Bad."' -> [{who, text, kind}]"""
    t = t.strip()
    if t in ('—', '-', ''):
        return []
    out = []
    for part in re.split(r'\s/\s(?=[A-Z][^:"]{0,60}:)', t):
        m = re.match(r'^([^:]+?):\s*(.*)$', part.strip())
        if not m:
            continue
        who, txt = m.group(1).strip(), m.group(2).strip().strip('"').strip('“”')
        lw = who.lower()
        kind = 'speech'
        if lw.startswith('caption') or lw in ('left (refused)', 'right (done)'):
            kind = 'caption'
        if 'headline' in lw or lw.startswith('screen'):
            kind = 'screen'
        if 'whisper' in lw:
            kind = 'whisper'
        if 'radio' in lw or 'on the phone' in lw:
            kind = 'radio'
        if 'handwritten' in lw:
            kind = 'diary'
        if 'screen caption' in lw:
            kind = 'screen_voice'
        name = re.sub(r'\s*\(.*?\)', '', who).strip()
        variant = None
        if lw.startswith('left (refused)'):
            variant = 'refused'
        if lw.startswith('right (done)'):
            variant = 'done'
            # "Right (done): Caption: "...""
            m2 = re.match(r'^Caption:\s*(.*)$', txt)
            if m2:
                txt = m2.group(1).strip().strip('"')
        if variant == 'refused':
            m2 = re.match(r'^(\w+):\s*(.*)$', txt)
            if m2:
                name, txt, kind = m2.group(1), m2.group(2).strip().strip('"'), 'speech'
        out.append({'who': name, 'kind': kind, 'text': txt, **({'variant': variant} if variant else {})})
    return out


def panels():
    src = open(os.path.join(ROOT, 'docs', 'deeplink_panel_prompts.md'), encoding='utf-8').read()
    out, section = [], None
    for blk in re.split(r'\n(?=### )', src):
        h2 = re.findall(r'^## (.+)$', blk, re.M)
        head = re.match(r'^### (\S+) · ([\d:]+)(?: \(DRIFT\))? · (.+)$', blk.strip().split('\n')[0])
        if not head:
            if h2:
                section = h2[-1]
            continue
        pid, aspect, title = head.groups()
        drift = '(DRIFT)' in blk.split('\n')[0]
        prompt = re.search(r'\*\*Prompt:\*\*\s*(.+)', blk)
        text = re.search(r'\*\*Text:\*\*\s*(.+)', blk)
        note = re.search(r'\*\*Note:\*\*\s*(.+)', blk)
        out.append({'id': pid, 'aspect': aspect, 'title': title.strip(), 'section': section, 'drift': drift,
                    'prompt': prompt.group(1).strip() if prompt else '',
                    'text': parse_text(text.group(1)) if text else [],
                    **({'note': note.group(1).strip()} if note else {})})
        if h2:
            section = h2[-1]
    return out


def music():
    src = open(os.path.join(ROOT, 'docs', 'deeplink_soundtrack.md'), encoding='utf-8').read()
    rows = {}
    for m in re.finditer(r'^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$', src, re.M):
        n, title, use, bpm, key, voc = [x.strip() for x in m.groups()]
        bpms = [int(x) for x in re.findall(r'\d+', bpm)]
        rows[int(n)] = {'n': int(n), 'title': title, 'use': use, 'bpm': bpms[0], 'bpm2': bpms[1] if len(bpms) > 1 else None,
                        'key': key, 'vocals': voc}
    tags = re.search(r'\*\*Instrumental dive tags\*\*.*?```\n(.*?)```', src, re.S).group(1).strip()
    parts = re.split(r'^## (\d+)\. ([^\n]+)$', src, flags=re.M)
    for i in range(1, len(parts) - 2, 3):
        n, body = int(parts[i]), parts[i + 2]
        blocks = re.findall(r'```\n(.*?)```', body, re.S)
        rows[n]['caption'] = blocks[0].strip()
        rows[n]['lyrics'] = blocks[1].strip() if len(blocks) > 1 else tags
        rows[n]['id'] = slug(rows[n]['title'])
    return [rows[k] for k in sorted(rows)]


if __name__ == '__main__':
    p = panels()
    json.dump(p, open(os.path.join(ROOT, 'data', 'panels.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    m = music()
    json.dump(m, open(os.path.join(ROOT, 'data', 'music.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(len(p), 'panels,', len(m), 'tracks')
