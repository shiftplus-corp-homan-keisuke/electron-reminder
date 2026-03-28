import { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

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
    const hourRef   = useRef<HTMLSpanElement>(null);
    const minuteRef = useRef<HTMLSpanElement>(null);

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

    const makeKeyDown = (seg: 'hour' | 'minute') =>
      (e: React.KeyboardEvent<HTMLSpanElement>) => {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            seg === 'hour' ? commit(hour + 1, minute) : commit(hour, minute + 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            seg === 'hour' ? commit(hour - 1, minute) : commit(hour, minute - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (seg === 'hour') minuteRef.current?.focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
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
          <Segment ref={hourRef}   value={String(hour).padStart(2, '0')}   suffix="時" onKeyDown={makeKeyDown('hour')}   />
          <Segment ref={minuteRef} value={String(minute).padStart(2, '0')} suffix="分" onKeyDown={makeKeyDown('minute')} />
        </div>
      </div>
    );
  }
);
TimePickerInput.displayName = 'TimePickerInput';
