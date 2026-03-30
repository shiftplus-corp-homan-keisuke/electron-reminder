import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculateNextFireTime } from './recurrence';
import type { Reminder } from '../types/reminder';

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'test-id',
    title: 'test',
    dateTime: new Date(2026, 2, 30, 9, 0, 0, 0).toISOString(),
    recurrenceType: 'daily',
    recurrenceConfig: { time: '09:00' },
    enabled: true,
    nextFireTime: null,
    createdAt: new Date(2026, 2, 1).toISOString(),
    updatedAt: new Date(2026, 2, 1).toISOString(),
    ...overrides,
  };
}

describe('calculateNextFireTime - daily with daysOfWeek', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('daysOfWeek 未指定は毎日: 翌日の同時刻を返す', () => {
    // 2026-03-30 (月) 10:00 → 翌日 2026-03-31 (火) 09:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 10, 0, 0, 0));

    const reminder = makeReminder({ recurrenceConfig: { time: '09:00' } });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(31);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });

  it('平日のみ: 金曜の時刻済みなら翌月曜を返す', () => {
    // 2026-04-03 (金) 10:00 → 次の月曜 2026-04-06
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 3, 10, 0, 0, 0));

    const reminder = makeReminder({
      recurrenceConfig: { time: '09:00', daysOfWeek: [1, 2, 3, 4, 5] },
    });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getDate()).toBe(6);
    expect(date.getDay()).toBe(1); // 月曜
  });

  it('平日のみ: 月曜の時刻前なら当日を返す', () => {
    // 2026-03-30 (月) 08:00 → 当日 2026-03-30 09:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 8, 0, 0, 0));

    const reminder = makeReminder({
      recurrenceConfig: { time: '09:00', daysOfWeek: [1, 2, 3, 4, 5] },
    });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getDate()).toBe(30);
    expect(date.getDay()).toBe(1);
  });

  it('週末のみ: 月曜なら次の土曜を返す', () => {
    // 2026-03-30 (月) 10:00 → 2026-04-04 (土)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 10, 0, 0, 0));

    const reminder = makeReminder({
      recurrenceConfig: { time: '09:00', daysOfWeek: [0, 6] },
    });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getDay()).toBe(6); // 土曜
    expect(date.getDate()).toBe(4);
    expect(date.getMonth()).toBe(3); // 4月
  });

  it('週末のみ: 日曜の時刻前なら当日日曜を返す', () => {
    // 2026-04-05 (日) 08:00 → 当日 2026-04-05 09:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 5, 8, 0, 0, 0));

    const reminder = makeReminder({
      recurrenceConfig: { time: '09:00', daysOfWeek: [0, 6] },
    });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getDay()).toBe(0); // 日曜
    expect(date.getDate()).toBe(5);
  });

  it('全曜日指定は毎日扱い: 翌日の同時刻を返す', () => {
    // 2026-03-30 (月) 10:00 → 翌日
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 10, 0, 0, 0));

    const reminder = makeReminder({
      recurrenceConfig: { time: '09:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    });
    const result = calculateNextFireTime(reminder)!;
    const date = new Date(result);

    expect(date.getDate()).toBe(31);
  });

  it('disabled なら null を返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 10, 0, 0, 0));

    const reminder = makeReminder({
      enabled: false,
      recurrenceConfig: { time: '09:00', daysOfWeek: [1, 2, 3, 4, 5] },
    });

    expect(calculateNextFireTime(reminder)).toBeNull();
  });
});

describe('formatDaysOfWeek', () => {
  it('全パターンのラベルが正しい', async () => {
    const { formatDaysOfWeek } = await import('./format');

    expect(formatDaysOfWeek(undefined)).toBe('毎日');
    expect(formatDaysOfWeek([])).toBe('毎日');
    expect(formatDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe('毎日');
    expect(formatDaysOfWeek([1, 2, 3, 4, 5])).toBe('平日（月〜金）');
    expect(formatDaysOfWeek([0, 6])).toBe('週末（土日）');
    expect(formatDaysOfWeek([1, 3])).toBe('月・水');
  });
});
