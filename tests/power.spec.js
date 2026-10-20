// Power restoration: three breaker switches on random (seeded) anchors, each with its own requirement, then the
// generator is cranked by holding E. Covers placement, every requirement, the generator start and co-op sync.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo, advance, KEEP_ALIVE, hostAndJoin } from './helpers.js';

const step = (page, fn, arg) => page.evaluate(fn, arg);
const useAt = (page, x, z, y = 0) => step(page, ([x, z, y]) => { const g = window.__G; g.P.pos.set(x, y, z); g.P.vy = 0; g.updateInteract(); const c = g.curInter; if (!c || c.t[0] === '!') return c ? c.t : null; c.o.use(); return c.t; }, [x, z, y]);
const brkOf = (page, type) => step(page, type => { const b = window.__G.QUEST.PWR.brk.find(q => q.type === type); return { i: b.i, x: b.a.x, y: b.a.y || 0, z: b.a.z, ox: b.o.x, oz: b.o.z }; }, type);

test('breakers: random placement, each requirement, generator crank', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await openGame(page);
  await toMainMenu(page);
  await startSolo(page);
  await advance(page, 1, KEEP_ALIVE);

  // placement: three anchors in three different zones, one of each type; the same seed gives the same layout
  const layouts = await step(page, () => {
    const g = window.__G, Q = g.QUEST, out = [];
    for (const seed of [11, 222, 3333, 44444, 555555, 11]) { Q.questLayout(seed); out.push(Q.PWR.brk.map(b => b.a.id + ':' + b.type + ':' + b.a.zone)); }
    return out;
  });
  for (const l of layouts) {
    expect(new Set(l.map(s => s.split(':')[2])).size).toBe(3);
    expect(l.map(s => s.split(':')[1]).sort()).toEqual(['fuse', 'jammed', 'surge']);
  }
  expect(layouts[5]).toEqual(layouts[0]);
  expect(new Set(layouts.slice(0, 5).map(l => l.join('|'))).size).toBeGreaterThan(2);
  expect(await step(page, () => window.__G.QUEST.QA.power.length)).toBeGreaterThanOrEqual(9);
  await step(page, () => window.__G.QUEST.questLayout(4242));

  // the generator is dead until all three breakers are thrown
  const gen = await step(page, () => window.__G.QUEST.QA.generator.use);
  expect(await useAt(page, gen.x, gen.z)).toMatch(/generator is dead\. Breakers thrown 0\/3/);
  await step(page, () => window.__G.QUEST.qAct('gen'));
  expect(await step(page, () => window.__G.POWER.on)).toBe(false);

  // breakers are found by walking near them (journal and banner)
  const j0 = await step(page, () => window.__G.QUEST.journal().l.map(x => x[1]).join(' | '));
  expect(j0).toMatch(/breakers found 0\/3 · thrown 0\/3/);
  for (const type of ['jammed', 'fuse', 'surge']) { const b = await brkOf(page, type); await step(page, b => { window.__G.P.pos.set(b.ox, b.y, b.oz); window.__G.P.vy = 0; }, b); await advance(page, 0.2, KEEP_ALIVE); }
  expect(await step(page, () => window.__G.QUEST.PWR.brk.every(b => b.found))).toBe(true);
  expect(await step(page, () => window.__G.QUEST.journal().l.map(x => x[1]).join(' | '))).toMatch(/breakers found 3\/3/);

  // jammed: refuses to throw, knife blows too far apart reset, five quick blows loosen it
  const J = await brkOf(page, 'jammed');
  expect(await useAt(page, J.ox, J.oz, J.y)).toMatch(/rusted solid/);
  const whack = () => step(page, b => { const g = window.__G; g.P.pos.set(b.ox, b.y, b.oz); g.P.vy = 0; g.P.yaw = Math.atan2(-(b.x - b.ox), -(b.z - b.oz)); g.melee(); }, J);
  await whack(); await advance(page, 0.7, KEEP_ALIVE); await whack();
  expect(await step(page, i => window.__G.QUEST.PWR.brk[i].whacks, J.i)).toBe(2);
  await advance(page, 3, KEEP_ALIVE); await whack();
  expect(await step(page, i => window.__G.QUEST.PWR.brk[i].whacks, J.i)).toBe(1); // seized up again
  for (let k = 0; k < 4; k++) { await advance(page, 0.7, KEEP_ALIVE); await whack(); }
  expect(await step(page, i => window.__G.QUEST.PWR.brk[i].whacks, J.i)).toBe(5);
  expect(await useAt(page, J.ox, J.oz, J.y)).toMatch(/Throw the breaker/);

  // fuse: no fuse, no throw; the fuse crate holds it (other crates do not); seat it, then throw
  const F = await brkOf(page, 'fuse');
  expect(await useAt(page, F.ox, F.oz, F.y)).toMatch(/fuse holder is empty/);
  const crates = await step(page, () => { const Q = window.__G.QUEST; return { at: Q.PWR.fuseAt, list: Q.QA.fuse }; });
  const other = crates.list.find((c, i) => i !== crates.at);
  expect(await useAt(page, other.x, other.z)).toMatch(/Search the supply crate/);
  expect(await step(page, () => window.__G.QUEST.QP.some(e => e.key === 'fuse'))).toBe(false);
  const fc = crates.list[crates.at];
  expect(await useAt(page, fc.x, fc.z)).toMatch(/Search the supply crate/);
  const fuse = await step(page, () => { const e = window.__G.QUEST.QP.find(e => e.key === 'fuse'); return e && { x: e.x, z: e.z }; });
  expect(fuse).toBeTruthy();
  expect(await useAt(page, fuse.x, fuse.z)).toMatch(/Take the breaker fuse/);
  expect(await step(page, () => window.__G.QUEST.QI.has('fuse'))).toBe(true);
  expect(await useAt(page, F.ox, F.oz, F.y)).toMatch(/Seat the fuse/);
  expect(await useAt(page, F.ox, F.oz, F.y)).toMatch(/Throw the breaker/);

  // surge: throwing it calls a horde
  const S = await brkOf(page, 'surge');
  await step(page, () => { const g = window.__G; for (const z of g.zombies) if (!z.dead) g.killZombie(z, 'self', true); g.R.inBreak = true; g.R.breakT = 1e9; });
  expect(await useAt(page, S.ox, S.oz, S.y)).toMatch(/Throw the breaker/);
  expect(await step(page, () => window.__G.QUEST.PWR.surge)).toBeGreaterThan(4);
  await advance(page, 2, KEEP_ALIVE);
  expect(await step(page, () => window.__G.zombies.filter(z => !z.dead).length)).toBeGreaterThan(2);
  expect(await step(page, () => window.__G.QUEST.PWR.brk.every(b => b.thrown))).toBe(true);
  expect(await step(page, () => window.__G.POWER.on)).toBe(false);

  // generator: a short crank does nothing, a full three-second hold starts it (and calls the dead)
  await step(page, g => { const G = window.__G, a = G.QUEST.QA.generator.use; G.P.pos.set(a.x, 0, a.z); G.updateInteract(); G.keys.KeyE = true; });
  await advance(page, 1.2, KEEP_ALIVE + 'const a=g.QUEST.QA.generator.use; g.P.pos.set(a.x,0,a.z);');
  await step(page, () => { window.__G.keys.KeyE = false; });
  expect(await step(page, () => window.__G.QUEST.PWR.genSurge)).toBe(true);
  await advance(page, 1.5, KEEP_ALIVE);
  expect(await step(page, () => window.__G.POWER.on)).toBe(false);
  expect(await step(page, () => window.__G.QUEST.PWR.crank)).toBe(0);
  await step(page, () => { window.__G.keys.KeyE = true; });
  await advance(page, 3.3, KEEP_ALIVE + 'const a=g.QUEST.QA.generator.use; g.P.pos.set(a.x,0,a.z);');
  await step(page, () => { window.__G.keys.KeyE = false; });
  expect(await step(page, () => window.__G.POWER.on)).toBe(true);
  expect(await step(page, () => window.__G.Q.rites)).toBe(1);
  expect(errors).toEqual([]);
});

