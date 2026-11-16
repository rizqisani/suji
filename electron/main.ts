import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { app, BrowserWindow, dialog, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { closeDatabase } from '../src/server/database';
import { setupServer } from '../server';

const { autoUpdater } = electronUpdater;

let mainWindow: BrowserWindow | null = null;
let backendServer: Server | undefined;

function prepareDataDirectory(): { directory: string; databasePath: string; keyPath: string } {
  const directory = app.getPath('userData');
  fs.mkdirSync(directory, { recursive: true });

  const probePath = path.join(directory, `.write-check-${randomUUID()}`);
  fs.writeFileSync(probePath, '', { flag: 'wx', mode: 0o600 });
  fs.unlinkSync(probePath);

  return {
    directory,
    databasePath: path.join(directory, 'suji.sqlite'),
    keyPath: path.join(directory, 'encryption.key'),
  };
}

async function prepareLocalInstallation(): Promise<boolean> {
  if (!['win32', 'darwin', 'linux'].includes(process.platform)) {
    throw new Error(`SI-Ujian belum mendukung sistem operasi ${process.platform}.`);
  }
  if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error('Runtime aplikasi tidak memenuhi kebutuhan minimum Node.js 22.');
  }

  const { directory, databasePath, keyPath } = prepareDataDirectory();
  const databaseExists = fs.existsSync(databasePath);
  let encryptionKey: string;

  if (fs.existsSync(keyPath)) {
    encryptionKey = fs.readFileSync(keyPath, 'utf8').trim();
    if (!/^[a-f0-9]{64}$/i.test(encryptionKey)) {
      throw new Error(`Kunci enkripsi lokal tidak valid: ${keyPath}`);
    }
  } else {
    if (databaseExists) {
      throw new Error(
        'Database lokal ditemukan tetapi kunci enkripsinya hilang. Data tidak diubah; pulihkan file encryption.key dari cadangan.'
      );
    }

    const result = await dialog.showMessageBox({
      type: 'question',
      title: 'Siapkan SI-Ujian',
      message: 'Pemeriksaan sistem selesai. Izinkan SI-Ujian menyiapkan penyimpanan lokal?',
      detail: `Data dan kunci enkripsi akan disimpan di:\n${directory}\n\nRuntime aplikasi dan SQLite sudah disertakan. Tidak perlu memasang Node.js, PostgreSQL, atau browser secara terpisah.`,
      buttons: ['Siapkan penyimpanan lokal', 'Batal'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response !== 0) return false;

    encryptionKey = randomBytes(32).toString('hex');
    fs.writeFileSync(keyPath, `${encryptionKey}\n`, { flag: 'wx', mode: 0o600 });
  }

  process.env.APP_LOCAL_MODE = 'true';
  process.env.APP_DATA_DIR = directory;
  process.env.APP_ENCRYPTION_KEY = encryptionKey;
  process.env.APP_WEB_DIST = path.join(app.getAppPath(), 'dist');
  process.env.NODE_ENV = 'production';
  return true;
}

function createWindow(origin: string): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SI-Ujian',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(origin)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) event.preventDefault();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(origin);
}

function configureUpdates(): void {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('error', (error) => {
    console.error('Pemeriksaan/pembaruan SI-Ujian gagal:', error);
  });
  autoUpdater.on('update-available', async (info) => {
    const window = mainWindow;
    if (!window) return;
    try {
      const result = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Pembaruan SI-Ujian tersedia',
        message: `Versi ${info.version} tersedia.`,
        detail: 'Unduh dan pasang pembaruan sekarang? Aplikasi akan dimulai ulang setelah pemasangan.',
        buttons: ['Unduh pembaruan', 'Nanti'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (result.response === 0) await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Gagal mengunduh pembaruan SI-Ujian:', error);
    }
  });
  autoUpdater.on('update-downloaded', async () => {
    const window = mainWindow;
    if (!window) return;
    try {
      const result = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Pembaruan siap dipasang',
        message: 'Pembaruan SI-Ujian sudah diunduh.',
        detail: 'Mulai ulang aplikasi untuk memasangnya sekarang?',
        buttons: ['Mulai ulang dan pasang', 'Nanti'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (result.response === 0) autoUpdater.quitAndInstall();
    } catch (error) {
      console.error('Gagal memulai pemasangan pembaruan SI-Ujian:', error);
    }
  });
  void autoUpdater.checkForUpdates().catch((error: unknown) => {
    console.error('Tidak dapat memeriksa GitHub Releases:', error);
  });
}

async function startApplication(): Promise<void> {
  if (!(await prepareLocalInstallation())) {
    app.quit();
    return;
  }

  backendServer = await setupServer({ host: '127.0.0.1', port: 0 });
  const address = backendServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Tidak dapat menentukan alamat server lokal SI-Ujian.');
  }

  const origin = `http://127.0.0.1:${address.port}`;
  createWindow(origin);
  configureUpdates();
}

if (app.requestSingleInstanceLock()) {
  app.whenReady().then(startApplication).catch((error: unknown) => {
    console.error('Gagal menginisialisasi SI-Ujian:', error);
    dialog.showErrorBox(
      'SI-Ujian tidak dapat dijalankan',
      error instanceof Error ? error.message : String(error)
    );
    app.quit();
  });
} else {
  app.quit();
}

app.on('activate', () => {
  if (!mainWindow && backendServer) {
    const address = backendServer.address();
    if (address && typeof address !== 'string') createWindow(`http://127.0.0.1:${address.port}`);
  }
});

app.on('before-quit', () => {
  backendServer?.close();
  closeDatabase();
});
