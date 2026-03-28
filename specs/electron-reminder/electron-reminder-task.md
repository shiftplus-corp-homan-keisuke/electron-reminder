# Electron Reminder - タスクブレークダウン

## Phase 1: プロジェクト初期化

- [ ] 1-1: Electron Forge + Vite + React + TypeScript でプロジェクト作成
  - `npm init electron-app@latest . -- --template=vite-typescript`
  - Verify: `npm start` でElectronウィンドウが表示される

- [ ] 1-2: Tailwind CSS 4 + shadcn/ui セットアップ
  - Tailwind v4インストール、`global.css`にインポート
  - shadcn/ui初期化 (`npx shadcn@latest init`)
  - Verify: shadcnのButtonコンポーネントが表示される

- [ ] 1-3: 基本依存パッケージのインストール
  - `zustand`, `dexie`, `date-fns`, `lucide-react`, `uuid`
  - Verify: `npm ls` でパッケージ確認

---

## Phase 2: データ層

- [ ] 2-1: 型定義 (`src/renderer/types/reminder.ts`)
  - `Reminder`, `RecurrenceType`, `RecurrenceConfig`, `AppSettings` 型を定義
  - Verify: TypeScriptコンパイルエラーなし

- [ ] 2-2: 共有定数 (`src/shared/constants.ts`)
  - IPCチャネル名、デフォルト設定値を定義
  - Verify: メイン・レンダラー双方からimport可能

- [ ] 2-3: Dexie.jsセットアップ (`src/renderer/lib/db.ts`)
  - IndexedDBスキーマ定義 (reminders, settings テーブル)
  - Verify: DevToolsのApplication→IndexedDBにテーブル確認

- [ ] 2-4: Zustandカスタムストレージアダプタ (`src/renderer/lib/dexie-storage.ts`)
  - Zustand persistミドルウェア用のDexie連携アダプタ
  - Verify: ストア変更がIndexedDBに反映される

- [ ] 2-5: 繰り返し計算ロジック (`src/renderer/lib/recurrence.ts`)
  - `calculateNextFireTime()`: 各繰り返しタイプの次回発火時刻計算
  - 月末フォールバック対応
  - Verify: ユニットテストで全パターン確認

- [ ] 2-6: Zustandストア作成
  - `reminder-store.ts`: CRUD操作、フィルタリング、ソート
  - `settings-store.ts`: テーマ、スタートアップ設定
  - Verify: ストアの操作でIndexedDBが更新される

---

## Phase 3: メインプロセス

- [ ] 3-1: Preload スクリプト (`src/preload/index.ts`)
  - `contextBridge.exposeInMainWorld` でElectronAPIを公開
  - Verify: レンダラーで `window.electronAPI` がアクセス可能

- [ ] 3-2: メインプロセスエントリ (`src/main/index.ts`)
  - BrowserWindow作成、閉じる→非表示の動作
  - IPCハンドラー登録
  - Verify: ウィンドウ閉じでタスクバーから消え、プロセスは存続

- [ ] 3-3: TrayManager (`src/main/tray.ts`)
  - トレイアイコン設定、コンテキストメニュー構築
  - 左クリックでウィンドウ表示/非表示トグル
  - Verify: タスクトレイにアイコン表示、メニュー動作

- [ ] 3-4: Scheduler (`src/main/scheduler.ts`)
  - 60秒間隔でリマインダーチェック
  - `sync-reminders` IPCでレンダラーからのデータを受信・保持
  - 発火条件マッチで通知送信
  - Verify: テスト用リマインダーが指定時刻に発火

- [ ] 3-5: NotificationManager (`src/main/notification.ts`)
  - Windows通知の生成・表示
  - 通知クリックでウィンドウ表示
  - Verify: 通知が表示され、クリックでウィンドウが開く

- [ ] 3-6: AutoLaunch (`src/main/auto-launch.ts`)
  - `app.setLoginItemSettings()` でスタートアップ登録/解除
  - IPC経由で状態取得・変更
  - Verify: Windowsのスタートアップに登録/解除される

