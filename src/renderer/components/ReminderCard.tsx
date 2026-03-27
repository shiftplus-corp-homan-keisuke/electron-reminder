import { Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useReminderStore } from '../stores/reminder-store';
import { formatFireTime, recurrenceLabel } from '../lib/format';
import type { Reminder } from '../types/reminder';

interface ReminderCardProps {
  reminder: Reminder;
  isFocused: boolean;
  onEdit: () => void;
}

/** 繰り返しタイプに応じたパステルカラーバッジ */
const RECURRENCE_COLORS: Record<string, string> = {
  once:    'bg-[oklch(0.93_0.04_65)]  text-[oklch(0.45_0.12_65)]',
  daily:   'bg-[oklch(0.93_0.04_180)] text-[oklch(0.40_0.12_180)]',
  weekly:  'bg-[oklch(0.93_0.04_265)] text-[oklch(0.42_0.12_265)]',
  monthly: 'bg-[oklch(0.93_0.04_305)] text-[oklch(0.42_0.12_305)]',
  yearly:  'bg-[oklch(0.93_0.04_355)] text-[oklch(0.48_0.14_355)]',
};

export default function ReminderCard({ reminder, isFocused, onEdit }: ReminderCardProps) {
  const toggleEnabled = useReminderStore((s) => s.toggleEnabled);
  const deleteReminder = useReminderStore((s) => s.deleteReminder);

  const isActive = reminder.enabled && !!reminder.nextFireTime;
  const isDisabledOrDone = !reminder.enabled || !reminder.nextFireTime;
  const recurrenceColor = RECURRENCE_COLORS[reminder.recurrenceType] ?? RECURRENCE_COLORS.once;

  return (
    <div
      className={cn(
        // カード: 丸くて浮いてる、ボーダーはほんのり
        'group relative flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl overflow-hidden',
        'bg-card border border-border',
        'shadow-sm shadow-border/60',
        'hover:shadow-md hover:shadow-primary/10 hover:border-primary/30',
        'transition-all duration-200 cursor-pointer',
        isFocused && 'border-primary/50 shadow-md shadow-primary/20 bg-accent/30',
        isDisabledOrDone && 'opacity-60',
      )}
      onClick={onEdit}
    >
      {/* 左: ステータスドット (ぷっくり丸) */}
      <div
        className={cn(
          'size-2.5 rounded-full shrink-0 transition-colors',
          isActive ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-muted-foreground/30',
        )}
      />

      {/* 中: テキスト情報 */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* タイムスタンプ行 */}
        <div className="flex items-center gap-1 mb-0.5 overflow-hidden">
          <Clock className="size-3 text-muted-foreground/70 shrink-0" strokeWidth={1.8} />
          <span className="text-[11px] text-muted-foreground leading-none truncate">
            {formatFireTime(reminder.nextFireTime, reminder.enabled)}
          </span>
        </div>

        {/* タイトル */}
        <p
          className={cn(
            'text-[13.5px] font-bold truncate leading-snug',
            isDisabledOrDone ? 'text-muted-foreground line-through decoration-muted-foreground/50' : 'text-foreground',
          )}
        >
          {reminder.title}
        </p>

        {/* メモ */}
        {reminder.memo && (
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 leading-tight w-full">
            {reminder.memo}
          </p>
        )}
      </div>

      {/* 右: コントロール群 */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* 繰り返しバッジ: パステルカラー丸バッジ */}
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold leading-none',
            recurrenceColor,
          )}
        >
          {recurrenceLabel(reminder.recurrenceType)}
        </span>

        <Switch
          size="sm"
          checked={reminder.enabled}
          onCheckedChange={() => toggleEnabled(reminder.id)}
          aria-label={reminder.enabled ? '無効にする' : '有効にする'}
        />

        {/* 削除ボタン: 非ホバー時はサイズゼロで余白を残さない */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="w-0 overflow-hidden group-hover:w-7 transition-all duration-150 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-0 group-hover:p-1"
              aria-label="削除"
            >
              <Trash2 className="size-3.5 shrink-0" strokeWidth={1.8} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{reminder.title}」を削除します。この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
                onClick={() => deleteReminder(reminder.id)}
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
