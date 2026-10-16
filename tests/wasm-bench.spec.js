// JS vs WASM zombie locomotion benchmark (npm run test:bench, ASHFALL_BENCH=1). Not part of npm test.
// Uses ashfallSim.bench() from src/engine/05b-wasm-sim.js: for 24 / 60 / 120 zombies spread over the open map it times
//   update*  the whole updateZombies per frame (AI + animation are identical in both modes, so the gap is locomotion)
//   loco*    locomotion alone: the game's JS block (route + separation + collide) vs one WASM batch step
// and prints a table. It only asserts that WASM is not slower at 120 zombies.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo } from './helpers.js';

test('benchmark: JS vs WASM locomotion at 24 / 60 / 120 zombies', async ({ page }) => {
  test.skip(process.env.ASHFALL_SIM === 'js', 'needs the WASM core');
  await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await expect.poll(() => page.evaluate(() => window.ashfallSim.ready), { timeout: 30_000 }).toBe(true);
  const frames = +(process.env.ASHFALL_BENCH_FRAMES || 300);
  // run twice; the first pass warms up both JITs and the second is reported
  await page.evaluate(f => window.ashfallSim.bench([24, 60, 120], Math.round(f / 3)), frames);
  const rows = await page.evaluate(f => window.ashfallSim.bench([24, 60, 120], f), frames);
  expect(rows.error).toBeUndefined();
  console.log('\nms per frame (' + frames + ' frames each)\n' +
    'zombies | updateZombies JS | updateZombies WASM | locomotion JS | locomotion WASM | speed-up (loco)\n' +
    rows.map(r => `${String(r.zombies).padStart(7)} | ${r.updateJS.toFixed(3).padStart(16)} | ${r.updateWASM.toFixed(3).padStart(18)} | ${r.locoJS.toFixed(3).padStart(13)} | ${r.locoWASM.toFixed(3).padStart(15)} | ${(r.locoJS / Math.max(1e-3, r.locoWASM)).toFixed(1).padStart(5)}x`).join('\n'));
  const big = rows.find(r => r.zombies === 120);
  expect(big.locoWASM).toBeLessThan(big.locoJS);
});
