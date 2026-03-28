import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategoryStore } from '../stores/category-store';
import type { ReminderFilter } from '../stores/reminder-store';

const FILTER_LABELS: Record<string, string> = {
  pending:  '未完了',
  done:     '完了',
  all:      'すべて',
  today:    '今日の予定',
  thisWeek: '今週の予定',
  once:     '1回のみ',
  daily:    '毎日',
  weekly:   '毎週',
  monthly:  '毎月',
  yearly:   '毎年',
};

interface HeaderProps {
  filter: ReminderFilter;
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export default function Header({ filter, onAddClick, onSettingsClick }: HeaderProps) {
  const categories = useCategoryStore((s) => s.categories);

  const getFilterLabel = (): string => {
    if (filter.startsWith('category:')) {
      const id = filter.slice('category:'.length);
      const cat = categories.find((c) => c.id === id);
      return cat ? `${cat.icon} ${cat.name}` : 'カテゴリー';
    }
    return FILTER_LABELS[filter] ?? filter;
  };

  return (
    <header className="flex h-[52px] items-center gap-3 px-4 shrink-0 bg-background border-b border-border z-10">
      {/* アプリタイトル */}
      <span className="text-sm font-bold text-foreground/80 select-none truncate flex-1 min-w-0">
        {getFilterLabel()}
      </span>

      {/* 右: アクションボタン */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          onClick={onAddClick}
          size="sm"
          aria-label="リマインダーを追加 (Ctrl+N)"
          className="h-8 px-3 rounded-xl text-xs gap-1.5 bg-primary hover:bg-primary/90 font-bold"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          追加
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="設定"
          className="size-8 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Settings className="size-4" strokeWidth={1.8} />
        </Button>
      </div>
    </header>
  );
}
