import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Bell, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReminderStore } from '../stores/reminder-store';
import {
  DAY_OF_WEEK_OPTIONS,
  MONTH_OPTIONS,
  DAY_OPTIONS,
} from '../lib/format';
import type { Reminder, RecurrenceType, RecurrenceConfig } from '../types/reminder';

interface ReminderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder;
}

interface FormValues {
  title: string;
  memo: string;
  recurrenceType: RecurrenceType;
  date: string;
  time: string;
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  day: number;
}

interface FormErrors {
  title?: string;
  date?: string;
  time?: string;
}

function defaultValues(reminder?: Reminder): FormValues {
  if (!reminder) {
    return {
      title: '',
      memo: '',
      recurrenceType: 'once',
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      month: 1,
      day: 1,
    };
  }
  const dt = new Date(reminder.dateTime);
  return {
    title: reminder.title,
    memo: reminder.memo,
    recurrenceType: reminder.recurrenceType,
    date: format(dt, 'yyyy-MM-dd'),
    time: reminder.recurrenceType === 'once'
      ? format(dt, 'HH:mm')
      : (reminder.recurrenceConfig.time ?? '09:00'),
    dayOfWeek: reminder.recurrenceConfig.dayOfWeek ?? 1,
    dayOfMonth: reminder.recurrenceConfig.dayOfMonth ?? 1,
    month: reminder.recurrenceConfig.month ?? 1,
    day: reminder.recurrenceConfig.day ?? 1,
  };
}

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export default function ReminderForm({ open, onOpenChange, reminder }: ReminderFormProps) {
  const addReminder = useReminderStore((s) => s.addReminder);
  const updateReminder = useReminderStore((s) => s.updateReminder);

  const [values, setValues] = useState<FormValues>(() => defaultValues(reminder));
  const [errors, setErrors] = useState<FormErrors>({});

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      setValues(defaultValues(reminder));
      setErrors({});
    }
  }, [open, reminder]);

  const set = (partial: Partial<FormValues>) => setValues((v) => ({ ...v, ...partial }));

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!values.title.trim()) errs.title = 'タイトルを入力してください';
    if (values.recurrenceType === 'once' && !values.date) errs.date = '日付を入力してください';
    if (!values.time) errs.time = '時刻を入力してください';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const config: RecurrenceConfig = { time: values.time };
    if (values.recurrenceType === 'weekly') config.dayOfWeek = values.dayOfWeek;
    if (values.recurrenceType === 'monthly') config.dayOfMonth = values.dayOfMonth;
    if (values.recurrenceType === 'yearly') {
      config.month = values.month;
      config.day = values.day;
    }

    const dateTime =
      values.recurrenceType === 'once'
        ? new Date(`${values.date}T${values.time}:00`).toISOString()
        : new Date().toISOString();

    if (reminder) {
      updateReminder(reminder.id, {
        title: values.title.trim(),
        memo: values.memo.trim(),
        dateTime,
        recurrenceType: values.recurrenceType,
        recurrenceConfig: config,
      });
    } else {
      addReminder({
        title: values.title.trim(),
        memo: values.memo.trim(),
        dateTime,
        recurrenceType: values.recurrenceType,
        recurrenceConfig: config,
        enabled: true,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
              {reminder
                ? <Pencil className="size-4 text-primary" />
                : <Bell className="size-4 text-primary" />
              }
            </div>
            <DialogTitle className="text-base font-bold">
              {reminder ? 'リマインダーを編集' : '新しいリマインダー'}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            リマインダーの詳細を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* タイトル */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">タイトル <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="例: 薬を飲む"
              maxLength={100}
              value={values.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* メモ */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="memo">メモ</Label>
            <Textarea
              id="memo"
              placeholder="詳細メモ（任意）"
              maxLength={500}
              rows={2}
              className="resize-none"
              value={values.memo}
              onChange={(e) => set({ memo: e.target.value })}
            />
          </div>

          {/* 繰り返しタイプ */}
          <div className="flex flex-col gap-1.5">
            <Label>繰り返し</Label>
            <Select
              value={values.recurrenceType}
              onValueChange={(v) => set({ recurrenceType: v as RecurrenceType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">1回のみ</SelectItem>
                <SelectItem value="daily">毎日</SelectItem>
                <SelectItem value="weekly">毎週</SelectItem>
                <SelectItem value="monthly">毎月</SelectItem>
                <SelectItem value="yearly">毎年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 動的フィールド: 繰り返しタイプに応じて変化 */}
          {values.recurrenceType === 'once' && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="date">日付 <span className="text-destructive">*</span></Label>
                <input
                  id="date"
                  type="date"
                  className={inputClass}
                  value={values.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <Label htmlFor="time-once">時刻 <span className="text-destructive">*</span></Label>
                <input
                  id="time-once"
                  type="time"
                  className={inputClass}
                  value={values.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
          )}

          {values.recurrenceType === 'daily' && (
            <div className="flex flex-col gap-1.5 w-28">
              <Label htmlFor="time-daily">時刻 <span className="text-destructive">*</span></Label>
              <input
                id="time-daily"
                type="time"
                className={inputClass}
                value={values.time}
                onChange={(e) => set({ time: e.target.value })}
              />
              {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
            </div>
          )}

          {values.recurrenceType === 'weekly' && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>曜日</Label>
                <Select
                  value={String(values.dayOfWeek)}
                  onValueChange={(v) => set({ dayOfWeek: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OF_WEEK_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <Label htmlFor="time-weekly">時刻 <span className="text-destructive">*</span></Label>
                <input
                  id="time-weekly"
                  type="time"
                  className={inputClass}
                  value={values.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
          )}

          {values.recurrenceType === 'monthly' && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>日</Label>
                <Select
                  value={String(values.dayOfMonth)}
                  onValueChange={(v) => set({ dayOfMonth: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {DAY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <Label htmlFor="time-monthly">時刻 <span className="text-destructive">*</span></Label>
                <input
                  id="time-monthly"
                  type="time"
                  className={inputClass}
                  value={values.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
          )}

          {values.recurrenceType === 'yearly' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label>月</Label>
                  <Select
                    value={String(values.month)}
                    onValueChange={(v) => set({ month: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {MONTH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label>日</Label>
                  <Select
                    value={String(values.day)}
                    onValueChange={(v) => set({ day: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {DAY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <Label htmlFor="time-yearly">時刻 <span className="text-destructive">*</span></Label>
                <input
                  id="time-yearly"
                  type="time"
                  className={inputClass}
                  value={values.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
