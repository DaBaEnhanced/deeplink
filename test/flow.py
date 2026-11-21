"""Story flow smoke test: boot -> title -> menu -> new story -> intro -> calibration (bot) -> results -> seq0 -> mods -> lab
-> contract -> lab -> story dive 1 ... Dives are ended early through the debug hook. Screenshots in /tmp/flow_*.png"""
import asyncio, os, sys, subprocess, time, socket
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def up(port):
    s = socket.socket()
    try: s.connect(('127.0.0.1', port)); return True
    except OSError: return False
    finally: s.close()
async def main():
    if not up(8765): subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'serve.py'), '8765']); time.sleep(1)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless=True,
            args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        n = [0]
        async def shot(tag):
            n[0] += 1; await pg.screenshot(path=f'/tmp/flow_{n[0]:02d}_{tag}.png'); print('shot', n[0], tag, '| state', await pg.evaluate('DEEPLINK.state'), '| logs', logs[-3:])
        async def click(text):
            await pg.get_by_text(text, exact=False).first.click(); await pg.wait_for_timeout(700)
        await pg.goto('http://localhost:8765/index.html?capture'); await pg.evaluate('localStorage.clear()')
        await pg.goto('http://localhost:8765/index.html?capture'); await pg.wait_for_timeout(1500)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(6000); await shot('title')
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(800); await shot('menu')
        await click('Story'); await pg.wait_for_timeout(1500); await shot('intro')
        for i in range(3): await pg.keyboard.press('Space'); await pg.wait_for_timeout(500)
        await shot('intro2')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(4000); await shot('calib')
        await pg.evaluate("import('./src/sim/bot.js').then(m => { DEEPLINK.dive.bot = new m.Bot(); })")
        await pg.wait_for_timeout(3000); await shot('calib_play')
        await pg.evaluate('DEEPLINK.dive.sim.stats.kills=30; DEEPLINK.dive.sim.stats.spawned=34; DEEPLINK.dive.sim.finish()'); await pg.wait_for_timeout(1200); await shot('results')
        await click('Continue'); await pg.wait_for_timeout(1500); await shot('seq0')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1200); await shot('mods')
        await pg.locator('.modcard').first.click(); await pg.wait_for_timeout(1000); await shot('dialogue')
        await pg.locator('.opts .btn').first.click(); await pg.wait_for_timeout(1500); await shot('lab1')
        await pg.locator('.card').first.click(); await pg.wait_for_timeout(900); await shot('briefing')
        await click('DIVE'); await pg.wait_for_timeout(5000); await shot('contract')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600); await shot('pause')
        await click('Resume'); await pg.wait_for_timeout(500)
        await pg.evaluate('DEEPLINK.dive.sim.finish()'); await pg.wait_for_timeout(1200); await shot('contract_results')
        await click('Continue'); await pg.wait_for_timeout(2500); await shot('after_contract')
        for l in logs: print(l)
        await b.close()
asyncio.run(main())
