// Smoke test: the game loads, the splash and menu work, Solo starts, a round begins, a zombie spawns
// and can be killed by gunfire, and the pause menu opens.
import { test, expect } from '@playwright/test';
// (also covers the F3 performance overlay and the dev error overlay staying hidden)
import { openGame, toMainMenu, startSolo, tickUntil, KEEP_ALIVE } from './helpers.js';

test('loads, starts a solo game, kills a zombie, pauses', async ({ page }) => {
  const errors = await openGame(page);
  await expect(page).toHaveTitle(/Ashfall Excavation/);
  const version = await page.locator('meta[name="ashfall-version"]').getAttribute('content');
  expect(version).toMatch(/^\d+\.\d+\.\d+/);

  await toMainMenu(page);
  await startSolo(page);

  // a round begins after the opening break
  await tickUntil(page, 'g.R.n>=1 && !g.R.inBreak', 20, KEEP_ALIVE);
  // a zombie spawns on its own
  await tickUntil(page, 'g.zombies.some(z=>!z.dead)', 30, KEEP_ALIVE);

  // bring it in front of the player and shoot it with the pistol until it dies
  await tickUntil(page, 'g.zombies.some(z=>!z.dead&&z.rise<=0)', 20, KEEP_ALIVE);
  const killed = await page.evaluate(() => {
    const g = window.__G, z = g.zombies.find(q => !q.dead && q.rise <= 0), P = g.P;
    const kills0 = P.kills;
    for (let i = 0; i < 400 && !z.dead; i++) {
      P.hp = P.maxHp; P.invuln = 5; P.yaw = 0; P.pitch = 0;
      z.speed = 0; z.win = null; z.wstate = null; z.g.position.set(P.pos.x, 0, P.pos.z - 4); g.scene.updateMatrixWorld();
      g.setTrig(true); g.setMouse(true); g.tick(0.05);
      const w = g.curW(); if (w && w.mag === 0 && w.res === 0) w.res = 64;
    }
    g.setMouse(false);
    return { dead: z.dead, kills: P.kills - kills0 };
  });
  expect(killed.dead).toBe(true);
  expect(killed.kills).toBeGreaterThanOrEqual(1);

  // pause. With mouse capture, Esc makes the browser release the pointer and the game pauses on that;
  // where capture is refused (headless), the game falls back to pausing on Esc itself after two refusals.
  for (let i = 0; i < 3 && !(await page.evaluate(() => !!document.pointerLockElement)); i++) {
    await page.mouse.click(480, 270); await page.waitForTimeout(400);
  }
  const locked = await page.evaluate(() => !!document.pointerLockElement);
  console.log('pointer lock in this browser:', locked);
  if (locked) await page.evaluate(() => document.exitPointerLock());
  else await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__G.state)).toBe('paused');
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#play')).toHaveText(/Resume/i);
  await page.click('#play');
  await expect.poll(() => page.evaluate(() => window.__G.state)).toBe('play');

  // F3 performance overlay shows live numbers (and the version stamp)
  await page.keyboard.press('F3');
  const perf = page.locator('#perf-overlay');
  await expect(perf).toBeVisible();
  await expect(perf).toContainText('v' + version, { timeout: 20_000 });
  await expect.poll(async () => +(((await perf.textContent()).match(/draws\s+(\d+)/) || [])[1] || 0), { timeout: 20_000 }).toBeGreaterThan(0);
  await expect(perf).toContainText(/fps\s+\d+/);
  await expect(perf).toContainText(/net\s+solo/);
  await page.keyboard.press('F3');
  await expect(perf).toBeHidden();

  // a few real frames render without errors
  await page.waitForTimeout(1000);
  await expect(page.locator('#ash-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__ashfallErrors || [])).toEqual([]);
});

test('dev builds show uncaught errors on screen', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => { setTimeout(() => { throw new Error('overlay check'); }, 0); });
  await expect(page.locator('#ash-error-overlay')).toBeVisible();
  await expect(page.locator('#ash-error-overlay')).toContainText('overlay check');
  await page.screenshot({ path: 'test-results/error-overlay.png' });
  await page.keyboard.press('F3');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/perf-overlay.png' });
});
