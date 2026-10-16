// Desktop shell check: launches the Electron app (desktop/main.cjs) on the production build and makes sure
// the game boots from the app:// origin with the CSP in place, the window is set up, and keys reach the page.
// Opt-in (needs a display; use xvfb-run on Linux CI):  ASHFALL_DESKTOP_TEST=1 npx playwright test desktop
import { test, expect, _electron as electron } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toMainMenu } from './helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
test.skip(!process.env.ASHFALL_DESKTOP_TEST, 'set ASHFALL_DESKTOP_TEST=1 to run the desktop shell test');

test('desktop app boots the game', async () => {
  // ASHFALL_DESKTOP_EXE=release/linux-unpacked/ashfall-excavation tests the packaged app instead of `electron .`
  const exe = process.env.ASHFALL_DESKTOP_EXE;
  const app = await electron.launch({ ...(exe ? { executablePath: join(root, exe), args: ['--no-sandbox'] } : { args: [root, '--no-sandbox'] }), cwd: root, env: { ...process.env, ASHFALL_SOFTWARE_GL: '1' } });
  try {
    const errors = [];
    const page = await app.firstWindow();
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForURL('app://ashfall/index.html', { timeout: 30000 });
    await expect(page.locator('#splash')).toBeVisible({ timeout: 30000 });
    const info = await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return { title: w.getTitle(), menu: w.isMenuBarVisible() }; });
    expect(info.title).toBe('Ashfall Excavation');
    expect(info.menu).toBe(false);
    expect(await page.evaluate(() => !!(window.ashfallDesktop && window.ashfallDesktop.isDesktop))).toBe(true);
    // the co-op library URL the game requests must load inside the app
    const peer = await page.evaluate(() => new Promise(res => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = () => res(window.Peer ? 'loaded' : 'missing'); s.onerror = () => res('error'); document.head.appendChild(s); setTimeout(() => res('timeout'), 15000); }));
    expect(peer).toBe('loaded'); // served from the app's own copy, so this works offline too
    await toMainMenu(page);
    await page.click('#play');
    await expect(page.locator('#hud')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(500);
    // Esc must reach the page (the shell only intercepts F11 / Alt+Enter)
    await page.evaluate(() => { window.__escSeen = false; addEventListener('keydown', e => { if (e.code === 'Escape') window.__escSeen = true; }, true); });
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__escSeen)).toBe(true);
    // fullscreen toggle (F11 goes through the same function; synthetic key events skip before-input-event)
    const fs0 = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
    await page.evaluate(() => window.ashfallDesktop.toggleFullscreen());
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(!fs0);
    expect(errors).toEqual([]);
  } finally { await app.close(); }
});
