import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:5173';

// GPU acceleration flags for better rendering performance
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Save directory for game saves
const savesDir = path.join(app.getPath('userData'), 'saves');

function ensureSavesDir(): void {
  if (!fs.existsSync(savesDir)) {
    fs.mkdirSync(savesDir, { recursive: true });
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    title: 'Augmented Survival',
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show window when ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Build the application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            win.webContents.send('menu-save');
          },
        },
        {
          label: 'Load',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            win.webContents.send('menu-load');
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
  ];

  // Add dev tools menu in dev mode
  if (isDev) {
    menuTemplate.push({
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            win.webContents.toggleDevTools();
          },
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            win.webContents.reload();
          },
        },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Load from dev server or built files
  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    const distPath = path.join(__dirname, '../../packages/game-web/dist/index.html');
    win.loadFile(distPath);
  }
}

// IPC handlers for file system operations
function registerIpcHandlers(): void {
  ensureSavesDir();

  ipcMain.handle('save-to-disk', async (_event, filename: string, data: string) => {
    const filePath = path.join(savesDir, filename);
    await fs.promises.writeFile(filePath, data, 'utf-8');
  });

  ipcMain.handle('load-from-disk', async (_event, filename: string) => {
    const filePath = path.join(savesDir, filename);
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  });

  ipcMain.handle('list-saves', async () => {
    try {
      const files = await fs.promises.readdir(savesDir);
      return files.filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
  });

  ipcMain.handle('delete-save', async (_event, filename: string) => {
    const filePath = path.join(savesDir, filename);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may not exist, ignore
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

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

