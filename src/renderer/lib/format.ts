import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import type { RecurrenceType, Reminder } from '../types/reminder';

function formatReminderDateTime(dateTime: string): string {
  const d = new Date(dateTime);
  const t = format(d, 'HH:mm');
  if (isToday(d)) return `今日 ${t}`;
  if (isTomorrow(d)) return `明日 ${t}`;
  if (isThisWeek(d, { weekStartsOn: 1 })) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${days[d.getDay()]} ${t}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${t}`;
}

function isSentOnceReminder(reminder: Pick<Reminder, 'recurrenceType' | 'nextFireTime' | 'firedAt'>): boolean {
  return reminder.recurrenceType === 'once' && reminder.nextFireTime === null && !!reminder.firedAt;
}

export function formatFireTime(reminder: Pick<Reminder, 'recurrenceType' | 'nextFireTime' | 'enabled' | 'firedAt' | 'dateTime'>): string {
  if (isSentOnceReminder(reminder)) {
    return `送信済み • ${formatReminderDateTime(reminder.dateTime)}`;
  }
  if (!reminder.enabled) return '無効';
  if (!reminder.nextFireTime) return '完了';
  return formatReminderDateTime(reminder.nextFireTime);
}

export function recurrenceLabel(type: RecurrenceType): string {
  const map: Record<RecurrenceType, string> = {
    once: '1回',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
  };
  return map[type];
}

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
];

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}日`,
}));
