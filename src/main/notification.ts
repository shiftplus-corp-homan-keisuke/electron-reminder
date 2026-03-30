import { Notification, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import type { Reminder } from '../renderer/types/reminder';

export class NotificationManager {
  private resolveIcon(): string | undefined {
    const iconPath = path.join(
      process.resourcesPath ?? path.join(__dirname, '../../resources'),
      'icon.png'
    );
    return fs.existsSync(iconPath) ? iconPath : undefined;
  }

  show(
    reminder: { id: string; title: string },
    onClickCallback: (id: string) => void
  ): void {
    if (!Notification.isSupported()) {
      console.info('[Notification] Notification.isSupported() = false。WSL / 仮想環境では通知は届きません。');
      this._flashTaskbar();
      return;
    }

    const icon = this.resolveIcon();
    const notification = new Notification({
      title: reminder.title,
      body: '',
      timeoutType: 'never',
      ...(icon ? { icon } : {}),
    });

    notification.on('click', () => onClickCallback(reminder.id));
    notification.on('failed', (_event, error) => {
      console.error('[Notification] 通知の表示に失敗しました:', error);
    });
    notification.show();
  }

  /** ダイジェスト通知 */
  showDigest(type: 'today' | 'week', items: Reminder[]): void {
    if (!Notification.isSupported()) {
      this._flashTaskbar();
      return;
    }

    const count = items.length;
    if (count === 0) return;

    const title = type === 'today'
      ? `📅 今日の予定 (${count}件)`
      : `📆 今週の予定 (${count}件)`;

    // 最大3件まで箇条書き表示 (OS通知の文字数制限に配慮)
    const bodyLines = items.slice(0, 3).map((r) => {
      const time = r.nextFireTime
        ? new Date(r.nextFireTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '';
      const shortTitle = r.title.split('\n')[0].slice(0, 30);
      return time ? `${time} ${shortTitle}` : shortTitle;
    });
    if (count > 3) bodyLines.push(`...他 ${count - 3} 件`);

    const icon = this.resolveIcon();
    const notification = new Notification({
      title,
      body: bodyLines.join('\n'),
      timeoutType: 'never',
      ...(icon ? { icon } : {}),
    });
    notification.on('failed', (_event, error) => {
      console.error('[Notification] ダイジェスト通知の表示に失敗しました:', error);
    });
    notification.show();
  }

  /** ダイジェスト通知を Webhook へ POST する */
  sendWebhookDigest(webhookUrl: string, type: 'today' | 'week', items: Reminder[]): void {
    if (!webhookUrl || items.length === 0) return;

    const count = items.length;
    const header = type === 'today'
      ? `📅 今日の予定 (${count}件)`
      : `📆 今週の予定 (${count}件)`;

    const lines = items.slice(0, 10).map((r) => {
      const time = r.nextFireTime
        ? new Date(r.nextFireTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '';
      const shortTitle = r.title.split('\n')[0].slice(0, 50);
      return time ? `${time} ${shortTitle}` : shortTitle;
    });
    if (count > 10) lines.push(`...他 ${count - 10} 件`);

    this.sendWebhook(webhookUrl, [header, ...lines].join('\n'));
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
      app_name: 'ちぃかわりまいんだぁ',
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
      res.resume();
    });
    req.on('error', (err) => {
      console.error('[Webhook] 送信に失敗しました:', err.message);
    });
    req.write(payload);
    req.end();
  }

  private _flashTaskbar(): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.flashFrame(true);
      setTimeout(() => win.flashFrame(false), 5000);
    }
  }
}

export const notificationManager = new NotificationManager();
