'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '@/components/knowledge/SearchBar';
import { KnowledgeCard } from '@/components/knowledge/KnowledgeCard';
import { CategoryBrowser } from '@/components/knowledge/CategoryBrowser';

interface CardData {
  id: string;
  title: string | null;
  summary: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  source_file_name: string;
  drive_url: string | null;
  file_type: string | null;
}

interface CategoryItem {
  name: string;
  count: number;
  children?: { name: string; count: number }[];
}

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    total_cards: number;
    total_files: number;
    last_indexed: string | null;
  } | null>(null);

  // 載入分類和狀態
  useEffect(() => {
    Promise.all([
      fetch('/api/knowledge/categories').then(r => r.json()),
      fetch('/api/knowledge/status').then(r => r.json()),
    ]).then(([catData, statusData]) => {
      setCategories(catData.categories ?? []);
      setStatus(statusData);
    }).catch(() => {});
  }, []);

  // 搜尋
  const doSearch = useCallback(async (q: string, cat: string | null, subcat: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      if (subcat) params.set('subcategory', subcat);

      const res = await fetch(`/api/knowledge/search?${params}`);
      const data = await res.json();
      setCards(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setCards([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始搜尋
  useEffect(() => {
    doSearch('', null, null);
  }, [doSearch]);

  const handleSearch = (q: string) => {
    setQuery(q);
    doSearch(q, selectedCategory, selectedSubcategory);
  };

  const handleCategorySelect = (cat: string | null, subcat: string | null) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(subcat);
    doSearch(query, cat, subcat);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">知識庫</h1>
        {status && (
          <div className="text-xs text-gray-500">
            {status.total_cards} 張卡片 | {status.total_files} 個檔案
            {status.last_indexed && (
              <> | 最後更新 {new Date(status.last_indexed).toLocaleDateString('zh-TW')}</>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="flex gap-6">
        {/* 左側分類 */}
        <div className="w-48 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-600 mb-2">分類瀏覽</h3>
          <CategoryBrowser
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            onSelect={handleCategorySelect}
          />
        </div>

        {/* 右側卡片網格 */}
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-3">
            {loading ? '搜尋中...' : `${total} 筆結果`}
          </p>

          {cards.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-400">
              {status?.total_cards === 0
                ? '知識庫尚未建立索引。請到設定頁面啟動初始化。'
                : '沒有找到符合的卡片'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card) => (
                <KnowledgeCard
                  key={card.id}
                  title={card.title}
                  summary={card.summary}
                  category={card.category}
                  subcategory={card.subcategory}
                  tags={card.tags}
                  sourceFileName={card.source_file_name}
                  driveUrl={card.drive_url}
                  fileType={card.file_type}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
