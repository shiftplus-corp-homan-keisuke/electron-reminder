import { Notification, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export class NotificationManager {
  show(
    reminder: { id: string; title: string; memo: string },
    onClickCallback: (id: string) => void
  ): void {
    // ── Windows ネイティブ通知 ──────────────────────────────
    // Notification.isSupported() が false の環境（WSL 等）では
    // トースト通知は使えないため、フォールバック処理のみ行う
    if (!Notification.isSupported()) {
      console.info(
        '[Notification] Notification.isSupported() = false。' +
        'WSL / 仮想環境では Windows トースト通知は届きません。' +
        'Windows ネイティブ環境で実行してください。'
      );
      // フォールバック: タスクバーをフラッシュしてユーザーに気づかせる
      this._flashTaskbar();
      return;
    }

    const body = reminder.memo ? reminder.memo.slice(0, 100) : '';

    const iconPath = path.join(
      process.resourcesPath ?? path.join(__dirname, '../../resources'),
      'icon.png'
    );
    const icon = fs.existsSync(iconPath) ? iconPath : undefined;

    const notification = new Notification({
      title: reminder.title,
      body,
      ...(icon ? { icon } : {}),
    });

    notification.on('click', () => {
      onClickCallback(reminder.id);
    });

    notification.on('failed', (_event, error) => {
      console.error('[Notification] 通知の表示に失敗しました:', error);
    });

    notification.show();
  }

  /** タスクバーボタンを点滅させる (WSL や通知が使えない環境のフォールバック) */
  private _flashTaskbar(): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.flashFrame(true);
      // 5 秒後にフラッシュを止める
      setTimeout(() => win.flashFrame(false), 5000);
    }
  }
}

export const notificationManager = new NotificationManager();
