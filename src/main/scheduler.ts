import type { Reminder } from '../renderer/types/reminder';

export class Scheduler {
  private reminders: Reminder[] = [];
  private timer: NodeJS.Timeout | null = null;
  private firedIds: Set<string> = new Set();
  private onFireCallback: ((id: string, title: string, memo: string) => void) | null = null;

  start(onFire: (id: string, title: string, memo: string) => void): void {
    this.onFireCallback = onFire;
    this.timer = setInterval(() => this.check(), 60_000);
    this.check();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateReminders(reminders: Reminder[]): void {
    this.reminders = reminders;
    this.firedIds.clear();
  }

  private check(): void {
    const now = new Date();

    for (const r of this.reminders) {
      if (!r.enabled || r.nextFireTime === null) continue;

      const fireTime = new Date(r.nextFireTime).getTime();
      const diff = Math.abs(fireTime - now.getTime());

      if (diff <= 30_000 && !this.firedIds.has(r.id)) {
        this.firedIds.add(r.id);
        this.onFireCallback?.(r.id, r.title, r.memo);
      }
    }

    // 120秒後にfiredIdsをクリアして次サイクルの二重発火を防ぐ
    setTimeout(() => {
      this.firedIds.clear();
    }, 120_000);
  }
}
