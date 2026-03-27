// IPCチャネル名の定数
export const IPC_CHANNELS = {
  SYNC_REMINDERS: 'sync-reminders',   // Renderer → Main: リマインダー一覧をスケジューラへ同期
  REMINDER_FIRED: 'reminder-fired',   // Main → Renderer: 通知発火をUIに伝達
  GET_AUTO_LAUNCH: 'get-auto-launch', // Renderer → Main: スタートアップ状態取得
  SET_AUTO_LAUNCH: 'set-auto-launch', // Renderer → Main: スタートアップ登録/解除
  GET_NATIVE_THEME: 'get-native-theme', // Renderer → Main: システムテーマ取得
  THEME_CHANGED: 'theme-changed',     // Main → Renderer: テーマ変更通知
  SHOW_WINDOW: 'show-window',         // Main内部: ウィンドウ表示
  FOCUS_REMINDER: 'focus-reminder',   // Main → Renderer: 通知クリック時にリマインダーにフォーカス
  SET_WEBHOOK_URL: 'set-webhook-url', // Renderer → Main: Webhook URL を同期
} as const;

export const DEFAULT_SETTINGS = {
  launchAtStartup: false,
  theme: 'system' as const,
};
