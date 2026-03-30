import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

const DIGIT_BUFFER_DELAY = 1500;

type DateSegment = 'year' | 'month' | 'day';

function getDaysInMonthSafe(year: number, month: number) {
  const date = new Date(0);
  date.setFullYear(year, month, 0);
  return date.getDate();
}

function formatDateValue(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Segment ─────────────────────────────────────────────────

interface SegmentProps {
  value: string;
  suffix: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
  onBlur?: () => void;
}

const Segment = forwardRef<HTMLSpanElement, SegmentProps>(
  ({ value, suffix, onKeyDown, onBlur }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <span className="inline-flex items-center gap-0.5">
        <span
          ref={ref}
          tabIndex={0}
          role="spinbutton"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
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
    const [drafts, setDrafts] = useState<Partial<Record<DateSegment, string>>>({});
    const yearRef  = useRef<HTMLSpanElement>(null);
    const monthRef = useRef<HTMLSpanElement>(null);
    const dayRef   = useRef<HTMLSpanElement>(null);
    const digitTimersRef = useRef<Partial<Record<DateSegment, ReturnType<typeof setTimeout>>>>({});

    useEffect(() => {
      return () => {
        Object.values(digitTimersRef.current).forEach((timer) => {
          if (timer) {
            clearTimeout(timer);
          }
        });
      };
    }, []);

    useImperativeHandle(ref, () => ({
      focusDay() { dayRef.current?.focus(); },
    }));

    const parts = value ? value.split('-').map(Number) : [];
    const year  = parts[0] || new Date().getFullYear();
    const month = parts[1] || new Date().getMonth() + 1;
    const day   = parts[2] || new Date().getDate();

    const commit = (ny: number, nm: number, nd: number) => {
      ny = Math.max(1, ny);
      nm = Math.max(1, Math.min(12, nm));
      nd = Math.max(1, Math.min(getDaysInMonthSafe(ny, nm), nd));
      onChange(formatDateValue(ny, nm, nd));
    };

    const clearDraft = (seg: DateSegment) => {
      const timer = digitTimersRef.current[seg];
      if (timer) {
        clearTimeout(timer);
        delete digitTimersRef.current[seg];
      }

      setDrafts((current) => {
        if (!(seg in current)) {
          return current;
        }

        const next = { ...current };
        delete next[seg];
        return next;
      });
    };

    const setDraft = (seg: DateSegment, nextDigits: string) => {
      const currentTimer = digitTimersRef.current[seg];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }

      setDrafts((current) => ({ ...current, [seg]: nextDigits }));
      digitTimersRef.current[seg] = setTimeout(() => {
        clearDraft(seg);
      }, DIGIT_BUFFER_DELAY);
    };

    const clearAllDrafts = () => {
      clearDraft('year');
      clearDraft('month');
      clearDraft('day');
    };

    const handleDigitInput = (seg: DateSegment, digit: string) => {
      const maxDigits = seg === 'year' ? 4 : 2;
      const currentDraft = drafts[seg] ?? '';
      const nextDigits = currentDraft.length > 0 && currentDraft.length < maxDigits
        ? `${currentDraft}${digit}`
        : digit;

      if (seg === 'year') {
        setDraft(seg, nextDigits);

        if (nextDigits.length === 4) {
          commit(Number(nextDigits), month, day);
          clearDraft(seg);
        }

        return;
      }

      const nextValue = Number(nextDigits);
      if (Number.isNaN(nextValue)) {
        return;
      }

      setDraft(seg, nextDigits);

      if (nextDigits.length === 1) {
        if (digit === '0') {
          return;
        }

        if (seg === 'month') {
          commit(year, nextValue, day);
        } else {
          commit(year, month, nextValue);
        }

        return;
      }

      clearDraft(seg);

      const maxValue = seg === 'month' ? 12 : getDaysInMonthSafe(year, month);
      if (nextValue < 1 || nextValue > maxValue) {
        return;
      }

      if (seg === 'month') {
        commit(year, nextValue, day);
      } else {
        commit(year, month, nextValue);
      }
    };

    const displayValue = (seg: DateSegment) => {
      const draft = drafts[seg];
      if (draft !== undefined) {
        return draft;
      }

      if (seg === 'year') {
        return String(year);
      }

      if (seg === 'month') {
        return String(month).padStart(2, '0');
      }

      return String(day).padStart(2, '0');
    };

    const makeKeyDown = (seg: DateSegment) =>
      (e: React.KeyboardEvent<HTMLSpanElement>) => {
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          handleDigitInput(seg, e.key);
          return;
        }

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            clearAllDrafts();
            if (seg === 'year')       commit(year + 1, month, day);
            else if (seg === 'month') commit(year, month + 1, day);
            else                      commit(year, month, day + 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            clearAllDrafts();
            if (seg === 'year')       commit(year - 1, month, day);
            else if (seg === 'month') commit(year, month - 1, day);
            else                      commit(year, month, day - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            clearAllDrafts();
            if (seg === 'year')       monthRef.current?.focus();
            else if (seg === 'month') dayRef.current?.focus();
            else                      onExitRight?.();   // 「日」→ 外へ
            break;
          case 'ArrowLeft':
            e.preventDefault();
            clearAllDrafts();
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
          <Segment ref={yearRef}  value={displayValue('year')}  suffix="年" onKeyDown={makeKeyDown('year')} onBlur={() => clearDraft('year')} />
          <Segment ref={monthRef} value={displayValue('month')} suffix="月" onKeyDown={makeKeyDown('month')} onBlur={() => clearDraft('month')} />
          <Segment ref={dayRef}   value={displayValue('day')}   suffix="日" onKeyDown={makeKeyDown('day')} onBlur={() => clearDraft('day')} />
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
                  clearAllDrafts();
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
