/**
 * Electron preload script.
 * Runs in renderer process before web content loads.
 * Use contextBridge to expose safe APIs to the renderer.
 */

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('platform', {
  isDesktop: true,
  platform: process.platform,
});

