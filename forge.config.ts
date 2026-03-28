import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { PublisherGithub } from '@electron-forge/publisher-github';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'resources/icon',
    executableName: 'electron-reminder',
    extraResource: [
      'resources/icon.ico',
      'resources/icon.png',
    ],
    appCopyright: `Copyright © ${new Date().getFullYear()}`,
    win32metadata: {
      FileDescription: 'ちぃかわりまいんだぁ',
      OriginalFilename: 'electron-reminder.exe',
      ProductName: 'ちぃかわりまいんだぁ',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'electron_reminder',
      authors: 'ちぃかわりまいんだぁ',
      setupIcon: 'resources/icon.ico',
      setupExe: 'ChiikawaReminderSetup.exe',
    }),
    new MakerZIP({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'shiftplus-corp-homan-keisuke',
        name: 'electron-reminder',
      },
      prerelease: false,
      draft: true, // 下書きとして作成 → GitHub上で確認後に手動公開
    }),
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
