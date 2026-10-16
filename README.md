# Ashfall Excavation

A round-based co-op zombie survival shooter set at Dig Site 7 on the northern front, 1918. The dig crew struck something black and humming under the mud, and now the dead climb out of the trenches every night.

Hold out round after round with up to three friends. Board the windows, open the site, restore the power, and forge your guns into something worse. Finish the old rite the diggers started: ride the Colossus that stalks No Man's Land, read the chapel's glass, build a storm in your fist, bring the giant down, and find the way out from under the dig.

By **Furnace Lantern Games**. Built with Three.js (r186, WebGPU with an automatic WebGL 2 fallback) and plain JavaScript; runs in a browser or as a desktop app for Windows, macOS and Linux.

- **Play in the browser:** https://abest15.github.io/ashfall-excavation/
- **Download the desktop app:** [Releases](https://github.com/abest15/ashfall-excavation/releases) (Windows installer or portable .exe, macOS .dmg, Linux AppImage)

---

## How to play

- **Solo:** press any key on the title screen, then choose **Solo**.
- **Co-op (2 to 4 players):** one player chooses **Co-op → Host a game** and shares the five-letter room code; friends choose **Co-op**, type the code and **Join**. The host presses **Start the dig**. Co-op needs an internet connection (peer-to-peer through PeerJS); the host's game is the authoritative one.
- Each round sends more of the dead. Kills and repairs earn points; spend them on doors, wall weapons, tonics, the relic crate and the Forge.
- Graphics quality (Low / Medium / High), renderer (Auto / WebGPU / WebGL), field of view, sensitivity, volume and difficulty are under **Options**. Use **Low** on basic laptops.

### Controls

| Action | Keyboard and mouse | Controller |
|---|---|---|
| Move | W A S D | Left stick |
| Sprint · jump | Shift · Space | LS click · A |
| Look | Mouse | Right stick |
| Fire · aim | Left click · Right click | RT · LT |
| Reload | R | X (when nothing to use) |
| Buy, open, drink, dig, use | E | X |
| Rebuild a window · revive | Hold E | Hold X |
| Switch weapon | 1 2 3 · mouse wheel | Y |
| Knife | F or V | B or RB |
| Throw a Clockwork Lure | G | LB |
| Fold the field journal | J | Back |
| Pause | Esc | Start |
| Performance overlay | F3 | |
| Fullscreen (desktop app) | F11 or Alt+Enter | |

The third weapon slot opens with the Packmule Tonic. Xbox and PlayStation controllers work in the browser and in the desktop app.

---

## Running it locally

You need [Node.js](https://nodejs.org) 22.12 or newer.

```bash
npm install          # three.js (bundled into the game) and the dev tools
npm run dev          # builds, serves http://localhost:5173 and rebuilds whenever src/ changes
```

Other build commands:

| Command | What it does |
|---|---|
| `npm run build` | Dev build into `dist/` (multi-file) and `dist-single/index.html` (one self-contained file). Shows an on-screen error box for uncaught errors. |
| `npm run build:prod` | Production build: minified with esbuild, no error box. This is what GitHub Pages and the desktop app ship. |
| `npm run build:test` | Test build into `.test/` with `window.__G` exposed for automated tests. |
| `npm run icons` | Regenerates the app icons in `desktop/build/` from `desktop/icon.svg`. |

Build options (environment variables): `ASHFALL_OUT=folder` (output folder), `ASHFALL_TEST=1` (test hook), `ASHFALL_PROD=1` (same as `--prod`), `ASHFALL_VERSION=1.2.3` (override the version stamp), and for the dev server `PORT=5181` and `ASHFALL_NO_WATCH=1`.

The version shown in the game comes from `"version"` in `package.json`. The build defines it for the game code as `GAME_VERSION`, and it appears in the F3 overlay.

---

## Desktop app

The desktop app is an [Electron](https://www.electronjs.org) shell around the production build (`desktop/main.cjs`). It:

- opens fullscreen the first time (maximized windowed mode is remembered if you switch with **F11** or **Alt+Enter**); **Esc** always goes to the game's pause menu;
- has no menu bar, uses the window title "Ashfall Excavation" and its own icon;
- works offline for solo play (everything is bundled); co-op still needs internet for matchmaking, but the PeerJS library itself is bundled;
- serves the game from a private `app://` origin with a content security policy; only pointer lock, fullscreen and clipboard writes (for "Copy room code") are allowed; links open in your normal browser;
- keeps settings and best rounds in the user profile, and allows only one copy to run at a time.

```bash
npm run desktop      # production build, then run the app
npm run dist:linux   # build release/Ashfall-Excavation-<version>-x86_64.AppImage
npm run dist:win     # build the NSIS installer and the portable .exe (run on Windows)
npm run dist:mac     # build a universal .dmg (run on macOS)
```

Installers are written to `release/`. Build each platform on that platform; the release workflow below does all three for you on GitHub. The builds are **not code-signed**: Windows SmartScreen will say "unknown publisher" (choose *More info → Run anyway*), and on macOS right-click the app and choose *Open* the first time. To sign later, add the usual electron-builder secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`; for macOS also `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) to the repository and remove `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` from `.github/workflows/release.yml`.

To run the Linux AppImage: `chmod +x Ashfall-Excavation-*.AppImage && ./Ashfall-Excavation-*.AppImage`.

---

## Tests

```bash
npx playwright install chromium   # once
npm test                          # smoke, full ritual and co-op tests (about 4 minutes with software rendering)
npm test -- smoke                 # just one file
ASHFALL_DESKTOP_TEST=1 xvfb-run -a npm test -- desktop   # the desktop app (after npm run build:prod)
```

`npm test` builds a test build into `.lane5-test/`, serves it on port 5185, and runs Chromium with software WebGL (SwiftShader), so no GPU is needed. Game time is driven with `__G.tick(0.05)` so long stages run quickly.

| Test | Covers |
|---|---|
| `tests/smoke.spec.js` | page loads, splash and menu, Solo starts, a round begins, a zombie spawns and is shot dead, Esc pauses and Resume continues, the F3 overlay, the dev error box |
| `tests/ritual.spec.js` | the entire main quest from the Rod fragments to stepping through the gate in the Hollow (victory screen, 12/12 rites) |
| `tests/coop.spec.js` | two pages host and join through the co-op menu over the local transport (`?net=local`), zombies replicate to the client, a kill by the client is credited to the client |
| `tests/desktop.spec.js` | the Electron app boots from `app://`, window title, no menu bar, the bundled PeerJS loads, Esc reaches the game, fullscreen toggles |

Failure screenshots and traces go to `test-results/`.

---

## Releasing a new version

1. Update `"version"` in `package.json` (for example `1.0.0`) and commit it to `main`.
2. Create a tag named `v` + the version, for example `v1.0.0`, and push it. On the GitHub website: **Releases → Draft a new release → Choose a tag → type `v1.0.0` → Create new tag on publish**, then **Publish release**. (A tag that contains a dash, like `v1.1.0-beta.1`, is marked as a pre-release.)
3. The **Release** workflow builds the Windows installer and portable .exe, the macOS .dmg, the Linux AppImage, a zip of the web build and the single-file HTML, and attaches them all to the GitHub Release for that tag (about 15 minutes). The version inside the apps is taken from the tag.

You can rebuild an existing tag from **Actions → Release → Run workflow**.

## Deploying the web version (GitHub Pages)

The **Deploy to GitHub Pages** workflow publishes the production build every time CI passes on `main`; nothing built needs to be committed.

One-time setup: in the repository go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions** (instead of "Deploy from a branch"). After that, every push to `main` that passes the tests updates https://abest15.github.io/ashfall-excavation/. You can also run it by hand from **Actions → Deploy to GitHub Pages → Run workflow**.

If you upload files through the GitHub website: upload the source (everything except `node_modules/`, `dist/`, `dist-single/`, `release/` and `test-results/`, which `.gitignore` already leaves out) and the workflows do the building. Keep `package-lock.json`; CI installs exactly what it lists.

## Continuous integration

| Workflow | When | What |
|---|---|---|
| `.github/workflows/ci.yml` | push to `main`, pull requests | production build, Playwright tests, desktop app launch under Xvfb |
| `.github/workflows/pages.yml` | after CI succeeds on `main` | deploys `dist/` to GitHub Pages |
| `.github/workflows/release.yml` | tag `v*` | installers for Windows, macOS, Linux attached to a GitHub Release |
| `.github/dependabot.yml` | weekly | pull requests that bump the pinned action versions and dev tools |

---

## Project structure

```
src/                  game source, assembled into one script by tools/build.mjs
  manifest.json       load order of every source file (one shared scope)
  index.template.html page shell
  engine/ world/ entities/ gameplay/ audio/ ui/ net/ core/  (see docs/ARCHITECTURE.md)
  styles/             CSS, ordered by styles/order.json
vendor/               peerjs.min.js (three.js comes from npm and is bundled by esbuild)
tools/
  build.mjs           the build (dev, production, test)
  serve.mjs           dev server with rebuild on change
  test-hook.js        window.__G for tests (test builds only)
  error-overlay.js    on-screen error box (dev and test builds only)
  make-icons.mjs      renders desktop/icon.svg to PNG, ICO and ICNS
desktop/
  main.cjs            Electron main process
  preload.cjs         window.ashfallDesktop bridge
  icon.svg            app icon source
  build/              generated icons used by electron-builder and as the favicon
tests/                Playwright tests and config
.github/              CI, Pages and release workflows
docs/                 ARCHITECTURE.md (how the code fits together), LANES.md (who owns what)
```

The code is split by area and assembled in order into one scope. Read `docs/ARCHITECTURE.md` before adding files.

---

All code, art, sound and text in Ashfall Excavation are original. Three.js (MIT, bundled from npm) and PeerJS (MIT, in `vendor/`) are third-party libraries.
