// The four elemental staffs: each has its own parts, binding and upgrade trial, and its own fire and alt-fire.
// Builds and upgrades one staff through its real tasks, checks all four are distinct, and claims one in co-op.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, advance, KEEP_ALIVE, hostAndJoin } from './helpers.js';
import { staffBuild, staffClaim, staffUpgrade } from './staff-helpers.js';

const step = (page, fn, arg) => page.evaluate(fn, arg);

test('staffs: build and upgrade the Cinder Staff; all four are distinct', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await advance(page, 1, KEEP_ALIVE);
  await step(page, () => { const g = window.__G; g.powerOn(); g.R.inBreak = true; g.R.breakT = 1e9; });

  // four staffs, four different elements: names, beam colours, sounds, fire patterns and alt-fires all differ
  const defs = await step(page, () => window.__G.QUEST.STAFF_IDS.slice());
  const info = await step(page, () => { const Q = window.__G.QUEST; return Q.STAFF_IDS.map(k => ({ k, parts: Q.STAFF_PARTS[k].map(p => p.how + ':' + (p.kind || '')).join(','), seq: Q.STQ[k].length })); });
  expect(defs).toEqual(['cinder', 'brine', 'grave', 'gale']);
  expect(new Set(info.map(i => i.parts)).size).toBe(4); // every staff's three part tasks differ
  for (const i of info) expect(i.parts.split(',').map(p => p.split(':')[0]).sort()).toEqual(['drop', i.k === 'cinder' || i.k === 'gale' ? 'zone' : 'hold', 'seq'].sort());
  const pedPrompt = await step(page, () => window.__G.QUEST.pedPrompt('cinder'));
  expect(pedPrompt).toMatch(/Cinder Staff · parts 0\/3/);

  // a wrong order in the part puzzle resets it and wakes the dead
  await step(page, () => { const Q = window.__G.QUEST, S = Q.STF.cinder; const wrong = S.seqOrder[1]; Q.questShoot('st_cinder_' + wrong, { id: 'pistol' }); });
  expect(await step(page, () => window.__G.QUEST.STF.cinder.seq.length)).toBe(0);

  // build: Sapper drop, ember puzzle, fuel-trench kills; bind at the pedestal (needs power)
  await staffBuild(page, 'cinder');
  expect(await step(page, () => window.__G.QUEST.STF.cinder.built)).toBe(true);
  await staffClaim(page, 'cinder');
  expect(await step(page, () => window.__G.curW().id)).toBe('cinder');
  expect(await step(page, () => window.__G.QUEST.STF.cinder.owner)).toBe('h');
  await advance(page, .6, KEEP_ALIVE); // the staff comes up

  // primary fire leaves a slag pool; alt-fire (aim + fire) is the Slag Geyser and costs three charges
  const before = await step(page, () => { const g = window.__G; g.P.pos.set(0, 0, 44); g.P.yaw = 0; g.P.pitch = -.3; g.P.ads = 0; const w = g.curW(); w.next = 0; g.setTrig(true); g.fire(); return { mag: w.mag }; });
  await advance(page, .1, KEEP_ALIVE);
  expect(await step(page, () => window.__G.QUEST.SFX_LIVE.some(e => e.kind === 'slag'))).toBe(true);
  const alt = await step(page, () => { const g = window.__G, w = g.curW(); w.next = 0; g.P.ads = 1; g.setTrig(true); const m0 = w.mag; g.fire(); g.P.ads = 0; return m0 - w.mag; });
  expect(alt).toBe(3);
  expect(before.mag).toBeGreaterThan(0);

  // upgrade trial: twelve dead die in its slag
  await staffUpgrade(page, 'cinder');
  expect(await step(page, () => { const g = window.__G; return g.curW().id === 'cinder' && g.curW().up && g.QUEST.STF.cinder.up; })).toBe(true);

  // the other three: each alt-fire does something different (Undertow pushes, Soul Harvest heals, Glass Cyclone pulls)
  const fx = await step(page, () => {
    const g = window.__G, Q = g.QUEST, out = {};
    const at = (x, z) => { const q = g.spawnZombie('walker'); q.g.position.set(x, 0, z); q.rise = 0; q.win = null; q.wstate = null; q.hp = 1e5; q.maxHp = 1e5; q.speed = 0; return q; };
    g.P.pos.set(0, 0, 40);
    let z = at(2, 40); Q.qAct('stfx', ['brine', 0, 1, 0, 40, []]); out.brinePush = +(z.g.position.x - 2).toFixed(2); g.killZombie(z, 'self', true);
    g.P.hp = 20; z = at(0, 36); z.hp = 1; Q.qAct('stfx', ['grave', 0, 1, 0, 36, []]); out.graveHeal = g.P.hp > 20;
    z = at(4, 36); const d0 = Math.hypot(z.g.position.x - 1, z.g.position.z - 36); Q.qAct('stfx', ['gale', 0, 1, 1, 36, []]);
    for (let i = 0; i < 10; i++) g.tick(0.05); out.galePull = d0 - Math.hypot(z.g.position.x - 1, z.g.position.z - 36); out.cyclone = Q.SFX_LIVE.some(e => e.kind === 'cyclone');
    return out; });
  expect(fx.brinePush).toBeGreaterThan(2);
  expect(fx.graveHeal).toBe(true);
  expect(fx.galePull).toBeGreaterThan(.5);
  expect(fx.cyclone).toBe(true);
  // swap: claiming another built staff puts the carried one back on its pedestal (solo carries one)
  await step(page, () => { const Q = window.__G.QUEST; Q.STF.gale.built = true; });
  await staffClaim(page, 'gale');
  expect(await step(page, () => { const g = window.__G; return { cur: g.curW().id, cinder: g.P.weapons.some(w => w.id === 'cinder'), owner: g.QUEST.STF.cinder.owner }; })).toEqual({ cur: 'gale', cinder: false, owner: null });
  expect(errors).toEqual([]);
});

