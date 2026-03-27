import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'resources/icon',
    executableName: 'electron-reminder',
    // アイコンを process.resourcesPath 下に配置
    extraResource: [
      'resources/icon.png',
    ],
    // Windows 向けメタデータ
    appCopyright: `Copyright © ${new Date().getFullYear()}`,
    win32metadata: {
      FileDescription: 'ちぃかわりまいんだぁ',
      OriginalFilename: 'electron-reminder.exe',
      ProductName: 'ちぃかわりまいんだぁ',
    },
  },
  rebuildConfig: {},
  makers: [
    // Windows: Squirrel インストーラー (npm run make on Windows)
    new MakerSquirrel({
      name: 'electron_reminder',
      authors: 'ちぃかわりまいんだぁ',
      setupIcon: 'resources/icon.ico',
      setupExe: 'ChiikawaReminderSetup.exe',
    }),
    // 全プラットフォーム: ZIP (CI / クロスビルド検証用)
    new MakerZIP({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
