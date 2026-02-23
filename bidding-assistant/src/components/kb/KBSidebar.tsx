/**
 * 知識庫側邊欄
 * 顯示分類選單和計數
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { KBCategory } from '@/lib/kb/types';

const KB_CATEGORIES = [
  { id: '00A', name: '策略框架' },
  { id: '00B', name: '案件實績' },
  { id: '00C', name: '提案模板' },
  { id: '00D', name: '競爭分析' },
  { id: '00E', name: '其他資源' },
] as const;

interface KBSidebarProps {
  selectedCategory: KBCategory | null;
  counts: Record<string, number>;
  onCategorySelect: (category: KBCategory | null) => void;
  isLoading?: boolean;
}

export function KBSidebar({
  selectedCategory,
  counts,
  onCategorySelect,
  isLoading,
}: KBSidebarProps) {
  return (
    <div className="w-48 border-r bg-gray-50 p-4 flex flex-col gap-2">
      <h3 className="font-semibold text-sm text-gray-700 px-2">分類</h3>

      <Button
        variant={selectedCategory === null ? 'default' : 'ghost'}
        className="justify-start"
        onClick={() => onCategorySelect(null)}
        disabled={isLoading}
      >
        <span>全部</span>
        <span className="ml-auto text-xs text-gray-500">
          ({counts.all || 0})
        </span>
      </Button>

      {KB_CATEGORIES.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedCategory === cat.id ? 'default' : 'ghost'}
          className="justify-start"
          onClick={() => onCategorySelect(cat.id)}
          disabled={isLoading}
        >
          <span className="text-sm">{cat.name}</span>
          <span className="ml-auto text-xs text-gray-500">
            ({counts[cat.id] || 0})
          </span>
        </Button>
      ))}
    </div>
  );
}
