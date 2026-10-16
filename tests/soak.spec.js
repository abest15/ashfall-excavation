// Soak test: a solo game auto-played from round 1 to round 15 with __G.tick.
// The player stands still (kept alive); every step the nearest risen zombie is placed in front of them and shot
// through the real fire() -> raycast -> hitZombie -> killZombie path with an upgraded light machine gun.
// After each round a few real frames render, then the test samples renderer memory, scene size, live audio
// nodes, DOM size and zombie bookkeeping, and checks that nothing grows without bound.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo } from './helpers.js';

const LAST_ROUND = 15;

// runs inside the page: plays until round `target` has started (or the game-time cap is hit)
function playUntilRound([target, capSeconds]) {
  const g = window.__G, P = g.P;
  let maxAlive = 0, maxList = 0, steps = 0, shots0 = g.NET.shots;
  const kills0 = P.kills;
  const n = Math.round(capSeconds / 0.05);
  for (let i = 0; i < n; i++) {
    if (g.R.n >= target && !g.R.inBreak) break;
    P.hp = P.maxHp; P.invuln = 5; P.downed = false; P.dead = false;
    P.pos.set(0, 0, 44); P.vy = 0; P.yaw = 0; P.pitch = 0;
    const w = g.curW(); if (w) w.res = 999;
    let alive = 0; for (const z of g.zombies) if (!z.dead) alive++;
    maxAlive = Math.max(maxAlive, alive); maxList = Math.max(maxList, g.zombies.length);
    const z = g.zombies.find(q => !q.dead && q.rise <= 0);
    if (z) {
      z.win = null; z.wstate = null; z.g.position.set(0, 0, 40); z.g.rotation.y = 0;
      g.scene.updateMatrixWorld();
      // aim at the middle of its hit parts (hounds are low, bosses tall)
      let ty = 0, c = 0; const v = g.camera.position.clone();
      for (const part of z.parts || []) { part.getWorldPosition(v); ty += v.y; c++; }
      if (c) P.pitch = Math.atan2(ty / c - g.camera.position.y, 4);
      g.setTrig(true); g.setMouse(true);
    } else g.setMouse(false);
    g.tick(0.05); steps++;
  }
  g.setMouse(false);
  return { round: g.R.n, inBreak: g.R.inBreak, maxAlive, maxList, kills: P.kills - kills0, shots: g.NET.shots - shots0, gameSeconds: steps * 0.05, state: g.state };
}

function sample() {
  const g = window.__G, mem = g.renderer.info.memory;
  let objects = 0; g.scene.traverse(() => objects++);
  return {
    round: g.R.n, geometries: mem.geometries, textures: mem.textures, sceneChildren: g.scene.children.length, objects,
    zombieList: g.zombies.length, alive: g.zombies.filter(z => !z.dead).length,
    auLive: g.AU ? g.AU.live : 0, auPeak: g.AU ? g.AU.peakLive : 0, auCtx: !!(g.AU && g.AU.ctx),
    dom: document.getElementsByTagName('*').length, pickups: g.pickups.length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  };
}

test('solo soak: rounds 1 to 15 without errors or leaks', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await page.evaluate(() => { const g = window.__G; g.giveWeapon(g.mkInst('lmg', true)); });

  const rows = [];
  for (let r = 1; r <= LAST_ROUND; r++) {
    const res = await page.evaluate(playUntilRound, [r, 400]);
    expect(res.state, `game still running in round ${r}`).toBe('play');
    expect(res.round, `round ${r} started (game time ${res.gameSeconds.toFixed(0)} s)`).toBeGreaterThanOrEqual(r);
    // let the real loop render a few frames so renderer.info.memory reflects what is on screen
    await page.waitForTimeout(1200);
    const s = await page.evaluate(sample);
    rows.push({ ...s, killsLastRound: res.kills, maxAlive: res.maxAlive, maxList: res.maxList });
    // zombie bookkeeping stays sane: never more alive than the game's own cap (+ a boss), corpses get cleaned up
    expect(res.maxAlive, `alive zombies in round ${r}`).toBeLessThanOrEqual(24 + 2);
    expect(res.maxList, `zombie list (alive + dying) in round ${r}`).toBeLessThan(60);
  }
  console.table(rows);

  // leak checks: compare the end of the soak with round 3 (after the first wave of lazily created assets)
  const base = rows[2], end = rows[rows.length - 1];
  const growth = k => end[k] - base[k];
  console.log('growth round 3 -> 15:', { geometries: growth('geometries'), textures: growth('textures'), objects: growth('objects'), sceneChildren: growth('sceneChildren'), dom: growth('dom'), pickups: growth('pickups') });
  // soft: every check is reported even when an earlier one fails
  expect.soft(growth('pickups'), 'world pickups pile up (uncollected duplicates)').toBeLessThan(3);
  expect.soft(growth('geometries'), 'GPU geometries grow without bound').toBeLessThan(30);
  expect.soft(growth('textures'), 'GPU textures grow without bound').toBeLessThan(6);
  expect.soft(growth('objects'), 'scene objects grow without bound').toBeLessThan(150);
  expect.soft(growth('dom'), 'DOM nodes grow without bound').toBeLessThan(200);
  // audio: tick() packs minutes of game time into a few real seconds, so the live-node peak here is far above what
  // real play produces; it is logged, not asserted. The leak check is that voices drain once the shooting stops.
  console.log('audio live-node peak (AU.peakLive):', end.auPeak, '(engine cap AU_MAXLIVE = 240)');
  await page.evaluate(() => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true); g.R.inBreak = true; g.R.breakT = 999; });
  await page.waitForTimeout(4000);
  const quiet = await page.evaluate(() => window.__G.AU ? window.__G.AU.live : 0);
  console.log('live audio nodes after 4 s of quiet:', quiet);
  expect.soft(quiet, 'AU.live returns to near zero once the game is quiet (it gates sounds at 240)').toBeLessThan(40);

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__ashfallErrors || [])).toEqual([]);
});
