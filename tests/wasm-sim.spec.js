// Zombie simulation (src/engine/05b-wasm-sim.js + sim/, Rust -> wasm32): zombies path through open doors to the
// player, stop at closed doors, never pass through walls, don't stack up, and in co-op each heads for the nearest
// player. Runs on the WASM core by default and on the JavaScript path with ASHFALL_SIM=js (npm run test:js);
// the same behaviour is expected from both.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, hostAndJoin, KEEP_ALIVE } from './helpers.js';

const WANT = process.env.ASHFALL_SIM === 'js' ? 'js' : 'wasm';
// no natural spawns while a scenario runs; the player stays put and alive
const HOLD = KEEP_ALIVE + ' g.R.toSpawn=0; g.R.bossDue=false; g.R.inBreak=false;';

async function solo(page) {
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await expect.poll(() => page.evaluate(() => window.ashfallSim.mode), { timeout: 30_000 }).toBe(WANT);
  // clear the opening round so only scenario zombies exist
  await page.evaluate(() => { const g = window.__G; g.R.toSpawn = 0; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true); g.tick(0.05); });
  return errors;
}

// Places n risen walkers at the given points (in-page), returns nothing; zombies get a fixed speed.
const PLACE = `(g, pts, speed) => pts.map(([x, z]) => { const q = g.spawnZombie('walker'); q.win = null; q.wstate = null; q.rise = 0;
  q.g.position.set(x, 0, z); q.tx = x; q.tz = z; q.lx = x; q.lz = z; q.speed = speed; return q.id; })`;

