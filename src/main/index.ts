import { app, BrowserWindow, ipcMain, nativeTheme, Menu } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../shared/constants';
import { autoLaunch } from './auto-launch';
import { TrayManager } from './tray';
import { Scheduler } from './scheduler';
import { NotificationManager } from './notification';
import type { Reminder } from '../renderer/types/reminder';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// ─────────────────────────────────────────────────────────
// WSL / 仮想環境の互換性設定
// GPU アクセラレーションが動作しない環境（WSL2 など）では
// ハードウェアアクセラレーションを無効にしてソフトウェアレンダリングにフォールバック
// この呼び出しは app.whenReady() より前に行う必要がある
// ─────────────────────────────────────────────────────────
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

// ─────────────────────────────────────────────────────────
// Windows 通知を動作させるために必要な設定
// setAppUserModelId を設定しないと Windows の通知センターに通知が届かない
// ─────────────────────────────────────────────────────────
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
  // パッケージ済み: process.resourcesPath 以下
  // 開発時: プロジェクトルートの resources/ 以下
  const base = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  if (process.platform === 'win32') return path.join(base, 'icon.ico');
  if (process.platform === 'darwin') return path.join(base, 'icon.png');
  return path.join(base, 'icon.png');
}

function createWindow(): void {
  // アプリケーションメニューバーを完全に除去
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 420,
    minHeight: 500,
    icon: resolveIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'ちぃかわりまいんだぁ',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // 開発環境では DevTools を自動で開く（エラー確認用）
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // ウィンドウの閉じるボタンはアプリ終了ではなく非表示にする
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
  // close イベントを外してから閉じることで確実に終了
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

  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow?.webContents.send(IPC_CHANNELS.THEME_CHANGED, theme);
  });
}

function startScheduler(): void {
  scheduler.start((id, title, memo) => {
    // Rendererに発火を通知
    mainWindow?.webContents.send(IPC_CHANNELS.REMINDER_FIRED, id);

    // Windows通知: Webhook設定済み かつ 抑制フラグON の場合はスキップ
    const skipNative = disableNativeNotificationOnWebhook && !!webhookUrl;
    if (!skipNative) {
      notificationManager.show({ id, title, memo }, (firedId) => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send(IPC_CHANNELS.FOCUS_REMINDER, firedId);
      });
    }

    // Webhook 送信
    notificationManager.sendWebhook(webhookUrl, title);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  initTray();
  startScheduler();
});

// ウィンドウが全て閉じてもアプリを終了しない (トレイ常駐)
app.on('window-all-closed', () => {
  // 何もしない: トレイの「終了」からのみ終了できる
});

// macOS: Dockアイコンクリック時にウィンドウがなければ再作成
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
