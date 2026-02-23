/**
 * 編輯知識庫項目對話框
 */

import React, { useEffect } from 'react';
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
import { useKBForm } from '@/lib/kb/useKBForm';
import { KBItem } from '@/lib/kb/types';

interface EditKBItemDialogProps {
  open: boolean;
  item: KBItem;
  onClose: () => void;
  onSuccess: (item: KBItem) => void;
}

export function EditKBItemDialog({
  open,
  item,
  onClose,
  onSuccess,
}: EditKBItemDialogProps) {
  const { form, setForm, errors, isSubmitting, submitError, submit, reset } =
    useKBForm(item);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, item, reset]);

  const handleSubmit = async () => {
    const result = await submit(item.id);
    if (result) {
      onSuccess(result);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯知識庫項目</DialogTitle>
          <DialogDescription>修改項目資訊並儲存</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {submitError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">分類</label>
            <div className="px-3 py-2 border rounded bg-gray-50 text-sm">
              {item.category}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">標題</label>
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
              placeholder="輸入項目內容"
              value={form.content}
              onChange={(e) => setForm({ content: e.target.value })}
              disabled={isSubmitting}
              rows={4}
            />
            {errors.content && (
              <p className="text-sm text-red-500 mt-1">{errors.content}</p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            建立者: {item.created_by} | 建立日期:{' '}
            {new Date(item.created_at).toLocaleDateString('zh-TW')}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
