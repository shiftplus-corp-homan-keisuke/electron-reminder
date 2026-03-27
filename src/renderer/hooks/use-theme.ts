import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { getElectronAPI } from '../lib/ipc';

function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark);
}

function applyChiikawaMode(enabled: boolean): void {
  // documentElement に付与することで .simple.dark が同一要素に同居できる
  document.documentElement.classList.toggle('simple', !enabled);
}

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const setTheme = useSettingsStore((s) => s.setTheme);

  // hydration完了後にテーマをdocumentに適用
  useEffect(() => {
    if (!hydrated) return;

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
  }, [settings.theme, hydrated]);

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

  // ちぃかわもーど切り替え
  useEffect(() => {
    if (!hydrated) return;
    applyChiikawaMode(settings.chiikawaModeEnabled);
    // hydrated 後は index.html の fallback 背景色を除去して CSS 変数に委ねる
    document.documentElement.style.removeProperty('background');
  }, [settings.chiikawaModeEnabled, hydrated]);

  return { theme: settings.theme, setTheme };
}
