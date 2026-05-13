const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Allow loading local files
      webSecurity: !isDev,
    },
    icon: path.join(__dirname, '../public/logo.png'),
    title: 'Tuhanas Inventory',
    // Remove default frame for a cleaner look — optional
    // frame: false,
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // Load the static export directly via file:// protocol
    // Next.js output: 'export' with trailingSlash: true creates index.html files
    win.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // Handle navigation: intercept link clicks that would cause 404
  win.webContents.on('will-navigate', (event, url) => {
    // If navigating within the app (file://), let it through
    // If navigating to an external URL, open in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      require('electron').shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
