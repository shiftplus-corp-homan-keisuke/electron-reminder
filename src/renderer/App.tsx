import { useEffect, useState, useCallback } from "react";
import { useReminderStore } from "./stores/reminder-store";
import { useSettingsStore } from "./stores/settings-store";
import { useTheme } from "./hooks/use-theme";
import { getElectronAPI, setWebhookUrl, setDisableNativeNotification, setDigestSettings } from "./lib/ipc";
import Sidebar from "./components/Sidebar";
import ReminderList from "./components/ReminderList";
import ReminderForm from "./components/ReminderForm";
import SettingsDialog from "./components/SettingsDialog";
import CategoryForm from "./components/CategoryForm";
import chiikawaBg from "./assets/chiikawa-bg.png";
import type { Reminder, Category } from "./types/reminder";
import type { ReminderFilter } from "./stores/reminder-store";

export default function App() {
  const reminders = useReminderStore((s) => s.reminders);
  const filter = useReminderStore((s) => s.filter);
  const setFilter = useReminderStore((s) => s.setFilter);
  const focusedReminderId = useReminderStore((s) => s.focusedReminderId);
  const markFired = useReminderStore((s) => s.markFired);
  const setFocusedReminder = useReminderStore((s) => s.setFocusedReminder);
  const syncToMain = useReminderStore((s) => s.syncToMain);
  const getFilteredReminders = useReminderStore((s) => s.getFilteredReminders);
  const initialize = useSettingsStore((s) => s.initialize);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const settings = useSettingsStore((s) => s.settings);
  const chiikawaMode = settings.chiikawaModeEnabled;

  useTheme();

  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  // 起動時初期化
  useEffect(() => {
    initialize();
    syncToMain();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dexie 復元完了後に永続化済み設定をメインプロセスへ同期
  useEffect(() => {
    if (!hydrated) return;
    setWebhookUrl(settings.webhookUrl).catch(console.error);
    setDisableNativeNotification(settings.disableNativeNotificationOnWebhook).catch(console.error);
    setDigestSettings({
      todayEnabled: settings.todayDigestEnabled,
      todayTime: settings.todayDigestTime,
      weeklyEnabled: settings.weeklyDigestEnabled,
      weeklyTime: settings.weeklyDigestTime,
      weeklyDay: settings.weeklyDigestDay,
    }).catch(console.error);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Ctrl+N でリマインダー追加ダイアログを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleAddClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddClick]);

  const handleEditClick = useCallback(
    (id: string) => {
      const r = reminders.find((r) => r.id === id);
      setEditingReminder(r);
      setFormOpen(true);
    },
    [reminders],
  );

  const handleAddCategory = useCallback(() => {
    setEditingCategory(undefined);
    setCategoryFormOpen(true);
  }, []);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  }, []);

  const filteredReminders = getFilteredReminders();

  if (!hydrated) return null;

  return (
    <div className="relative flex h-screen bg-background transition-colors duration-200 overflow-hidden">
      {chiikawaMode && (
        <img
          src={chiikawaBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute bottom-0 right-0 w-16 opacity-[0.8] translate-x-1 translate-y-1 z-0"
          draggable={false}
        />
      )}

      <Sidebar
        filter={filter}
        onFilterChange={(f: ReminderFilter) => setFilter(f)}
        onAddClick={handleAddClick}
        onSettingsClick={() => setSettingsOpen(true)}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        <ReminderList
          reminders={filteredReminders}
          focusedId={focusedReminderId}
          onEdit={handleEditClick}
          onAddClick={handleAddClick}
        />
      </main>

      <ReminderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingReminder(undefined);
        }}
        reminder={editingReminder}
      />
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={(open) => {
          setCategoryFormOpen(open);
          if (!open) setEditingCategory(undefined);
        }}
        category={editingCategory}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
