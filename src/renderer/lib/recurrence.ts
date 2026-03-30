import {
  addDays,
  addMonths,
  getDaysInMonth,
  isBefore,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  getDay,
} from 'date-fns';
import type { Reminder } from '../types/reminder';

/**
 * 指定した日付に HH:mm を適用した Date を返す
 */
export function applyTime(date: Date, time: string): Date {
  const [hourStr, minuteStr] = time.split(':');
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  let result = setHours(date, hours);
  result = setMinutes(result, minutes);
  result = setSeconds(result, 0);
  result = setMilliseconds(result, 0);
  return result;
}

/**
 * 次回発火時刻を計算して ISO 8601 文字列で返す
 * 発火不要（onceで発火済み、disabledなど）の場合は null を返す
 */
export function calculateNextFireTime(reminder: Reminder): string | null {
  if (!reminder.enabled) return null;

  const now = new Date();
  const { recurrenceType, recurrenceConfig } = reminder;

  switch (recurrenceType) {
    case 'once':
      return calcOnce(reminder);

    case 'daily':
      return calcDaily(now, recurrenceConfig.time, recurrenceConfig.daysOfWeek).toISOString();

    case 'weekly': {
      const dayOfWeek = recurrenceConfig.dayOfWeek ?? 0;
      return calcWeekly(now, recurrenceConfig.time, dayOfWeek).toISOString();
    }

    case 'monthly': {
      const dayOfMonth = recurrenceConfig.dayOfMonth ?? 1;
      return calcMonthly(now, recurrenceConfig.time, dayOfMonth).toISOString();
    }

    default:
      return null;
  }
}

// --- 内部実装 ---

function calcOnce(reminder: Reminder): string | null {
  // 発火済みなら null
  if (reminder.firedAt) return null;
  return reminder.dateTime;
}

function calcDaily(now: Date, time: string, daysOfWeek?: number[]): Date {
  // 有効な曜日セット（未指定・空・全曜日はすべて「毎日」扱い）
  const activeDays =
    !daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.length === 7
      ? null
      : daysOfWeek;

  // 今日〜7日後で最初の「有効曜日 かつ 指定時刻が未来」の日を探す
  for (let i = 0; i < 8; i++) {
    const candidate = addDays(now, i);
    if (activeDays && !activeDays.includes(getDay(candidate))) continue;
    const candidateAtTime = applyTime(candidate, time);
    if (isBefore(now, candidateAtTime)) return candidateAtTime;
  }

  // 上記でヒットしない場合（全曜日が時刻済み等）→ 翌週最初の有効曜日
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(now, i);
    if (!activeDays || activeDays.includes(getDay(candidate))) {
      return applyTime(candidate, time);
    }
  }

  // フォールバック（通常到達しない）
  return applyTime(addDays(now, 1), time);
}

function calcWeekly(now: Date, time: string, targetDayOfWeek: number): Date {
  const currentDayOfWeek = getDay(now);
  const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  if (daysUntilTarget === 0) {
    // 今日が対象曜日 → 時刻が未来かチェック
    const todayAtTime = applyTime(now, time);
    if (isBefore(now, todayAtTime)) {
      return todayAtTime;
    }
    // 過去なら7日後
    return applyTime(addDays(now, 7), time);
  }

  return applyTime(addDays(now, daysUntilTarget), time);
}

function calcMonthly(now: Date, time: string, targetDayOfMonth: number): Date {
  const candidate = buildMonthlyCandidate(now, targetDayOfMonth, time);
  if (isBefore(now, candidate)) {
    return candidate;
  }
  // 翌月の同日
  return buildMonthlyCandidate(addMonths(now, 1), targetDayOfMonth, time);
}

/**
 * 指定月において targetDayOfMonth の日付を構築する
 * 月末を超える場合は月の最終日にフォールバック
 */
function buildMonthlyCandidate(base: Date, targetDayOfMonth: number, time: string): Date {
  const daysInMonth = getDaysInMonth(base);
  const safeDay = Math.min(targetDayOfMonth, daysInMonth);
  const dateWithDay = setDate(base, safeDay);
  return applyTime(dateWithDay, time);
}
