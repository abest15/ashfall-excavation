// Controller input reaches the game even when the browser lists a phantom pad first, and with a
// non-'standard' (XInput-order) layout as Firefox/Linux report it.
import { test, expect } from '@playwright/test';
import { openGame, toMainMenu, startSolo } from './helpers.js';

function fakePads(layout) {
  // window.__pads drives the fake devices; index 0 is a phantom that never sends input
  window.__pads = { rx: 0, rt: 0 };
  const mk = (i, id, mapping, nb, na) => ({ id, index: i, mapping, connected: true, timestamp: 1,
    buttons: Array.from({ length: nb }, () => ({ pressed: false, value: 0 })), axes: new Array(na).fill(0) });
  navigator.getGamepads = () => {
    const phantom = mk(0, 'Virtual Device', '', 4, 2);
    const real = layout === 'standard' ? mk(1, 'Xbox Controller (STANDARD GAMEPAD)', 'standard', 17, 4)
                                       : mk(1, 'Xbox 360 Controller', '', 11, 8);
    real.timestamp = 1000;
    if (layout === 'standard') { real.axes[2] = window.__pads.rx; real.buttons[7] = { pressed: window.__pads.rt > .5, value: window.__pads.rt }; }
    else { real.axes[3] = window.__pads.rx; real.axes[2] = -1; real.axes[5] = window.__pads.rt * 2 - 1; }
    return [phantom, real];
  };
}

for (const layout of ['standard', 'xinput']) {
  test(`controller works with a phantom pad listed first (${layout} layout)`, async ({ page }) => {
    await page.addInitScript(fakePads, layout);
    const errors = await openGame(page);
    await toMainMenu(page);
    await startSolo(page);
    const r = await page.evaluate(() => {
      const g = window.__G; const y0 = g.P.yaw;
      window.__pads.rx = 1; for (let i = 0; i < 20; i++) g.pollPad(0.05);
      const turned = Math.abs(g.P.yaw - y0);
      window.__pads.rx = 0; window.__pads.rt = 1; g.pollPad(0.05);
      return { turned, fire: g.PAD.fire, active: g.PAD.active, using: g.getPad().index };
    });
    expect(r.using).toBe(1);
    expect(r.turned).toBeGreaterThan(0.1);
    expect(r.fire).toBe(true);
    expect(errors).toEqual([]);
  });
}
