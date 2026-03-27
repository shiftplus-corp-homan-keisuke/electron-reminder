import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types/reminder';
import { dexieStorage } from '../lib/dexie-storage';
import { getAutoLaunch, setAutoLaunch, setWebhookUrl as ipcSetWebhookUrl, setDisableNativeNotification as ipcSetDisableNativeNotification } from '../lib/ipc';

interface SettingsState {
  settings: AppSettings;
  initialized: boolean;
  hydrated: boolean;

  setTheme(theme: AppSettings['theme']): void;
  setLaunchAtStartup(enabled: boolean): void;
  setWebhookUrl(url: string): void;
  setDisableNativeNotification(disabled: boolean): void;
  setChiikawaMode(enabled: boolean): void;
  initialize(): Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        launchAtStartup: false,
        theme: 'system',
        webhookUrl: '',
        disableNativeNotificationOnWebhook: false,
        chiikawaModeEnabled: true,
      },
      initialized: false,
      hydrated: false,

      setTheme(theme) {
        set((state) => ({
          settings: { ...state.settings, theme },
        }));
      },

      setLaunchAtStartup(enabled) {
        set((state) => ({
          settings: { ...state.settings, launchAtStartup: enabled },
        }));
        // IPCを通じてメインプロセスのスタートアップ設定を更新
        setAutoLaunch(enabled).catch((err) => {
          console.error('[SettingsStore] setAutoLaunch failed:', err);
        });
      },

      setWebhookUrl(url) {
        set((state) => ({
          settings: { ...state.settings, webhookUrl: url },
        }));
        ipcSetWebhookUrl(url).catch((err) => {
          console.error('[SettingsStore] setWebhookUrl failed:', err);
        });
      },

      setDisableNativeNotification(disabled) {
        set((state) => ({
          settings: { ...state.settings, disableNativeNotificationOnWebhook: disabled },
        }));
        ipcSetDisableNativeNotification(disabled).catch((err) => {
          console.error('[SettingsStore] setDisableNativeNotification failed:', err);
        });
      },

      setChiikawaMode(enabled) {
        set((state) => ({
          settings: { ...state.settings, chiikawaModeEnabled: enabled },
        }));
      },

      async initialize() {
        try {
          // IPCからスタートアップ状態を取得してストアに反映
          const launchAtStartup = await getAutoLaunch();
          set((state) => ({
            settings: { ...state.settings, launchAtStartup },
            initialized: true,
          }));
        } catch (err) {
          console.error('[SettingsStore] initialize failed:', err);
          set({ initialized: true });
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: dexieStorage,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[SettingsStore] rehydration failed:', error);
        }
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
