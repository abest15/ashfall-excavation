// Playwright configuration for the Ashfall Excavation tests.
// The web server builds a test build (ASHFALL_TEST=1 exposes window.__G) into .lane5-test/ once and serves it.
//   npm test                         the main browser tests (smoke, ritual, co-op, knife, perf budget)
//   npm run test:qa                  the soak tests (solo rounds 1-15 leak check, co-op 3 rounds)
//   npm run test:all                 both
//   npm test -- smoke                one file
//   ASHFALL_DESKTOP_TEST=1 xvfb-run -a npm test -- desktop    the Electron shell (needs `npm run build:prod`)
import { defineConfig } from '@playwright/test';

const PORT = +(process.env.ASHFALL_TEST_PORT || 5185);
const OUT = process.env.ASHFALL_TEST_OUT || '.lane5-test';

// The long soak tests run only with ASHFALL_QA=1 (npm run test:qa); npm test stays a few minutes.
const QA_ONLY = ['**/soak.spec.js', '**/coop-soak.spec.js'];

export default defineConfig({
  testDir: '.',
  testIgnore: process.env.ASHFALL_QA ? [] : QA_ONLY,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: '../test-results/html' }]] : 'list',
  outputDir: '../test-results/artifacts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 960, height: 540 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    command: 'node tools/serve.mjs',
    cwd: '..',
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { PORT: String(PORT), ASHFALL_OUT: OUT, ASHFALL_TEST: '1', ASHFALL_NO_WATCH: '1' },
  },
});
