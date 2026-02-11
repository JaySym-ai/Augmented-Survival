/**
 * Electron preload script.
 * Runs in renderer process before web content loads.
 * Use contextBridge to expose safe APIs to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose platform information
contextBridge.exposeInMainWorld('platform', {
  isDesktop: true,
  platform: process.platform,
});

// Expose file system access for save/load via IPC
contextBridge.exposeInMainWorld('desktopFS', {
  saveToDisk: (filename: string, data: string): Promise<void> => {
    return ipcRenderer.invoke('save-to-disk', filename, data);
  },
  loadFromDisk: (filename: string): Promise<string | null> => {
    return ipcRenderer.invoke('load-from-disk', filename);
  },
  listSaves: (): Promise<string[]> => {
    return ipcRenderer.invoke('list-saves');
  },
  deleteSave: (filename: string): Promise<void> => {
    return ipcRenderer.invoke('delete-save', filename);
  },
});

// Expose menu event listeners
contextBridge.exposeInMainWorld('desktopEvents', {
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu-save', () => callback());
  },
  onMenuLoad: (callback: () => void) => {
    ipcRenderer.on('menu-load', () => callback());
  },
});