test('staffs in co-op: a client claims and fires its own staff', async ({ context }) => {
  test.setTimeout(300_000);
  const { host, client, hostErrors, clientErrors } = await hostAndJoin(context);
  const pump = async (n = 4) => { for (const p of [host, client]) await p.evaluate(([keep, n]) => { const g = window.__G, f = new Function('g', keep); for (let i = 0; i < n; i++) { f(g); g.tick(0.05); } }, [KEEP_ALIVE, n]); await host.waitForTimeout(40); };
  await host.evaluate(() => { const g = window.__G; g.powerOn(); g.R.inBreak = true; g.R.breakT = 1e9; for (const k of ['brine', 'grave']) g.QUEST.STF[k].built = true; });
  await expect.poll(async () => { await pump(); return client.evaluate(() => window.__G.QUEST.STF.brine.built); }, { timeout: 30_000 }).toBe(true);

  // the client takes the Brine Staff at its pedestal prompt; the host records the claim and the client holds it
  const t = await client.evaluate(() => { const g = window.__G, pd = g.QUEST.PED[1]; g.P.pos.set(pd.o.x, 0, pd.o.z); g.updateInteract(); const c = g.curInter; if (c && c.t[0] !== '!') c.o.use(); return c && c.t; });
  expect(t).toMatch(/Take the Brine Staff/);
  await expect.poll(async () => { await pump(); return host.evaluate(() => window.__G.QUEST.STF.brine.owner); }, { timeout: 30_000 }).toBe('p2');
  await expect.poll(async () => { await pump(); return client.evaluate(() => window.__G.P.weapons.some(w => w.id === 'brine')); }, { timeout: 30_000 }).toBe(true);
  // the host sees it is taken, and takes the Grave Staff for itself
  expect(await host.evaluate(() => window.__G.QUEST.pedPrompt('brine'))).toMatch(/carries the Brine Staff/);
  await host.evaluate(() => window.__G.QUEST.qAct('ped', ['grave', 0]));
  expect(await host.evaluate(() => window.__G.curW().id)).toBe('grave');

  // the client's alt-fire (Undertow) runs on the host and pushes the host's zombie
  const zid = await host.evaluate(() => { const g = window.__G, z = g.spawnZombie('walker'); z.rise = 0; z.win = null; z.wstate = null; z.speed = 0; z.hp = 1e5; z.maxHp = 1e5; return z.id; });
  await host.evaluate(([id]) => { const g = window.__G, z = g.zombies.find(q => q.id === id); z.g.position.set(0, 0, 40); }, [zid]);
  await expect.poll(async () => { await pump(); return client.evaluate(id => window.__G.zombies.some(z => z.id === id), zid); }, { timeout: 30_000 }).toBe(true);
  const x0 = await host.evaluate(id => window.__G.zombies.find(q => q.id === id).g.position.z, zid);
  await client.evaluate(() => { const g = window.__G; g.P.pos.set(0, 0, 42.5); g.P.yaw = 0; g.P.pitch = 0; const i = g.P.weapons.findIndex(w => w.id === 'brine'); g.P.cur = i; const w = g.curW(); w.next = 0; w.mag = 16; g.P.ads = 1; g.setTrig(true); g.fire(); g.P.ads = 0; });
  await expect.poll(async () => { await client.evaluate(() => window.__G.P.pos.set(0, 0, 42.5)); await pump(); return host.evaluate(([id, z0]) => Math.abs(window.__G.zombies.find(q => q.id === id).g.position.z - z0), [zid, x0]); }, { timeout: 30_000 }).toBeGreaterThan(1.5);
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
});
