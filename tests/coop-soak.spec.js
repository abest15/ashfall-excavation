// Co-op soak: host + client over ?net=local play through rounds 1 to 3. The host kills even-numbered zombies,
// the client kills odd-numbered ones (its hits go to the host). At regular checkpoints both must agree on the
// round number and on exactly which zombies are alive, and neither page may log an error.
import { test, expect } from '@playwright/test';
import { hostAndJoin, KEEP_ALIVE } from './helpers.js';

test('co-op soak: three rounds in sync', async ({ context }) => {
  test.setTimeout(600_000);
  const { host, client, hostErrors, clientErrors } = await hostAndJoin(context);

  // one step: both sides advance a little game time and each kills its share of the risen zombies
  const step = async () => {
    await host.evaluate(keep => {
      const g = window.__G, f = new Function('g', keep);
      for (let i = 0; i < 6; i++) { f(g); g.tick(0.05); }
      const z = g.zombies.find(q => !q.dead && q.rise <= 0 && q.id % 2 === 0); if (z) g.hitZombie(z, 1e6, 1, 'gun');
    }, KEEP_ALIVE);
    await client.evaluate(keep => {
      const g = window.__G, f = new Function('g', keep);
      for (let i = 0; i < 2; i++) { f(g); g.tick(0.05); }
      const z = g.zombies.find(q => !q.dead && q.id % 2 === 1); if (z) g.hitZombie(z, 1e6, 1, 'gun');
    }, KEEP_ALIVE);
    await host.waitForTimeout(40);
  };
  // checkpoint: the host sends a snapshot of exactly its current state; compare once it has arrived
  const checkpoint = async () => {
    const h = await host.evaluate(() => { const g = window.__G; g.NET.sendT = 0; g.tick(0.001); return { round: g.R.n, alive: g.zombies.filter(z => !z.dead).map(z => z.id).sort((a, b) => a - b), kills: g.P.kills }; });
    await host.waitForTimeout(250);
    const c = await client.evaluate(() => { const g = window.__G; return { round: g.R.n, alive: g.zombies.filter(z => !z.dead && !z.gone).map(z => z.id).sort((a, b) => a - b), kills: g.P.kills, role: g.NET.role }; });
    return { h, c };
  };

  let checks = 0, sawZombies = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 480_000) {
    for (let i = 0; i < 10; i++) await step();
    const { h, c } = await checkpoint();
    checks++; if (h.alive.length) sawZombies++;
    expect(c.role, 'client still connected').toBe('client');
    expect(c.round, `round number agrees (check ${checks})`).toBe(h.round);
    expect(c.alive, `alive zombie ids agree in round ${h.round} (check ${checks})`).toEqual(h.alive);
    if (h.round >= 4) break;
  }
  const final = await checkpoint();
  console.log(`co-op soak: ${checks} checkpoints, ${sawZombies} with zombies alive; round ${final.h.round}; kills host ${final.h.kills}, client ${final.c.kills}`);
  expect(final.h.round, 'reached round 4 (rounds 1-3 cleared)').toBeGreaterThanOrEqual(4);
  expect(sawZombies).toBeGreaterThan(3);
  expect(final.c.kills, 'client kills are credited to the client').toBeGreaterThan(5);
  expect(final.h.kills).toBeGreaterThan(5);
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
});
