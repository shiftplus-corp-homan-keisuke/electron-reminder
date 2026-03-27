import { useRef, useEffect } from 'react';
import { BellOff, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import ReminderCard from './ReminderCard';
import type { Reminder } from '../types/reminder';

interface ReminderListProps {
  reminders: Reminder[];
  focusedId: string | null;
  onEdit: (id: string) => void;
  onAddClick?: () => void;
}

export default function ReminderList({ reminders, focusedId, onEdit, onAddClick }: ReminderListProps) {
  const focusedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusedId && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedId]);

  if (reminders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        {/* ぷっくり丸アイコンエリア */}
        <div className="flex items-center justify-center size-20 rounded-[2rem] bg-primary/10 border-2 border-primary/15 shadow-sm">
          <BellOff className="size-9 text-primary/40" strokeWidth={1.6} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[14px] font-bold text-foreground/60">
            リマインダーはまだないよ
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            右上の「追加」から<br />新しいリマインダーをつくってね
          </p>
        </div>
        {onAddClick && (
          <Button
            onClick={onAddClick}
            className="gap-2 rounded-2xl px-5 h-10 bg-primary text-primary-foreground hover:bg-primary/85 shadow-md shadow-primary/25 font-bold text-[13px]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            追加する
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 overflow-x-hidden">
      {/* カード間はゆったりgap、上下にも余白 */}
      <div className="py-3 flex flex-col gap-2.5 w-full">
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
