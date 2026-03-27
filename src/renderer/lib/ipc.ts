import type { Reminder } from '../types/reminder';
import type { AppSettings } from '../types/reminder';

// window.electronAPI の型定義 (preloadで提供)
export interface ElectronAPI {
  syncReminders(reminders: Reminder[]): Promise<void>;
  onReminderFired(callback: (id: string) => void): () => void;
  onFocusReminder(callback: (id: string) => void): () => void;
  getAutoLaunch(): Promise<boolean>;
  setAutoLaunch(enabled: boolean): Promise<void>;
  getNativeTheme(): Promise<'light' | 'dark'>;
  onThemeChanged(callback: (theme: 'light' | 'dark') => void): () => void;
  setWebhookUrl(url: string): Promise<void>;
}

// AppSettings は再エクスポート (他モジュールからの参照用)
export type { AppSettings };

/**
 * ElectronAPIのアクセサ
 * 開発環境でwindow.electronAPIが未定義の場合はnullを返す
 */
export function getElectronAPI(): ElectronAPI | null {
  return (window as typeof window & { electronAPI?: ElectronAPI }).electronAPI ?? null;
}

export async function syncRemindersToMain(reminders: Reminder[]): Promise<void> {
  await getElectronAPI()?.syncReminders(reminders);
}

export async function getAutoLaunch(): Promise<boolean> {
  return (await getElectronAPI()?.getAutoLaunch()) ?? false;
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  await getElectronAPI()?.setAutoLaunch(enabled);
}

export async function getNativeTheme(): Promise<'light' | 'dark'> {
  return (await getElectronAPI()?.getNativeTheme()) ?? 'light';
}

export async function setWebhookUrl(url: string): Promise<void> {
  await getElectronAPI()?.setWebhookUrl(url);
}
