const { app, BrowserWindow, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 920,
    minHeight: 620,
    title: 'Brújula · CRM Comercial',
    icon: path.join(APP_ROOT, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Abrir WhatsApp, Facebook e Instagram en el navegador / app nativa de Windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|whatsapp:|mailto:)/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://brujula')) {
      event.preventDefault();
      if (/^(https?:|whatsapp:|mailto:)/i.test(url)) {
        shell.openExternal(url);
      }
    }
  });

  win.loadURL('app://brujula/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    try {
      const parsed = new URL(request.url);
      let relPath = decodeURIComponent(parsed.pathname || '/index.html');
      if (relPath === '/' || relPath === '') relPath = '/index.html';

      const targetPath = path.normalize(path.join(APP_ROOT, relPath));
      if (!targetPath.startsWith(APP_ROOT)) {
        return new Response('Acceso denegado', { status: 403 });
      }

      const data = await fs.promises.readFile(targetPath);
      const ext = path.extname(targetPath).toLowerCase();
      return new Response(data, {
        status: 200,
        headers: { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' }
      });
    } catch {
      return new Response('Archivo no encontrado', { status: 404 });
    }
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
