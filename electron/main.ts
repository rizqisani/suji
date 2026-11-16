import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import type { IncomingMessage, Server } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { closeDatabase } from '../src/server/database';
import { setupServer } from '../server';

const { autoUpdater } = electronUpdater;

let mainWindow: BrowserWindow | null = null;
let backendServer: Server | undefined;
let updateCheckInProgress = false;

const GITHUB_RELEASE_API = 'https://api.github.com/repos/rizqisani/suji/releases/latest';

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  digest?: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

function isPortableApp(): boolean {
  return process.platform === 'win32' && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

function compareVersions(left: string, right: string): number {
  const parse = (version: string) =>
    version
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function fetchHttps(url: string, remainingRedirects = 5): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'SI-Ujian-Updater',
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location && remainingRedirects > 0) {
          response.resume();
          fetchHttps(new URL(location, url).toString(), remainingRedirects - 1).then(resolve, reject);
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Server pembaruan merespons HTTP ${statusCode}.`));
          return;
        }
        resolve(response);
      }
    );
    request.setTimeout(30_000, () => request.destroy(new Error('Koneksi pembaruan melebihi batas waktu.')));
    request.on('error', reject);
  });
}

async function fetchLatestPortableRelease(): Promise<GitHubRelease> {
  const response = await fetchHttps(GITHUB_RELEASE_API);
  let body = '';
  response.setEncoding('utf8');
  for await (const chunk of response) body += chunk;
  const release = JSON.parse(body) as GitHubRelease;
  if (release.draft || release.prerelease || !release.tag_name) {
    throw new Error('Rilis stabil terbaru tidak tersedia.');
  }
  return release;
}

async function getSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const source = fs.createReadStream(filePath);
  source.on('data', (chunk) => hash.update(chunk));
  await new Promise<void>((resolve, reject) => {
    source.on('end', resolve);
    source.on('error', reject);
  });
  return hash.digest('hex');
}

async function downloadPortableAsset(asset: GitHubReleaseAsset, destination: string): Promise<void> {
  const response = await fetchHttps(asset.browser_download_url);
  await pipeline(response, fs.createWriteStream(destination, { flags: 'wx' }));

  const expectedDigest = asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  if (!expectedDigest) return;

  const actualDigest = await getSha256(destination);
  if (actualDigest !== expectedDigest) {
    throw new Error('Checksum berkas pembaruan tidak cocok; pembaruan dibatalkan.');
  }
}

function ensurePortableDirectoryWritable(executablePath: string): void {
  const probePath = path.join(path.dirname(executablePath), `.suji-update-${randomUUID()}.tmp`);
  fs.writeFileSync(probePath, '', { flag: 'wx', mode: 0o600 });
  fs.unlinkSync(probePath);
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function replacePortableExecutable(executablePath: string, stagedPath: string): void {
  const backupPath = `${executablePath}.previous`;
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$target = '${escapePowerShell(executablePath)}'`,
    `$staged = '${escapePowerShell(stagedPath)}'`,
    `$backup = '${escapePowerShell(backupPath)}'`,
    `Wait-Process -Id ${process.pid}`,
    "if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }",
    'Move-Item -LiteralPath $target -Destination $backup -Force',
    'Move-Item -LiteralPath $staged -Destination $target -Force',
    'Start-Process -FilePath $target',
  ].join('; ');
  const helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  helper.unref();
}

async function checkPortableForUpdates(manualCheck: boolean) {
  const executablePath = process.env.PORTABLE_EXECUTABLE_FILE;
  if (!executablePath) return { status: 'error' as const };

  const release = await fetchLatestPortableRelease();
  const availableVersion = release.tag_name.replace(/^v/i, '');
  if (compareVersions(availableVersion, app.getVersion()) <= 0) {
    if (manualCheck) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'Cek pembaruan SI-Ujian',
        message: 'SI-Ujian portable sudah menggunakan versi terbaru.',
        noLink: true,
      });
    }
    return { status: 'latest' as const };
  }

  const architecture = process.arch === 'arm64' ? 'arm64' : 'x64';
  const asset = release.assets.find((item) =>
    item.name.endsWith(`-win-${architecture}-portable.exe`)
  );
  if (!asset) {
    throw new Error(`Berkas portable ${architecture} untuk versi ${availableVersion} tidak tersedia.`);
  }

  const confirmation = await dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'info',
    title: 'Pembaruan SI-Ujian tersedia',
    message: `Versi ${availableVersion} tersedia.`,
    detail:
      'Berkas portable baru akan diunduh, lalu menggantikan executable saat aplikasi ditutup. Cadangan versi sebelumnya akan disimpan dengan akhiran .previous.',
    buttons: ['Unduh, perbarui, dan mulai ulang', 'Nanti'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (confirmation.response !== 0) {
    return { status: 'available' as const, version: availableVersion };
  }

  ensurePortableDirectoryWritable(executablePath);
  const stagedPath = path.join(app.getPath('temp'), `${app.getName()}-${availableVersion}-${randomUUID()}.exe`);
  try {
    await downloadPortableAsset(asset, stagedPath);
    replacePortableExecutable(executablePath, stagedPath);
    app.quit();
    return { status: 'available' as const, version: availableVersion };
  } catch (error) {
    fs.rmSync(stagedPath, { force: true });
    throw error;
  }
}

async function checkForUpdates(manualCheck: boolean) {
  if (!app.isPackaged) {
    if (manualCheck) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'Cek pembaruan SI-Ujian',
        message: 'Pengecekan update hanya tersedia pada aplikasi desktop hasil build.',
        noLink: true,
      });
    }
    return { status: 'latest' as const };
  }

  if (updateCheckInProgress) return { status: 'checking' as const };

  updateCheckInProgress = true;
  try {
    if (isPortableApp()) return await checkPortableForUpdates(manualCheck);

    const result = await autoUpdater.checkForUpdates();
    if (!result?.updateInfo && manualCheck) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'Cek pembaruan SI-Ujian',
        message: 'SI-Ujian sudah menggunakan versi terbaru.',
        noLink: true,
      });
    }
    return {
      status: result?.updateInfo ? ('available' as const) : ('latest' as const),
      version: result?.updateInfo?.version,
    };
  } catch (error) {
    console.error('Tidak dapat memeriksa GitHub Releases:', error);
    if (manualCheck) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'error',
        title: 'Cek pembaruan gagal',
        message: 'Pembaruan belum dapat diperiksa.',
        detail: error instanceof Error ? error.message : String(error),
        noLink: true,
      });
    }
    return { status: 'error' as const };
  } finally {
    updateCheckInProgress = false;
  }
}

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
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
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
  ipcMain.handle('check-for-updates', () => checkForUpdates(true));

  if (!app.isPackaged) return;
  if (isPortableApp()) {
    void checkForUpdates(false);
    return;
  }

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
  void checkForUpdates(false);
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
