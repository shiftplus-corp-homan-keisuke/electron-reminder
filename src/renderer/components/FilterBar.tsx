import { cn } from '@/lib/utils';
import type { ReminderFilter } from '../stores/reminder-store';

interface FilterBarProps {
  filter: ReminderFilter;
  onFilterChange: (filter: ReminderFilter) => void;
}

const FILTER_TABS: { value: ReminderFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '有効' },
  { value: 'disabled', label: '無効' },
  { value: 'once', label: '1回' },
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
];

export default function FilterBar({ filter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-none border-b border-border shrink-0">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onFilterChange(tab.value)}
          className={cn(
            'rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors',
            filter === tab.value
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
