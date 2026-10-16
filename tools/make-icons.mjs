// Renders desktop/icon.svg into the icon files electron-builder and the web build use:
//   desktop/build/icon.png (512), icon-256.png, icon-64.png (favicon), icon.ico (Windows), icon.icns (macOS)
// Run with `npm run icons` after editing the SVG; the outputs are committed so CI needs no image tools.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import png2icons from 'png2icons';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'desktop', 'build');
mkdirSync(out, { recursive: true });
const svg = readFileSync(join(root, 'desktop', 'icon.svg'));
const png = size => sharp(svg, { density: Math.ceil(72 * size / 512) * 2 }).resize(size, size).png().toBuffer();

const big = await png(1024);
writeFileSync(join(out, 'icon.png'), await png(512));
writeFileSync(join(out, 'icon-256.png'), await png(256));
writeFileSync(join(out, 'icon-64.png'), await png(64));
writeFileSync(join(out, 'icon.ico'), png2icons.createICO(big, png2icons.BICUBIC2, 0, false, true));
writeFileSync(join(out, 'icon.icns'), png2icons.createICNS(big, png2icons.BICUBIC2, 0));
console.log('icons written to desktop/build/');
