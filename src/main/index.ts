import { app, BrowserWindow, ipcMain, nativeTheme, Menu } from 'electron';
import path from 'path';
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
// インストール/アンインストール/アップデート時にアプリが起動されるため即座に終了する
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) app.quit();

// 自動アップデートの初期化 (update.electronjs.org 経由で GitHub Releases をチェック)
updateElectronApp();

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.chiikawa-reminder.app');
}

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
const scheduler = new Scheduler();
const notificationManager = new NotificationManager();
let webhookUrl = '';
let disableNativeNotificationOnWebhook = false;

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
});

app.on('window-all-closed', () => {
  // 何もしない: トレイの「終了」からのみ終了できる
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
