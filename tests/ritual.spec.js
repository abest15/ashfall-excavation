// Full ritual: drives the whole main quest (the easter egg, 23 rites) to the victory screen through window.__G.
// Each step uses the same function the game calls when the player does that thing (interactions go through the
// prompt under the player, shooting a strongbox dial calls questShoot, knifing a breaker calls melee, ...), and game
// time is advanced with __G.tick so the timed stages (generator crank, binding, awakening, the supply drop, the Deep
// Hymn, the seals, the Furnace Heart rising) run for real. Solutions come from the per-game layout (seeded).
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, advance, tickUntil, KEEP_ALIVE } from './helpers.js';
import { staffBuild, staffClaim, staffUpgrade } from './staff-helpers.js';

// keep the player alive and the site from filling up while game time runs
const CALM = KEEP_ALIVE + 'for(const z of g.zombies){ if(!z.dead&&!z.boss&&!z.prime&&z.rise<=0&&Math.random()<.05) g.killZombie(z,"self"); }';
const stage = page => page.evaluate(() => window.__G.Q.stage);
const step = (page, fn, arg) => page.evaluate(fn, arg);
// stand at x,z and use whatever prompt is under the player
const useAt = (page, x, z) => step(page, ([x, z]) => { const g = window.__G; g.P.pos.set(x, 0, z); g.P.vy = 0; g.updateInteract(); const c = g.curInter; if (!c || c.t[0] === '!') return c ? c.t : null; c.o.use(); return c.t; }, [x, z]);
const takeAll = (page, key) => step(page, key => { const g = window.__G, Q = g.QUEST; let n = 0; for (const e of Q.QP.slice()) if (!key || e.key.startsWith(key)) { g.P.pos.set(e.x, 0, e.z); g.updateInteract(); e.o.use(); n++; } return n; }, key);

