// Exposes a tiny, safe API to the game page as window.ashfallDesktop (desktop app only).
// The game can feature-detect it: `if (window.ashfallDesktop) ...` e.g. to show "Quit to desktop".
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ashfallDesktop', {
  isDesktop: true,
  platform: process.platform,
  toggleFullscreen: () => ipcRenderer.invoke('ashfall:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('ashfall:is-fullscreen'),
  quit: () => ipcRenderer.invoke('ashfall:quit'),
});
