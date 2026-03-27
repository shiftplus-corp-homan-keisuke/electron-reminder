import { Bell, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export default function Header({ onAddClick, onSettingsClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between px-4 bg-background border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-foreground" />
        <span className="font-semibold text-foreground">Reminder</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onAddClick} aria-label="リマインダーを追加">
          <Plus />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettingsClick} aria-label="設定">
          <Settings />
        </Button>
      </div>
    </header>
  );
}
