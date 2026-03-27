# Electron Reminder - アーキテクチャ設計書

## プロセスアーキテクチャ

Electronは**メインプロセス**と**レンダラープロセス**の2プロセスで動作する。
本アプリではウィンドウを閉じても非表示にするだけで、レンダラーは常時稼働する。

```
┌─────────────────────────────────────────────────────┐
│                  Main Process (Node.js)              │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ TrayManager │  │  Scheduler   │  │ AutoLaunch│  │
│  │             │  │              │  │           │  │
│  │ - アイコン   │  │ - 1分間隔で  │  │ - 起動登録│  │
│  │ - メニュー   │  │   発火チェック│  │ - 状態管理│  │
│  │ - クリック   │  │ - 通知送信   │  │           │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│         │                │                          │
│         │          ┌─────┴──────┐                   │
│         │          │Notification│                   │
│         │          │  Manager   │                   │
│         │          └────────────┘                   │
│         │                                           │
│  ═══════╪═══════════ IPC Bridge ════════════════    │
│         │         (contextBridge)                   │
│         │                                           │
│  ┌──────┴──────────────────────────────────────┐    │
│  │          Renderer Process (Chromium)         │    │
│  │                                              │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  │    │
│  │  │  React   │  │  Zustand  │  │  Dexie   │  │    │
│  │  │  UI      │  │  Store    │  │ (IndexDB)│  │    │
│  │  │          │  │           │  │          │  │    │
│  │  │ shadcn/  │←→│ reminder  │←→│ reminders│  │    │
│  │  │ ui       │  │ settings  │  │ settings │  │    │
│  │  └──────────┘  └───────────┘  └──────────┘  │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## ADR-01: スケジューラの配置場所

### 決定: メインプロセスに配置

**理由:**
- レンダラープロセスはウィンドウ再作成時にリセットされる可能性がある
- メインプロセスはアプリのライフサイクル全体で稼働し続ける
- 通知APIはメインプロセスから直接呼べる

**トレードオフ:**
- レンダラーでデータ変更 → IPC経由でメインにスケジュール同期が必要
- メインプロセスが肥大化しないよう責務を絞る

**フロー:**
```
Renderer: データ変更
    ↓ IPC: 'sync-reminders'
Main: スケジュール更新(メモリ内のリマインダーリスト)
    ↓ setInterval(60秒)
Main: 現在時刻と比較 → 一致 → Notification発火
    ↓ IPC: 'reminder-fired'
Renderer: UI更新(1回のみなら完了化、繰り返しなら次回計算)
```

---

## ADR-02: データ永続化戦略

### 決定: Zustand + Dexie.js (IndexedDB)

**理由:**
- Zustandのミドルウェアで永続化を実現
- Dexie.jsはIndexedDBの薄いラッパーで、Promise API・自動インデックス対応
- electron-storeなどファイルベースのストレージより大量データに強い
- オフラインで完全に動作

**構成:**
```typescript
// Zustandストア → カスタム永続化ミドルウェア → Dexie.js → IndexedDB
const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'reminder-storage',
      storage: createDexieStorage(), // カスタムストレージアダプタ
    }
  )
);
```

**Dexieスキーマ:**
```typescript
const db = new Dexie('ElectronReminderDB');
db.version(1).stores({
  reminders: 'id, nextFireTime, enabled, recurrenceType',
  settings: 'key',
});
```

---

## ADR-03: ウィンドウ管理

### 決定: 閉じる→非表示、トレイ常駐

**理由:**
- ユーザーは「閉じた」と思っても通知は届く必要がある
- レンダラーを常時維持することでデータの一貫性を保つ
- Windows標準のトレイアプリの動作に合わせる

**実装:**
```typescript
mainWindow.on('close', (e) => {
  e.preventDefault();
  mainWindow.hide();
});
```

---

## ディレクトリ構成

```
electron-reminder/
├── package.json
├── forge.config.ts              # Electron Forge設定
├── tsconfig.json
├── tailwind.config.ts
├── components.json              # shadcn/ui設定
├── index.html                   # エントリHTML
│
├── src/
│   ├── main/                    # --- メインプロセス ---
│   │   ├── index.ts             # エントリ: BrowserWindow生成、IPC登録
│   │   ├── tray.ts              # TrayManager: トレイアイコン・メニュー
│   │   ├── scheduler.ts         # Scheduler: リマインダー発火チェック
│   │   ├── notification.ts      # NotificationManager: 通知送信
│   │   └── auto-launch.ts       # AutoLaunch: スタートアップ登録
│   │
│   ├── preload/                 # --- プリロード ---
│   │   └── index.ts             # contextBridge: IPC APIをレンダラーに公開
│   │
│   ├── renderer/                # --- レンダラープロセス ---
│   │   ├── index.tsx            # Reactエントリ
│   │   ├── App.tsx              # ルートコンポーネント
│   │   ├── global.css           # Tailwind + shadcnテーマ
│   │   │
│   │   ├── components/          # UIコンポーネント
│   │   │   ├── ui/              # shadcn/uiコンポーネント
│   │   │   ├── ReminderList.tsx
│   │   │   ├── ReminderCard.tsx
│   │   │   ├── ReminderForm.tsx # 作成/編集ダイアログ
│   │   │   ├── Header.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── SettingsDialog.tsx
│   │   │
│   │   ├── stores/              # 状態管理
│   │   │   ├── reminder-store.ts
│   │   │   └── settings-store.ts
│   │   │
│   │   ├── lib/                 # ユーティリティ
│   │   │   ├── db.ts            # Dexie.jsインスタンス・スキーマ定義
│   │   │   ├── dexie-storage.ts # Zustand用カスタムストレージアダプタ
│   │   │   ├── recurrence.ts    # 繰り返し計算ロジック
│   │   │   ├── utils.ts         # 汎用ユーティリティ (cn等)
│   │   │   └── ipc.ts           # IPC呼び出しラッパー
│   │   │
│   │   └── types/               # 型定義
│   │       └── reminder.ts
│   │
│   └── shared/                  # --- 共有 ---
│       └── constants.ts         # IPC チャネル名、デフォルト値
│
├── resources/                   # 静的リソース
│   ├── icon.ico                 # アプリアイコン
│   ├── tray-icon.png            # トレイアイコン (16x16)
│   └── tray-icon@2x.png        # トレイアイコン (32x32)
│
└── specs/                       # 仕様書
    └── electron-reminder/
