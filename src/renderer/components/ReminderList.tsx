import { useRef, useEffect } from 'react';
import { BellOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReminderCard from './ReminderCard';
import type { Reminder } from '../types/reminder';

interface ReminderListProps {
  reminders: Reminder[];
  focusedId: string | null;
  onEdit: (id: string) => void;
}

export default function ReminderList({ reminders, focusedId, onEdit }: ReminderListProps) {
  const focusedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusedId && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedId]);

  if (reminders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <BellOff className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">まだリマインダーがありません</p>
          <p className="text-xs text-muted-foreground/70 mt-1">ヘッダーの「＋」を押して作成できます</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            ref={reminder.id === focusedId ? focusedRef : null}
          >
            <ReminderCard
              reminder={reminder}
              isFocused={reminder.id === focusedId}
              onEdit={() => onEdit(reminder.id)}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
