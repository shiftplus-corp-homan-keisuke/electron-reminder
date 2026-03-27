import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types/reminder';
import { dexieStorage } from '../lib/dexie-storage';
import { getAutoLaunch, setAutoLaunch } from '../lib/ipc';

interface SettingsState {
  settings: AppSettings;
  initialized: boolean;

  setTheme(theme: AppSettings['theme']): void;
  setLaunchAtStartup(enabled: boolean): void;
  initialize(): Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        launchAtStartup: false,
        theme: 'system',
      },
      initialized: false,

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
    },
  ),
);
