import { Notification, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

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
      timeoutType: 'never',
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

  /** リマインダー発火時に Webhook へ POST する */
  sendWebhook(webhookUrl: string, title: string): void {
    if (!webhookUrl) return;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(webhookUrl);
    } catch {
      console.error('[Webhook] 無効なURLです:', webhookUrl);
      return;
    }

    const payload = JSON.stringify({
      message: title,
      app_name: 'Electron Reminder',
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      console.info(`[Webhook] レスポンス: ${res.statusCode}`);
      res.resume(); // ボディを読み捨てて接続を解放
    });

    req.on('error', (err) => {
      console.error('[Webhook] 送信に失敗しました:', err.message);
    });

    req.write(payload);
    req.end();
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
