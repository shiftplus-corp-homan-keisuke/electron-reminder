# Electron Reminder

Windows 向けのデスクトップリマインダーアプリです。  
シンプルで直感的な UI を持ち、**システムトレイに常駐してバックグラウンドでも通知を届けます**。

---

## 機能

| 機能 | 説明 |
|------|------|
| リマインダー管理 | 作成・編集・削除・有効/無効の切替 |
| 繰り返し通知 | **1回・毎日・毎週・毎月・毎年** の5種類 |
| Windows通知 | トースト通知（Windows 10 / 11）。通知クリックで該当リマインダーにジャンプ |
| トレイ常駐 | ウィンドウを閉じても通知し続ける。タスクトレイから再表示 |
| スタートアップ登録 | Windows 起動時に自動起動（設定画面またはトレイメニューからトグル） |
| テーマ切替 | ライト / ダーク / システム設定に従う の3モード |
| 完全オフライン | データはすべてローカル（IndexedDB）に保存。インターネット不要 |

---

## 動作環境

| 項目 | 要件 |
|------|------|
| OS | Windows 10 / 11 (64-bit) |
| ネットワーク | 不要 |

---

## インストール（エンドユーザー向け）

### Windows インストーラーから使う

1. [Releases](../../releases) ページから **`ElectronReminderSetup.exe`** をダウンロード
2. ダウンロードした `.exe` をダブルクリックしてインストール
3. デスクトップまたはスタートメニューの「**Electron Reminder**」から起動

> **インストール場所**  
> `%LOCALAPPDATA%\electron_reminder\` に自動インストールされます。

---

## 開発環境のセットアップ

### 前提条件

| ツール | バージョン |
|--------|-----------|
| Node.js | v20 以上 |
| npm | v10 以上 |

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-name/electron-reminder.git
cd electron-reminder

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動（ホットリロード対応）
npm start
```

アプリが起動したら、コードを変更するたびに自動でリロードされます。

### WSL (Windows Subsystem for Linux) で開発する場合

WSL 上での開発は可能ですが、**一部の機能に制限**があります。

| 機能 | WSL での動作 |
|------|-------------|
| UI 表示 | ✅ 動作する（WSLg 経由） |
| リマインダー CRUD | ✅ 動作する |
| テーマ切替 | ✅ 動作する |
| **Windows 通知** | ❌ **届かない**（Linux 通知バックエンドが使われる） |
| トレイアイコン | ⚠️ 表示されない場合あり |
| スタートアップ登録 | ❌ Linux 環境では無効 |

> **Windows 通知のテストは Windows ネイティブ環境（または `npm run make` でビルドした .exe）で行ってください。**
>
> WSL でリマインダーが発火したとき、通知の代わりに**タスクバーボタンが点滅**します。

---

## 使い方

### リマインダーを追加する

1. ヘッダー右上の **`+` ボタン** をクリック
2. **タイトル**（必須）と**メモ**（任意）を入力
3. **繰り返し** を選択する

   | 選択肢 | 必要な設定 |
   |--------|-----------|
   | 1回のみ | 日付 + 時刻 |
   | 毎日 | 時刻 |
   | 毎週 | 曜日 + 時刻 |
   | 毎月 | 日（1〜31）+ 時刻 |
   | 毎年 | 月 + 日 + 時刻 |

4. **保存** をクリック

> **ヒント**  
> 毎月 31 日を指定すると、31日が存在しない月はその月の最終日に自動調整されます。

---

### リマインダーを編集・削除する

- **カードをクリック** → 編集ダイアログを開く
- **カードにマウスを乗せる** → ゴミ箱アイコンが表示され、クリックで削除（確認ダイアログあり）
- **右側のスイッチ** → リマインダーを一時的に無効化 / 再有効化

---

### フィルターで絞り込む

ヘッダー下のタブで表示するリマインダーを絞り込めます。

```
すべて  有効  無効  1回  毎日  毎週  毎月  毎年
```

---

### 通知が届いたとき

- **Windows トースト通知**が画面右下に表示されます
- 通知をクリックすると、アプリが前面に表示され、対象のリマインダーがハイライトされます
- 「1回のみ」のリマインダーは通知後に自動で「完了」になります

---

### ウィンドウを閉じてもバックグラウンドで動作

- ウィンドウ右上の **× ボタン** はアプリを終了しません。タスクトレイに格納されます
- **タスクトレイのアイコンをクリック** → ウィンドウを再表示
- **タスクトレイを右クリック** → コンテキストメニュー

```
┌───────────────────────────┐
│  開く                      │
├───────────────────────────┤
│  ☐  スタートアップに登録   │
├───────────────────────────┤
│  終了                      │
└───────────────────────────┘
```

