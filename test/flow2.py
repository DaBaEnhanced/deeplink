"""Modes smoke test: menu (unlocked) -> free dive -> endless -> time attack -> custom music UI -> gallery -> options -> credits; endings."""
import asyncio, os, sys, subprocess, time, socket
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless=True,
            args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        n = [0]
        async def shot(tag):
            n[0] += 1; await pg.screenshot(path=f'/tmp/f2_{n[0]:02d}_{tag}.png'); print('shot', n[0], tag, await pg.evaluate('DEEPLINK.state'), logs[-2:])
        async def click(text): await pg.get_by_text(text, exact=False).first.click(); await pg.wait_for_timeout(600)
        async def menu():
            await pg.evaluate('DEEPLINK.endDive(); DEEPLINK.screens.menu()'); await pg.wait_for_timeout(500)
        await pg.goto('http://localhost:8765/index.html?capture&unlock'); await pg.wait_for_timeout(1500)
        await menu(); await shot('menu')
        await click('Free Dive'); await pg.locator('.list .btn').nth(3).click(); await shot('free')
        await click('DIVE'); await pg.wait_for_timeout(5000); await shot('free_dive')
        await menu(); await click('Endless Deep'); await click('DIVE'); await pg.wait_for_timeout(5000); await shot('endless')
        await pg.evaluate('DEEPLINK.dive.sim.finish()'); await pg.wait_for_timeout(5000); await shot('endless_loop2')
        await menu(); await click('Time Attack'); await pg.locator('.list .btn').first.click(); await pg.wait_for_timeout(6000); await shot('timeattack')
        await menu(); await click('Custom Music'); await shot('custom')
        await menu(); await click('Gallery'); await shot('gallery')
        await menu(); await click('Options'); await pg.get_by_text('Access').click(); await shot('options')
        for seq in ['end_come_back', 'end_ascend', 'end_free']:
            await pg.goto(f'http://localhost:8765/index.html?capture&seq={seq}&drift=70'); await pg.wait_for_timeout(1500)
            for i in range(4): await pg.keyboard.press('Space'); await pg.wait_for_timeout(300)
            await shot(seq)
        await pg.evaluate('DEEPLINK.screens.credits(true)'); await pg.wait_for_timeout(3000); await shot('credits')
        for l in logs: print(l)
        await b.close()
asyncio.run(main())
