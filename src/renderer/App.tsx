import { useEffect, useState, useCallback } from 'react';
import { useReminderStore } from './stores/reminder-store';
import { useSettingsStore } from './stores/settings-store';
import { useTheme } from './hooks/use-theme';
import { getElectronAPI } from './lib/ipc';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ReminderList from './components/ReminderList';
import ReminderForm from './components/ReminderForm';
import SettingsDialog from './components/SettingsDialog';
import type { Reminder } from './types/reminder';

export default function App() {
  const reminders = useReminderStore((s) => s.reminders);
  const filter = useReminderStore((s) => s.filter);
  const focusedReminderId = useReminderStore((s) => s.focusedReminderId);
  const setFilter = useReminderStore((s) => s.setFilter);
  const markFired = useReminderStore((s) => s.markFired);
  const setFocusedReminder = useReminderStore((s) => s.setFocusedReminder);
  const syncToMain = useReminderStore((s) => s.syncToMain);
  const getFilteredReminders = useReminderStore((s) => s.getFilteredReminders);
  const initialize = useSettingsStore((s) => s.initialize);

  // Phase5: テーマをdocument.documentElementに適用
  useTheme();

  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 起動時初期化
  useEffect(() => {
    initialize();
    syncToMain();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // IPCリスナー: リマインダー発火・フォーカス
  useEffect(() => {
    const api = getElectronAPI();
    const unFired = api?.onReminderFired((id) => markFired(id));
    const unFocus = api?.onFocusReminder((id) => setFocusedReminder(id));
    return () => {
      unFired?.();
      unFocus?.();
    };
  }, [markFired, setFocusedReminder]);

  const handleAddClick = useCallback(() => {
    setEditingReminder(undefined);
    setFormOpen(true);
  }, []);

  const handleEditClick = useCallback(
    (id: string) => {
      const r = reminders.find((r) => r.id === id);
      setEditingReminder(r);
      setFormOpen(true);
    },
    [reminders],
  );

  const filteredReminders = getFilteredReminders();

  return (
    <div className="flex flex-col h-screen bg-background transition-colors duration-200">
      <Header onAddClick={handleAddClick} onSettingsClick={() => setSettingsOpen(true)} />
      <FilterBar filter={filter} onFilterChange={setFilter} />
      <ReminderList
        reminders={filteredReminders}
        focusedId={focusedReminderId}
        onEdit={handleEditClick}
      />
      <ReminderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingReminder(undefined);
        }}
        reminder={editingReminder}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
