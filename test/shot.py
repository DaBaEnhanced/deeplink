"""Headless screenshot / smoke test (Chromium with WebGPU on SwiftShader).
    python test/shot.py "?dive=grid_city&bot&from=60" out.png [wait_ms] [w h] [--js "expr"]
Starts tools/serve.py on port 8765 if needed, prints console errors."""
import asyncio, subprocess, sys, time, socket, os
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def up(port):
    s = socket.socket();
    try: s.connect(('127.0.0.1', port)); return True
    except OSError: return False
    finally: s.close()
async def main():
    q, out = sys.argv[1], sys.argv[2]
    wait = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 4000
    w, h = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 and sys.argv[4].isdigit() else (800, 600)
    js = sys.argv[sys.argv.index('--js') + 1] if '--js' in sys.argv else None
    if not up(8765): subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'serve.py'), '8765'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless=True,
            args=(os.environ.get('GPUFLAGS') or '--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=swiftshader --use-webgpu-adapter=swiftshader').split() + ['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto(f'http://localhost:8765/index.html{q}')
        await pg.wait_for_timeout(wait)
        if js:
            r = await pg.evaluate(js); print('JS:', r)
        await pg.screenshot(path=out)
        for l in logs[:40]: print(l)
        await b.close()
asyncio.run(main())
