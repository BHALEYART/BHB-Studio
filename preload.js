'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── electronAPI ───────────────────────────────────────────────────
//  Exposed as window.electronAPI in all renderer pages.
//  Nothing from Node.js / Electron internals leaks beyond this object.
// ─────────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {

  // Flag — lets renderer code detect desktop context
  isElectron: true,

  // ── Navigation ───────────────────────────────────────────────
  navigate(page) {
    ipcRenderer.send('navigate', page);
  },

  async getCurrentPage() {
    return ipcRenderer.invoke('get-current-page');
  },

  // ── File I/O ─────────────────────────────────────────────────
  /**
   * Save a binary file with a native Save dialog.
   *
   * @param {Uint8Array|ArrayBuffer} buffer  — file bytes
   * @param {string}  filename              — suggested filename (e.g. "BHB-12345.png")
   * @param {string}  mimeType              — e.g. "image/png", "video/mp4"
   * @returns {Promise<{saved:boolean, filePath?:string, error?:string}>}
   */
  async saveFile(buffer, filename, mimeType) {
    // Normalise to plain array so it survives the structured-clone step
    const arr = buffer instanceof Uint8Array
      ? Array.from(buffer)
      : Array.from(new Uint8Array(buffer));
    return ipcRenderer.invoke('save-file', { buffer: arr, filename, mimeType });
  },

  // ── External URLs ─────────────────────────────────────────────
  /**
   * Open a URL in the system default browser.
   * Only https / http links are accepted.
   */
  openExternal(url) {
    ipcRenderer.send('open-external', url);
  },
});
