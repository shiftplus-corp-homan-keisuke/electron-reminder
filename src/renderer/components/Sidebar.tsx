import { useState } from 'react';
import { Bell, CheckCheck, List, CalendarDays, Calendar, Plus, Pencil, Trash2, Repeat, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useReminderStore } from '../stores/reminder-store';
import { useCategoryStore } from '../stores/category-store';
import type { ReminderFilter } from '../stores/reminder-store';
import type { Category } from '../types/reminder';

interface SidebarProps {
  filter: ReminderFilter;
  onFilterChange: (filter: ReminderFilter) => void;
  onAddClick: () => void;
  onSettingsClick: () => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  value: ReminderFilter;
  count: number;
  isActive: boolean;
  color?: string;
  onSelect: (value: ReminderFilter) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function NavItem({ icon, label, value, count, isActive, color, onSelect, onEdit, onDelete }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onSelect(value)}
        className={cn(
          'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer text-left',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <span
          className="size-4 shrink-0 flex items-center justify-center text-sm leading-none"
          style={color ? { color } : undefined}
        >
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {count > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1 shrink-0',
              isActive
                ? 'bg-primary/20 text-primary'
                : 'bg-muted-foreground/15 text-muted-foreground',
            )}
          >
            {count}
          </span>
        )}
      </button>

      {(onEdit || onDelete) && hovered && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-card rounded-lg px-1 py-0.5 shadow-sm border border-border">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="size-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const RECURRENCE_ITEMS: { value: ReminderFilter; label: string }[] = [
  { value: 'once',    label: '1回のみ' },
  { value: 'daily',   label: '毎日' },
  { value: 'weekly',  label: '毎週' },
  { value: 'monthly', label: '毎月' },
];

export default function Sidebar({
  filter,
  onFilterChange,
  onAddClick,
  onSettingsClick,
  onAddCategory,
  onEditCategory,
}: SidebarProps) {
  const getCountByFilter = useReminderStore((s) => s.getCountByFilter);
  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const setFilter = useReminderStore((s) => s.setFilter);

  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
    if (filter === `category:${id}`) {
      setFilter('pending');
    }
  };

  return (
    <aside className="w-56 flex flex-col h-full bg-card/80 backdrop-blur-xl border-r border-border/50 shrink-0 z-10">

      {/* 追加ボタン */}
      <div className="p-3 shrink-0">
        <Button
          onClick={onAddClick}
          className="w-full h-9 rounded-xl text-sm gap-2 bg-primary hover:bg-primary/90 font-bold shadow-sm shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          aria-label="リマインダーを追加 (Ctrl+N)"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          追加
        </Button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-0.5">

        {/* リマインダーセクション */}
        <p className="text-[10px] font-bold text-muted-foreground/60 px-2 py-1 mt-1 uppercase tracking-wider">
          リマインダー
        </p>
        <NavItem
          icon={<Bell className="size-4" strokeWidth={1.8} />}
          label="未完了"
          value="pending"
          count={getCountByFilter('pending')}
          isActive={filter === 'pending'}
          onSelect={onFilterChange}
        />
        <NavItem
          icon={<CheckCheck className="size-4" strokeWidth={1.8} />}
          label="完了"
          value="done"
          count={getCountByFilter('done')}
          isActive={filter === 'done'}
          onSelect={onFilterChange}
        />
        <NavItem
          icon={<List className="size-4" strokeWidth={1.8} />}
          label="すべて"
          value="all"
          count={getCountByFilter('all')}
          isActive={filter === 'all'}
          onSelect={onFilterChange}
        />

        {/* スケジュールセクション */}
        <p className="text-[10px] font-bold text-muted-foreground/60 px-2 py-1 mt-3 uppercase tracking-wider">
          スケジュール
        </p>
        <NavItem
          icon={<CalendarDays className="size-4" strokeWidth={1.8} />}
          label="今日"
          value="today"
          count={getCountByFilter('today')}
          isActive={filter === 'today'}
          onSelect={onFilterChange}
        />
        <NavItem
          icon={<Calendar className="size-4" strokeWidth={1.8} />}
          label="今週"
          value="thisWeek"
          count={getCountByFilter('thisWeek')}
          isActive={filter === 'thisWeek'}
          onSelect={onFilterChange}
        />

        {/* 繰り返しセクション */}
        <p className="text-[10px] font-bold text-muted-foreground/60 px-2 py-1 mt-3 uppercase tracking-wider">
          繰り返し
        </p>
        {RECURRENCE_ITEMS.map((item) => (
          <NavItem
            key={item.value}
            icon={<Repeat className="size-4" strokeWidth={1.8} />}
            label={item.label}
            value={item.value}
            count={getCountByFilter(item.value)}
            isActive={filter === item.value}
            onSelect={onFilterChange}
          />
        ))}

        {/* カテゴリーセクション */}
        <div className="flex items-center justify-between px-2 py-1 mt-3">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
            カテゴリー
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddCategory}
            className="size-5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
            aria-label="カテゴリーを追加"
          >
            <Plus className="size-3" strokeWidth={2.5} />
          </Button>
        </div>

        {categories.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 px-3 py-1">
            カテゴリーなし
          </p>
        )}

        {categories.map((cat) => (
          <NavItem
            key={cat.id}
            icon={cat.icon}
            label={cat.name}
            value={`category:${cat.id}` as ReminderFilter}
            count={getCountByFilter(`category:${cat.id}` as ReminderFilter)}
            isActive={filter === `category:${cat.id}`}
            color={cat.color}
            onSelect={onFilterChange}
            onEdit={() => onEditCategory(cat)}
            onDelete={() => handleDeleteCategory(cat.id)}
          />
        ))}
      </nav>

      {/* 設定ボタン (フッター固定) */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150 cursor-pointer"
          aria-label="設定"
        >
          <Settings className="size-4 shrink-0" strokeWidth={1.8} />
          <span>設定</span>
        </button>
      </div>
    </aside>
  );
}
