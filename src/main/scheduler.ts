import type { Reminder } from '../renderer/types/reminder';

export interface DigestSettings {
  todayEnabled: boolean;
  todayTime: string;    // "HH:mm"
  weeklyEnabled: boolean;
  weeklyTime: string;   // "HH:mm"
  weeklyDay: number;    // 0(日)〜6(土)
}

export class Scheduler {
  private reminders: Reminder[] = [];
  private timer: NodeJS.Timeout | null = null;
  private onFireCallback: ((id: string, title: string) => void) | null = null;
  private onDigestCallback: ((type: 'today' | 'week', items: Reminder[]) => void) | null = null;
  private digestSettings: DigestSettings | null = null;

  // id → 発火済みの nextFireTime を記録。同じ nextFireTime の二重発火を防止する。
  // setTimeout ベースの firedIds.clear() だとスリープ復帰時に一斉発火して
  // 競合が起きるため、発火済み時刻で判定する方式に変更。
  private firedMap: Map<string, string> = new Map();
  private digestFiredKeys: Set<string> = new Set();

  start(
    onFire: (id: string, title: string) => void,
    onDigest: (type: 'today' | 'week', items: Reminder[]) => void,
  ): void {
    this.onFireCallback = onFire;
    this.onDigestCallback = onDigest;
    this.timer = setInterval(() => this.check(), 60_000);
    this.check();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** スリープ復帰時などに外部から即座にチェックを実行する */
  checkNow(): void {
    this.check();
  }

  updateReminders(reminders: Reminder[]): void {
    this.reminders = reminders;
    this.firedMap.clear();
  }

  updateDigestSettings(settings: DigestSettings): void {
    this.digestSettings = settings;
  }

  private check(): void {
    const now = new Date();
    this.checkReminders(now);
    this.checkDigest(now);
  }

  private checkReminders(now: Date): void {
    const nowMs = now.getTime();

    for (const r of this.reminders) {
      if (!r.enabled || r.nextFireTime === null) continue;

      // この nextFireTime を既に発火済みならスキップ
      if (this.firedMap.get(r.id) === r.nextFireTime) continue;

      const fireMs = new Date(r.nextFireTime).getTime();
      const diff = nowMs - fireMs;

      // 発火条件: 予定時刻の30秒前〜過去すべて
      // スリープで数時間経過しても、復帰後に確実に発火する
      if (diff >= -30_000) {
        this.firedMap.set(r.id, r.nextFireTime);
        this.onFireCallback?.(r.id, r.title);
      }
    }
  }

  private checkDigest(now: Date): void {
    if (!this.digestSettings) return;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dateStr = now.toISOString().split('T')[0];

    // 今日のダイジェスト
    // 条件: 設定時刻を過ぎていて、当日まだ未発火
    // スリープで設定時刻を跨いでも復帰後に発火する
    if (this.digestSettings.todayEnabled && this.digestSettings.todayTime) {
      const [h, m] = this.digestSettings.todayTime.split(':').map(Number);
      const targetMinutes = h * 60 + m;
      const key = `today-${dateStr}`;
      if (currentMinutes >= targetMinutes && !this.digestFiredKeys.has(key)) {
        this.digestFiredKeys.add(key);
        this.onDigestCallback?.('today', this.getTodayReminders(now));
      }
    }

    // 今週のダイジェスト (指定曜日のみ)
    if (this.digestSettings.weeklyEnabled && this.digestSettings.weeklyTime) {
      if (now.getDay() === this.digestSettings.weeklyDay) {
        const [h, m] = this.digestSettings.weeklyTime.split(':').map(Number);
        const targetMinutes = h * 60 + m;
        const key = `weekly-${dateStr}`;
        if (currentMinutes >= targetMinutes && !this.digestFiredKeys.has(key)) {
          this.digestFiredKeys.add(key);
          this.onDigestCallback?.('week', this.getWeekReminders(now));
        }
      }
    }
  }

  private getTodayReminders(now: Date): Reminder[] {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return this.reminders.filter((r) => {
      if (!r.enabled || !r.nextFireTime) return false;
      const ft = new Date(r.nextFireTime);
      return ft >= start && ft <= end;
    });
  }

  private getWeekReminders(now: Date): Reminder[] {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 月曜始まり・日曜終わりの今週範囲
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
    const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return this.reminders.filter((r) => {
      if (!r.enabled || !r.nextFireTime) return false;
      const ft = new Date(r.nextFireTime);
      return ft >= today && ft <= sunday;
    });
  }
}
