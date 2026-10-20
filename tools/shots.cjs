// Screenshot tour of the game for update reviews.
// usage: node tools/shots.cjs [outDir] [quality low|med|high] [views,comma,separated]
// Builds a test copy (ASHFALL_TEST) into .shots/, opens the single-file build headless, captures the menu
// plus a set of fixed camera spots, and writes a contact sheet (sheet.jpg, composed with sharp) next to the shots.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lays the shots out three per row with a caption under each, using sharp (no browser page involved).
async function contactSheet(shots, file) {
  const sharp = require('sharp');
  const COLS = 3, W = 528, H = Math.round(W * 720 / 1280), CAP = 26, GAP = 6;
  const rows = Math.ceil(shots.length / COLS);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const layers = [];
  for (let i = 0; i < shots.length; i++) {
    const x = GAP + (i % COLS) * (W + GAP), y = GAP + Math.floor(i / COLS) * (H + CAP + GAP);
    layers.push({ input: await sharp(shots[i].f).resize(W, H, { fit: 'cover' }).toBuffer(), left: x, top: y });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${CAP}"><text x="3" y="18" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="600" fill="#dddddd">${esc(shots[i].label)}</text></svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y + H });
  }
  await sharp({ create: { width: GAP + COLS * (W + GAP), height: GAP + rows * (H + CAP + GAP), channels: 3, background: '#111111' } })
    .composite(layers).jpeg({ quality: 85 }).toFile(file);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'test-results', 'shots'));
const QUAL = process.argv[3] || 'med';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const SCALE = { low: .55, med: .75, high: 1 }[QUAL] || .75;

// camera spots: pos [x, y, z] (y = feet height; optional), yaw, pitch; extra views can be added in docs/MAP.md order
const VIEWS = {
  bunker: { pos: [0, 0, 44], yaw: 0, pitch: -0.05 },
  trench: { pos: [-12, 0, 17], yaw: -Math.PI / 2, pitch: -0.08 },
  chapel: { pos: [36, 0, 17.5], yaw: -Math.PI / 2, pitch: 0.05 },
  nomansland: { pos: [48, 0, -12], yaw: -Math.PI / 2 - 0.2, pitch: 0.15 },
  dig: { pos: [-20, 0, -4], yaw: -2.4, pitch: -0.1 },
  colossus: { pos: [44, 0, -4], yaw: -0.95, pitch: 0.42 },
  zombies: { pos: [0, 0, 20], yaw: 0, pitch: 0.1, zombies: true },
};
// optional extra spots (e.g. new map areas) from tools/shots.views.json: { name: { pos, yaw, pitch } }
try { Object.assign(VIEWS, JSON.parse(fs.readFileSync(path.join(__dirname, 'shots.views.json'), 'utf8'))); } catch (e) {}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  execSync('node tools/build.mjs', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, ASHFALL_TEST: '1', ASHFALL_OUT: '.shots' } });
  const url = 'file://' + path.join(ROOT, '.shots-single', 'index.html');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(s => { try { localStorage.setItem('ashfall:settings', JSON.stringify({ scale: s, vol: 0 })); localStorage.setItem('ashfall:firstrun', '1'); } catch (e) {} }, SCALE);
  const page = await ctx.newPage(); page.setDefaultTimeout(240000);
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const shots = [];
  const snap = async (name, label) => { const f = path.join(OUT, name + '.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 82 }); shots.push({ f, label }); };
  for (let i = 0; i < 25; i++) { if (await page.isVisible('#play').catch(() => false)) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await page.waitForTimeout(1200);
  if (!ONLY || ONLY.includes('menu')) await snap('menu', 'Main menu');
  await page.click('#play', { force: true });
  for (let i = 0; i < 600; i++) { if (await page.evaluate(() => window.__G && __G.state === 'play')) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#journal{display:none!important}' });
  await page.evaluate(() => { const G = __G; G.R.toSpawn = 0; for (const z of G.zombies.slice()) G.killZombie(z, 'self', true); G.P.points = 1e6; G.powerOn && G.powerOn(); if (G.ZONES) for (const k in G.ZONES) G.ZONES[k].open = true; });
  for (const [name, v] of Object.entries(VIEWS)) {
    if (ONLY && !ONLY.includes(name)) continue;
    await page.evaluate(async v => {
      const G = __G; G.R.toSpawn = 0; G.P.invuln = 1e9;
      G.P.pos.set(v.pos[0], v.pos[1] || 0, v.pos[2]); G.P.yaw = v.yaw; G.P.pitch = v.pitch;
      if (v.zombies) {
        for (let i = 0; i < 6; i++) G.spawnZombie(i === 5 ? 'hound' : 'walker');
        G.tick(1.5);
        G.zombies.forEach((z, i) => { z.wstate = null; z.win = null; z.rise = 0; z.speed = 0.001; z.g.position.set(v.pos[0] - 3 + i * 1.2, v.pos[1] || 0, v.pos[2] - 3.2 - (i % 2) * .8); });
        G.P.pos.set(v.pos[0], v.pos[1] || 0, v.pos[2]);
      }
      for (let i = 0; i < 3; i++) G.tick(0.016);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, v);
    await page.waitForTimeout(200);
    await snap(name, v.label || name);
    if (v.zombies) await page.evaluate(() => { for (const z of __G.zombies.slice()) __G.killZombie(z, 'self', true); __G.tick(3); });
  }
  console.log(JSON.stringify({ out: OUT, shots: shots.length, errors: errs }));
  // contact sheet: close the game first (at High it keeps the software renderer busy), then compose with sharp
  await page.close().catch(() => {});
  await browser.close();
  await contactSheet(shots, path.join(OUT, 'sheet.jpg'));
})().catch(e => { console.error(e); process.exit(1); });
