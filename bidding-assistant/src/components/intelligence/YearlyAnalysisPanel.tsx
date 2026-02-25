'use client';

import { useState } from 'react';
import type { BidderGroup } from '@/lib/intelligence/types';
import { buildYearlyAnalysis } from '@/lib/intelligence/yearly-analysis';
import type { AgencyCase } from '@/lib/intelligence/types';

interface Props {
  cases: AgencyCase[];
}

const TABS: { key: BidderGroup; label: string }[] = [
  { key: 'total',  label: '總計' },
  { key: 'single', label: '只有一家投標' },
  { key: 'two',    label: '二家投標' },
  { key: 'multi',  label: '三家以上投標' },
];

function formatAmount(val: number | null): string {
  if (val === null) return '—';
  if (val >= 1_000_000) return `${(val / 10000).toFixed(0)} 萬`;
  return `${val.toLocaleString()}`;
}

export function YearlyAnalysisPanel({ cases }: Props) {
  const [activeTab, setActiveTab] = useState<BidderGroup>('total');
  const data = buildYearlyAnalysis(cases);
  const rows = data[activeTab];

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-3">分年標案分析</h3>

      {/* 頁籤 */}
      <div className="flex gap-1 mb-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-xs text-gray-400">
              ({data[tab.key].reduce((s, r) => s + r.count, 0)})
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">此組別無資料</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <th className="py-2 px-3">年份</th>
                <th className="py-2 px-3">分類</th>
                <th className="py-2 px-3 text-right">件數</th>
                <th className="py-2 px-3 text-right">預算金額</th>
                <th className="py-2 px-3 text-right">決標金額</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.year}-${row.category}`}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 font-medium">{row.year}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      {row.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{row.count}</td>
                  <td className="py-2 px-3 text-right text-gray-500">{formatAmount(row.budget_total)}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatAmount(row.award_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">預算金額：搜尋結果通常不含此欄位（顯示「—」為正常）</p>
    </div>
  );
}