> **完全に終了** するには、トレイメニューの **「終了」** をクリックしてください。

---

### スタートアップ登録

Windows 起動時に自動でアプリを起動させる方法は2つあります。

- **設定画面**（歯車アイコン）→「Windows起動時に自動起動」をオン
- **トレイを右クリック** → 「スタートアップに登録」にチェック

---

### テーマを切り替える

歯車アイコンの**設定画面** → 「テーマ」から選択できます。

| 選択肢 | 動作 |
|--------|------|
| システム設定に従う | Windows のダーク/ライト設定に自動連動 |
| ライト | 常にライトモード |
| ダーク | 常にダークモード |

---

## ビルド・パッケージング

### 開発ビルド（動作確認用）

```bash
# アンパック済みアプリを生成（インストール不要で直接起動できる）
npm run package
# 出力先: out/Electron Reminder-linux-x64/  ※Linux の場合
```

### Windows インストーラーを作成（Windows 環境で実行）

```bash
# Squirrel.Windows インストーラー (.exe) を生成
npm run make

# 出力先: out/make/squirrel.windows/x64/
#   └── ElectronReminderSetup.exe
```

> **クロスビルドについて**  
> Squirrel.Windows インストーラーは **Windows 上でのみ** 生成できます。  
> ZIP 形式のみであれば他プラットフォームからでも生成可能です。
>
> ```bash
> npm run make -- --targets @electron-forge/maker-zip
> ```

### アイコンの再生成

```bash
python3 scripts/create-icons.py
# resources/ に icon.ico, icon.png, tray-icon.png, tray-icon@2x.png を生成
```

---

## プロジェクト構成

```
electron-reminder/
├── src/
│   ├── main/                  # メインプロセス (Node.js)
│   │   ├── index.ts           # エントリ・IPC登録・ウィンドウ管理
│   │   ├── tray.ts            # トレイアイコン・コンテキストメニュー
│   │   ├── scheduler.ts       # 60秒間隔の通知発火チェック
│   │   ├── notification.ts    # Windows トースト通知
│   │   └── auto-launch.ts     # スタートアップ登録
│   ├── preload/
│   │   └── index.ts           # contextBridge (IPC を UI に公開)
│   ├── renderer/              # レンダラープロセス (React)
│   │   ├── App.tsx            # ルートコンポーネント
│   │   ├── components/        # UI コンポーネント
│   │   │   ├── Header.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── ReminderList.tsx
│   │   │   ├── ReminderCard.tsx
│   │   │   ├── ReminderForm.tsx     # 作成/編集ダイアログ
│   │   │   ├── SettingsDialog.tsx
│   │   │   └── ui/            # shadcn/ui プリミティブ
│   │   ├── stores/            # Zustand ストア
│   │   │   ├── reminder-store.ts
│   │   │   └── settings-store.ts
│   │   ├── lib/
│   │   │   ├── db.ts          # Dexie.js (IndexedDB)
│   │   │   ├── recurrence.ts  # 繰り返し日時計算
│   │   │   ├── format.ts      # 日付フォーマット
│   │   │   └── ipc.ts         # IPC 呼び出しラッパー
│   │   └── hooks/
│   │       └── use-theme.ts   # テーマ管理フック
│   └── shared/
│       └── constants.ts       # IPC チャネル名定数
├── resources/                 # アイコンファイル
│   ├── icon.ico
│   ├── icon.png
│   ├── tray-icon.png
│   └── tray-icon@2x.png
├── scripts/
│   └── create-icons.py        # アイコン生成スクリプト
├── specs/                     # 設計ドキュメント
├── forge.config.ts            # Electron Forge 設定
├── vite.*.config.ts           # Vite ビルド設定
└── components.json            # shadcn/ui 設定
```

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | [Electron](https://www.electronjs.org/) 35 |
| ビルドツール | [Electron Forge](https://www.electronforge.io/) + [Vite](https://vitejs.dev/) 6 |
| UI | [React](https://react.dev/) 19 + TypeScript |
| UIコンポーネント | [shadcn/ui](https://ui.shadcn.com/) (new-york style) |
| スタイリング | [Tailwind CSS](https://tailwindcss.com/) 4 |
| 状態管理 | [Zustand](https://zustand-demo.pmnd.rs/) 5 (persist ミドルウェア) |
| データ永続化 | [Dexie.js](https://dexie.org/) 4 (IndexedDB ラッパー) |
| 日時処理 | [date-fns](https://date-fns.org/) 4 |
| アイコン | [Lucide React](https://lucide.dev/) |

---

## ライセンス

MIT
