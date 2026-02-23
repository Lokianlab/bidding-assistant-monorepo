// M07 知識庫搜尋頁面

'use client';

import { useState } from 'react';
import { useKBSearch } from '@/hooks/useKBSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function KBSearchPage() {
  const { query, setQuery, results, loading, error, search, clearResults } = useKBSearch();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    await search(query);
  };

  const handleClear = () => {
    clearResults();
    setHasSearched(false);
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
          <form onSubmit={handleSearch} className="flex gap-2">
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
                `找到 ${results.length} 個結果`
              )}
            </div>

            <div className="grid gap-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{result.title}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      相關度 {Math.round(result.relevance * 100)}%
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2">{result.content}</p>
                </div>
              ))}
            </div>
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
