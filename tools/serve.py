"""Local web server for DEEPLINK (WebGPU and ES modules need http://localhost, not file://).

    python tools/serve.py [port]        (default 8000)

Serves the game folder with caching disabled (directory listings are used to find art and music), plus:
    POST /beatmap/save?id=<track id>   body = beat map JSON -> data/tracks/<id>.json (a .bak copy is kept)
Editor endpoints are accepted from this computer only.
"""
import json
import os
import re
import shutil
import sys
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ID_RE = re.compile(r'^[A-Za-z0-9_.-]{1,60}$')


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.wgsl': 'text/plain'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            return self._json({'error': 'local only'}, 403)
        if u.path == '/beatmap/save':
            tid = urllib.parse.parse_qs(u.query).get('id', [''])[0]
            if not ID_RE.match(tid):
                return self._json({'error': 'bad id'}, 400)
            n = int(self.headers.get('Content-Length') or 0)
            try:
                data = json.loads(self.rfile.read(n) or b'{}')
                assert isinstance(data.get('sections'), list)
            except (ValueError, AssertionError):
                return self._json({'error': 'bad map'}, 400)
            out = os.path.join(ROOT, 'data', 'tracks', tid + '.json')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            if os.path.exists(out):
                shutil.copyfile(out, out + '.bak')
            with open(out, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=1)
            return self._json({'ok': True})
        return self._json({'error': 'not found'}, 404)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    srv.daemon_threads = True
    print(f'DEEPLINK on http://localhost:{port}/   (beat mapper: /tools/beatmapper.html   kit lab: /tools/kitlab.html)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
