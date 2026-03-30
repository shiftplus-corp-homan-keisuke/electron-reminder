import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const DIGIT_BUFFER_DELAY = 1500;

type TimeSegment = 'hour' | 'minute';

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

// ─── TimePickerInput ─────────────────────────────────────────

export interface TimePickerInputRef {
  /** 「時」セグメントにフォーカスを当てる */
  focusHour(): void;
}

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  /** 「時」セグメントで左矢印を押したときのコールバック */
  onExitLeft?: () => void;
  className?: string;
}

export const TimePickerInput = forwardRef<TimePickerInputRef, TimePickerInputProps>(
  ({ value, onChange, onExitLeft, className }, ref) => {
    const [drafts, setDrafts] = useState<Partial<Record<TimeSegment, string>>>({});
    const hourRef   = useRef<HTMLSpanElement>(null);
    const minuteRef = useRef<HTMLSpanElement>(null);
    const digitTimersRef = useRef<Partial<Record<TimeSegment, ReturnType<typeof setTimeout>>>>({});

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
      focusHour() { hourRef.current?.focus(); },
    }));

    const parts  = value ? value.split(':').map(Number) : [];
    const hour   = !isNaN(parts[0]) ? parts[0] : 9;
    const minute = !isNaN(parts[1]) ? parts[1] : 0;

    const commit = (h: number, m: number) => {
      h = ((h % 24) + 24) % 24;
      m = ((m % 60) + 60) % 60;
      onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    };

    const clearDraft = (seg: TimeSegment) => {
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

    const setDraft = (seg: TimeSegment, nextDigits: string) => {
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
      clearDraft('hour');
      clearDraft('minute');
    };

    const handleDigitInput = (seg: TimeSegment, digit: string) => {
      const currentDraft = drafts[seg] ?? '';
      const nextDigits = currentDraft.length > 0 && currentDraft.length < 2
        ? `${currentDraft}${digit}`
        : digit;

      const nextValue = Number(nextDigits);
      if (Number.isNaN(nextValue)) {
        return;
      }

      setDraft(seg, nextDigits);

      if (nextDigits.length === 1) {
        if (digit === '0') {
          return;
        }

        if (seg === 'hour') {
          commit(nextValue, minute);
        } else {
          commit(hour, nextValue);
        }

        return;
      }

      clearDraft(seg);

      const maxValue = seg === 'hour' ? 23 : 59;
      if (nextValue < 0 || nextValue > maxValue) {
        return;
      }

      if (seg === 'hour') {
        commit(nextValue, minute);
      } else {
        commit(hour, nextValue);
      }
    };

    const displayValue = (seg: TimeSegment) => {
      const draft = drafts[seg];
      if (draft !== undefined) {
        return draft;
      }

      return seg === 'hour'
        ? String(hour).padStart(2, '0')
        : String(minute).padStart(2, '0');
    };

    const makeKeyDown = (seg: TimeSegment) =>
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
            seg === 'hour' ? commit(hour + 1, minute) : commit(hour, minute + 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            clearAllDrafts();
            seg === 'hour' ? commit(hour - 1, minute) : commit(hour, minute - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            clearAllDrafts();
            if (seg === 'hour') minuteRef.current?.focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            clearAllDrafts();
            if (seg === 'minute') hourRef.current?.focus();
            else                  onExitLeft?.();   // 「時」→ 外へ
            break;
        }
      };

    return (
      <div
        className={cn(
          'flex items-center h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs',
          'focus-within:ring-1 focus-within:ring-ring transition-colors',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Segment ref={hourRef}   value={displayValue('hour')}   suffix="時" onKeyDown={makeKeyDown('hour')} onBlur={() => clearDraft('hour')} />
          <Segment ref={minuteRef} value={displayValue('minute')} suffix="分" onKeyDown={makeKeyDown('minute')} onBlur={() => clearDraft('minute')} />
        </div>
      </div>
    );
  }
);
TimePickerInput.displayName = 'TimePickerInput';
