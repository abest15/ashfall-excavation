// Levels (src/world/05c-levels.js, 07b-levels-build.js): the player walks down the collapsed shaft into the Underworks
// and up the Château stair to its upper floor; zombies chase the player across floors; nobody falls through a floor;
// a co-op client sees zombies at their real height. Runs on the WASM sim by default and on the JS path with
// ASHFALL_SIM=js (npm run test:js).
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, hostAndJoin, KEEP_ALIVE } from './helpers.js';

const WANT = process.env.ASHFALL_SIM === 'js' ? 'js' : 'wasm';
const HOLD = KEEP_ALIVE + ' g.R.toSpawn=0; g.R.bossDue=false; g.R.inBreak=false;';

async function solo(page) {
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await expect.poll(() => page.evaluate(() => window.ashfallSim.mode), { timeout: 30_000 }).toBe(WANT);
  await page.evaluate(() => { const g = window.__G; g.R.toSpawn = 0; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true); g.tick(0.05); });
  return errors;
}

// walks the player through waypoints with the movement keys (in-page); returns the path's heights and zones
const WALK = `(g, pts, hold, maxT) => { const out = { ys: [], zones: [], minGap: 1e9, reached: false }; let k = 0;
  for (let i = 0; i < maxT * 20; i++) { hold(g); const P = g.P, w = pts[k], dx = w[0] - P.pos.x, dz = w[1] - P.pos.z;
    if (Math.hypot(dx, dz) < .6) { k++; if (k >= pts.length) { out.reached = true; break; } continue; }
    P.yaw = Math.atan2(-dx, -dz); P.pitch = 0; g.keys.KeyW = true; g.tick(0.05);
    const f = g.floorAt(P.pos.x, P.pos.y + .1, P.pos.z); out.minGap = Math.min(out.minGap, P.pos.y - f);
    if (i % 10 === 0) { out.ys.push(+P.pos.y.toFixed(2)); out.zones.push(P.zone); } }
  g.keys.KeyW = false; out.end = [g.P.pos.x, g.P.pos.y, g.P.pos.z].map(v => +v.toFixed(2)); out.zone = g.P.zone; return out; }`;

test('the player walks down into the Underworks and up to the Château upper floor', async ({ page }) => {
  const errors = await solo(page);
  const r = await page.evaluate(([WALK, HOLD]) => {
    const g = window.__G, walk = eval(WALK), hold = new Function('g', HOLD);
    for (const id of ['shaft', 'chateau']) g.openDoor(g.LVL.doors[id]);
    for (let i = 0; i < 30; i++) { hold(g); g.P.pos.set(-12, 0, -22.2); g.P.vy = 0; g.tick(0.05); }
    const down = walk(g, [[-8, -22.2], [12, -22.2], [16, -20]], hold, 30);
    for (let i = 0; i < 10; i++) { hold(g); g.P.pos.set(-27, 0, -11); g.P.vy = 0; g.tick(0.05); }
    const up = walk(g, [[-31.6, -10.5], [-31.6, .2], [-41.6, .2], [-41.6, -4], [-46, -8]], hold, 40);
    // the drop hole above the kitchen: one step off the upper floor lands you on the ground floor
    const drop = walk(g, [[-48.75, -4.75]], hold, 10); for (let i = 0; i < 30; i++) { hold(g); g.tick(0.05); }
    // a jump under the upper floor bumps the ceiling instead of passing through it
    g.P.pos.set(-50, 0, -20); g.P.vy = 0; for (let i = 0; i < 5; i++) { hold(g); g.tick(0.05); } g.P.vy = 30; let top = 0;
    for (let i = 0; i < 30; i++) { hold(g); g.tick(0.05); top = Math.max(top, g.P.pos.y); }
    return { down, up, dropY: +g.P.pos.y.toFixed(2), dropZone: g.P.zone, top };
  }, [WALK, HOLD]);
  expect(r.down.reached, JSON.stringify(r.down)).toBe(true);
  expect(r.down.end[1]).toBeCloseTo(-7, 1);
  expect(r.down.zone).toBe('U1');
  expect(r.down.minGap).toBeGreaterThan(-0.05); // never below the floor
  expect(r.up.reached, JSON.stringify(r.up)).toBe(true);
  expect(r.up.end[1]).toBeCloseTo(4.2, 1);
  expect(r.up.zone).toBe('L');
  expect(r.up.minGap).toBeGreaterThan(-0.05);
  expect(r.dropY).toBeCloseTo(0, 1);
  expect(r.dropZone).toBe('K');
  expect(r.top).toBeLessThan(3.9 - 1.75); // head stays under the upper floor slab
  expect(errors).toEqual([]);
});

