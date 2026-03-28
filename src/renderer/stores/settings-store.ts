import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types/reminder';
import { dexieStorage } from '../lib/dexie-storage';
import {
  getAutoLaunch,
  setAutoLaunch,
  setWebhookUrl as ipcSetWebhookUrl,
  setDisableNativeNotification as ipcSetDisableNativeNotification,
  setDigestSettings as ipcSetDigestSettings,
} from '../lib/ipc';

interface SettingsState {
  settings: AppSettings;
  initialized: boolean;
  hydrated: boolean;

  setTheme(theme: AppSettings['theme']): void;
  setLaunchAtStartup(enabled: boolean): void;
  setWebhookUrl(url: string): void;
  setDisableNativeNotification(disabled: boolean): void;
  setChiikawaMode(enabled: boolean): void;
  setTodayDigest(enabled: boolean, time: string): void;
  setWeeklyDigest(enabled: boolean, time: string, day: number): void;
  initialize(): Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        launchAtStartup: false,
        theme: 'system',
        webhookUrl: '',
        disableNativeNotificationOnWebhook: false,
        chiikawaModeEnabled: true,
        todayDigestEnabled: false,
        todayDigestTime: '08:00',
        weeklyDigestEnabled: false,
        weeklyDigestTime: '08:00',
        weeklyDigestDay: 1, // 月曜
      },
      initialized: false,
      hydrated: false,

      setTheme(theme) {
        set((state) => ({ settings: { ...state.settings, theme } }));
      },

      setLaunchAtStartup(enabled) {
        set((state) => ({ settings: { ...state.settings, launchAtStartup: enabled } }));
        setAutoLaunch(enabled).catch((err) => {
          console.error('[SettingsStore] setAutoLaunch failed:', err);
        });
      },

      setWebhookUrl(url) {
        set((state) => ({ settings: { ...state.settings, webhookUrl: url } }));
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
        set((state) => ({ settings: { ...state.settings, chiikawaModeEnabled: enabled } }));
      },

      setTodayDigest(enabled, time) {
        set((state) => ({
          settings: { ...state.settings, todayDigestEnabled: enabled, todayDigestTime: time },
        }));
        const { settings } = get();
        ipcSetDigestSettings({
          todayEnabled: enabled,
          todayTime: time,
          weeklyEnabled: settings.weeklyDigestEnabled,
          weeklyTime: settings.weeklyDigestTime,
          weeklyDay: settings.weeklyDigestDay,
        }).catch((err: unknown) => {
          console.error('[SettingsStore] setDigestSettings failed:', err);
        });
      },

      setWeeklyDigest(enabled, time, day) {
        set((state) => ({
          settings: {
            ...state.settings,
            weeklyDigestEnabled: enabled,
            weeklyDigestTime: time,
            weeklyDigestDay: day,
          },
        }));
        const { settings } = get();
        ipcSetDigestSettings({
          todayEnabled: settings.todayDigestEnabled,
          todayTime: settings.todayDigestTime,
          weeklyEnabled: enabled,
          weeklyTime: time,
          weeklyDay: day,
        }).catch((err: unknown) => {
          console.error('[SettingsStore] setDigestSettings failed:', err);
        });
      },

      async initialize() {
        try {
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
