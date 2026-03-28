import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { Reminder } from '../renderer/types/reminder';
import type { DigestSettingsPayload } from '../renderer/lib/ipc';

contextBridge.exposeInMainWorld('electronAPI', {
  syncReminders: (reminders: Reminder[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_REMINDERS, reminders),

  onReminderFired: (callback: (id: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on(IPC_CHANNELS.REMINDER_FIRED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.REMINDER_FIRED, listener);
  },

  onFocusReminder: (callback: (id: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on(IPC_CHANNELS.FOCUS_REMINDER, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FOCUS_REMINDER, listener);
  },

  getAutoLaunch: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTO_LAUNCH),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_AUTO_LAUNCH, enabled),

  getNativeTheme: () => ipcRenderer.invoke(IPC_CHANNELS.GET_NATIVE_THEME),
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      theme: 'light' | 'dark'
    ) => callback(theme);
    ipcRenderer.on(IPC_CHANNELS.THEME_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_CHANGED, listener);
  },

  setWebhookUrl: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_WEBHOOK_URL, url),

  setDisableNativeNotification: (disabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_DISABLE_NATIVE_NOTIFICATION, disabled),

  setDigestSettings: (payload: DigestSettingsPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_DIGEST_SETTINGS, payload),
});
