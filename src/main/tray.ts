import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly showWindowFn: () => void,
    private readonly quitFn: () => void,
    private readonly toggleAutoLaunchFn: () => void
  ) {}

  init(): void {
    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, '../../resources');

    const iconPath = path.join(
      resourcesPath,
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    );

    const icon = fs.existsSync(iconPath)
      ? iconPath
      : nativeImage.createEmpty();

    this.tray = new Tray(icon);
    this.tray.setToolTip('ちぃかわりまいんだぁ');

    this.tray.on('click', () => {
      this.showWindowFn();
    });
  }

  buildContextMenu(launchAtStartup: boolean): void {
    if (!this.tray) return;

    const menu = Menu.buildFromTemplate([
      {
        label: '開く',
        click: () => this.showWindowFn(),
      },
      { type: 'separator' },
      {
        label: 'スタートアップに登録',
        type: 'checkbox',
        checked: launchAtStartup,
        click: () => this.toggleAutoLaunchFn(),
      },
      { type: 'separator' },
      {
        label: '終了',
        click: () => this.quitFn(),
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  updateAutoLaunchMenuItem(enabled: boolean): void {
    this.buildContextMenu(enabled);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
