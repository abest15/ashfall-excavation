// Co-op soak: host + client over ?net=local play through rounds 1 to 3. The host kills even-numbered zombies,
// the client kills odd-numbered ones (its hits go to the host). At regular checkpoints both must agree on the
// round number and on exactly which zombies are alive, and neither page may log an error.
// (The comparison freezes the host's own loop for a moment so it compares one snapshot, not a moving target.)
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
  // checkpoint. Both pages keep running their own animation loops, so a naive "read host, then read client"
  // races: the host keeps ticking (spawning, sending newer snapshots) and the client's forwarded hits land
  // in between. So: freeze the host's loop, let in-flight client -> host messages drain, force one snapshot of
  // exactly the host's current state, wait until the client has applied it, compare exactly, unfreeze.
  await host.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window); window.__hold = false;
    window.requestAnimationFrame = cb => raf(t => { if (window.__hold) window.requestAnimationFrame(cb); else cb(t); });
  });
  const clientView = () => client.evaluate(() => {
    const g = window.__G, snap = g.NET.lastSnap;
    const ids = a => a.slice().sort((x, y) => x - y);
    return {
      round: g.R.n, role: g.NET.role, kills: g.P.kills,
      alive: ids(g.zombies.filter(z => !z.dead && !z.gone).map(z => z.id)),
      // what the last snapshot the client applied says is alive (flag bit 1 = dead)
      snapAlive: snap ? ids(snap.z.filter(a => !(a[7] & 1)).map(a => a[0])) : null, snapRound: snap ? snap.r : null,
    };
  });
  const checkpoint = async () => {
    await host.evaluate(() => { window.__hold = true; });
    await host.waitForTimeout(300); // client hits already sent get resolved by the host now
    const h = await host.evaluate(() => { const g = window.__G; g.NET.sendT = 0; g.tick(0.001); return { round: g.R.n, alive: g.zombies.filter(z => !z.dead).map(z => z.id).sort((a, b) => a - b), kills: g.P.kills }; });
    let c = await clientView();
    for (let i = 0; i < 30 && JSON.stringify(c.snapAlive) !== JSON.stringify(h.alive); i++) { await host.waitForTimeout(100); c = await clientView(); }
    await host.evaluate(() => { window.__hold = false; });
    return { h, c };
  };

  let checks = 0, sawZombies = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 480_000) {
    for (let i = 0; i < 10; i++) await step();
    const { h, c } = await checkpoint();
    checks++; if (h.alive.length) sawZombies++;
    expect(c.role, 'client still connected').toBe('client');
    // replication: the client shows exactly what the snapshot it applied says (independent of timing)
    expect(c.alive, `client matches its last applied snapshot (check ${checks})`).toEqual(c.snapAlive);
    // sync: with the host frozen, that snapshot is the host's current state
    expect(c.round, `round number agrees (check ${checks})`).toBe(h.round);
    expect(c.alive, `alive zombie ids agree in round ${h.round} (check ${checks}); client snapshot ${JSON.stringify(c.snapAlive)}`).toEqual(h.alive);
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
