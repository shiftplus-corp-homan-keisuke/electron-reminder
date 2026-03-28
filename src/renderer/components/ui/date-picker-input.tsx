import { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

// ─── Segment ─────────────────────────────────────────────────

interface SegmentProps {
  value: string;
  suffix: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
}

const Segment = forwardRef<HTMLSpanElement, SegmentProps>(
  ({ value, suffix, onKeyDown }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <span className="inline-flex items-center gap-0.5">
        <span
          ref={ref}
          tabIndex={0}
          role="spinbutton"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          className={cn(
            'inline-flex items-center justify-center rounded px-1 tabular-nums',
            'cursor-default select-none outline-none transition-colors',
            focused
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground',
          )}
        >
          {value}
        </span>
        <span className="text-muted-foreground select-none">{suffix}</span>
      </span>
    );
  }
);
Segment.displayName = 'Segment';

// ─── DatePickerInput ─────────────────────────────────────────

export interface DatePickerInputRef {
  /** 「日」セグメントにフォーカスを当てる */
  focusDay(): void;
}

interface DatePickerInputProps {
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  /** 「日」セグメントで右矢印を押したときのコールバック */
  onExitRight?: () => void;
  className?: string;
}

export const DatePickerInput = forwardRef<DatePickerInputRef, DatePickerInputProps>(
  ({ value, onChange, onExitRight, className }, ref) => {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const yearRef  = useRef<HTMLSpanElement>(null);
    const monthRef = useRef<HTMLSpanElement>(null);
    const dayRef   = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      focusDay() { dayRef.current?.focus(); },
    }));

    const parts = value ? value.split('-').map(Number) : [];
    const year  = parts[0] || new Date().getFullYear();
    const month = parts[1] || new Date().getMonth() + 1;
    const day   = parts[2] || new Date().getDate();

    const commit = (ny: number, nm: number, nd: number) => {
      nm = Math.max(1, Math.min(12, nm));
      nd = Math.max(1, Math.min(getDaysInMonth(new Date(ny, nm - 1)), nd));
      onChange(`${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`);
    };

    const makeKeyDown = (seg: 'year' | 'month' | 'day') =>
      (e: React.KeyboardEvent<HTMLSpanElement>) => {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (seg === 'year')       commit(year + 1, month, day);
            else if (seg === 'month') commit(year, month + 1, day);
            else                      commit(year, month, day + 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (seg === 'year')       commit(year - 1, month, day);
            else if (seg === 'month') commit(year, month - 1, day);
            else                      commit(year, month, day - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (seg === 'year')       monthRef.current?.focus();
            else if (seg === 'month') dayRef.current?.focus();
            else                      onExitRight?.();   // 「日」→ 外へ
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (seg === 'day')        monthRef.current?.focus();
            else if (seg === 'month') yearRef.current?.focus();
            break;
        }
      };

    const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;

    return (
      <div
        className={cn(
          'flex items-center h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs',
          'focus-within:ring-1 focus-within:ring-ring transition-colors',
          className,
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <Segment ref={yearRef}  value={String(year)}                   suffix="年" onKeyDown={makeKeyDown('year')}  />
          <Segment ref={monthRef} value={String(month).padStart(2, '0')} suffix="月" onKeyDown={makeKeyDown('month')} />
          <Segment ref={dayRef}   value={String(day).padStart(2, '0')}   suffix="日" onKeyDown={makeKeyDown('day')}   />
        </div>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="カレンダーを開く"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            >
              <CalendarIcon className="size-4" strokeWidth={1.8} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(picked) => {
                if (picked) {
                  onChange(format(picked, 'yyyy-MM-dd'));
                  setCalendarOpen(false);
                  setTimeout(() => dayRef.current?.focus(), 50);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
DatePickerInput.displayName = 'DatePickerInput';
