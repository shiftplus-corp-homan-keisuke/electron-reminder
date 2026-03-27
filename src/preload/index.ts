import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { Reminder } from '../renderer/types/reminder';

contextBridge.exposeInMainWorld('electronAPI', {
  // リマインダーをメインプロセスのスケジューラに同期
  syncReminders: (reminders: Reminder[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_REMINDERS, reminders),

  // 通知発火イベントのリスナー登録 (クリーンアップ関数を返す)
  onReminderFired: (callback: (id: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on(IPC_CHANNELS.REMINDER_FIRED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.REMINDER_FIRED, listener);
  },

  // 通知クリック時のフォーカスイベント
  onFocusReminder: (callback: (id: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on(IPC_CHANNELS.FOCUS_REMINDER, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FOCUS_REMINDER, listener);
  },

  // スタートアップ
  getAutoLaunch: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTO_LAUNCH),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_AUTO_LAUNCH, enabled),

  // システムテーマ
  getNativeTheme: () => ipcRenderer.invoke(IPC_CHANNELS.GET_NATIVE_THEME),
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      theme: 'light' | 'dark'
    ) => callback(theme);
    ipcRenderer.on(IPC_CHANNELS.THEME_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_CHANGED, listener);
  },

  // Webhook URL
  setWebhookUrl: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_WEBHOOK_URL, url),
});
