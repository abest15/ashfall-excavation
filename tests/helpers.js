// Shared helpers for the Playwright tests. All game access goes through window.__G (tools/test-hook.js).
import { expect } from '@playwright/test';

// Low graphics keeps software rendering usable; settings are read from localStorage at boot.
export async function openGame(page, query = '') {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  await page.addInitScript(() => {
    try { if (!localStorage.getItem('ashfall:settings')) localStorage.setItem('ashfall:settings', JSON.stringify({ scale: 0.55, vol: 0 })); } catch (e) {}
  });
  await page.goto('/index.html' + query);
  try { await page.waitForFunction(() => window.__G && window.__G.renderer, null, { timeout: 60_000 }); }
  catch (e) { throw new Error('game did not boot (window.__G missing). Page errors: ' + JSON.stringify(errors)); }
  return errors;
}

// Gets past the splash (and any intro) to the main menu.
export async function toMainMenu(page) {
  await expect(page.locator('#splash')).toBeVisible({ timeout: 60_000 });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.locator('#front-main').isVisible()) return;
    await page.locator('#splash').click({ timeout: 2000, force: true }).catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(400);
  }
  await expect(page.locator('#front-main')).toBeVisible();
}

// Clicks Solo and waits through any loading screen until the game is running.
export async function startSolo(page) {
  await page.click('#play');
  await expect.poll(() => page.evaluate(() => window.__G.state), { timeout: 90_000 }).toBe('play');
  await expect(page.locator('#hud')).toBeVisible();
}

// Advances game time by `seconds` in fixed 50 ms steps (much faster than real time under software GL).
// `each` (a function source string) runs inside the page before every step, e.g. to keep the player alive.
export async function advance(page, seconds, each = '') {
  await page.evaluate(([n, each]) => {
    const g = window.__G, f = each ? new Function('g', each) : null;
    for (let i = 0; i < n; i++) { if (f) f(g); g.tick(0.05); }
  }, [Math.round(seconds / 0.05), each]);
}

// Ticks until `cond` (function source returning truthy, gets g) holds or game time runs out.
export async function tickUntil(page, cond, maxSeconds = 60, each = '') {
  const ok = await page.evaluate(([cond, n, each]) => {
    const g = window.__G, c = new Function('g', 'return (' + cond + ')'), f = each ? new Function('g', each) : null;
    for (let i = 0; i < n; i++) { if (c(g)) return true; if (f) f(g); g.tick(0.05); }
    return !!c(g);
  }, [cond, Math.round(maxSeconds / 0.05), each]);
  expect(ok, `condition never held: ${cond}`).toBe(true);
}

export const KEEP_ALIVE = 'g.P.hp=g.P.maxHp; g.P.invuln=5; g.P.downed=false;';
