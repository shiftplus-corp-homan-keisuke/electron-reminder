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
import appIcon from "./assets/icon.png";
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
  const [initialTitle, setInitialTitle] = useState<string | undefined>();
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

  // IPCリスナー: リマインダー発火・フォーカス・ディープリンク
  useEffect(() => {
    const api = getElectronAPI();
    const unFired = api?.onReminderFired((id) => markFired(id));
    const unFocus = api?.onFocusReminder((id) => setFocusedReminder(id));
    const unDeepLink = api?.onDeepLinkCreateReminder((title) => {
      setEditingReminder(undefined);
      setInitialTitle(title || undefined);
      setFormOpen(true);
    });
    return () => {
      unFired?.();
      unFocus?.();
      unDeepLink?.();
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
    <div className="relative flex flex-col h-screen bg-background transition-colors duration-200 overflow-hidden">
      {/* カスタムタイトルバー (Electronのウィンドウドラッグ領域) */}
      <div 
        className="w-full h-[36px] shrink-0 flex items-center z-50 select-none bg-background/50 backdrop-blur-sm border-b border-border/30"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 px-3 text-[11.5px] font-medium text-muted-foreground/80 tracking-wider">
          <img src={appIcon} alt="icon" className="w-4 h-4 object-contain opacity-90 drop-shadow-sm" draggable={false} />
          <span>ちぃかわりまいんだぁ</span>
        </div>
        <div 
          className="flex h-full ml-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button 
            onClick={() => getElectronAPI()?.windowMinimize()}
            className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label="最小化"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 5H10" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
          <button 
            onClick={() => getElectronAPI()?.windowMaximize()}
            className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label="最大化"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
          <button 
            onClick={() => getElectronAPI()?.windowClose()}
            className="h-full px-4 hover:bg-[#e81123] hover:text-white transition-colors flex items-center justify-center text-muted-foreground"
            tabIndex={-1}
            aria-label="閉じる"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 overflow-hidden">
      {chiikawaMode && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-40">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/20 mix-blend-multiply blur-3xl dark:mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-secondary/30 mix-blend-multiply blur-3xl dark:mix-blend-screen animate-pulse" style={{ animationDuration: '5s' }} />
          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-accent/40 mix-blend-multiply blur-3xl dark:mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        </div>
      )}

      {chiikawaMode && (
        <img
          src={chiikawaBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -bottom-2 -right-2 w-16 opacity-90 drop-shadow-xl z-0 hover:scale-105 transition-transform duration-500"
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
      <main className="flex-1 overflow-hidden flex flex-col z-10">
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
          if (!open) {
            setEditingReminder(undefined);
            setInitialTitle(undefined);
          }
        }}
        reminder={editingReminder}
        initialTitle={initialTitle}
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
    </div>
  );
}
