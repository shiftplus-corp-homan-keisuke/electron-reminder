import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder, RecurrenceType, RecurrenceConfig } from '../types/reminder';
import { calculateNextFireTime } from '../lib/recurrence';
import { dexieStorage } from '../lib/dexie-storage';
import { syncRemindersToMain } from '../lib/ipc';

export type ReminderFilter = 'pending' | 'done' | 'all' | RecurrenceType;

interface ReminderState {
  reminders: Reminder[];
  filter: ReminderFilter;
  focusedReminderId: string | null;

  // CRUD
  addReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'nextFireTime'>): void;
  updateReminder(id: string, data: Partial<Omit<Reminder, 'id' | 'createdAt'>>): void;
  deleteReminder(id: string): void;
  toggleEnabled(id: string): void;

  // 発火後処理
  markFired(id: string): void;

  // フィルター
  setFilter(filter: ReminderFilter): void;

  // フォーカス (通知クリック時)
  setFocusedReminder(id: string | null): void;

  // メインプロセスへの同期
  syncToMain(): void;

  // フィルター後のリマインダーを返す (ソート込み)
  getFilteredReminders(): Reminder[];
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
        // nextFireTimeを計算
        newReminder.nextFireTime = calculateNextFireTime(newReminder);

        set((state) => ({ reminders: [...state.reminders, newReminder] }));
        get().syncToMain();
      },

      updateReminder(id, data) {
        set((state) => ({
          reminders: state.reminders.map((r) => {
            if (r.id !== id) return r;
            const updated: Reminder = {
              ...r,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            updated.nextFireTime = calculateNextFireTime(updated);
            return updated;
          }),
        }));
        get().syncToMain();
      },

      deleteReminder(id) {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        }));
        get().syncToMain();
      },

      toggleEnabled(id) {
        set((state) => ({
          reminders: state.reminders.map((r) => {
            if (r.id !== id) return r;
            const toggled: Reminder = {
              ...r,
              enabled: !r.enabled,
              updatedAt: new Date().toISOString(),
            };
            // disabled → nextFireTime を null に
            // enabled  → 再計算
            toggled.nextFireTime = toggled.enabled
              ? calculateNextFireTime(toggled)
              : null;
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
              // 1回限り → firedAtをセットし nextFireTime をnullに
              return {
                ...r,
                firedAt: now,
                nextFireTime: null,
                updatedAt: now,
              };
            }

            // 繰り返し → 次回の nextFireTime を再計算
            const updated: Reminder = {
              ...r,
              firedAt: now,
              updatedAt: now,
            };
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
        syncRemindersToMain(reminders).catch((err) => {
          console.error('[ReminderStore] syncToMain failed:', err);
        });
      },

      getFilteredReminders() {
        const { reminders, filter } = get();

        const filtered = reminders.filter((r) => {
          // 完了 = 1回きりで発火済み (nextFireTime === null かつ firedAt あり)
          const isDone = r.recurrenceType === 'once' && r.nextFireTime === null && !!r.firedAt;

          switch (filter) {
            case 'pending':
              return !isDone;
            case 'done':
              return isDone;
            case 'all':
              return true;
            default:
              // RecurrenceType によるフィルター
              return r.recurrenceType === filter;
          }
        });

        // nextFireTime の昇順ソート、null は末尾
        return filtered.sort((a, b) => {
          if (a.nextFireTime === null && b.nextFireTime === null) return 0;
          if (a.nextFireTime === null) return 1;
          if (b.nextFireTime === null) return -1;
          return a.nextFireTime.localeCompare(b.nextFireTime);
        });
      },
    }),
    {
      name: 'reminder-storage',
      storage: dexieStorage,
    },
  ),
);
