// Full ritual: drives the whole main quest (the easter egg) to the victory screen through window.__G.
// Each step uses the same function the game calls when the player does that thing (shooting a resonator
// calls hitReson, using the Lodestone calls lodeUse, ...), and game time is advanced with __G.tick so the
// timed stages (binding, awakening, the wraith's flights, the Prime's arrival) run for real.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, advance, tickUntil, KEEP_ALIVE } from './helpers.js';

// keep the player alive and the site from filling up while game time runs
const CALM = KEEP_ALIVE + 'for(const z of g.zombies){ if(!z.dead&&!z.boss&&!z.prime&&z.rise<=0&&Math.random()<.05) g.killZombie(z,"self"); }';
const stage = page => page.evaluate(() => window.__G.Q.stage);
const step = (page, fn, arg) => page.evaluate(fn, arg);

test('full ritual reaches the victory screen', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await advance(page, 4, KEEP_ALIVE); // round 1 begins

  // 1. the three Rod fragments (dig mound, field locker, the marked zombie), then set them in the Lodestone
  await step(page, () => { const g = window.__G; Object.assign(g.Q.frag, { dig: true, locker: true, marked: true }); g.lodeUse(); });
  expect(await stage(page)).toBe('assembling');
  await tickUntil(page, "g.Q.stage==='rodReady'", 10, CALM);
  await step(page, () => window.__G.lodeUse());
  expect(await stage(page)).toBe('stones');
  expect(await step(page, () => window.__G.P.weapons.some(w => w.id === 'rod' && !w.up))).toBe(true);

  // 2. feed the three waystones (12 kills near each) and strike them with the Rod
  await step(page, () => { const g = window.__G; g.Q.stones.forEach(s => { s.kills = 12; s.fed = true; }); g.Q.stones.forEach((s, i) => g.strikeStone(i)); });
  expect(await stage(page)).toBe('echoes');
  expect(await step(page, () => window.__G.P.bless.has('stone'))).toBe(true);

  // 3. the resonators: low to high, then (after they move) high to low
  await step(page, () => { const g = window.__G; for (const i of g.Q.echo.order.slice()) g.hitReson(i); });
  expect(await step(page, () => window.__G.Q.echo.verse)).toBe(2);
  await tickUntil(page, 'g.Q.echo.moveT<=0', 5, CALM);
  await advance(page, 0.5, CALM);
  await step(page, () => { const g = window.__G; for (const i of g.Q.echo.order.slice()) g.hitReson(i); });
  expect(await stage(page)).toBe('candles');
  expect(await step(page, () => window.__G.P.bless.has('knife'))).toBe(true);

  // 4. ring the chapel bell, then light the candelabras in the order the glass shows (CH.order)
  await step(page, () => { const g = window.__G; g.ringBell(); for (let k = 0; k < 4; k++) g.lightCandle(g.CH.order[k]); });
  expect(await stage(page)).toBe('ember');

  // 5. take the Saint's Ember from the altar (walk to it and use the interaction prompt)
  await step(page, () => { const g = window.__G, q = g.pickups.find(p => p.key === 'ember'); g.P.pos.set(q.x, 0, q.z); g.updateInteract(); g.curInter.o.use(); });
  expect(await stage(page)).toBe('colossus');
  expect(await step(page, () => window.__G.P.items.has('ember'))).toBe(true);

  // 6. ride the Colossus: with power on, stand where its glowing hatch foot will land
  await step(page, () => { const g = window.__G; if (!g.POWER.on) g.powerOn(); });
  await tickUntil(page, 'g.COL.feet[0].sw && g.COL.feet[0].hatch', 30, CALM);
  const rode = await step(page, () => {
    const g = window.__G, f = g.COL.feet[0];
    for (let i = 0; i < 200 && !g.P.inCabin; i++) { g.P.hp = g.P.maxHp; g.P.invuln = 5; g.P.pos.set(f.to.x, 0, f.to.z); g.P.vy = 0; g.tick(0.05); }
    return g.P.inCabin;
  });
  expect(rode, 'the hatch foot carried the player into the cabin').toBe(true);
  expect(await step(page, () => window.__G.CAB.item)).toBe('heart');

  // 7. take the Colossus Heart, drop out, build the Tempest Gauntlet at the chapel workbench
  await step(page, () => { const g = window.__G; g.takeCabin(); g.exitCabin(); });
  expect(await stage(page)).toBe('gauntlet');
  await step(page, () => window.__G.benchUse());
  expect(await stage(page)).toBe('return');
  expect(await step(page, () => window.__G.P.weapons.some(w => w.id === 'gauntlet'))).toBe(true);

  // 8. return the Rod to the Lodestone and hold the dig while it awakens (45 s near the stone, an Iron Warden arrives)
  await step(page, () => {
    const g = window.__G; g.P.pos.set(g.LODE.x, 0, g.LODE.z + 3);
    if (!g.P.weapons.some(w => w.id === 'rod' && !w.up)) g.lodeUse(); // reclaim it if the Gauntlet took its slot
    g.lodeUse();
  });
  expect(await stage(page)).toBe('awakening');
  await tickUntil(page, "g.Q.stage==='awakenReady'", 60, CALM + 'g.P.pos.set(g.LODE.x,0,g.LODE.z+3);');
  await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self'); g.lodeUse(); });
  expect(await stage(page)).toBe('wraith');
  expect(await step(page, () => window.__G.P.weapons.some(w => w.id === 'rod' && w.up))).toBe(true);

  // 9. wound the wraith three times with the Awakened Rod (it flies off between hits), then destroy the Warden it possesses
  for (let hit = 1; hit <= 3; hit++) {
    await tickUntil(page, 'g.Q.wr.moving<=0', 5, CALM);
    await step(page, () => window.__G.hitWraith({ id: 'rod', up: true }));
    expect(await step(page, () => window.__G.Q.wr.hits)).toBe(hit);
  }
  const boss = await step(page, () => { const z = window.__G.zombies.find(q => q.wraithBound && !q.dead); return z && z.id; });
  expect(boss, 'a wraith-bound Warden spawned').toBeTruthy();
  await advance(page, 1.5, KEEP_ALIVE);
  await step(page, () => { const g = window.__G, z = g.zombies.find(q => q.wraithBound && !q.dead); for (let i = 0; i < 50 && !z.dead; i++) g.hitZombie(z, z.maxHp / 8, 1, 'gun'); });
  expect(await stage(page)).toBe('felling');
  expect(await step(page, () => window.__G.P.bless.has('talisman'))).toBe(true);

  // 10. breach the Colossus's three valves with a relic weapon; it falls
  await step(page, () => { const g = window.__G; for (let i = 0; i < 3; i++) g.hitValve(i, { id: 'gauntlet', up: false }); });
  expect(await step(page, () => window.__G.COL.felled)).toBe(true);
  expect(await stage(page)).toBe('strike');

  // 11. strike the Lodestone with the Awakened Rod, then descend into the Hollow
  await step(page, () => window.__G.strikeLodestone({ id: 'rod', up: true }));
  expect(await stage(page)).toBe('descent');
  await step(page, () => window.__G.enterHollow());
  expect(await step(page, () => window.__G.mode)).toBe('hollow');

  // 12. the final wave: the Warden Prime raises two wards; shatter the lit crystals each time, then finish it
  await step(page, () => window.__G.startWave(4));
  await tickUntil(page, 'g.zombies.some(z=>z.prime&&!z.dead)', 10, KEEP_ALIVE);
  const wards = await step(page, () => {
    const g = window.__G, z = g.zombies.find(q => q.prime && !q.dead); let wards = 0;
    for (let i = 0; i < 200 && !z.dead; i++) {
      g.P.hp = g.P.maxHp; g.P.invuln = 5;
      if (z.shield) { wards++; for (const c of g.HL.lit.slice()) g.hitCrystal(c); }
      g.hitZombie(z, z.maxHp / 20, 1, 'gun');
    }
    return wards;
  });
  expect(wards).toBe(2);
  expect(await step(page, () => window.__G.HL.gateOpen)).toBe(true);

  // 13. step into the gate of light
  await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self'); const gp = g.HL.gate.getWorldPosition(g.P.pos.clone()); g.P.pos.set(gp.x, 0, gp.z + 1); g.updateInteract(); g.curInter.o.use(); });
  await expect.poll(() => step(page, () => window.__G.state)).toBe('end');
  await expect(page.locator('#over')).toBeVisible();
  await expect(page.locator('#over-eyebrow')).toHaveText(/Escaped/i);
  const rites = await page.locator('#st-rites').textContent();
  console.log('rites recorded on the victory screen:', rites);
  expect(parseInt(rites, 10)).toBeGreaterThanOrEqual(10);
  expect(errors).toEqual([]);
});
