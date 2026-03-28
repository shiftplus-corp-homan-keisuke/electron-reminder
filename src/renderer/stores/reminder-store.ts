import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder, RecurrenceType, RecurrenceConfig } from '../types/reminder';
import { calculateNextFireTime } from '../lib/recurrence';
import { dexieStorage } from '../lib/dexie-storage';
import { syncRemindersToMain } from '../lib/ipc';

export type ReminderFilter =
  | 'pending'
  | 'done'
  | 'all'
  | 'today'
  | 'thisWeek'
  | RecurrenceType
  | `category:${string}`;

// 今日の範囲 [startOfToday, endOfToday] を返す
function getTodayRange(): [Date, Date] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return [start, end];
}

// 今週の範囲 [startOfToday, 今週日曜の終わり] を返す (月曜始まり)
function getWeekRange(): [Date, Date] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay(): 0=日, 1=月, ..., 6=土 → 月曜からの日数を求める
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
  const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1); // 日曜の終わり
  return [today, sunday]; // 今日〜今週日曜
}

function isDone(r: Reminder): boolean {
  return r.recurrenceType === 'once' && r.nextFireTime === null && !!r.firedAt;
}

function matchesFilter(r: Reminder, filter: ReminderFilter): boolean {
  switch (filter) {
    case 'pending':
      return !isDone(r);
    case 'done':
      return isDone(r);
    case 'all':
      return true;
    case 'today': {
      if (!r.enabled || !r.nextFireTime) return false;
      const [start, end] = getTodayRange();
      const ft = new Date(r.nextFireTime);
      return ft >= start && ft <= end;
    }
    case 'thisWeek': {
      if (!r.enabled || !r.nextFireTime) return false;
      const [start, end] = getWeekRange();
      const ft = new Date(r.nextFireTime);
      return ft >= start && ft <= end;
    }
    default:
      if (filter.startsWith('category:')) {
        const categoryId = filter.slice('category:'.length);
        return r.categoryId === categoryId;
      }
      // 繰り返しタイプでの絞り込みは完了済みを除外
      return r.recurrenceType === (filter as RecurrenceType) && !isDone(r);
  }
}

interface ReminderState {
  reminders: Reminder[];
  filter: ReminderFilter;
  focusedReminderId: string | null;

  addReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'nextFireTime'>): void;
  updateReminder(id: string, data: Partial<Omit<Reminder, 'id' | 'createdAt'>>): void;
  deleteReminder(id: string): void;
  toggleEnabled(id: string): void;
  markFired(id: string): void;
  setFilter(filter: ReminderFilter): void;
  setFocusedReminder(id: string | null): void;
  syncToMain(): void;
  getFilteredReminders(): Reminder[];
  getCountByFilter(filter: ReminderFilter): number;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      filter: 'pending',
      focusedReminderId: null,

      addReminder(data) {
        const now = new Date().toISOString();
        const newReminder: Reminder = {
          ...data,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          nextFireTime: null,
        };
        newReminder.nextFireTime = calculateNextFireTime(newReminder);
        set((state) => ({ reminders: [...state.reminders, newReminder] }));
        get().syncToMain();
      },

      updateReminder(id, data) {
        set((state) => ({
          reminders: state.reminders.map((r) => {
            if (r.id !== id) return r;
            const updated: Reminder = { ...r, ...data, updatedAt: new Date().toISOString() };
            updated.nextFireTime = calculateNextFireTime(updated);
            return updated;
          }),
        }));
        get().syncToMain();
      },

      deleteReminder(id) {
        set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
        get().syncToMain();
      },

      toggleEnabled(id) {
        set((state) => ({
          reminders: state.reminders.map((r) => {
            if (r.id !== id) return r;
            const toggled: Reminder = { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() };
            // 完了済みonceリマインダーを再有効化する場合は firedAt をクリアして復活させる
            if (toggled.enabled && toggled.recurrenceType === 'once' && toggled.firedAt) {
              toggled.firedAt = undefined;
            }
            toggled.nextFireTime = toggled.enabled ? calculateNextFireTime(toggled) : null;
            return toggled;
          }),
        }));
        get().syncToMain();
      },

      markFired(id) {
        const now = new Date().toISOString();
        set((state) => ({
          reminders: state.reminders.map((r) => {
            if (r.id !== id) return r;
            if (r.recurrenceType === 'once') {
              return { ...r, firedAt: now, nextFireTime: null, updatedAt: now };
            }
            const updated: Reminder = { ...r, firedAt: now, updatedAt: now };
            updated.nextFireTime = calculateNextFireTime(updated);
            return updated;
          }),
        }));
        get().syncToMain();
      },

      setFilter(filter) {
        set({ filter });
      },

      setFocusedReminder(id) {
        set({ focusedReminderId: id });
      },

      syncToMain() {
        const { reminders } = get();
        syncRemindersToMain(reminders).catch((err: unknown) => {
          console.error('[ReminderStore] syncToMain failed:', err);
        });
      },

      getFilteredReminders() {
        const { reminders, filter } = get();
        return reminders
          .filter((r) => matchesFilter(r, filter))
          .sort((a, b) => {
            if (a.nextFireTime === null && b.nextFireTime === null) return 0;
            if (a.nextFireTime === null) return 1;
            if (b.nextFireTime === null) return -1;
            return a.nextFireTime.localeCompare(b.nextFireTime);
          });
      },

      getCountByFilter(filter) {
        const { reminders } = get();
        return reminders.filter((r) => matchesFilter(r, filter)).length;
      },
    }),
    {
      name: 'reminder-storage',
      storage: dexieStorage,
    },
  ),
);
