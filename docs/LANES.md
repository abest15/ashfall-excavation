# Development lanes

Five lanes work in parallel. Each owns specific files; edit files you don't own only with small, exact, surgical replacements, and say so in your report.

| Lane | Owns | Port / build folder |
|---|---|---|
| 1 Studio & front end | `src/ui/36-menu.js`, `src/ui/front/*`, `src/styles/front.css`, title/menu markup in `src/index.template.html` | 5181 / `.lane1` |
| 2 Graphics & characters | `src/engine/*`, `src/world/*`, `src/entities/24-*`, `25-*`, `26-*` | 5182 / `.lane2` |
| 3 Weapons, movement & HUD | `src/gameplay/10-weapons.js`, `28-player-combat.js`, `39-player-update.js`, `src/entities/11-*`, `12-*`, `13-*`, `src/ui/31-hud.js`, `src/styles/hud.css`, HUD markup | 5183 / `.lane3` |
| 4 Audio | `src/audio/*` | 5184 / `.lane4` |
| 5 Platform, release & QA | `tools/*`, `desktop/*`, `.github/*`, `tests/*`, `package.json`, `README.md`, `docs/*`, `vendor/peerjs.min.js`, `src/core/perf-overlay.js`, `.gitignore` | 5185 / `.lane5` (tests: `.lane5-test`) |
| 7 WebAssembly simulation | `sim/*`, `src/engine/05b-wasm-sim.js`, `tools/build-sim.mjs`, `tests/wasm-*.spec.js` (hooks in `25-zombies.js` are four marked lines) | 5197 / `.lane7` (tests: `.lane7-test`) |

Shared files (`src/manifest.json`, `src/styles/order.json`, `src/index.template.html`): re-read immediately before editing and change only your own entries or blocks.

## Cross-lane contracts
- **Settings** (lane 1 adds the UI, lane 4 reads): `SETTINGS.music` and `SETTINGS.sfx`, numbers 0..1, default 0.8 and 1.
- **Sounds lane 3 will call** (lane 4 implements; lane 3 guards every call): `sfx.reloadOut(id)`, `sfx.reloadIn(id)`, `sfx.boltRack(id)`, `sfx.slide()`, `sfx.land(force)`, `sfx.step(surface)` with surface `'mud' | 'wood' | 'stone' | 'metal' | 'crystal'`, `sfx.hitmarker(head)`, `sfx.lowAmmo()`, `sfx.adsIn()`, `sfx.adsOut()`.
- **Surface lookup** (lane 2 provides): `surfaceAt(x,z)` returns one of the surfaces above. Lane 3 falls back to `'mud'` if it isn't defined yet.
- **Version stamp** (lane 5 provides, anyone may show it): the build defines `GAME_VERSION` (string, e.g. `"0.9.0"`). An element with id `game-version` that is empty at load is filled with `v` + version automatically.
- **Desktop app** (lane 5 provides): `window.ashfallDesktop` exists only in the desktop app (`quit()`, `toggleFullscreen()`); feature-detect it, e.g. for a "Quit to desktop" button.
- **Test hook** (lane 5 owns `tools/test-hook.js`): if you rename something exposed on `window.__G`, tell lane 5 or update the name there.
- **Studio name**: Furnace Lantern Games (original). Lane 1 owns the logo and intro; others reuse the name only if needed.
