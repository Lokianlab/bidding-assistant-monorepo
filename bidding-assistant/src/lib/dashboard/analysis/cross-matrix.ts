/**
 * 二維交叉分析矩陣
 * 從 useCrossAnalysis.ts 抽取的純函式
 */

import type { NotionPage } from "../types";
import { F, CONCLUDED_STATUSES } from "../types";
import { buildBreakdown, getBudgetRange } from "./breakdown";
import type { ResultBreakdown } from "./breakdown";

// ====== 型別 ======

/** 交叉分析單格 */
export interface CrossCell {
  rowKey: string;
  colKey: string;
  total: number;
  won: number;
  winRate: number;
  wonBudget: number;
}

/** 交叉分析矩陣 */
export interface CrossMatrix {
  rowLabel: string;
  colLabel: string;
  rows: string[];
  cols: string[];
  cells: CrossCell[];
  rowTotals: Record<string, ResultBreakdown>;
  colTotals: Record<string, ResultBreakdown>;
}

// ====== 維度定義 ======

type DimensionExtractor = (p: NotionPage) => string[];

const DIMENSION_MAP: Record<string, { label: string; extract: DimensionExtractor }> = {
  writer: {
    label: "企劃人員",
    extract: (p) => {
      const w = p.properties[F.企劃主筆] ?? [];
      return Array.isArray(w) ? w.filter(Boolean) : [];
    },
  },
  agency: {
    label: "招標機關",
    extract: (p) => [p.properties[F.招標機關] ?? ""].filter(Boolean),
  },
  type: {
    label: "標案類型",
    extract: (p) => {
      const t = p.properties[F.標案類型] ?? [];
      return Array.isArray(t) ? t.filter(Boolean) : [];
    },
  },
  method: {
    label: "評審方式",
    extract: (p) => [p.properties[F.評審方式] ?? ""].filter(Boolean),
  },
  budgetRange: {
    label: "預算區間",
    extract: (p) => [getBudgetRange(p.properties[F.預算] ?? 0)],
  },
  decision: {
    label: "備標決策",
    extract: (p) => [p.properties[F.決策] ?? ""].filter(Boolean),
  },
  priority: {
    label: "投遞序位",
    extract: (p) => [p.properties[F.投遞序位] ?? ""].filter(Boolean),
  },
};

export type DimensionKey = keyof typeof DIMENSION_MAP;

export const DIMENSION_OPTIONS: { key: DimensionKey; label: string }[] = [
  { key: "writer", label: "企劃人員" },
  { key: "agency", label: "招標機關" },
  { key: "type", label: "標案類型" },
  { key: "method", label: "評審方式" },
  { key: "budgetRange", label: "預算區間" },
  { key: "decision", label: "備標決策" },
  { key: "priority", label: "投遞序位" },
];

// ====== 交叉矩陣計算 ======

export function computeCrossMatrix(
  pages: NotionPage[],
  dimA: DimensionKey,
  dimB: DimensionKey,
): CrossMatrix {
  const a = DIMENSION_MAP[dimA];
  const b = DIMENSION_MAP[dimB];

  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const cellMap: Record<string, NotionPage[]> = {};
  const rowGroups: Record<string, NotionPage[]> = {};
  const colGroups: Record<string, NotionPage[]> = {};

  for (const p of pages) {
    const rowKeys = a.extract(p);
    const colKeys = b.extract(p);

    for (const rk of rowKeys) {
      rowSet.add(rk);
      if (!rowGroups[rk]) rowGroups[rk] = [];
      rowGroups[rk].push(p);

      for (const ck of colKeys) {
        colSet.add(ck);
        if (!colGroups[ck]) colGroups[ck] = [];
        colGroups[ck].push(p);

        const cellKey = `${rk}|||${ck}`;
        if (!cellMap[cellKey]) cellMap[cellKey] = [];
        cellMap[cellKey].push(p);
      }
    }
  }

  const rows = Array.from(rowSet).sort();
  const cols = Array.from(colSet).sort();

  const cells: CrossCell[] = [];
  for (const rk of rows) {
    for (const ck of cols) {
      const cellPages = cellMap[`${rk}|||${ck}`] ?? [];
      const won = cellPages.filter((p) => p.properties[F.進程] === "得標").length;
      const concluded = cellPages.filter((p) => CONCLUDED_STATUSES.has(p.properties[F.進程] ?? "")).length;
      cells.push({
        rowKey: rk, colKey: ck,
        total: cellPages.length, won,
        winRate: concluded > 0 ? Math.round((won / concluded) * 100) : 0,
        wonBudget: cellPages.filter((p) => p.properties[F.進程] === "得標")
          .reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0),
      });
    }
  }

  const rowTotals: Record<string, ResultBreakdown> = {};
  for (const rk of rows) rowTotals[rk] = buildBreakdown(rk, rowGroups[rk] ?? []);
  const colTotals: Record<string, ResultBreakdown> = {};
  for (const ck of cols) colTotals[ck] = buildBreakdown(ck, colGroups[ck] ?? []);

  return { rowLabel: a.label, colLabel: b.label, rows, cols, cells, rowTotals, colTotals };
}
