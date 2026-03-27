import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useSettingsStore } from '../stores/settings-store';
import type { AppSettings } from '../types/reminder';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLaunchAtStartup = useSettingsStore((s) => s.setLaunchAtStartup);
  const setWebhookUrl = useSettingsStore((s) => s.setWebhookUrl);
  const setDisableNativeNotification = useSettingsStore((s) => s.setDisableNativeNotification);
  const setChiikawaMode = useSettingsStore((s) => s.setChiikawaMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription className="sr-only">アプリの設定を変更します</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* ちぃかわもーど */}
          <div className="flex flex-col gap-2">
            <Label>ちぃかわもーど</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="chiikawa-mode-switch"
                checked={settings.chiikawaModeEnabled}
                onCheckedChange={setChiikawaMode}
              />
              <label htmlFor="chiikawa-mode-switch" className="text-sm cursor-pointer select-none">
                {settings.chiikawaModeEnabled ? 'ON 🌸' : 'OFF'}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              OFFにするとシンプルなモノトーンUIになります
            </p>
          </div>

          <Separator />

          {/* テーマ */}
          <div className="flex flex-col gap-2">
            <Label>テーマ</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => setTheme(v as AppSettings['theme'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">システム設定に従う</SelectItem>
                <SelectItem value="light">ライト</SelectItem>
                <SelectItem value="dark">ダーク</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* スタートアップ */}
          <div className="flex flex-col gap-2">
            <Label>スタートアップ</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="startup-switch"
                checked={settings.launchAtStartup}
                onCheckedChange={setLaunchAtStartup}
              />
              <label htmlFor="startup-switch" className="text-sm cursor-pointer select-none">
                Windows起動時に自動起動
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              有効にすると、Windows起動時にバックグラウンドで自動的に起動します
            </p>
          </div>

          <Separator />

          {/* Webhook */}
          <div className="flex flex-col gap-2">
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

          {/* Webhook設定時のWindows通知抑制 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Switch
                id="disable-native-switch"
                checked={settings.disableNativeNotificationOnWebhook}
                disabled={!settings.webhookUrl}
                onCheckedChange={setDisableNativeNotification}
              />
              <label
                htmlFor="disable-native-switch"
                className="text-sm cursor-pointer select-none"
              >
                Webhook送信時はWindows通知を出さない
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.webhookUrl
                ? 'Webhook URLが設定されている場合のみ有効です'
                : 'Webhook URLを設定すると選択できます'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
