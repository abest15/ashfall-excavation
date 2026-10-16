# Ashfall Excavation — architecture

Round-based co-op zombie survival game. Three.js r128 (vendored in `vendor/`), plain JavaScript, no runtime dependencies.

## How the code is put together
- `src/manifest.json` lists every source file in load order. `tools/build.mjs` concatenates them into **one shared scope** wrapped in a single IIFE (`'use strict'`).
  - Every top-level `const`/`let`/`function` in any file is visible to every other file. **Names must be unique across the whole game.**
  - Top-level code runs in manifest order at load. `function` declarations are hoisted; `const`/`let` are not (using one before its file has run throws).
- `src/styles/order.json` lists CSS files in order. `src/index.template.html` is the page shell (`<!--STYLES-->` / `<!--SCRIPTS-->` are filled in by the build).
- Builds: `npm run build` → `dist/` (multi-file, for GitHub Pages and the desktop app) and `dist-single/index.html` (one self-contained file).
  - `npm run build:prod` (or `ASHFALL_PROD=1`) minifies game code and CSS with esbuild and leaves out the dev error overlay. CI, Pages and the desktop app use this.
  - `ASHFALL_OUT=name` changes the output folder (each lane builds into its own folder).
  - `ASHFALL_TEST=1` injects `tools/test-hook.js`, exposing internals as `window.__G` for automated tests. A name the hook cannot find is skipped and listed in `__G.__missing` instead of breaking the build.
  - Every build prepends `const GAME_VERSION="x.y.z";` inside the game scope (from `package.json` `version`, or `ASHFALL_VERSION`). Any file may read `GAME_VERSION`; do not declare that name yourself. The page also gets `<meta name="ashfall-version">`, and `dist/version.json` records the build.
  - Dev and test builds (not production) load `tools/error-overlay.js` before the game, which shows uncaught errors and promise rejections on screen.
  - `vendor/peerjs.min.js` (PeerJS 1.5.4, MIT) is copied to `dist/assets/`. The web build still loads PeerJS from unpkg at runtime; the desktop app redirects that request to the local copy.
  - If `desktop/build/icon-64.png` exists it becomes the favicon.
- Dev: `PORT=5181 ASHFALL_OUT=.lane1 npm run dev` serves and rebuilds on change (`ASHFALL_TEST=1` works here too).
- In-game tools: **F3** toggles the performance overlay (`src/core/perf-overlay.js`: FPS, frame time, draw calls, triangles, zombies, quality, network role, ping when `NET.ping` is set in ms).
- Desktop: `desktop/main.cjs` (Electron) serves `dist/` from a private `app://ashfall` origin with a content security policy, allows pointer lock, fullscreen and clipboard writes, and exposes `window.ashfallDesktop` (`isDesktop`, `toggleFullscreen()`, `isFullscreen()`, `quit()`) through `desktop/preload.cjs`. Packaging is configured under `"build"` in `package.json` (electron-builder; output in `release/`).
- Tests: `tests/` (Playwright). `npm test` builds a test build into `.lane5-test/`, serves it on port 5185 and runs the smoke, full-ritual and co-op tests. See README.md.

## WebAssembly simulation core (`sim/`, `src/engine/05b-wasm-sim.js`)
- `sim/` is a dependency-free Rust crate compiled to `wasm32-unknown-unknown` (plain `#[no_mangle] extern "C"` exports, no allocator, no imports, ~21 KB). It holds the collision world (a mirror of `colliders`, uniform-grid broadphase, the same resolution rule as `collide()`), nav grids at 1 m (the trench network and the Hollow; closed doors block because their boxes do) with flow fields per target set (slot 0: every live player, so co-op zombies take the nearest one by path; slots 1-3: active lures), and a batched crowd step (flow / line-of-sight direction, arrival, separation, look-ahead avoidance, overlap relaxation, wall collision, player push-out, stuck side-steps) over a struct-of-arrays `Float32Array` shared with JS.
- `updateZombies` calls four hooks (`wsimBegin`, `wsimAim`, `wsimAgent`, `wsimEnd`). With the core loaded, only zombie *locomotion* goes through WASM; targets, attacks, windows, rising, bosses, hounds, lures, the Hollow and co-op host authority stay in JS. If the core is missing or `?sim=js` is in the URL, the original JS path runs unchanged. The player's own `collide()` stays in JS.
- `tools/build-sim.mjs` runs `cargo build --release --target wasm32-unknown-unknown` (plus `wasm-opt -Oz` when installed) on every build; without cargo it uses the committed `sim/prebuilt/sim.wasm` and warns. The multi-file build writes `dist/assets/sim.wasm` (fetched at boot); the single-file build inlines it as base64 (`window.__ASHFALL_SIM_WASM`). After changing `sim/src`, run `npm run sim:prebuilt` and commit `sim/prebuilt/` (CI checks `SOURCE_HASH`). `npm run sim:test` runs the Rust unit tests.
- Debug: the F3 overlay's `sim` row shows the active path and the ms per frame of `updateZombies`; in the console `ashfallSim.spawn(120)` adds risen walkers, `ashfallSim.use('js'|'wasm')` switches path, `ashfallSim.bench()` compares both.

## Folders
| Folder | What lives there |
|---|---|
| `src/engine` | bootstrap, settings, renderer and post-processing, textures, materials |
| `src/world` | map, walls and windows, props, chapel, No Man's Land, lights, atmosphere, sky, the Hollow |
| `src/entities` | gun models and viewmodel, knife, the Colossus, zombies and hounds, boss projectiles |
| `src/gameplay` | game systems, weapon data, economy, tonics, power, forge, relic crate, quest, particles, power-ups, combat, rounds, reset, per-frame updates, player movement, collision |
| `src/audio` | Web Audio engine, procedural sound effects, zombie voices |
| `src/ui` | HUD, interaction prompts, gamepad, input, menus and title screen |
| `src/net` | peer-to-peer co-op (host-authoritative) |
| `src/core` | the performance overlay, then the main loop (`41-loop.js` must stay last) |

## Global conventions
- Key shared state: `P` (local player), `R` (rounds), `Q` (quest), `PU` (power-ups), `zombies`, `scene`, `camera`, `renderer`, `SETTINGS`, `QUAL` (0 low / 1 medium / 2 high), `NET` (`role`: solo / host / client), `mode` (main / hollow), `state` (menu / play / paused / over / end), `GT` (game time).
- Materials: `L(o)` lit material (Phong on Medium/High, Lambert on Low), `B(o)` unlit, `M.add(color,opacity)` additive glow.
- Sound: call `sfx.name(arg)`; positional one-shots `sfxAt(name, pos, maxDist, arg)`. When calling a sound another lane is adding, guard it: `sfx.reloadIn&&sfx.reloadIn()`.
- Co-op: the host is authoritative. On clients, `hitZombie` forwards to the host, and `spawnZombie`/`killZombie` do nothing. Anything that changes shared world state must follow that pattern (see `src/net`).
- Performance budget: must stay playable on a basic laptop at Graphics **Low**. Gate expensive effects behind `QUAL`.
- Everything must be **original**: no names, logos, characters, music, sounds, models or text copied from any existing game or studio.
