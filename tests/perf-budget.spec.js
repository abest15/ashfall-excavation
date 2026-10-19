// Performance budget at Graphics Low: draw calls and triangles of the world scene from fixed camera spots.
// Budgets are about 15% above what the game measured when this test was written (see MEASURED), so a change
// that makes Low noticeably heavier fails here instead of slipping through. If a change is intentional and
// worth it, re-measure (the test logs the numbers) and raise the budget in the same change.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo } from './helpers.js';

// x, z, yaw (radians; 0 looks toward -z), pitch, optional floor height y (levels)
const VIEWS = {
  'spawn, looking up the dig': [0, 44, 0, 0],
  'spawn, looking back': [0, 44, Math.PI, 0],
  'chapel approach': [40, 17, -Math.PI / 2, 0],
  "No Man's Land and the Colossus": [44, -12, -Math.PI / 2, 0.15],
  // levels (added with the Château and the Underworks; budgets measured when they were added)
  'Château hall': [-32, -8, Math.PI / 2, 0, 0],
  'Château upper floor': [-38, -8, Math.PI / 2, 0, 4.2],
  'Underworks pump room': [10, -22, -Math.PI / 2, 0, -7],
  'Underworks rail tunnel': [0, -40, Math.PI / 2, 0, -7],
};
// measured 2026-10-16 at HEAD (Low, 960x540), see the test log for current values
const MEASURED = {
  'spawn, looking up the dig': { calls: 432, triangles: 45050 },
  'spawn, looking back': { calls: 62, triangles: 18478 },
  'chapel approach': { calls: 164, triangles: 28062 },
  "No Man's Land and the Colossus": { calls: 179, triangles: 26332 },
  // measured 2026-10-18 when the levels were added (underground views also draw the surface above the ceiling)
  'Château hall': { calls: 66, triangles: 26072 },
  'Château upper floor': { calls: 65, triangles: 25952 },
  'Underworks pump room': { calls: 200, triangles: 43029 },
  'Underworks rail tunnel': { calls: 106, triangles: 33934 },
};
const HEADROOM = 1.15;
const BUDGET = Object.fromEntries(Object.entries(MEASURED).map(([k, v]) => [k, { calls: Math.ceil(v.calls * HEADROOM), triangles: Math.ceil(v.triangles * HEADROOM) }]));

test('Graphics Low stays within its draw-call and triangle budgets', async ({ page }) => {
  const errors = await openGame(page); // helpers set Graphics Low (scale 0.55)
  await toMainMenu(page);
  await startSolo(page);
  expect(await page.evaluate(() => window.__G.QUAL)).toBe(0);

  const results = {};
  for (const [name, [x, z, yaw, pitch, y = 0]] of Object.entries(VIEWS)) {
    results[name] = await page.evaluate(([x, z, yaw, pitch, y]) => {
      const g = window.__G, P = g.P, r = g.renderer;
      // a quiet site: no zombies, no round running, the Colossus at its start pose
      g.R.inBreak = true; g.R.breakT = 1e9;
      for (const q of g.zombies) if (!q.dead) g.killZombie(q, 'self', true);
      for (let i = 0; i < 4; i++) { P.pos.set(x, y, z); P.vy = 0; P.yaw = yaw; P.pitch = pitch; P.hp = P.maxHp; P.invuln = 5; g.tick(0.05); }
      P.yaw = yaw; P.pitch = pitch; g.tick(0.001);
      const auto = r.info.autoReset; r.info.autoReset = false; r.info.reset();
      r.setRenderTarget(null); r.render(g.scene, g.camera);
      const out = { calls: r.info.render.drawCalls ?? r.info.render.calls, // WebGPURenderer: drawCalls (render.calls counts render() calls)
        backend: r.backend && r.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2', triangles: r.info.render.triangles, cam: [g.camera.position.x, g.camera.position.z].map(v => +v.toFixed(1)) };
      r.info.reset(); r.info.autoReset = auto;
      return out;
    }, [x, z, yaw, pitch, y]);
  }
  console.table(results);
  for (const [name, m] of Object.entries(results)) {
    const b = BUDGET[name];
    if (!b) { console.log(`no budget yet for "${name}": suggest calls ${Math.ceil(m.calls * HEADROOM)}, triangles ${Math.ceil(m.triangles * HEADROOM)}`); continue; }
    expect.soft(m.calls, `draw calls: ${name} (budget ${b.calls})`).toBeLessThanOrEqual(b.calls);
    expect.soft(m.triangles, `triangles: ${name} (budget ${b.triangles})`).toBeLessThanOrEqual(b.triangles);
  }
  expect(errors).toEqual([]);
});
