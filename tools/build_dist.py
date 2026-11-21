#!/usr/bin/env python3
"""Builds the release folders of DEEPLINK. Standard library (+ Pillow for the WebP panels, ffmpeg not needed).

    python tools/build_dist.py [--out release] [--png] [--only web,itch,source,soundtrack]

release/web/                  the static build for any web host (open index.html over http(s); needs WebGPU)
release/deeplink_itch.zip     the same build zipped for itch.io (HTML5: index.html at the root, < 500 MB, < 1000 files)
release/source/               the source for the public repository: game, docs, tests and the tools that run offline
release/soundtrack/ + DEEPLINK_Soundtrack.zip   the soundtrack as distributed with the game (from ./soundtrack)

Storyboard panels are written as WebP (quality 90, same size) unless --png: the PNG masters are ~400 MB, over itch's limit.
A static host can't list folders, so the build writes assets/manifest.json (the files in each assets folder); the game
reads it instead of a directory listing. Re-running only copies / converts what changed.
"""
import argparse
import json
import os
import shutil
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RUNTIME = ['index.html', 'favicon.png', 'src', 'data', 'assets']
SKIP_DATA = {'gen_jobs.json', 'gen_music_ext.json'}           # generation job lists (local ComfyUI pipeline)
SOURCE_EXTRA = ['LICENSE', 'README.md', 'package.json', 'run.bat', 'run.sh', 'docs', 'test']
SOURCE_TOOLS = ['beatmap.mjs', 'beatmapper.html', 'kitlab.html', 'parse_docs.py', 'serve.py', 'build_dist.py']
STORE = {'.mp3', '.png', '.webp', '.jpg', '.woff2', '.zip', '.ogg'}
GITIGNORE = '/art\n/trailer\n/release\n__pycache__/\n*.bak\n'


def skip(path):
    n = os.path.basename(path)
    return n.endswith('.bak') or n == '__pycache__' or n.endswith('.pyc') or n.startswith('.') or n == 'Thumbs.db'


def fresh(src, dst):
    return os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)


def copy(src, dst):
    if fresh(src, dst) and os.path.getsize(dst) == os.path.getsize(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)


def walk(base):
    for d, dirs, files in os.walk(base):
        dirs[:] = sorted(x for x in dirs if not skip(x))
        for f in sorted(files):
            if not skip(f):
                yield os.path.join(d, f)


def panel(src, dst_dir, png):
    name, ext = os.path.splitext(os.path.basename(src))
    if png or ext.lower() != '.png':
        dst = os.path.join(dst_dir, os.path.basename(src)); copy(src, dst); return dst
    dst = os.path.join(dst_dir, name + '.webp')
    if not fresh(src, dst):
        from PIL import Image
        os.makedirs(dst_dir, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert('RGBA' if im.mode in ('RGBA', 'LA') or 'transparency' in im.info else 'RGB')
            im.save(dst + '.tmp', 'WEBP', quality=90, method=5)
        os.replace(dst + '.tmp', dst)
        print('  webp', name, flush=True)
    return dst


def sync(dst_root, wanted):
    """remove files in dst_root that the build no longer produces"""
    for p in list(walk(dst_root)):
        if os.path.relpath(p, dst_root).replace(os.sep, '/') not in wanted and not os.path.basename(p).startswith('.git'):
            os.remove(p)


def build_runtime(dst, png, manifest):
    out = set()
    for item in RUNTIME:
        src = os.path.join(ROOT, item)
        files = [src] if os.path.isfile(src) else list(walk(src))
        for f in files:
            rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
            if rel.startswith('data/') and os.path.basename(f) in SKIP_DATA:
                continue
            if rel == 'assets/manifest.json':
                continue
            if rel.startswith('assets/panels/'):
                d = panel(f, os.path.join(dst, 'assets', 'panels'), png)
                out.add(os.path.relpath(d, dst).replace(os.sep, '/'))
                continue
            copy(f, os.path.join(dst, rel)); out.add(rel)
    if manifest:
        m = {}
        for rel in sorted(out):
            if rel.startswith('assets/') and rel.count('/') == 2:
                d, n = rel.rsplit('/', 1); m.setdefault(d, []).append(n)
        with open(os.path.join(dst, 'assets', 'manifest.json'), 'w') as fh:
            json.dump(m, fh, indent=0)
        out.add('assets/manifest.json')
    return out


def zipdir(src, dst, prefix=''):
    tmp = dst + '.tmp'
    with zipfile.ZipFile(tmp, 'w') as z:
        for f in walk(src):
            rel = prefix + os.path.relpath(f, src).replace(os.sep, '/')
            z.write(f, rel, zipfile.ZIP_STORED if os.path.splitext(f)[1].lower() in STORE else zipfile.ZIP_DEFLATED)
    os.replace(tmp, dst)
    return os.path.getsize(dst)


def size(d):
    return sum(os.path.getsize(f) for f in walk(d)), sum(1 for _ in walk(d))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'release'))
    ap.add_argument('--png', action='store_true', help='keep the panels as PNG')
    ap.add_argument('--only', default='web,itch,source,soundtrack')
    a = ap.parse_args()
    only = set(a.only.split(',')); out = os.path.abspath(a.out); os.makedirs(out, exist_ok=True)
    web = os.path.join(out, 'web')
    if only & {'web', 'itch'}:
        print('web build ...', flush=True)
        sync(web, build_runtime(web, a.png, True))
        b, n = size(web); print(f'web: {n} files, {b / 1e6:.0f} MB', flush=True)
        if n >= 1000 or b >= 500e6: print('  WARNING: over the itch.io HTML5 limits (1000 files / 500 MB)')
    if 'itch' in only:
        print('itch zip ...', flush=True)
        print(f'deeplink_itch.zip: {zipdir(web, os.path.join(out, "deeplink_itch.zip")) / 1e6:.0f} MB', flush=True)
    if 'source' in only:
        print('source ...', flush=True)
        src = os.path.join(out, 'source')
        want = build_runtime(src, a.png, False)
        for item in SOURCE_EXTRA:
            p = os.path.join(ROOT, item)
            for f in ([p] if os.path.isfile(p) else list(walk(p))):
                rel = os.path.relpath(f, ROOT).replace(os.sep, '/'); copy(f, os.path.join(src, rel)); want.add(rel)
        for t in SOURCE_TOOLS:
            copy(os.path.join(ROOT, 'tools', t), os.path.join(src, 'tools', t)); want.add('tools/' + t)
        sync(src, want)
        with open(os.path.join(src, '.gitignore'), 'w') as fh:
            fh.write(GITIGNORE)
        b, n = size(src); print(f'source: {n} files, {b / 1e6:.0f} MB', flush=True)
    if 'soundtrack' in only and os.path.isdir(os.path.join(ROOT, 'soundtrack')):
        print('soundtrack ...', flush=True)
        st = os.path.join(out, 'soundtrack'); want = set()
        for f in walk(os.path.join(ROOT, 'soundtrack')):
            rel = os.path.relpath(f, os.path.join(ROOT, 'soundtrack')).replace(os.sep, '/'); copy(f, os.path.join(st, rel)); want.add(rel)
        sync(st, want)
        print(f'DEEPLINK_Soundtrack.zip: {zipdir(st, os.path.join(out, "DEEPLINK_Soundtrack.zip"), "DEEPLINK Soundtrack/") / 1e6:.0f} MB', flush=True)
    print('done', flush=True)


if __name__ == '__main__':
    sys.exit(main())
