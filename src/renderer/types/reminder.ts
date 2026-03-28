export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceConfig {
  time: string;        // "HH:mm"形式 - once以外で使用
  dayOfWeek?: number;  // 0(日)〜6(土) - weeklyで使用
  dayOfMonth?: number; // 1〜31 - monthlyで使用
  month?: number;      // 1〜12 - yearlyで使用
  day?: number;        // 1〜31 - yearlyで使用
}

export interface Category {
  id: string;
  name: string;
  color: string;    // hex e.g. '#ef4444'
  icon: string;     // emoji e.g. '💼'
  createdAt: string;
}

export interface Reminder {
  id: string;                  // UUID v4
  title: string;               // 必須 最大500文字 複数行対応
  categoryId?: string;         // カテゴリーID (任意)
  dateTime: string;            // ISO 8601 (onceの場合の日時、他タイプは初期設定日時として保持)
  recurrenceType: RecurrenceType;
  recurrenceConfig: RecurrenceConfig;
  enabled: boolean;
  nextFireTime: string | null; // ISO 8601 次回発火予定 (disabledや1回完了の場合はnull)
  firedAt?: string;            // ISO 8601 最終発火時刻 (onceが発火後にセット)
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}

export interface AppSettings {
  launchAtStartup: boolean;
  theme: 'light' | 'dark' | 'system';
  webhookUrl: string;
  disableNativeNotificationOnWebhook: boolean;
  chiikawaModeEnabled: boolean;
  // ダイジェスト通知
  todayDigestEnabled: boolean;
  todayDigestTime: string;      // "HH:mm"
  weeklyDigestEnabled: boolean;
  weeklyDigestTime: string;     // "HH:mm"
  weeklyDigestDay: number;      // 0(日)〜6(土)
}