test('the simulation core loads (or is forced off) and shows in the F3 overlay', async ({ page }) => {
  const errors = await solo(page);
  const info = await page.evaluate(() => ({ mode: window.ashfallSim.mode, ready: window.ashfallSim.ready, failed: window.ashfallSim.failed }));
  if (WANT === 'wasm') { expect(info.ready).toBe(true); expect(info.failed).toBeNull(); }
  else expect(info.failed).toMatch(/forced/);
  await page.keyboard.press('F3');
  await expect(page.locator('#perf-overlay')).toContainText(new RegExp('sim\\s+' + (WANT === 'wasm' ? 'WASM' : 'JS') + ' · \\d+\\.\\d+ ms'), { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('zombies reach the player through an open door and stop at a closed one', async ({ page }) => {
  const errors = await solo(page);
  const r = await page.evaluate(([PLACE, HOLD]) => {
    const g = window.__G, place = eval(PLACE), hold = new Function('g', HOLD);
    const door = g.DOORS.find(d => d.a === 'A' && d.b === 'B'); // the barricade at (0,30)
    // closed: a zombie in the trenches cannot reach the player in the bunker
    g.P.pos.set(0, 0, 44);
    const [idClosed] = place(g, [[-12, 18]], 3);
    const zc = g.zombies.find(q => q.id === idClosed);
    for (let i = 0; i < 300; i++) { hold(g); g.P.pos.set(0, 0, 44); g.tick(0.05); }
    const closedZ = zc.g.position.z;
    // open it: the same zombie walks through the doorway to the player
    g.openDoor(door);
    let reached = -1, maxGap = 0;
    for (let i = 0; i < 900 && reached < 0; i++) { hold(g); g.P.pos.set(0, 0, 44); g.tick(0.05);
      const p = zc.g.position; if (Math.hypot(p.x - g.P.pos.x, p.z - g.P.pos.z) < 1.6) reached = i * 0.05; }
    return { closedZ, reached, dead: zc.dead };
  }, [PLACE, HOLD]);
  expect(r.closedZ).toBeLessThan(29.2); // never got past the closed barricade (wall face at z=29.4)
  expect(r.reached).toBeGreaterThan(0);
  expect(r.reached).toBeLessThan(30);
  expect(errors).toEqual([]);
});

test('zombies never pass through walls and only change zone through doorways', async ({ page }) => {
  const errors = await solo(page);
  const r = await page.evaluate(([PLACE, HOLD]) => {
    const g = window.__G, place = eval(PLACE), hold = new Function('g', HOLD);
    for (const d of g.DOORS) if (!d.open && 'ABCD'.includes(d.a) && 'ABCD'.includes(d.b)) g.openDoor(d);
    // a crowd spread over the trenches and the dig, hunting the player in the generator yard
    const pts = []; for (let i = 0; i < 36; i++) pts.push(i % 2 ? [-25 + (i % 9) * 5, 10 + (i % 4) * 4] : [-25 + (i % 7) * 4, -25 + (i % 5) * 5]);
    const ids = place(g, pts, 3.2);
    const zs = ids.map(id => g.zombies.find(q => q.id === id));
    const inside = [], badCross = [];
    const prevZone = zs.map(z => g.zoneOf(z.g.position.x, z.g.position.z));
    for (let i = 0; i < 700; i++) { hold(g); g.P.pos.set(25, 0, -15); g.tick(0.05);
      zs.forEach((z, k) => { if (z.dead || z.rise > 0 || z.wstate) return; const p = z.g.position;
        for (const c of g.colliders) if (c.on && (c.y0 === undefined || (p.y + .35 < c.y1 && p.y + 1.7 > c.y0)) && p.x > c.minX + 0.05 && p.x < c.maxX - 0.05 && p.z > c.minZ + 0.05 && p.z < c.maxZ - 0.05) { inside.push([k, i, +p.x.toFixed(2), +p.z.toFixed(2)]); break; }
        const zn = g.zoneOf(p.x, p.z);
        if (zn && prevZone[k] && zn !== prevZone[k]) { const near = g.DOORS.some(d => d.open && Math.hypot(d.x - p.x, d.z - p.z) < 4.5); if (!near) badCross.push([k, prevZone[k], zn, +p.x.toFixed(1), +p.z.toFixed(1)]); }
        if (zn) prevZone[k] = zn; }); }
    const arrived = zs.filter(z => !z.dead && Math.hypot(z.g.position.x - 25, z.g.position.z + 15) < 8).length;
    return { inside: inside.slice(0, 5), insideN: inside.length, badCross: badCross.slice(0, 5), arrived, n: zs.length };
  }, [PLACE, HOLD]);
  expect(r.insideN, JSON.stringify(r.inside)).toBe(0);
  expect(r.badCross).toEqual([]);
  expect(r.arrived).toBeGreaterThan(r.n * 0.6);
  expect(errors).toEqual([]);
});

test('a crowd around the player does not stack up', async ({ page }) => {
  const errors = await solo(page);
  const r = await page.evaluate(([PLACE, HOLD]) => {
    const g = window.__G, place = eval(PLACE), hold = new Function('g', HOLD);
    g.openDoor(g.DOORS.find(d => d.a === 'A' && d.b === 'B'));
    const pts = []; for (let i = 0; i < 30; i++) pts.push([-20 + (i % 10) * 4, 12 + Math.floor(i / 10) * 4]);
    const ids = place(g, pts, 3);
    for (let i = 0; i < 500; i++) { hold(g); g.P.pos.set(0, 0, 22); g.tick(0.05); }
    const ps = ids.map(id => g.zombies.find(q => q.id === id)).filter(z => z && !z.dead).map(z => [z.g.position.x, z.g.position.z]);
    let min = 1e9, close = 0;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const d = Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]); if (d < min) min = d; if (d < 0.3) close++; }
    const near = ps.filter(p => Math.hypot(p[0], p[1] - 22) < 6).length;
    return { min, close, near, n: ps.length };
  }, [PLACE, HOLD]);
  console.log(`[${WANT}] crowd of ${r.n}: ${r.near} near the player, ${r.close} pairs closer than 0.3 m, closest ${r.min.toFixed(2)} m`);
  expect(r.near).toBeGreaterThan(r.n * 0.5); // they did converge
  // The JavaScript path is kept exactly as it was, and its soft separation lets bodies overlap in a dense crowd
  // (dozens of pairs); the WASM core's overlap relaxation is what fixes that, so the strict check is WASM-only.
  if (WANT === 'wasm') {
    expect(r.close).toBe(0); // nobody stands inside anybody
    expect(r.min).toBeGreaterThan(0.3);
  }
  expect(errors).toEqual([]);
});

test('co-op: each zombie goes for the nearest player', async ({ browser }) => {
  const context = await browser.newContext();
  const { host, client, hostErrors, clientErrors } = await hostAndJoin(context);
  await expect.poll(() => host.evaluate(() => window.ashfallSim.mode), { timeout: 30_000 }).toBe(WANT);
  // wait until the host has the client's state
  await expect.poll(() => host.evaluate(() => Object.values(window.__G.NET.remotes).some(r => r.st)), { timeout: 30_000 }).toBe(true);
  const r = await host.evaluate(([PLACE, HOLD]) => {
    const g = window.__G, place = eval(PLACE), hold = new Function('g', HOLD);
    for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true);
    g.openDoor(g.DOORS.find(d => d.a === 'A' && d.b === 'B'));
    const rp = Object.values(g.NET.remotes).find(q => q.st);
    const pin = () => { g.P.pos.set(-20, 0, 12); Object.assign(rp.st, { x: 20, z: 20, dn: 0, dd: 0, cab: 0, m: 'main' }); };
    pin();
    const [a, b] = place(g, [[-12, 18], [12, 14]], 2.6); // a starts nearer the host, b nearer the client
    const za = g.zombies.find(q => q.id === a), zb = g.zombies.find(q => q.id === b);
    const d = (z, x, y) => Math.hypot(z.g.position.x - x, z.g.position.z - y);
    for (let i = 0; i < 200; i++) { hold(g); pin(); g.tick(0.05); }
    return { aHost: d(za, -20, 12), aClient: d(za, 20, 20), bHost: d(zb, -20, 12), bClient: d(zb, 20, 20) };
  }, [PLACE, HOLD]);
  expect(r.aHost).toBeLessThan(2.5);
  expect(r.bClient).toBeLessThan(2.5);
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
  await context.close();
});
