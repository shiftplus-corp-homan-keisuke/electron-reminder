import { app, BrowserWindow, ipcMain, nativeTheme, Menu } from 'electron';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { updateElectronApp } from 'update-electron-app';
import { IPC_CHANNELS } from '../shared/constants';
import { autoLaunch } from './auto-launch';
import { TrayManager } from './tray';
import { Scheduler } from './scheduler';
import type { DigestSettings } from './scheduler';
import { NotificationManager } from './notification';
import type { Reminder } from '../renderer/types/reminder';
import type { DigestSettingsPayload } from '../renderer/lib/ipc';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Squirrel.Windows イベント処理
// インストール/アンインストール/アップデート時にアプリが特殊引数付きで起動されるため
// ショートカット作成/削除を行って即座に終了する
function handleSquirrelEvent(): boolean {
  if (process.platform !== 'win32') return false;

  const cmd = process.argv[1];
  if (!cmd) return false;

  const appName = path.basename(process.execPath);
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');

  const run = (args: string[], done: () => void) => {
    spawn(updateExe, args, { detached: true }).on('close', done);
  };

  switch (cmd) {
    case '--squirrel-install':
    case '--squirrel-updated':
      run(['--createShortcut=' + appName], app.quit);
      return true;
    case '--squirrel-uninstall':
      run(['--removeShortcut=' + appName], app.quit);
      return true;
    case '--squirrel-obsolete':
      app.quit();
      return true;
    default:
      return false;
  }
}

if (handleSquirrelEvent()) {
  // Squirrelイベント処理中なのでここで終了（以降のコードは実行しない）
} else {

// 自動アップデートの初期化 (update.electronjs.org 経由で GitHub Releases をチェック)
updateElectronApp();

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.chiikawa-reminder.app');
}

// カスタムURLスキームの登録: chiikawa-reminder://...
app.setAsDefaultProtocolClient('chiikawa-reminder');

// Electron 開発時は app.name が "Electron" になるため、
// ブラウザのプロトコル確認ダイアログに表示されるアプリ名をレジストリで上書き
if (process.platform === 'win32') {
  spawnSync('reg', [
    'add', 'HKCU\\Software\\Classes\\chiikawa-reminder',
    '/ve', '/t', 'REG_SZ',
    '/d', 'ちぃかわりまいんだぁ',
    '/f',
  ], { windowsHide: true });
}

// シングルインスタンス強制（ディープリンクの second-instance 処理にも必要）
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // 既に起動中のインスタンスが second-instance イベントで URL を受け取るので、こちらは終了
  app.quit();
} else {

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
const scheduler = new Scheduler();
const notificationManager = new NotificationManager();
let webhookUrl = '';
let disableNativeNotificationOnWebhook = false;

// 初回起動時のディープリンク（Renderer ロード前に届いた場合に一時保持）
let pendingDeepLinkTitle: string | null = null;

// アプリ起動中に別インスタンス（ディープリンクなど）が来た場合
app.on('second-instance', (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith('chiikawa-reminder://'));
  if (url) handleDeepLink(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ディープリンクURLをパースして Renderer に通知
function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.host !== 'reminder' || parsed.pathname !== '/create') return;
    const title = parsed.searchParams.get('title') ?? '';
    mainWindow?.webContents.send(IPC_CHANNELS.DEEP_LINK_CREATE_REMINDER, title);
  } catch {
    // 不正なURL - 無視
  }
}

function resolveIcon(): string {
  const base = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  if (process.platform === 'win32') return path.join(base, 'icon.ico');
  if (process.platform === 'darwin') return path.join(base, 'icon.png');
  return path.join(base, 'icon.png');
}

ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.hide(); // Hide instead of close to keep app in tray
});

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    minWidth: 680,
    minHeight: 500,
    icon: resolveIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    
    title: 'ちぃかわりまいんだぁ',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  // Renderer ロード完了後、保留中のディープリンクタイトルを送信
  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingDeepLinkTitle !== null) {
      const title = pendingDeepLinkTitle;
      pendingDeepLinkTitle = null;
      // React の useEffect が登録される時間を待つ
      setTimeout(() => {
        mainWindow?.webContents.send(IPC_CHANNELS.DEEP_LINK_CREATE_REMINDER, title);
      }, 500);
    }
  });
}