test('zombies follow the player across floors and stay on the floors', async ({ page }) => {
  const errors = await solo(page);
  const r = await page.evaluate(([HOLD]) => {
    const g = window.__G, hold = new Function('g', HOLD);
    for (const d of g.DOORS) if (!d.open && !d.locked) g.openDoor(d);
    const chase = (from, to, secs) => { const z = g.spawnZombie('walker'); z.win = null; z.wstate = null; z.rise = 0; z.g.position.set(...from); z.speed = 3;
      let t = -1, worst = 0, under = 0;
      for (let i = 0; i < secs * 20; i++) { hold(g); g.P.pos.set(...to); g.P.vy = 0; g.tick(0.05);
        const p = z.g.position, f = g.floorAt(p.x, p.y + .1, p.z); worst = Math.max(worst, Math.abs(p.y - f)); if (p.y < -10.6) under++;
        if (Math.hypot(p.x - to[0], p.y - to[1], p.z - to[2]) < 2.1) { t = i * .05; break; } }
      g.killZombie(z, 'self', true); g.tick(.05); return { t, worst: +worst.toFixed(2), under, end: [z.g.position.x, z.g.position.y, z.g.position.z].map(v => +v.toFixed(1)) }; };
    return { down: chase([-14, 0, -20], [16, -7, -22], 50), up: chase([18, -7, -20], [-16, 0, -6], 50),
      upper: chase([-20, 0, -10], [-50, 4.2, -20], 60), cellar: chase([-50, 0, -4], [-62, -7, -10], 50) };
  }, [HOLD]);
  for (const [k, v] of Object.entries(r)) {
    expect(v.t, `${k}: ${JSON.stringify(v)}`).toBeGreaterThan(0);
    expect(v.worst, `${k}: off the floor`).toBeLessThan(0.7);
    expect(v.under).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('co-op: the client sees zombies at their real height', async ({ browser }) => {
  const context = await browser.newContext();
  const { host, client, hostErrors, clientErrors } = await hostAndJoin(context);
  const id = await host.evaluate(([HOLD]) => {
    const g = window.__G, hold = new Function('g', HOLD);
    for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true);
    g.openDoor(g.LVL.doors.shaft); hold(g);
    const z = g.spawnZombie('walker'); z.win = null; z.wstate = null; z.rise = 0; z.speed = 0; z.g.position.set(18, -7, -20); z.fy = -7;
    const u = g.spawnZombie('walker'); u.win = null; u.wstate = null; u.rise = 0; u.speed = 0; u.g.position.set(-48, 4.2, -20); u.fy = 4.2;
    return [z.id, u.id];
  }, [HOLD]);
  const pump = async () => { for (const p of [host, client]) await p.evaluate(keep => { const g = window.__G, f = new Function('g', keep); for (let i = 0; i < 4; i++) { f(g); g.tick(0.05); } }, HOLD); await host.waitForTimeout(60); };
  await expect.poll(async () => { await pump(); return client.evaluate(ids => ids.map(i => { const z = window.__G.zombies.find(q => q.id === i && !q.dead); return z ? +z.g.position.y.toFixed(1) : null; }), id); }, { timeout: 30_000 }).toEqual([-7, 4.2]);
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
  await context.close();
});