test('full ritual reaches the victory screen', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await advance(page, 4, KEEP_ALIVE); // round 1 begins

  // 0. power: find the three breakers, satisfy each one's requirement, throw them, crank the generator
  const brk = await step(page, () => window.__G.QUEST.PWR.brk.map(b => ({ i: b.i, type: b.type, x: b.a.x, z: b.a.z, ox: b.o.x, oz: b.o.z })));
  expect(brk.map(b => b.type).sort()).toEqual(['fuse', 'jammed', 'surge']);
  for (const b of brk) {
    await step(page, b => { const g = window.__G; g.P.pos.set(b.ox, 0, b.oz); }, b);
    await advance(page, 0.2, KEEP_ALIVE);
    expect(await step(page, i => window.__G.QUEST.PWR.brk[i].found, b.i)).toBe(true);
    if (b.type === 'jammed') { // five knife blows in quick succession
      for (let k = 0; k < 5; k++) {
        await step(page, b => { const g = window.__G; g.P.pos.set(b.ox, 0, b.oz); g.P.yaw = Math.atan2(-(b.x - b.ox), -(b.z - b.oz)); g.melee(); }, b);
        await advance(page, 0.7, KEEP_ALIVE);
      }
      expect(await step(page, i => window.__G.QUEST.PWR.brk[i].whacks, b.i)).toBe(5);
    }
    if (b.type === 'fuse') { // the fuse is in one of the supply crates
      const c = await step(page, () => { const Q = window.__G.QUEST; return Q.QA.fuse[Q.PWR.fuseAt]; });
      expect(await useAt(page, c.x, c.z)).toMatch(/Search the supply crate/);
      expect(await takeAll(page, 'fuse')).toBe(1);
      expect(await useAt(page, b.ox, b.oz)).toMatch(/Seat the fuse/);
    }
    expect(await useAt(page, b.ox, b.oz)).toMatch(/Throw the breaker/);
    expect(await step(page, i => window.__G.QUEST.PWR.brk[i].thrown, b.i)).toBe(true);
  }
  await step(page, () => { const g = window.__G, a = g.QUEST.QA.generator.use; g.P.pos.set(a.x, 0, a.z); g.updateInteract(); g.keys.KeyE = true; });
  await tickUntil(page, 'g.POWER.on', 8, CALM + 'const a=g.QUEST.QA.generator.use; g.P.pos.set(a.x,0,a.z); g.updateInteract();');
  await step(page, () => { window.__G.keys.KeyE = false; });
  expect(await step(page, () => window.__G.Q.rites)).toBe(1);

  // 1. the three Rod fragments (dig mound, field locker, the marked zombie), then set them in the Lodestone
  await step(page, () => { const g = window.__G; Object.assign(g.Q.frag, { dig: true, locker: true, marked: true }); g.lodeUse(); });
  expect(await stage(page)).toBe('assembling');
  await tickUntil(page, "g.Q.stage==='rodReady'", 10, CALM);
  await step(page, () => window.__G.lodeUse());
  expect(await stage(page)).toBe('stones');

  // 2. feed the three waystones (12 kills near each) and strike them with the Rod
  await step(page, () => { const g = window.__G; g.Q.stones.forEach(s => { s.kills = 12; s.fed = true; }); g.Q.stones.forEach((s, i) => g.strikeStone(i)); });
  expect(await stage(page)).toBe('echoes');

  // 3. the resonators: low to high, then (after they move) high to low
  await step(page, () => { const g = window.__G; for (const i of g.Q.echo.order.slice()) g.hitReson(i); });
  await tickUntil(page, 'g.Q.echo.moveT<=0', 5, CALM);
  await advance(page, 0.5, CALM);
  await step(page, () => { const g = window.__G; for (const i of g.Q.echo.order.slice()) g.hitReson(i); });
  expect(await stage(page)).toBe('valves');

  // 4. the pressure manifold: set wheels A B C to the chalkboard gauges, pull the release lever
  const valve = await step(page, () => { const Q = window.__G.QUEST; return { tgt: Q.VAL.tgt.slice() }; });
  for (let i = 0; i < 3; i++) await step(page, ([i, t]) => { const Q = window.__G.QUEST; for (let k = 0; k < 6 && Q.VAL.set[i] !== t; k++) Q.qAct('valve', i); }, [i, valve.tgt[i]]);
  await step(page, () => window.__G.QUEST.qAct('vrel'));
  expect(await stage(page)).toBe('candles');
  expect(await takeAll(page, 'shard1')).toBe(1);

  // 5. ring the chapel bell, then light the candelabras in the order the glass shows (CH.order); take the Ember
  await step(page, () => { const g = window.__G; g.ringBell(); for (let k = 0; k < 4; k++) g.lightCandle(g.CH.order[k]); });
  expect(await stage(page)).toBe('ember');
  await step(page, () => { const g = window.__G, q = g.pickups.find(p => p.key === 'ember'); g.P.pos.set(q.x, 0, q.z); g.updateInteract(); g.curInter.o.use(); });
  expect(await stage(page)).toBe('colossus');

  // 6. ride the Colossus: stand where its glowing hatch foot will land; take the Heart; build the Gauntlet
  await tickUntil(page, 'g.COL.feet[0].sw && g.COL.feet[0].hatch', 30, CALM);
  const rode = await step(page, () => {
    const g = window.__G, f = g.COL.feet[0];
    for (let i = 0; i < 200 && !g.P.inCabin; i++) { g.P.hp = g.P.maxHp; g.P.invuln = 5; g.P.pos.set(f.to.x, 0, f.to.z); g.P.vy = 0; g.tick(0.05); }
    return g.P.inCabin;
  });
  expect(rode, 'the hatch foot carried the player into the cabin').toBe(true);
  await step(page, () => { const g = window.__G; g.takeCabin(); g.exitCabin(); });
  expect(await stage(page)).toBe('gauntlet');
  await step(page, () => window.__G.benchUse());
  expect(await stage(page)).toBe('radio');

  // 7. the field radio: Shriekers drop three dog tags; transmit each tag's frequency in order; open the supply drop
  for (let n = 1; n <= 3; n++) {
    await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead && !z.boss) g.killZombie(z, 'self', true); });
    // (a stray blast may kill the Shrieker first; its tag drops all the same)
    await tickUntil(page, "g.QUEST.QP.some(e=>e.key.startsWith('tag'))||g.zombies.some(z=>z.kind==='shrieker'&&!z.dead&&z.rise<=0)", 40, CALM.replace('!z.boss', "!z.boss&&z.kind!=='shrieker'"));
    await step(page, () => { const g = window.__G, z = g.zombies.find(q => q.kind === 'shrieker' && !q.dead); if (z && !g.QUEST.QP.some(e => e.key.startsWith('tag'))) g.killZombie(z, 'head'); });
    expect(await takeAll(page, 'tag')).toBe(1);
  }
  for (let k = 0; k < 3; k++) {
    await step(page, k => { const Q = window.__G.QUEST; for (let i = 0; i < 8 && Q.RAD.dial !== Q.RAD.freqs[k]; i++) Q.qAct('dial'); Q.qAct('tx'); }, k);
    expect(await step(page, () => window.__G.QUEST.RAD.seq)).toBe(k + 1);
    await advance(page, 1.3, CALM);
  }
  await tickUntil(page, 'g.QUEST.RAD.drop && g.QUEST.RAD.drop.y<=0', 10, CALM);
  const drop = await step(page, () => window.__G.QUEST.RAD.drop);
  expect(await useAt(page, drop.x, drop.z)).toMatch(/supply drop/);
  expect(await step(page, () => window.__G.P.drum)).toBe(true);
  expect(await stage(page)).toBe('return');
  expect(await takeAll(page, 'shard2')).toBe(1);

  // 8. return the Rod to the Lodestone and hold the dig while it awakens
  await step(page, () => {
    const g = window.__G; g.P.pos.set(g.LODE.x, 0, g.LODE.z + 3);
    if (!g.P.weapons.some(w => w.id === 'rod' && !w.up)) g.lodeUse();
    g.lodeUse();
  });
  expect(await stage(page)).toBe('awakening');
  await tickUntil(page, "g.Q.stage==='awakenReady'", 60, CALM + 'g.P.pos.set(g.LODE.x,0,g.LODE.z+3);');
  await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self'); g.lodeUse(); });
  expect(await stage(page)).toBe('wraith');

  // 9. the wraith: three wounds with the Awakened Rod, then the Warden it possesses
  for (let hit = 1; hit <= 3; hit++) {
    await tickUntil(page, 'g.Q.wr.moving<=0', 5, CALM);
    await step(page, () => window.__G.hitWraith({ id: 'rod', up: true }));
  }
  await advance(page, 1.5, KEEP_ALIVE);
  await step(page, () => { const g = window.__G, z = g.zombies.find(q => q.wraithBound && !q.dead); for (let i = 0; i < 50 && !z.dead; i++) g.hitZombie(z, z.maxHp / 8, 1, 'gun'); });
  expect(await stage(page)).toBe('gravecaller');

  // 10. the Gravecaller (mid-quest boss): it wards itself twice; shoot the three grave lanterns each time
  await tickUntil(page, 'g.zombies.some(z=>z.gravecaller&&!z.dead&&z.rise<=0)', 15, CALM);
  const wards = await step(page, () => {
    const g = window.__G, Q = g.QUEST, z = g.zombies.find(q => q.gravecaller && !q.dead); let wards = 0;
    for (let i = 0; i < 400 && !z.dead; i++) {
      g.P.hp = g.P.maxHp; g.P.invuln = 5;
      if (z.shield) { wards++; for (let k = 0; k < 3; k++) Q.questShoot('gl' + k, { id: 'pistol', up: false }); }
      g.hitZombie(z, z.maxHp / 25, 1, 'gun'); g.tick(0.05);
    }
    return wards;
  });
  expect(wards).toBe(2);
  expect(await stage(page)).toBe('felling');
  expect(await step(page, () => window.__G.Q.tonicOpen)).toBe(true);

  // 11. breach the Colossus's three valves; strike the Lodestone with the Awakened Rod
  await step(page, () => { const g = window.__G; for (let i = 0; i < 3; i++) g.hitValve(i, { id: 'gauntlet', up: false }); });
  expect(await stage(page)).toBe('strike');
  await step(page, () => window.__G.strikeLodestone({ id: 'rod', up: true }));
  expect(await stage(page)).toBe('glyphs');

  // 12. the glyph strongbox: shoot each dial to its glyph's tally count, then try the lid
  await step(page, () => { const g = window.__G, G = g.QUEST.GLY; for (let k = 0; k < 4; k++) { for (let n = 0; n < 6 && G.dials[k] !== G.tally[G.order[k]]; n++) { g.QUEST.questShoot('gd' + k, { id: 'pistol' }); g.tick(0.3); } } });
  const lb = await step(page, () => { const Q = window.__G.QUEST, a = Q.QA.lockbox; return { x: a.x + Math.sin(a.ry) * 1.5, z: a.z + Math.cos(a.ry) * 1.5 }; });
  expect(await useAt(page, lb.x, lb.z)).toMatch(/strongbox/);
  expect(await stage(page)).toBe('souls');
  expect(await takeAll(page, 'vkey') + await takeAll(page, 'shard3')).toBe(2); // the vault key and the last record shard

  // 13. soul canisters: kill the dead inside the chalk ward, three canisters
  for (let c = 0; c < 3; c++) {
    await step(page, () => { const g = window.__G, S = g.QUEST.SOUL, a = S.g.position; const need = S.need - S.n;
      for (let k = 0; k < need; k++) { const z = g.spawnZombie('walker'); z.g.position.set(a.x + 1, 0, a.z); z.rise = 0; g.killZombie(z, 'body'); } });
  }
  expect(await stage(page)).toBe('braziers');

  // 14. wind the music box, light the braziers in the order it plays
  await step(page, () => { const Q = window.__G.QUEST; Q.qAct('wind'); for (const i of Q.BRZ.order) Q.qAct('brz', i); });
  expect(await stage(page)).toBe('descent');

  // 14b. the four elemental staffs: solo builds every one (its parts, its binding) and upgrades each in turn
  for (const k of ['cinder', 'brine', 'grave', 'gale']) {
    await staffBuild(page, k);
    await staffClaim(page, k);
    await advance(page, .6, CALM);
    await staffUpgrade(page, k);
  }
  expect(await step(page, () => window.__G.QUEST.STAFF_IDS.every(k => window.__G.QUEST.STF[k].up))).toBe(true);

  // 15. the Hollow: the Warden Prime raises two wards; shatter the lit crystals each time; step into the gate
  await step(page, () => window.__G.enterHollow());
  await step(page, () => window.__G.startWave(4));
  await tickUntil(page, 'g.zombies.some(z=>z.prime&&!z.dead)', 10, KEEP_ALIVE);
  await step(page, () => {
    const g = window.__G, z = g.zombies.find(q => q.prime && !q.dead);
    for (let i = 0; i < 200 && !z.dead; i++) { g.P.hp = g.P.maxHp; g.P.invuln = 5; if (z.shield) for (const c of g.HL.lit.slice()) g.hitCrystal(c); g.hitZombie(z, z.maxHp / 20, 1, 'gun'); }
  });
  expect(await step(page, () => window.__G.HL.gateOpen)).toBe(true);
  await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self'); const gp = g.HL.gate.getWorldPosition(g.P.pos.clone()); g.P.pos.set(gp.x, 0, gp.z + 1); g.updateInteract(); g.curInter.o.use(); });
  expect(await stage(page)).toBe('vault');
  expect(await step(page, () => window.__G.mode)).toBe('main');

  // 16. the Deep Vault: play the Deep Hymn on the gramophone, unlock the door with the key and the lantern
  const V = await step(page, () => window.__G.QUEST.QA.vault);
  expect(await useAt(page, V.gramophone.x, V.gramophone.z + 1.1)).toMatch(/record shards/);
  await tickUntil(page, 'g.QUEST.VSTATE.hymn', 10, CALM);
  // set all four upgraded staffs in the door, one at a time (a solo player carries one)
  for (const k of ['cinder', 'brine', 'grave', 'gale']) {
    await staffClaim(page, k);
    expect(await useAt(page, V.door.x, V.door.z + 3.4)).toMatch(/Set the .* Staff in the vault door/);
  }
  expect(await step(page, () => window.__G.QUEST.STAFF_IDS.every(k => window.__G.QUEST.STF[k].placed))).toBe(true);
  expect(await useAt(page, V.door.x, V.door.z + 3.4)).toMatch(/Unlock the Deep Vault/);
  expect(await stage(page)).toBe('seals');

  // 17. hold the three seal plates
  for (const s of V.seals) await advance(page, 12.3, CALM + `g.P.pos.set(${s.x},0,${s.z});`);
  expect(await stage(page)).toBe('furnace');

  // 18. break the Furnace Heart, then ride the lift out
  await advance(page, 3.2, CALM);
  await step(page, () => { const g = window.__G, Q = g.QUEST; for (let i = 0; i < 200 && g.Q.stage === 'furnace'; i++) { Q.heartShot({ id: 'rod', up: true }); g.P.hp = g.P.maxHp; g.tick(0.05); } });
  expect(await stage(page)).toBe('escape');
  expect(await useAt(page, V.exit.x, V.exit.z)).toMatch(/Ride the lift/);

  await expect.poll(() => step(page, () => window.__G.state)).toBe('end');
  await expect(page.locator('#ending')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('ending.png') });
  await step(page, () => window.__G.QUEST.skipEnding());
  await expect(page.locator('#over')).toBeVisible();
  await expect(page.locator('#over-eyebrow')).toHaveText(/Escaped/i);
  const rites = await page.locator('#st-rites').textContent();
  console.log('rites recorded on the victory screen:', rites);
  expect(rites).toBe('23/23');
  expect(errors).toEqual([]);
});