function initTray(): void {
  trayManager = new TrayManager(
    () => {
      mainWindow?.show();
      mainWindow?.focus();
    },
    quit,
    () => {
      const current = autoLaunch.isEnabled();
      autoLaunch.set(!current);
      trayManager?.updateAutoLaunchMenuItem(!current);
    }
  );

  trayManager.init();
  trayManager.buildContextMenu(autoLaunch.isEnabled());
}

function quit(): void {
  mainWindow?.removeAllListeners('close');
  mainWindow?.close();
  trayManager?.destroy();
  scheduler.stop();
  app.quit();
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SYNC_REMINDERS,
    (_event, reminders: Reminder[]) => {
      scheduler.updateReminders(reminders);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_AUTO_LAUNCH, () => autoLaunch.isEnabled());

  ipcMain.handle(
    IPC_CHANNELS.SET_AUTO_LAUNCH,
    (_event, enabled: boolean) => {
      autoLaunch.set(enabled);
      trayManager?.updateAutoLaunchMenuItem(enabled);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_NATIVE_THEME, () =>
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  );

  ipcMain.handle(IPC_CHANNELS.SET_WEBHOOK_URL, (_event, url: string) => {
    webhookUrl = url;
  });

  ipcMain.handle(IPC_CHANNELS.SET_DISABLE_NATIVE_NOTIFICATION, (_event, disabled: boolean) => {
    disableNativeNotificationOnWebhook = disabled;
  });

  ipcMain.handle(IPC_CHANNELS.SET_DIGEST_SETTINGS, (_event, payload: DigestSettingsPayload) => {
    const settings: DigestSettings = {
      todayEnabled: payload.todayEnabled,
      todayTime: payload.todayTime,
      weeklyEnabled: payload.weeklyEnabled,
      weeklyTime: payload.weeklyTime,
      weeklyDay: payload.weeklyDay,
    };
    scheduler.updateDigestSettings(settings);
  });

  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow?.webContents.send(IPC_CHANNELS.THEME_CHANGED, theme);
  });
}

function startScheduler(): void {
  scheduler.start(
    (id, title) => {
      mainWindow?.webContents.send(IPC_CHANNELS.REMINDER_FIRED, id);
      const skipNative = disableNativeNotificationOnWebhook && !!webhookUrl;
      if (!skipNative) {
        notificationManager.show({ id, title }, (firedId) => {
          mainWindow?.show();
          mainWindow?.focus();
          mainWindow?.webContents.send(IPC_CHANNELS.FOCUS_REMINDER, firedId);
        });
      }
      notificationManager.sendWebhook(webhookUrl, title);
    },
    (type, items) => {
      notificationManager.showDigest(type, items);
    }
  );
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  initTray();
  startScheduler();

  // 初回起動時のディープリンク: process.argv にURLが含まれる場合はペンディングに格納
  // (createWindow後なので mainWindow はあるが Renderer ロードは未完 → did-finish-load で送信)
  const deepLinkUrl = process.argv.find((arg) => arg.startsWith('chiikawa-reminder://'));
  if (deepLinkUrl) {
    try {
      const parsed = new URL(deepLinkUrl);
      if (parsed.host === 'reminder' && parsed.pathname === '/create') {
        pendingDeepLinkTitle = parsed.searchParams.get('title') ?? '';
      }
    } catch {
      // 不正なURL - 無視
    }
  }
});

app.on('window-all-closed', () => {
  // 何もしない: トレイの「終了」からのみ終了できる
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

} // gotTheLock else block
} // handleSquirrelEvent else block
