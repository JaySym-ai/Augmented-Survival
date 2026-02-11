import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Augmented Survival',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built web app
  const distPath = path.join(__dirname, '../../packages/game-web/dist/index.html');
  win.loadFile(distPath);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