test('breakers in co-op: same layout on both machines, a client throws and cranks', async ({ context }) => {
  test.setTimeout(300_000);
  const { host, client, hostErrors, clientErrors } = await hostAndJoin(context);
  const pump = async (n = 4) => { for (const p of [host, client]) await p.evaluate(([keep, n]) => { const g = window.__G, f = new Function('g', keep); for (let i = 0; i < n; i++) { f(g); g.tick(0.05); } }, [KEEP_ALIVE, n]); await host.waitForTimeout(40); };
  const lay = p => p.evaluate(() => window.__G.QUEST.PWR.brk.map(b => b.a && [b.a.id, b.type]));
  await expect.poll(async () => { await pump(); return JSON.stringify(await lay(client)); }, { timeout: 60_000 }).toBe(JSON.stringify(await lay(host)));
  expect(await client.evaluate(() => window.__G.Q.seed)).toBe(await host.evaluate(() => window.__G.Q.seed));

  // the host loosens and seats; the client throws the breakers through its own prompts (sent to the host)
  await host.evaluate(() => { const Q = window.__G.QUEST; for (const b of Q.PWR.brk) { b.found = true; if (b.type === 'jammed') b.whacks = 5; if (b.type === 'fuse') b.fused = true; } window.__G.R.inBreak = true; window.__G.R.breakT = 1e9; });
  await pump();
  for (let i = 0; i < 3; i++) {
    const t = await client.evaluate(i => { const g = window.__G, b = g.QUEST.PWR.brk[i]; g.P.pos.set(b.o.x, b.o.y || 0, b.o.z); g.P.vy = 0; g.updateInteract(); const c = g.curInter; if (c && c.t[0] !== '!') c.o.use(); return c && c.t; }, i);
    expect(t).toMatch(/Throw the breaker/);
    await expect.poll(async () => { await pump(); return host.evaluate(i => window.__G.QUEST.PWR.brk[i].thrown, i); }, { timeout: 30_000 }).toBe(true);
  }
  await expect.poll(async () => { await pump(); return client.evaluate(() => window.__G.QUEST.PWR.brk.every(b => b.thrown)); }, { timeout: 30_000 }).toBe(true);

  // the client holds E at the generator; power comes on for both
  await client.evaluate(() => { const g = window.__G, a = g.QUEST.QA.generator.use; g.P.pos.set(a.x, 0, a.z); g.updateInteract(); g.keys.KeyE = true; });
  await expect.poll(async () => { await client.evaluate(() => { const g = window.__G, a = g.QUEST.QA.generator.use; g.P.pos.set(a.x, 0, a.z); }); await pump(8); return host.evaluate(() => window.__G.POWER.on); }, { timeout: 60_000 }).toBe(true);
  await client.evaluate(() => { window.__G.keys.KeyE = false; });
  await expect.poll(async () => { await pump(); return client.evaluate(() => window.__G.POWER.on); }, { timeout: 30_000 }).toBe(true);
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
});