---

## Phase 4: UIコンポーネント

- [ ] 4-1: shadcn/uiコンポーネント追加
  - Button, Dialog, Input, Textarea, Select, Switch, Calendar, Popover, Label, ScrollArea, DropdownMenu, Separator, Badge
  - Verify: 各コンポーネントがimport可能

- [ ] 4-2: レイアウト・ヘッダー (`Header.tsx`)
  - アプリタイトル、新規作成ボタン、設定ボタン
  - Verify: ヘッダーが表示される

- [ ] 4-3: フィルターバー (`FilterBar.tsx`)
  - 繰り返しタイプでのフィルター、有効/全表示の切替
  - Verify: フィルター操作でリスト表示が変わる

- [ ] 4-4: リマインダーカード (`ReminderCard.tsx`)
  - 時刻、タイトル、繰り返しバッジ、有効/無効トグル
  - クリックで編集ダイアログ表示
  - Verify: カード表示、トグル操作、クリック動作

- [ ] 4-5: リマインダーリスト (`ReminderList.tsx`)
  - カード一覧、nextFireTimeでソート表示
  - 空状態の表示
  - Verify: リマインダー追加でリストに表示される

- [ ] 4-6: リマインダーフォーム (`ReminderForm.tsx`)
  - 作成/編集共用のダイアログ
  - タイトル、メモ、繰り返しタイプ、日時入力
  - 繰り返しタイプに応じて入力項目が動的に変化
  - バリデーション (タイトル必須、日時必須)
  - Verify: 各繰り返しタイプで正しい入力項目が表示、保存動作

- [ ] 4-7: 設定ダイアログ (`SettingsDialog.tsx`)
  - テーマ切替 (light/dark/system)
  - スタートアップ登録トグル
  - Verify: テーマ変更反映、スタートアップ設定がIPC経由で動作

- [ ] 4-8: App.tsx ルート統合
  - 全コンポーネントを統合、テーマ適用
  - リマインダー変更時にメインプロセスへの自動同期
  - 通知発火イベントのハンドリング
  - Verify: 全機能が統合された状態で動作

---

## Phase 5: テーマ・スタイリング

- [ ] 5-1: ダークモード対応
  - shadcn/uiのCSS変数でlight/darkテーマ定義
  - `nativeTheme` 連動の system モード実装
  - Verify: 3モードすべてで正しくテーマ切替

- [ ] 5-2: UIの洗練
  - 余白・フォント・カラーの調整
  - ホバー・トランジションアニメーション
  - レスポンシブ対応 (ウィンドウリサイズ)
  - Verify: 目視で洗練された印象を確認

---

## Phase 6: 統合テスト・仕上げ

- [ ] 6-1: E2E動作確認
  - リマインダーCRUD全操作
  - 通知発火 (1回・繰り返し各タイプ)
  - ウィンドウ閉じ→トレイ常駐→再表示
  - スタートアップ登録→OS再起動→自動起動
  - Verify: 全操作が正常に動作

- [ ] 6-2: アプリアイコン・トレイアイコン設定
  - resources/ にアイコンファイルを配置
  - forge.config.ts でアイコンを設定
  - Verify: タスクバー・トレイ・タイトルバーにアイコン表示

- [ ] 6-3: パッケージビルド
  - `npm run make` でWindowsインストーラー生成
  - Verify: インストーラーからインストール→起動→動作確認

---

## 依存関係

```
Phase 1 (初期化)
  ↓
Phase 2 (データ層) ──→ Phase 3 (メインプロセス)
  ↓                        ↓
Phase 4 (UI) ←─────────────┘
  ↓
Phase 5 (テーマ)
  ↓
Phase 6 (統合・仕上げ)
```

**並行作業可能:**
- Phase 2 と Phase 3 の一部 (Preload, Tray) は並行可能
- Phase 4 の各コンポーネントは並行可能
