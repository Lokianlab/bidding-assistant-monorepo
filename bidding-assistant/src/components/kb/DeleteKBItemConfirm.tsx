/**
 * 刪除知識庫項目確認對話框
 */

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KBItem } from '@/lib/kb/types';
import { KBApiClient } from '@/lib/kb/api-client';

interface DeleteKBItemConfirmProps {
  open: boolean;
  item: KBItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteKBItemConfirm({
  open,
  item,
  onClose,
  onSuccess,
}: DeleteKBItemConfirmProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await KBApiClient.deleteItem(item.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認刪除？</AlertDialogTitle>
          <AlertDialogDescription>
            確認要刪除項目「{item.title}」嗎？此操作不可復原。
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>
            <strong>標題：</strong> {item.title}
          </p>
          <p>
            <strong>分類：</strong> {item.category}
          </p>
          <p>
            <strong>建立者：</strong> {item.created_by}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? '刪除中...' : '確認刪除'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
