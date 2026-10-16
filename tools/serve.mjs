// Dev server: rebuilds when anything in src/ changes and serves dist/ on http://localhost:5173
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), dist = join(root, process.env.ASHFALL_OUT || 'dist');
const port = +(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const safeBuild = () => { try { build({ quiet: true }); console.log('rebuilt', new Date().toLocaleTimeString()); } catch (e) { console.error('build failed:', e.message); } };
safeBuild();
let t; watch(join(root, 'src'), { recursive: true }, () => { clearTimeout(t); t = setTimeout(safeBuild, 120); });
createServer((req, res) => {
  let p = join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!p.startsWith(dist) || !existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(p));
}).listen(port, () => console.log(`Ashfall dev server: http://localhost:${port}`));
