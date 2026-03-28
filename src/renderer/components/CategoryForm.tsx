import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '../stores/category-store';
import type { Category } from '../types/reminder';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category; // 編集時に渡す
}

const PRESET_COLORS = [
  '#ef4444', // レッド
  '#f97316', // オレンジ
  '#eab308', // イエロー
  '#22c55e', // グリーン
  '#06b6d4', // シアン
  '#3b82f6', // ブルー
  '#8b5cf6', // パープル
  '#ec4899', // ピンク
  '#64748b', // スレート
  '#10b981', // エメラルド
];

const PRESET_ICONS = [
  '📋', '💼', '🏠', '❤️', '🎮', '🍕',
  '💊', '📚', '💡', '🎵', '🚗', '🐾',
  '⭐', '🎯', '💰', '🌿', '🎨', '🏋️',
  '📅', '🔔', '✅', '🛒', '🎓', '🌍',
];

interface FormValues {
  name: string;
  color: string;
  icon: string;
}

function defaultValues(category?: Category): FormValues {
  return {
    name: category?.name ?? '',
    color: category?.color ?? PRESET_COLORS[5],
    icon: category?.icon ?? '📋',
  };
}

export default function CategoryForm({ open, onOpenChange, category }: CategoryFormProps) {
  const addCategory = useCategoryStore((s) => s.addCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);

  const [values, setValues] = useState<FormValues>(() => defaultValues(category));
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(defaultValues(category));
      setNameError('');
    }
  }, [open, category]);

  const set = (partial: Partial<FormValues>) => setValues((v) => ({ ...v, ...partial }));

  function handleSave() {
    if (!values.name.trim()) {
      setNameError('カテゴリー名を入力してください');
      return;
    }
    if (category) {
      updateCategory(category.id, {
        name: values.name.trim(),
        color: values.color,
        icon: values.icon,
      });
    } else {
      addCategory({
        name: values.name.trim(),
        color: values.color,
        icon: values.icon,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {category ? 'カテゴリーを編集' : '新しいカテゴリー'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            カテゴリーの情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* プレビュー */}
          <div className="flex items-center justify-center py-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
              style={{ backgroundColor: `${values.color}20`, color: values.color }}
            >
              {values.icon} {values.name || 'カテゴリー名'}
            </span>
          </div>

          {/* 名前 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">名前 <span className="text-destructive">*</span></Label>
            <Input
              id="cat-name"
              placeholder="例: 仕事"
              maxLength={20}
              value={values.name}
              onChange={(e) => { set({ name: e.target.value }); setNameError(''); }}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* アイコン */}
          <div className="flex flex-col gap-1.5">
            <Label>アイコン</Label>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set({ icon })}
                  className={cn(
                    'flex items-center justify-center size-8 rounded-lg text-base transition-all',
                    values.icon === icon
                      ? 'bg-primary/20 ring-2 ring-primary scale-110'
                      : 'hover:bg-accent',
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* カラー */}
          <div className="flex flex-col gap-1.5">
            <Label>カラー</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set({ color })}
                  className={cn(
                    'size-7 rounded-full transition-transform',
                    values.color === color && 'ring-2 ring-offset-2 ring-foreground scale-110',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
