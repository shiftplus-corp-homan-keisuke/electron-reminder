import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Sparkles, Bell, Webhook } from 'lucide-react';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { useSettingsStore } from '../stores/settings-store';
import type { AppSettings } from '../types/reminder';
import appIcon from '../assets/icon.png';

// ─── カテゴリー定義 ───────────────────────────────────────────
type SettingsCategory = 'general' | 'notification' | 'integration';

const CATEGORIES: { id: SettingsCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'general',      label: '一般',   icon: <Sparkles className="size-4" strokeWidth={1.8} /> },
  { id: 'notification', label: '通知',   icon: <Bell     className="size-4" strokeWidth={1.8} /> },
  { id: 'integration',  label: '連携',   icon: <Webhook  className="size-4" strokeWidth={1.8} /> },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
];

const APP_VERSION = __APP_VERSION__;

// ─── 共通部品 ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-foreground mb-4">{children}</h3>;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

// ─── 一般パネル（一般＋表示を統合）─────────────────────────────
function GeneralPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setLaunchAtStartup = useSettingsStore((s) => s.setLaunchAtStartup);
  const setChiikawaMode = useSettingsStore((s) => s.setChiikawaMode);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>一般</SectionTitle>

      <SettingRow
        label="ちぃかわもーど 🌸"
        description="ONにするとかわいい背景装飾が表示されます"
      >
        <Switch checked={settings.chiikawaModeEnabled} onCheckedChange={setChiikawaMode} />
      </SettingRow>

      <Separator />

      <SettingRow label="テーマ" description="アプリ全体の配色テーマを選択します">
        <Select
          value={settings.theme}
          onValueChange={(v) => setTheme(v as AppSettings['theme'])}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">システム設定に従う</SelectItem>
            <SelectItem value="light">ライト</SelectItem>
            <SelectItem value="dark">ダーク</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <Separator />

      <SettingRow
        label="Windows起動時に自動起動"
        description="有効にすると、Windows起動時にバックグラウンドで自動的に起動します"
      >
        <Switch checked={settings.launchAtStartup} onCheckedChange={setLaunchAtStartup} />
      </SettingRow>
    </div>
  );
}

// ─── 通知パネル ───────────────────────────────────────────────
function NotificationPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setTodayDigest = useSettingsStore((s) => s.setTodayDigest);
  const setWeeklyDigest = useSettingsStore((s) => s.setWeeklyDigest);

  const [todayTime, setTodayTime] = useState(settings.todayDigestTime);
  const [weeklyTime, setWeeklyTime] = useState(settings.weeklyDigestTime);

  useEffect(() => {
    setTodayTime(settings.todayDigestTime);
    setWeeklyTime(settings.weeklyDigestTime);
  }, [settings.todayDigestTime, settings.weeklyDigestTime]);

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>通知</SectionTitle>
      <p className="text-xs text-muted-foreground -mt-3">
        決まった時刻に予定一覧をまとめて通知します
      </p>

      {/* 今日のダイジェスト */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <SettingRow
          label="📅 今日の予定ダイジェスト"
          description="毎日指定した時刻に今日の予定を通知します"
        >
          <Switch
            checked={settings.todayDigestEnabled}
            onCheckedChange={(v) => setTodayDigest(v, todayTime)}
          />
        </SettingRow>
        {settings.todayDigestEnabled && (
          <div className="flex items-center gap-3 pt-1">
            <Label className="text-xs text-muted-foreground shrink-0">通知時刻</Label>
            <TimePickerInput
              value={todayTime}
              onChange={(v) => {
                setTodayTime(v);
                setTodayDigest(settings.todayDigestEnabled, v);
              }}
            />
          </div>
        )}
      </div>

      {/* 今週のダイジェスト */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <SettingRow
          label="📆 今週の予定ダイジェスト"
          description="毎週指定した曜日・時刻に今週の予定を通知します"
        >
          <Switch
            checked={settings.weeklyDigestEnabled}
            onCheckedChange={(v) => setWeeklyDigest(v, weeklyTime, settings.weeklyDigestDay)}
          />
        </SettingRow>
        {settings.weeklyDigestEnabled && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground shrink-0 w-16">通知曜日</Label>
              <Select
                value={String(settings.weeklyDigestDay)}
                onValueChange={(v) =>
                  setWeeklyDigest(settings.weeklyDigestEnabled, weeklyTime, Number(v))
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_WEEK_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground shrink-0 w-16">通知時刻</Label>
              <TimePickerInput
                value={weeklyTime}
                onChange={(v) => {
                  setWeeklyTime(v);
                  setWeeklyDigest(settings.weeklyDigestEnabled, v, settings.weeklyDigestDay);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 連携パネル ───────────────────────────────────────────────
function IntegrationPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setWebhookUrl = useSettingsStore((s) => s.setWebhookUrl);
  const setDisableNativeNotification = useSettingsStore((s) => s.setDisableNativeNotification);

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>連携</SectionTitle>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://example.com/webhook"
          value={settings.webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="select-text"
        />
        <p className="text-xs text-muted-foreground">
          設定するとリマインダー発火時にPOSTリクエストを送信します
        </p>
      </div>

      <Separator />

      <SettingRow
        label="Webhook送信時はWindows通知を出さない"
        description={
          settings.webhookUrl
            ? 'Webhook URLが設定されている場合のみ有効です'
            : 'Webhook URLを設定すると選択できます'
        }
      >
        <Switch
          checked={settings.disableNativeNotificationOnWebhook}
          disabled={!settings.webhookUrl}
          onCheckedChange={setDisableNativeNotification}
        />
      </SettingRow>
    </div>
  );
}

// ─── メインダイアログ ─────────────────────────────────────────

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');

  const renderPanel = () => {
    switch (activeCategory) {
      case 'general':      return <GeneralPanel />;
      case 'notification': return <NotificationPanel />;
      case 'integration':  return <IntegrationPanel />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>アプリの設定を変更します</DialogDescription>
        </DialogHeader>

        <div className="flex h-[480px]">
          {/* 左: カテゴリーサイドバー */}
          <aside className="w-44 flex flex-col bg-muted/40 border-r border-border shrink-0">
            <div className="px-4 py-4 border-b border-border shrink-0">
              <h2 className="text-sm font-bold">設定</h2>
            </div>
            <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer text-left',
                    activeCategory === cat.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </nav>

            {/* バージョン情報 */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2 px-1">
                <img src={appIcon} alt="" className="w-5 h-5 object-contain opacity-80" draggable={false} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-muted-foreground/70 leading-tight">
                    ちぃかわりまいんだぁ
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 leading-tight">
                    v{APP_VERSION}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* 右: コンテンツパネル */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderPanel()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
