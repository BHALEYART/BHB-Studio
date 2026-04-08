'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

// ── Keep reference alive ──────────────────────────────────────────
let mainWindow = null;

// ── Dev mode flag ─────────────────────────────────────────────────
const isDev = !app.isPackaged;

// ── Current page tracking ─────────────────────────────────────────
let currentPage = 'customizer'; // 'customizer' | 'animator'

// ─────────────────────────────────────────────────────────────────
//  createWindow
// ─────────────────────────────────────────────────────────────────
function createWindow() {
  nativeTheme.themeSource = 'light';

  mainWindow = new BrowserWindow({
    width:          1280,
    height:         820,
    minWidth:       900,
    minHeight:      600,
    title:          'BHB Studio',
    backgroundColor: '#fafaf5',
    titleBarStyle:  process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      contextIsolation:    true,
      nodeIntegration:     false,
      // Allow canvas.captureStream(), getUserMedia (mic), Web Audio, WebCodecs
      allowRunningInsecureContent: false,
      webSecurity:         true,
    },
    // Icon shown in taskbar / dock
    icon: path.join(__dirname, 'build',
      process.platform === 'win32' ? 'icon.ico' :
      process.platform === 'darwin' ? 'icon.icns' : 'icon.png'),
  });

  // Load initial page
  loadPage('customizer');

  // Open DevTools in dev mode
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Intercept new-window / navigation to external URLs
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('file://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  Page navigation
// ─────────────────────────────────────────────────────────────────
function loadPage(page) {
  currentPage = page;
  const filePath = path.join(__dirname, 'renderer', page, 'index.html');
  mainWindow.loadFile(filePath);
  // Update menu checkmarks after navigation
  mainWindow.webContents.once('did-finish-load', () => {
    buildMenu();
  });
}

// ─────────────────────────────────────────────────────────────────
//  IPC Handlers
// ─────────────────────────────────────────────────────────────────

// Navigate between pages
ipcMain.on('navigate', (_event, page) => {
  if (page !== currentPage) loadPage(page);
});

// Save file with native dialog
ipcMain.handle('save-file', async (_event, { buffer, filename, mimeType }) => {
  const ext      = path.extname(filename).slice(1).toUpperCase() || 'FILE';
  const mimeMap  = {
    'image/png':  [{ name: 'PNG Image', extensions: ['png'] }],
    'video/mp4':  [{ name: 'MP4 Video', extensions: ['mp4'] }],
    'video/webm': [{ name: 'WebM Video', extensions: ['webm'] }],
    'audio/wav':  [{ name: 'WAV Audio', extensions: ['wav'] }],
    'audio/mpeg': [{ name: 'MP3 Audio', extensions: ['mp3'] }],
  };
  const filters = mimeMap[mimeType] || [{ name: `${ext} File`, extensions: [ext.toLowerCase()] }];

  // Default to Downloads folder
  const downloadsDir = app.getPath('downloads');
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title:           `Save ${ext}`,
    defaultPath:     path.join(downloadsDir, filename),
    filters,
    properties:      ['showOverwriteConfirmation'],
  });

  if (canceled || !filePath) return { saved: false };

  try {
    const buf = Buffer.from(buffer);
    fs.writeFileSync(filePath, buf);
    return { saved: true, filePath };
  } catch (err) {
    console.error('[save-file] write failed:', err);
    return { saved: false, error: err.message };
  }
});

