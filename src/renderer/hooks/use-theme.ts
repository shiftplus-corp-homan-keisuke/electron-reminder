import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { getElectronAPI } from '../lib/ipc';

function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark);
}

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);

  // テーマをdocumentに適用
  useEffect(() => {
    if (settings.theme === 'dark') {
      applyTheme(true);
    } else if (settings.theme === 'light') {
      applyTheme(false);
    } else {
      // system: Electron nativeTheme から初期値を取得
      getElectronAPI()
        ?.getNativeTheme()
        .then((t) => applyTheme(t === 'dark'))
        .catch(() => applyTheme(false));
    }
  }, [settings.theme]);

  // system選択中にOSのテーマ変更を監視
  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    const unsubscribe = api.onThemeChanged((t) => {
      if (settings.theme === 'system') {
        applyTheme(t === 'dark');
      }
    });

    return unsubscribe;
  }, [settings.theme]);

  return { theme: settings.theme, setTheme };
}
