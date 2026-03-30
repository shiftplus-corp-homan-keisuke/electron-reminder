import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const reminderStoreState = {
  toggleEnabled: vi.fn(),
  deleteReminder: vi.fn(),
};

const categoryStoreState = {
  categories: [],
};

vi.mock('lucide-react', () => ({
  Trash2: () => <span>trash</span>,
  Clock: () => <span>clock</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ 'aria-label': ariaLabel }: { 'aria-label': string }) => <button aria-label={ariaLabel}>switch</button>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../stores/reminder-store', () => ({
  useReminderStore: (selector: (state: typeof reminderStoreState) => unknown) => selector(reminderStoreState),
}));

vi.mock('../stores/category-store', () => ({
  useCategoryStore: (selector: (state: typeof categoryStoreState) => unknown) => selector(categoryStoreState),
}));

import ReminderCard from './ReminderCard';
import type { Reminder } from '../types/reminder';

describe('ReminderCard', () => {
  it('送信済み once の日時表示に送信済み文言を出す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 9, 0, 0, 0));

    const reminder: Reminder = {
      id: 'sent-once',
      title: 'sent once reminder',
      dateTime: new Date(2026, 2, 30, 15, 0, 0, 0).toISOString(),
      recurrenceType: 'once',
      recurrenceConfig: { time: '15:00' },
      enabled: true,
      nextFireTime: null,
      firedAt: new Date(2026, 2, 30, 15, 1, 0, 0).toISOString(),
      createdAt: new Date(2026, 2, 29, 12, 0, 0, 0).toISOString(),
      updatedAt: new Date(2026, 2, 30, 15, 1, 0, 0).toISOString(),
    };

    const html = renderToStaticMarkup(
      <ReminderCard reminder={reminder} isFocused={false} onEdit={vi.fn()} />,
    );

    expect(html).toContain('送信済み');
    expect(html).toContain('今日 15:00');

    vi.useRealTimers();
  });
});
