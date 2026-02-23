// M07 知識庫搜尋頁面

'use client';

import { useState } from 'react';
import { useKBSearch, type SearchFilters } from '@/hooks/useKBSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORIES = ['00A', '00B', '00C', '00D', '00E'];
const STATUSES = ['active', 'archived', 'draft'];

export default function KBSearchPage() {
  const { query, setQuery, results, loading, error, search, clearResults, total } = useKBSearch();
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setOffset(0); // 重置分頁
    const filters: SearchFilters = {
      categories: selectedCategories.length > 0 ? (selectedCategories as any) : undefined,
      status: selectedStatus ? (selectedStatus as any) : undefined,
      limit,
      offset: 0,
    };
    await search(query, filters);
  };

  const handleClear = () => {
    clearResults();
    setHasSearched(false);
    setSelectedCategories([]);
    setSelectedStatus('');
    setOffset(0);
  };

  const handleLoadMore = async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    const filters: SearchFilters = {
      categories: selectedCategories.length > 0 ? (selectedCategories as any) : undefined,
      status: selectedStatus ? (selectedStatus as any) : undefined,
      limit,
      offset: newOffset,
    };
    await search(query, filters);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* 頭部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">知識庫搜尋</h1>
          <p className="text-slate-600">搜尋公司歷史案例、經驗資料和學習紀錄</p>
        </div>

        {/* 搜尋表單 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="輸入關鍵字：案件名稱、技術、客戶..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? '搜尋中...' : '搜尋'}
              </Button>
              {hasSearched && (
                <Button type="button" variant="outline" onClick={handleClear}>
                  清除
                </Button>
              )}
            </div>

            {/* 篩選選項 */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">分類</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedCategories.includes(cat)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">狀態</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-1 border rounded text-sm"
                >
                  <option value="">全部</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 搜尋結果 */}
        {hasSearched && (
          <div>
            <div className="text-sm text-slate-600 mb-4">
              {loading ? (
                '搜尋中...'
              ) : results.length === 0 ? (
                `未找到與「${query}」相關的結果`
              ) : (
                `找到 ${total || results.length} 個結果`
              )}
            </div>

            <div className="grid gap-4 mb-6">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{result.title}</h3>
                      <div className="flex gap-2 mt-1">
                        {result.category && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                            {result.category}
                          </span>
                        )}
                        {result.entryId && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                            {result.entryId}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      相關度 {Math.round(result.relevance * 100)}%
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2">{result.content}</p>
                </div>
              ))}
            </div>

            {/* 載入更多按鈕 */}
            {results.length > 0 && total && offset + limit < total && (
              <div className="text-center">
                <Button onClick={handleLoadMore} disabled={loading} variant="outline">
                  {loading ? '載入中...' : '載入更多'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 初始狀態 */}
        {!hasSearched && !error && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-slate-500">輸入關鍵字開始搜尋</p>
          </div>
        )}
      </div>
    </div>
  );
}
