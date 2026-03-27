import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReminderStore } from '../stores/reminder-store';
import type { ReminderFilter } from '../stores/reminder-store';

const FILTER_OPTIONS: { value: ReminderFilter; label: string }[] = [
  { value: 'pending', label: '未完了' },
  { value: 'done',    label: '完了' },
  { value: 'all',     label: 'すべて' },
  { value: 'once',    label: '1回' },
  { value: 'daily',   label: '毎日' },
  { value: 'weekly',  label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly',  label: '毎年' },
];

interface HeaderProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export default function Header({ onAddClick, onSettingsClick }: HeaderProps) {
  const reminders = useReminderStore((s) => s.reminders);
  const filter = useReminderStore((s) => s.filter);
  const setFilter = useReminderStore((s) => s.setFilter);

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

  const currentLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'すべて';
  const currentCount = getCount(filter);

  return (
    <header className="flex h-[56px] items-center gap-2 px-3 shrink-0 bg-background border-b border-border">
      {/* 左: 追加ボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddClick}
        aria-label="リマインダーを追加 (Ctrl+N)"
        className="size-8 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
      >
        <Plus className="size-4" strokeWidth={2.2} />
      </Button>

      {/* 中央: フィルターセレクト */}
      <div className="flex-1 min-w-0">
        <Select value={filter} onValueChange={(v) => setFilter(v as ReminderFilter)}>
          <SelectTrigger className="h-8 rounded-xl border-border bg-muted/50 text-xs font-medium focus:ring-primary/30 w-full">
            <SelectValue>
              <span className="flex items-center gap-1.5">
                {currentLabel}
                {currentCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[17px] h-[17px] px-1">
                    {currentCount}
                  </span>
                )}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {FILTER_OPTIONS.map((opt) => {
              const count = getCount(opt.value);
              return (
                <SelectItem key={opt.value} value={opt.value} className="text-xs rounded-lg">
                  <span className="flex items-center gap-1.5">
                    {opt.label}
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold min-w-[17px] h-[17px] px-1">
                        {count}
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 右: 設定ボタン */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        aria-label="設定"
        className="size-8 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Settings className="size-4" strokeWidth={1.8} />
      </Button>
    </header>
  );
}
