// Builds the WebAssembly simulation core (sim/, Rust) for tools/build.mjs.
//
//   simWasm()                    -> Buffer with sim.wasm: a fresh `cargo build --release --target wasm32-unknown-unknown`
//                                   (then `wasm-opt -Oz` if it is installed), or sim/prebuilt/sim.wasm when cargo or the
//                                   wasm32 target is missing (with a warning), so builds without Rust still work.
//   node tools/build-sim.mjs --update   rebuild and refresh sim/prebuilt/ (sim.wasm + SOURCE_HASH); commit both
//   node tools/build-sim.mjs --check    fail if sim/prebuilt/SOURCE_HASH does not match the current Rust sources
//
// ASHFALL_SIM_PREBUILT=1 skips cargo and always uses the prebuilt file.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const simDir = join(root, 'sim');
const prebuilt = join(simDir, 'prebuilt', 'sim.wasm');
const hashFile = join(simDir, 'prebuilt', 'SOURCE_HASH');
const cargoOut = join(simDir, 'target', 'wasm32-unknown-unknown', 'release', 'ashfall_sim.wasm');

function walk(dir) { return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }

// Hash of everything that decides the output (line endings normalised so Windows checkouts agree).
export function sourceHash() {
  const files = ['Cargo.toml', ...walk(join(simDir, 'src')).map(p => relative(simDir, p))].map(f => f.split('\\').join('/')).sort();
  const h = createHash('sha256');
  for (const f of files) h.update(f + '\n' + readFileSync(join(simDir, f), 'utf8').replace(/\r\n/g, '\n') + '\n');
  return h.digest('hex');
}

const has = (cmd, args = ['--version']) => { try { return spawnSync(cmd, args, { stdio: 'ignore' }).status === 0; } catch { return false; } };

function cargoBuild(quiet) {
  if (!existsSync(join(simDir, 'Cargo.toml'))) return { error: 'sim/Cargo.toml missing' };
  if (!has('cargo')) return { error: 'cargo not found' };
  const r = spawnSync('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown'], { cwd: simDir, stdio: quiet ? 'pipe' : ['ignore', 'inherit', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) return { error: 'cargo build failed' + (r.stderr ? ':\n' + String(r.stderr).trim().split('\n').slice(-6).join('\n') : '') };
  let out = cargoOut;
  if (has('wasm-opt')) {
    const opt = join(simDir, 'target', 'sim.opt.wasm');
    const o = spawnSync('wasm-opt', ['-Oz', '--strip-debug', '--strip-producers', cargoOut, '-o', opt], { stdio: 'ignore' });
    if (o.status === 0 && existsSync(opt)) out = opt;
  }
  return { bytes: readFileSync(out), optimised: out !== cargoOut };
}

let warned = false;
export function simWasm({ quiet = false } = {}) {
  if (!process.env.ASHFALL_SIM_PREBUILT) {
    const r = cargoBuild(quiet);
    if (r.bytes) return { bytes: r.bytes, source: 'cargo' + (r.optimised ? ' + wasm-opt' : '') };
    if (!warned) console.warn(`[sim] ${r.error}; using the committed sim/prebuilt/sim.wasm`);
  }
  warned = true;
  if (!existsSync(prebuilt)) { console.warn('[sim] no sim/prebuilt/sim.wasm either: the game will use its JavaScript fallback'); return null; }
  if (existsSync(hashFile) && readFileSync(hashFile, 'utf8').trim() !== sourceHash()) console.warn('[sim] sim/prebuilt/sim.wasm is older than sim/src (run `npm run sim:prebuilt` with Rust installed)');
  return { bytes: readFileSync(prebuilt), source: 'prebuilt' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const want = sourceHash(), got = existsSync(hashFile) ? readFileSync(hashFile, 'utf8').trim() : '(none)';
    if (want !== got) { console.error(`sim/prebuilt is stale: SOURCE_HASH ${got} but sim sources hash to ${want}. Run \`npm run sim:prebuilt\` and commit sim/prebuilt/.`); process.exit(1); }
    console.log('sim/prebuilt matches the Rust sources (' + want.slice(0, 12) + ')');
  } else if (process.argv.includes('--update')) {
    const r = cargoBuild(false);
    if (!r.bytes) { console.error(r.error); process.exit(1); }
    mkdirSync(dirname(prebuilt), { recursive: true });
    writeFileSync(prebuilt, r.bytes); writeFileSync(hashFile, sourceHash() + '\n');
    console.log(`sim/prebuilt/sim.wasm updated (${r.bytes.length} bytes${r.optimised ? ', wasm-opt' : ''})`);
  } else {
    const r = simWasm();
    console.log(r ? `sim.wasm: ${r.bytes.length} bytes (${r.source})` : 'sim.wasm: unavailable');
  }
}
