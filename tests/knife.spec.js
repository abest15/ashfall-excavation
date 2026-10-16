// Regression: one knife swing kills an idle round-1 zombie at any distance inside lunge range
// (the lunge once carried the player through the target, so the hit landed behind them).
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo } from './helpers.js';

test('knife kills an idle zombie in one swing at every range', async ({ page }) => {
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  const r = await page.evaluate(() => {
    const G = window.__G, P = G.P;
    const T = (s, dt = .05) => { for (let t = 0; t < s; t += dt) { G.scene.updateMatrixWorld(); G.tick(dt); } };
    P.hp = P.maxHp = 1e9; T(.3);
    const out = [];
    for (const d of [0.6, 1.0, 1.6, 2.4, 3.2]) {
      for (const q of G.zombies) if (!q.dead) G.killZombie(q, 'body', true);
      P.pos.set(0, 0, 30); P.yaw = 0; P.pitch = 0; P.meleeT = 0; T(.7);
      const z = G.spawnZombie(); z.rise = 0; z.win = null; z.wstate = null; z.hp = z.maxHp = 150; z.g.position.set(0, 0, 30 - d);
      let swings = 0;
      while (!z.dead && swings < 4) { P.meleeT = 0; G.melee(); swings++; T(.7); }
      out.push({ d, swings, dead: z.dead });
    }
    return out;
  });
  console.log('knife swings by distance:', JSON.stringify(r));
  for (const x of r) { expect(x.dead).toBe(true); expect(x.swings).toBe(1); }
  expect(errors).toEqual([]);
});
