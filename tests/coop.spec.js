// Two-player co-op over the built-in local transport (?net=local uses BroadcastChannel in place of PeerJS),
// so it needs no internet. Host and client are two pages in one browser context, driven through the
// real co-op menu (#mp-*). Checks: both start, the host's zombies replicate to the client, and a kill made
// by the client is resolved by the host and credited to the client.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, KEEP_ALIVE } from './helpers.js';

const state = p => p.evaluate(() => window.__G.state);

test('host and client play together over the local transport', async ({ context }) => {
  test.setTimeout(300_000);
  const host = await context.newPage(), client = await context.newPage();
  const hostErrors = await openGame(host, '?net=local');
  const clientErrors = await openGame(client, '?net=local');

  // host opens a room
  await toMainMenu(host);
  await host.click('#m-coop');
  await host.fill('#mp-name', 'Hosty');
  await host.click('#mp-host');
  await expect(host.locator('#mp-lobby')).toBeVisible();
  await expect(host.locator('#mp-roomcode')).toHaveText(/^[A-Z]{5}$/);
  const code = (await host.locator('#mp-roomcode').textContent()).trim();

  // client joins with the code
  await toMainMenu(client);
  await client.click('#m-coop');
  await client.fill('#mp-name', 'Clienty');
  await client.fill('#mp-code', code);
  await client.click('#mp-join');
  await expect(client.locator('#mp-status')).toContainText(/Connected/i);
  await expect.poll(() => client.evaluate(() => window.__G.NET.myId)).toBe('p2');
  await expect(host.locator('#mp-players li')).toHaveCount(2);

  // host starts; both enter the game
  await host.click('#mp-start');
  await expect.poll(() => state(host), { timeout: 90_000 }).toBe('play');
  await expect.poll(() => state(client), { timeout: 90_000 }).toBe('play');
  expect(await host.evaluate(() => window.__G.NET.role)).toBe('host');
  expect(await client.evaluate(() => window.__G.NET.role)).toBe('client');

  // the host spawns a zombie; it shows up on the client with the same id
  const zid = await host.evaluate(keep => {
    const g = window.__G; new Function('g', keep)(g);
    const z = g.spawnZombie('walker'); z.speed = 0; z.win = null; z.wstate = null; return z.id;
  }, KEEP_ALIVE);
  expect(zid).toBeGreaterThan(0);
  const pump = async () => {
    for (const p of [host, client]) await p.evaluate(keep => { const g = window.__G, f = new Function('g', keep); for (let i = 0; i < 4; i++) { f(g); g.tick(0.05); } }, KEEP_ALIVE);
    await host.waitForTimeout(60);
  };
  await expect.poll(async () => { await pump(); return client.evaluate(id => window.__G.zombies.some(z => z.id === id && !z.dead), zid); }, { timeout: 30_000 }).toBe(true);
  // its position follows the host's copy
  const [hp, cp] = [await host.evaluate(id => { const p = window.__G.zombies.find(z => z.id === id).g.position; return [p.x, p.z]; }, zid),
    await client.evaluate(id => { const p = window.__G.zombies.find(z => z.id === id).g.position; return [p.x, p.z]; }, zid)];
  expect(Math.hypot(hp[0] - cp[0], hp[1] - cp[1])).toBeLessThan(3);

  // the client kills it: the hit goes to the host, the host kills it and credits the client
  const before = { host: await host.evaluate(() => ({ kills: window.__G.P.kills })), client: await client.evaluate(() => ({ kills: window.__G.P.kills, points: window.__G.P.points })) };
  await client.evaluate(id => { const g = window.__G, z = g.zombies.find(q => q.id === id); for (let i = 0; i < 6; i++) g.hitZombie(z, 1e6, 1, 'gun'); }, zid);
  await expect.poll(async () => { await pump(); return host.evaluate(id => { const z = window.__G.zombies.find(q => q.id === id); return !z || z.dead; }, zid); }, { timeout: 30_000 }).toBe(true);
  await expect.poll(async () => { await pump(); return client.evaluate(() => window.__G.P.kills); }, { timeout: 30_000 }).toBe(before.client.kills + 1);
  expect(await client.evaluate(() => window.__G.P.points)).toBeGreaterThan(before.client.points);
  expect(await host.evaluate(() => window.__G.P.kills)).toBe(before.host.kills);
  // and the client sees it die
  await expect.poll(async () => { await pump(); return client.evaluate(id => { const z = window.__G.zombies.find(q => q.id === id); return !z || z.dead; }, zid); }, { timeout: 30_000 }).toBe(true);

  // the host sees the client in the roster
  expect(await host.evaluate(() => Object.keys(window.__G.NET.remotes))).toContain('p2');
  expect(hostErrors).toEqual([]);
  expect(clientErrors).toEqual([]);
});
