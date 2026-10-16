// Assembles src/ into a playable build.
//   dist/          multi-file web build (index.html + assets/) for GitHub Pages and the desktop app
//   dist-single/   one self-contained index.html, handy for quick sharing
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => join(root, 'src', p);
const read = p => readFileSync(p, 'utf8');

export function assemble() {
  const { files } = JSON.parse(read(src('manifest.json')));
  const parts = files.map(f => {
    if (!existsSync(src(f))) throw new Error(`manifest lists missing file: src/${f}`);
    return `// ---- src/${f}\n${read(src(f))}`;
  });
  if (process.env.ASHFALL_TEST) parts.splice(parts.length - 1, 0, `// ---- tools/test-hook.js (test builds only)\n${read(join(root, 'tools', 'test-hook.js'))}`);
  const game = `(function(){\n'use strict';\n${parts.join('\n')}\n})();\n`;
  const css = files.length && existsSync(src('styles')) ? cssBundle() : '';
  return { game, css, three: read(join(root, 'vendor', 'three.r128.min.js')), html: read(src('index.template.html')) };
}

function cssBundle() {
  const order = JSON.parse(read(src('styles/order.json')));
  return order.map(f => `/* ---- src/styles/${f} */\n${read(src('styles/' + f))}`).join('\n');
}

export function build({ quiet } = {}) {
  const { game, css, three, html } = assemble();
  const outName = process.env.ASHFALL_OUT || 'dist';
  const out = join(root, outName), single = join(root, outName + '-single');
  rmSync(out, { recursive: true, force: true }); rmSync(single, { recursive: true, force: true });
  mkdirSync(join(out, 'assets'), { recursive: true }); mkdirSync(single, { recursive: true });
  writeFileSync(join(out, 'assets', 'game.js'), game);
  writeFileSync(join(out, 'assets', 'game.css'), css);
  writeFileSync(join(out, 'assets', 'three.min.js'), three);
  if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), out, { recursive: true });
  writeFileSync(join(out, 'index.html'), html
    .replace('<!--STYLES-->', '<link rel="stylesheet" href="assets/game.css">')
    .replace('<!--SCRIPTS-->', '<script src="assets/three.min.js"></script>\n<script src="assets/game.js"></script>'));
  writeFileSync(join(out, '.nojekyll'), '');
  writeFileSync(join(single, 'index.html'), html
    .replace('<!--STYLES-->', () => `<style>\n${css}</style>`)
    .replace('<!--SCRIPTS-->', () => `<script>${three}</script>\n<script>\n${game}</script>`));
  if (!quiet) console.log(`built ${outName}/ and ${outName}-single/ (${(game.length / 1024).toFixed(0)} KB game code)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
