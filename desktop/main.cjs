// Ashfall Excavation desktop shell (Electron main process).
// Serves the built game (dist/) from a private app:// origin so it works offline, keeps saves in the
// user's profile, allows pointer lock and gamepads, and lets co-op load its peer library from unpkg.
'use strict';
const { app, BrowserWindow, Menu, protocol, net, session, shell, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const TITLE = 'Ashfall Excavation';
const DIST = path.join(__dirname, '..', 'dist');
const ICON = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const ORIGIN = 'app://ashfall';

// Content security: the game's own files, plus the remote pieces it uses when online
// (PeerJS from unpkg, its signalling server over https/wss, Google Fonts). WebRTC media/data
// traffic is not governed by CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://unpkg.com",   // wasm-unsafe-eval: the sim core (assets/sim.wasm)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'none'",
].join('; ');

const ALLOWED_PERMISSIONS = new Set(['pointerLock', 'fullscreen', 'clipboard-sanitized-write', 'keyboardLock']);

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// GPU: prefer the discrete GPU on laptops, and never let a game go to sleep in the background
// while a co-op session is running.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// WebGPU (the game picks it automatically and falls back to WebGL 2): Chromium enables it on Windows, macOS and
// supported Linux GPUs. ASHFALL_WEBGPU=1 also turns it on for other Linux GPUs through Vulkan.
if (process.platform === 'linux' && process.env.ASHFALL_WEBGPU) { app.commandLine.appendSwitch('enable-unsafe-webgpu'); app.commandLine.appendSwitch('enable-features', 'Vulkan'); }
if (process.env.ASHFALL_SOFTWARE_GL) { app.commandLine.appendSwitch('use-gl', 'angle'); app.commandLine.appendSwitch('use-angle', 'swiftshader'); app.commandLine.appendSwitch('enable-unsafe-swiftshader'); }
app.setName(TITLE);
if (process.platform === 'win32') app.setAppUserModelId('com.furnacelantern.ashfall');

// window state (fullscreen or maximized, remembered between launches)
const statePath = () => path.join(app.getPath('userData'), 'window-state.json');
function loadState() { try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return { fullscreen: true }; } }
function saveState(win) { try { fs.writeFileSync(statePath(), JSON.stringify({ fullscreen: win.isFullScreen() })); } catch {} }

let win = null;

function serveDist() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    if (file.endsWith('.html')) headers.set('Content-Security-Policy', CSP);
    if (file.endsWith('.js')) headers.set('Content-Type', 'text/javascript'); // the game is an ES module
    return new Response(res.body, { status: res.status, headers });
  });
}

// Co-op loads PeerJS from unpkg; the app ships the same file, so serve it locally (works even if unpkg is down).
// Signalling (0.peerjs.com) and WebRTC still need internet, exactly as on the web.
const PEER_URLS = ['https://unpkg.com/peerjs@*/dist/peerjs.min.js'];
function localPeerLibrary(ses) {
  if (!fs.existsSync(path.join(DIST, 'assets', 'peerjs.min.js'))) return;
  ses.webRequest.onBeforeRequest({ urls: PEER_URLS }, (details, cb) => cb({ redirectURL: `${ORIGIN}/assets/peerjs.min.js` }));
}

function lockDownSession(ses) {
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((wc, permission) => ALLOWED_PERMISSIONS.has(permission));
}

function toggleFullscreen() {
  if (!win) return;
  win.setFullScreen(!win.isFullScreen());
  saveState(win);
}

function createWindow() {
  const st = loadState();
  const { workAreaSize } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    title: TITLE,
    icon: ICON,
    width: Math.min(1600, workAreaSize.width), height: Math.min(900, workAreaSize.height),
    minWidth: 960, minHeight: 540,
    backgroundColor: '#0c0907',
    show: false,
    autoHideMenuBar: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => {
    win.maximize();
    if (st.fullscreen) win.setFullScreen(true);
    win.show();
    win.focus();
  });
  // The page sets its own <title>; keep the window title fixed.
  win.on('page-title-updated', e => e.preventDefault());

  // F11 / Alt+Enter toggle fullscreen. Esc is never intercepted, so it reaches the game (pause menu);
  // Esc does not leave app fullscreen in Electron, only pointer lock.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { event.preventDefault(); toggleFullscreen(); }
    else if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
    else if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i' && process.env.ASHFALL_DEVTOOLS) win.webContents.toggleDevTools();
  });
  win.on('leave-full-screen', () => saveState(win));
  win.on('enter-full-screen', () => saveState(win));

  // Stay on the game: external links open in the system browser, and nothing navigates the window away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  win.webContents.on('render-process-gone', (e, details) => { if (details.reason !== 'clean-exit' && win && !win.isDestroyed()) win.reload(); });

  win.loadURL(`${ORIGIN}/index.html`);
  win.on('closed', () => { win = null; });
}

// one copy at a time; a second launch focuses the running game
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { label: 'View', submenu: [{ role: 'togglefullscreen' }] }]));
    } else {
      Menu.setApplicationMenu(null);
    }
    serveDist();
    lockDownSession(session.defaultSession);
    localPeerLibrary(session.defaultSession);
    ipcMain.handle('ashfall:toggle-fullscreen', () => { toggleFullscreen(); return win ? win.isFullScreen() : false; });
    ipcMain.handle('ashfall:is-fullscreen', () => (win ? win.isFullScreen() : false));
    ipcMain.handle('ashfall:quit', () => app.quit());
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
