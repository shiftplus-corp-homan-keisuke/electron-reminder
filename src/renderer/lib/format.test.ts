import { describe, expect, it, vi } from 'vitest';
import { formatFireTime } from './format';

describe('formatFireTime', () => {
  it('送信済み once は送信済みだと分かる文言で表示する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 9, 0, 0, 0));

    const result = formatFireTime({
      recurrenceType: 'once',
      enabled: true,
      nextFireTime: null,
      firedAt: new Date(2026, 2, 30, 15, 1, 0, 0).toISOString(),
      dateTime: new Date(2026, 2, 30, 15, 0, 0, 0).toISOString(),
    });

    expect(result).toContain('送信済み');
    expect(result).toContain('今日 15:00');

    vi.useRealTimers();
  });
});
