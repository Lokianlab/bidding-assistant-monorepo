/**
 * 新增知識庫項目對話框
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useKBForm } from '@/lib/kb/useKBForm';
import { KBCategory, KBItem } from '@/lib/kb/types';

interface CreateKBItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (item: KBItem) => void;
}

const CATEGORY_OPTIONS: { value: KBCategory; label: string }[] = [
  { value: '00A', label: '策略框架' },
  { value: '00B', label: '案件實績' },
  { value: '00C', label: '提案模板' },
  { value: '00D', label: '競爭分析' },
  { value: '00E', label: '其他資源' },
];

export function CreateKBItemDialog({
  open,
  onClose,
  onSuccess,
}: CreateKBItemDialogProps) {
  const { form, setForm, errors, isSubmitting, submitError, submit } =
    useKBForm();

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      onSuccess(result);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增知識庫項目</DialogTitle>
          <DialogDescription>
            填入項目資訊並選擇分類
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {submitError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              分類 <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm({ category: value as KBCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              標題 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="輸入項目標題"
              value={form.title}
              onChange={(e) => setForm({ title: e.target.value })}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">內容</label>
            <Textarea
              placeholder="輸入項目內容（可選）"
              value={form.content}
              onChange={(e) => setForm({ content: e.target.value })}
              disabled={isSubmitting}
              rows={4}
            />
            {errors.content && (
              <p className="text-sm text-red-500 mt-1">{errors.content}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '新增'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
