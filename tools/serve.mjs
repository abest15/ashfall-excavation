// Dev server: rebuilds when anything in src/ (or tools/test-hook.js, tools/error-overlay.js) changes and serves
// the build on http://localhost:$PORT (default 5173). Honours ASHFALL_OUT, ASHFALL_TEST and ASHFALL_PROD like the build;
// ASHFALL_NO_WATCH=1 builds once and serves without watching (used by the Playwright tests).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), dist = join(root, process.env.ASHFALL_OUT || 'dist');
const port = +(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
let building = Promise.resolve();
const safeBuild = () => (building = building.then(() => build({ quiet: true })).then(() => console.log('rebuilt', new Date().toLocaleTimeString()), e => { console.error('build failed:', e.message); if (process.env.ASHFALL_NO_WATCH) process.exit(1); }));
safeBuild();
let t; const queue = () => { clearTimeout(t); t = setTimeout(safeBuild, 120); };
if (!process.env.ASHFALL_NO_WATCH) { watch(join(root, 'src'), { recursive: true }, queue); watch(join(root, 'tools'), queue); }
createServer(async (req, res) => {
  await building;
  let p = join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!(p === dist || p.startsWith(dist + sep)) || !existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(p));
}).listen(port, () => console.log(`Ashfall dev server: http://localhost:${port}`));
