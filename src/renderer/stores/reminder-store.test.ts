import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/dexie-storage', () => ({
  dexieStorage: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

vi.mock('../lib/ipc', () => ({
  syncRemindersToMain: vi.fn(async () => undefined),
}));

import { useReminderStore } from './reminder-store';
import type { Reminder } from '../types/reminder';

function toIso(year: number, monthIndex: number, day: number, hour: number, minute: number): string {
  return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString();
}

function createReminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: overrides.id ?? 'reminder-id',
    title: overrides.title ?? 'test reminder',
    dateTime: overrides.dateTime ?? toIso(2026, 2, 30, 9, 0),
    recurrenceType: overrides.recurrenceType ?? 'once',
    recurrenceConfig: overrides.recurrenceConfig ?? { time: '09:00' },
    enabled: overrides.enabled ?? true,
    nextFireTime: overrides.nextFireTime ?? null,
    firedAt: overrides.firedAt,
    createdAt: overrides.createdAt ?? toIso(2026, 2, 29, 12, 0),
    updatedAt: overrides.updatedAt ?? toIso(2026, 2, 29, 12, 0),
    categoryId: overrides.categoryId,
  };
}

describe('useReminderStore schedule filters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 9, 0, 0, 0));
    useReminderStore.setState({ reminders: [], filter: 'pending', focusedReminderId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    useReminderStore.setState({ reminders: [], filter: 'pending', focusedReminderId: null });
  });

  it('today フィルタは送信済み once と未送信の当日予定を含み、範囲外の送信済み once を含まない', () => {
    const sentOnceToday = createReminder({
      id: 'sent-once-today',
      title: 'sent once today',
      dateTime: toIso(2026, 2, 30, 15, 0),
      firedAt: toIso(2026, 2, 30, 15, 1),
    });
    const pendingToday = createReminder({
      id: 'pending-today',
      title: 'pending today',
      recurrenceType: 'daily',
      dateTime: toIso(2026, 2, 28, 18, 0),
      nextFireTime: toIso(2026, 2, 30, 18, 0),
      firedAt: undefined,
    });
    const sentOnceOutOfRange = createReminder({
      id: 'sent-once-next-week',
      title: 'sent once next week',
      dateTime: toIso(2026, 3, 6, 9, 0),
      firedAt: toIso(2026, 3, 6, 9, 1),
    });

    useReminderStore.setState({
      reminders: [sentOnceToday, pendingToday, sentOnceOutOfRange],
      filter: 'today',
    });

    const reminders = useReminderStore.getState().getFilteredReminders();
    const ids = reminders.map((reminder) => reminder.id);

    expect(ids).toEqual(['sent-once-today', 'pending-today']);
    expect(useReminderStore.getState().getCountByFilter('today')).toBe(2);
  });

  it('thisWeek フィルタは送信済み once と未送信の今週予定を含み、範囲外の送信済み once を含まない', () => {
    const sentOnceToday = createReminder({
      id: 'sent-once-today',
      title: 'sent once today',
      dateTime: toIso(2026, 2, 30, 15, 0),
      firedAt: toIso(2026, 2, 30, 15, 1),
    });
    const pendingToday = createReminder({
      id: 'pending-today',
      title: 'pending today',
      recurrenceType: 'daily',
      dateTime: toIso(2026, 2, 28, 18, 0),
      nextFireTime: toIso(2026, 2, 30, 18, 0),
      firedAt: undefined,
    });
    const sentOnceThisWeek = createReminder({
      id: 'sent-once-this-week',
      title: 'sent once this week',
      dateTime: toIso(2026, 3, 2, 10, 0),
      firedAt: toIso(2026, 3, 2, 10, 1),
    });
    const pendingThisWeek = createReminder({
      id: 'pending-this-week',
      title: 'pending this week',
      recurrenceType: 'weekly',
      recurrenceConfig: { time: '11:00', dayOfWeek: 5 },
      dateTime: toIso(2026, 2, 20, 11, 0),
      nextFireTime: toIso(2026, 3, 3, 11, 0),
      firedAt: undefined,
    });
    const sentOnceOutOfRange = createReminder({
      id: 'sent-once-next-week',
      title: 'sent once next week',
      dateTime: toIso(2026, 3, 6, 9, 0),
      firedAt: toIso(2026, 3, 6, 9, 1),
    });

    useReminderStore.setState({
      reminders: [
        sentOnceOutOfRange,
        pendingThisWeek,
        pendingToday,
        sentOnceThisWeek,
        sentOnceToday,
      ],
      filter: 'thisWeek',
    });

    const reminders = useReminderStore.getState().getFilteredReminders();
    const ids = reminders.map((reminder) => reminder.id);

    expect(ids).toEqual([
      'sent-once-today',
      'pending-today',
      'sent-once-this-week',
      'pending-this-week',
    ]);
    expect(useReminderStore.getState().getCountByFilter('thisWeek')).toBe(4);
  });
});
