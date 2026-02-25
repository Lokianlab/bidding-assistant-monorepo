'use client';

import { buildCompetitorsByCategory } from '@/lib/intelligence/yearly-analysis';
import type { AgencyCase } from '@/lib/intelligence/types';

interface Props {
  cases: AgencyCase[];
}

export function CompetitorByCategoryPanel({ cases }: Props) {
  const data = buildCompetitorsByCategory(cases);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-3">分類競爭對手</h3>
      <div className="space-y-4">
        {data.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">
                {cat.category}
              </span>
              <span className="text-xs text-gray-500">{cat.total_cases} 件</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.top_competitors.map((comp) => (
                <div
                  key={comp.name}
                  className="flex items-center gap-1.5 text-xs bg-white border rounded-full px-2.5 py-1"
                >
                  <span className="font-medium">{comp.name}</span>
                  <span className="text-gray-400">
                    出現 {comp.encounter_count} 次
                    {comp.win_count > 0 && (
                      <span className="text-amber-600 ml-1">
                        ／得標 {comp.win_count}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