// Open external URL in system browser
ipcMain.on('open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// Get current page (so renderer knows which tab is active)
ipcMain.handle('get-current-page', () => currentPage);

// ─────────────────────────────────────────────────────────────────
//  Application Menu
// ─────────────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS app menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // View / Navigate
    {
      label: 'View',
      submenu: [
        {
          label: '🎨 Customizer',
          type:  'radio',
          checked: currentPage === 'customizer',
          accelerator: 'CmdOrCtrl+1',
          click() { if (mainWindow) { loadPage('customizer'); } },
        },
        {
          label: '🎬 Animator',
          type:  'radio',
          checked: currentPage === 'animator',
          accelerator: 'CmdOrCtrl+2',
          click() { if (mainWindow) { loadPage('animator'); } },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools' },
        ] : []),
      ],
    },

    // Edit
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // Help
    {
      label: 'Help',
      submenu: [
        {
          label: 'BHB Website',
          click() { shell.openExternal('https://bigheadbillionaires.com'); },
        },
        {
          label: 'Help & Documentation',
          click() { shell.openExternal('https://bigheadbillionaires.com/help/'); },
        },
        {
          label: 'Discord Community',
          click() { shell.openExternal('https://discord.gg/MHskPjHsf2'); },
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click() { shell.openExternal('https://github.com/BHALEYART/bhb-studio'); },
        },
        ...(isMac ? [] : [
          { type: 'separator' },
          {
            label: 'About BHB Studio',
            click() {
              dialog.showMessageBox(mainWindow, {
                type:    'info',
                title:   'BHB Studio',
                message: 'BHB Studio',
                detail:  `Version ${app.getVersion()}\n\nBig Head Billionaires Character Customizer & Animator\n\nBuilt on Solana · © 2025`,
              });
            },
          },
        ]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─────────────────────────────────────────────────────────────────
//  Microphone permission — sticky across launches
//
//  How it works per platform:
//
//  macOS — systemPreferences.getMediaAccessStatus() checks whether the
//    OS-level TCC permission has been granted before.  If it hasn't been
//    asked yet we call askForMediaAccess().  Once the user taps Allow the
//    OS remembers it permanently (System Preferences → Privacy → Micro-
//    phone).  We never ask again on subsequent launches.
//
//  Windows — the browser-side getUserMedia() dialog handles persistence
//    automatically: Chromium stores the granted origin permission in the
//    Electron session's permission store (userData/Partitions/…).  We
//    use setPermissionCheckHandler + setPermissionRequestHandler to
//    always approve the "media" permission so the OS dialog only appears
//    once and Chromium's site-permission cache takes over after that.
// ─────────────────────────────────────────────────────────────────
async function ensureMicPermission() {
  if (process.platform === 'darwin') {
    const { systemPreferences } = require('electron');
    const status = systemPreferences.getMediaAccessStatus('microphone');
    // 'not-determined' = never asked; 'denied' = user explicitly blocked
    // 'granted' = already approved — nothing to do
    if (status === 'not-determined') {
      await systemPreferences.askForMediaAccess('microphone').catch(() => {});
    }
    // If 'denied': the user can re-enable in System Preferences → Privacy.
    // We don't prompt again — it would be a no-op anyway.
  }
  // Windows: handled entirely by the permission handlers below.
}

// ─────────────────────────────────────────────────────────────────
//  App lifecycle
// ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Set up session permission handlers BEFORE creating the window so the
  // very first getUserMedia() call is already covered.
  setupPermissionHandlers();

  await ensureMicPermission();

  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      buildMenu();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────────────────────────
//  Permission handlers (called for every new WebContents)
//
//  setPermissionCheckHandler  — synchronous; controls whether the page
//    even sees the permission as potentially grantable.
//  setPermissionRequestHandler — called when the page actually invokes
//    getUserMedia / requestPermission; we approve media unconditionally
//    so Chromium's own cache stores the grant and won't re-ask next time.
// ─────────────────────────────────────────────────────────────────
function setupPermissionHandlers() {
  const { session } = require('electron');
  const ses = session.defaultSession;

  // Check handler — let 'media' (mic/camera) through
  ses.setPermissionCheckHandler((_webContents, permission, _origin, _details) => {
    const always = ['media', 'mediaKeySystem', 'notifications', 'fullscreen'];
    return always.includes(permission);
  });

  // Request handler — approve media requests so Chromium caches the grant
  ses.setPermissionRequestHandler((_webContents, permission, callback, _details) => {
    const always = ['media', 'mediaKeySystem', 'fullscreen'];
    callback(always.includes(permission));
  });
}

// Also wire up any dynamically-created WebContents (e.g. DevTools)
app.on('web-contents-created', (_event, _contents) => {
  // Permission handling is already on the default session — nothing extra needed.
});
