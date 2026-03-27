import { app } from 'electron';

export class AutoLaunch {
  isEnabled(): boolean {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  }

  enable(): void {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
    });
  }

  disable(): void {
    app.setLoginItemSettings({
      openAtLogin: false,
    });
  }

  set(enabled: boolean): void {
    if (enabled) {
      this.enable();
    } else {
      this.disable();
    }
  }
}

export const autoLaunch = new AutoLaunch();
