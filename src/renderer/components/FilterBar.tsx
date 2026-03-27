import { cn } from '@/lib/utils';
import { useReminderStore } from '../stores/reminder-store';
import type { ReminderFilter } from '../stores/reminder-store';

interface FilterBarProps {
  filter: ReminderFilter;
  onFilterChange: (filter: ReminderFilter) => void;
}

const FILTER_TABS: { value: ReminderFilter; label: string }[] = [
  { value: 'pending', label: '未完了' },
  { value: 'done',    label: '完了' },
  { value: 'all',     label: 'すべて' },
  { value: 'once',    label: '1回' },
  { value: 'daily',   label: '毎日' },
  { value: 'weekly',  label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly',  label: '毎年' },
];

export default function FilterBar({ filter, onFilterChange }: FilterBarProps) {
  const reminders = useReminderStore((s) => s.reminders);

  const getCount = (value: ReminderFilter): number => {
    const isDone = (r: (typeof reminders)[0]) =>
      r.recurrenceType === 'once' && r.nextFireTime === null && !!r.firedAt;
    switch (value) {
      case 'pending': return reminders.filter((r) => !isDone(r)).length;
      case 'done':    return reminders.filter((r) => isDone(r)).length;
      case 'all':     return reminders.length;
      default:        return reminders.filter((r) => r.recurrenceType === value).length;
    }
  };

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b border-border shrink-0 bg-background">
      {FILTER_TABS.map((tab) => {
        const count = getCount(tab.value);
        const isActive = filter === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.04]'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]',
            )}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[17px] h-[17px] px-1',
                  isActive
                    ? 'bg-white/30 text-white'
                    : 'bg-muted-foreground/15 text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
