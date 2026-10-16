# Ashfall Excavation — architecture

Round-based co-op zombie survival game. Three.js r128 (vendored in `vendor/`), plain JavaScript, no runtime dependencies.

## How the code is put together
- `src/manifest.json` lists every source file in load order. `tools/build.mjs` concatenates them into **one shared scope** wrapped in a single IIFE (`'use strict'`).
  - Every top-level `const`/`let`/`function` in any file is visible to every other file. **Names must be unique across the whole game.**
  - Top-level code runs in manifest order at load. `function` declarations are hoisted; `const`/`let` are not (using one before its file has run throws).
- `src/styles/order.json` lists CSS files in order. `src/index.template.html` is the page shell (`<!--STYLES-->` / `<!--SCRIPTS-->` are filled in by the build).
- Builds: `npm run build` → `dist/` (multi-file, for GitHub Pages and the desktop app) and `dist-single/index.html` (one self-contained file).
  - `ASHFALL_OUT=name` changes the output folder (each lane builds into its own folder).
  - `ASHFALL_TEST=1` injects `tools/test-hook.js`, exposing internals as `window.__G` for automated tests.
- Dev: `PORT=5181 ASHFALL_OUT=.lane1 npm run dev` serves and rebuilds on change.

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
| `src/core` | the main loop (must stay last) |

## Global conventions
- Key shared state: `P` (local player), `R` (rounds), `Q` (quest), `PU` (power-ups), `zombies`, `scene`, `camera`, `renderer`, `SETTINGS`, `QUAL` (0 low / 1 medium / 2 high), `NET` (`role`: solo / host / client), `mode` (main / hollow), `state` (menu / play / paused / over / end), `GT` (game time).
- Materials: `L(o)` lit material (Phong on Medium/High, Lambert on Low), `B(o)` unlit, `M.add(color,opacity)` additive glow.
- Sound: call `sfx.name(arg)`; positional one-shots `sfxAt(name, pos, maxDist, arg)`. When calling a sound another lane is adding, guard it: `sfx.reloadIn&&sfx.reloadIn()`.
- Co-op: the host is authoritative. On clients, `hitZombie` forwards to the host, and `spawnZombie`/`killZombie` do nothing. Anything that changes shared world state must follow that pattern (see `src/net`).
- Performance budget: must stay playable on a basic laptop at Graphics **Low**. Gate expensive effects behind `QUAL`.
- Everything must be **original**: no names, logos, characters, music, sounds, models or text copied from any existing game or studio.
