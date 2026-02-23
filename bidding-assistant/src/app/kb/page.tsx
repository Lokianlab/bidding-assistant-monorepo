/**
 * 知識庫管理頁面
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useKBItems } from '@/lib/kb/useKBItems';
import { KBItem, KBCategory } from '@/lib/kb/types';
import { KBSidebar } from '@/components/kb/KBSidebar';
import { KBSearchBar } from '@/components/kb/KBSearchBar';
import { KBTable } from '@/components/kb/KBTable';
import { CreateKBItemDialog } from '@/components/kb/CreateKBItemDialog';
import { EditKBItemDialog } from '@/components/kb/EditKBItemDialog';
import { DeleteKBItemConfirm } from '@/components/kb/DeleteKBItemConfirm';
import { Plus } from 'lucide-react';

export default function KBPage() {
  const {
    items,
    total,
    isLoading,
    error,
    pagination,
    filters,
    selection,
    refetch,
  } = useKBItems();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KBItem | null>(null);

  // 計算各分類的項目數量
  const counts = useMemo(() => {
    const result: Record<string | 'all', number> = {
      all: total,
      '00A': 0,
      '00B': 0,
      '00C': 0,
      '00D': 0,
      '00E': 0,
    };

    // 這裡應該從 API 取得每個分類的計數
    // 簡化起見，這裡假設已取得所有項目
    if (!filters.category) {
      items.forEach((item) => {
        if (result[item.category] !== undefined) {
          result[item.category]++;
        }
      });
    }

    return result;
  }, [total, items, filters.category]);

  const handleCreateSuccess = (item: KBItem) => {
    refetch();
    setIsCreateOpen(false);
  };

  const handleEditSuccess = () => {
    refetch();
    setEditingItem(null);
  };

  const handleDeleteSuccess = () => {
    refetch();
    setDeletingItem(null);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">知識庫管理</h1>
          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={isLoading}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            新增項目
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <KBSidebar
          selectedCategory={filters.category}
          counts={counts}
          onCategorySelect={filters.setCategory}
          isLoading={isLoading}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden p-6">
          {/* Search Bar */}
          <KBSearchBar
            onSearch={filters.setSearch}
            onClear={() => filters.setSearch('')}
            isLoading={isLoading}
          />

          {/* Error Alert */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <KBTable
                items={items}
                selectedIds={selection.selected}
                onSelectOne={selection.toggleOne}
                onSelectAll={selection.toggleAll}
                onEdit={setEditingItem}
                onDelete={setDeletingItem}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              共 {total} 項，第 {pagination.page} 頁
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  pagination.setPage(Math.max(1, pagination.page - 1))
                }
                disabled={pagination.page === 1 || isLoading}
              >
                上一頁
              </Button>
              <Button
                variant="outline"
                onClick={() => pagination.setPage(pagination.page + 1)}
                disabled={
                  pagination.page * pagination.perPage >= total || isLoading
                }
              >
                下一頁
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateKBItemDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {editingItem && (
        <EditKBItemDialog
          open={true}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingItem && (
        <DeleteKBItemConfirm
          open={true}
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