```

---

## IPC通信設計

### チャネル一覧

| チャネル名 | 方向 | データ | 用途 |
|-----------|------|--------|------|
| `sync-reminders` | Renderer → Main | `Reminder[]` | スケジュール同期 |
| `reminder-fired` | Main → Renderer | `{ id: string }` | 通知発火をRendererに伝達 |
| `get-auto-launch` | Renderer → Main | - | スタートアップ状態取得 |
| `set-auto-launch` | Renderer → Main | `boolean` | スタートアップ登録/解除 |
| `show-window` | Main内部 | - | 通知クリック時にウィンドウ表示 |

### Preload API (contextBridge)

```typescript
// レンダラーから呼べるAPI
interface ElectronAPI {
  // リマインダースケジュール同期
  syncReminders(reminders: Reminder[]): Promise<void>;

  // 通知発火イベントのリスナー
  onReminderFired(callback: (id: string) => void): () => void;

  // スタートアップ
  getAutoLaunch(): Promise<boolean>;
  setAutoLaunch(enabled: boolean): Promise<void>;

  // テーマ
  getNativeTheme(): Promise<'light' | 'dark'>;
  onThemeChanged(callback: (theme: 'light' | 'dark') => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## スケジューラ設計

### メインプロセス側

```
60秒間隔でチェック:
  1. 現在時刻を取得
  2. メモリ内リマインダーリストを走査
  3. nextFireTime が 現在時刻 ± 30秒以内 のものを抽出
  4. 該当リマインダーの通知を発火
  5. Rendererに 'reminder-fired' を送信
```

### 次回発火時刻の計算 (Renderer側)

```typescript
function calculateNextFireTime(reminder: Reminder): string | null {
  const now = new Date();

  switch (reminder.recurrenceType) {
    case 'once':
      // 未発火なら設定日時、発火済みならnull
      return isFuture(reminder.dateTime) ? reminder.dateTime : null;

    case 'daily':
      // 今日のtime以降なら今日、過ぎていたら明日
      return getNextDaily(reminder.recurrenceConfig.time, now);

    case 'weekly':
      // 今週の指定曜日以降、過ぎていたら来週
      return getNextWeekly(reminder.recurrenceConfig, now);

    case 'monthly':
      // 今月の指定日以降、過ぎていたら来月
      return getNextMonthly(reminder.recurrenceConfig, now);

    case 'yearly':
      // 今年の指定月日以降、過ぎていたら来年
      return getNextYearly(reminder.recurrenceConfig, now);
  }
}
```

---

## テーマ対応

```
shadcn/uiのCSS変数ベーステーマ:
- light / dark / system の3モード
- system選択時はElectronのnativeTheme.shouldUseDarkColorsに連動
- CSS変数で切り替え (.dark クラストグル)
```

---

## ビルド・パッケージング

| 項目 | 設定 |
|------|------|
| ビルドツール | Electron Forge + Vite plugin |
| ターゲット | Windows x64 |
| インストーラー | Squirrel.Windows |
| 自動更新 | v1ではスコープ外 |
| コード署名 | v1ではスコープ外 |
