import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

export default function ReminderCard({ reminder, isFocused, onEdit }: ReminderCardProps) {
  const toggleEnabled = useReminderStore((s) => s.toggleEnabled);
  const deleteReminder = useReminderStore((s) => s.deleteReminder);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors cursor-pointer',
        isFocused && 'ring-2 ring-inset ring-primary bg-accent/30',
      )}
      onClick={onEdit}
    >
      {/* 左: テキスト情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">
          {formatFireTime(reminder.nextFireTime, reminder.enabled)}
        </p>
        <p className="text-sm font-semibold text-foreground truncate mt-0.5">
          {reminder.title}
        </p>
        {reminder.memo && (
          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
            {reminder.memo}
          </p>
        )}
      </div>

      {/* 右: コントロール */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Badge variant="outline" className="text-xs font-normal hidden sm:inline-flex">
          {recurrenceLabel(reminder.recurrenceType)}
        </Badge>

        <Switch
          size="sm"
          checked={reminder.enabled}
          onCheckedChange={() => toggleEnabled(reminder.id)}
          aria-label={reminder.enabled ? '無効にする' : '有効にする'}
        />

        {/* 削除ボタン: hover時のみ表示 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              aria-label="削除"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>リマインダーを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{reminder.title}」を削除します。この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
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
