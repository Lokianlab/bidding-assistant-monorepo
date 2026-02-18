// ====== 標案狀態：唯一來源 ======
// 所有狀態字串、分組、顏色、API filter 都從這裡產生
// 要新增/移除/改名任何狀態，只需改這一個檔案

// ====== 狀態字串常數 ======

export const BID_STATUS = {
  等標期間: "等標期間",
  著手領備標: "著手領/備標",
  已投標: "已投標",
  競標階段: "競標階段",
  已出席簡報: "已出席簡報",
  不參與: "不參與",
  逾期未參與: "逾期未參與",
  領標後未參與: "領標後未參與",
  資格不符: "資格不符",
  未獲青睞: "未獲青睞",
  流標廢標: "流標/廢標",
  黃冊集結: "黃冊集結（紙本）",
  得標: "得標",
} as const;

export type BidStatusValue = (typeof BID_STATUS)[keyof typeof BID_STATUS];

// ====== 狀態分組 ======

/** 「進行中」或「得標」（截標後仍顯示在指揮部） */
export const ACTIVE_STATUSES: Set<string> = new Set([
  BID_STATUS.著手領備標,
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.得標,
]);

/** 投標件數統計用（含截標期間內所有已結案狀態） */
export const SUBMITTED_STATUSES: Set<string> = new Set([
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.得標,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.資格不符,
  BID_STATUS.領標後未參與,
]);

/** 已領標的狀態（用來算總投入成本） */
export const PROCURED_STATUSES: Set<string> = new Set([
  BID_STATUS.領標後未參與,
  BID_STATUS.逾期未參與,
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.得標,
]);

/** 必須列入績效統計的狀態（績效檢視中心用） */
export const REVIEW_STATUSES: Set<string> = new Set([
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.領標後未參與,
  BID_STATUS.資格不符,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.得標,
]);

/** 已結案的狀態（可計算勝率） */
export const CONCLUDED_STATUSES: Set<string> = new Set([
  BID_STATUS.得標,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.資格不符,
]);

/** 沉沒成本（領標後放棄） */
export const SUNK_STATUSES: Set<string> = new Set([
  BID_STATUS.領標後未參與,
  BID_STATUS.逾期未參與,
]);

// ====== 順序陣列 ======

/** 看板欄位順序（指揮部 Kanban 用） */
export const BOARD_COLUMNS_ORDER = [
  BID_STATUS.等標期間,
  BID_STATUS.著手領備標,
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.不參與,
  BID_STATUS.逾期未參與,
  BID_STATUS.領標後未參與,
  BID_STATUS.資格不符,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.黃冊集結,
  BID_STATUS.得標,
];

/** 績效表格的欄位順序 */
export const PERFORMANCE_STATUS_COLUMNS = [
  BID_STATUS.已投標,
  BID_STATUS.競標階段,
  BID_STATUS.已出席簡報,
  BID_STATUS.領標後未參與,
  BID_STATUS.資格不符,
  BID_STATUS.未獲青睞,
  BID_STATUS.流標廢標,
  BID_STATUS.得標,
];

// ====== 顏色表（Tailwind class） ======

export const STATUS_COLORS_TW: Record<string, string> = {
  [BID_STATUS.等標期間]: "bg-slate-100 text-slate-700",
  [BID_STATUS.著手領備標]: "bg-blue-100 text-blue-800",
  [BID_STATUS.已投標]: "bg-amber-100 text-amber-800",
  [BID_STATUS.競標階段]: "bg-purple-100 text-purple-800",
  [BID_STATUS.已出席簡報]: "bg-indigo-100 text-indigo-800",
  [BID_STATUS.不參與]: "bg-gray-200 text-gray-500",
  [BID_STATUS.逾期未參與]: "bg-gray-100 text-gray-500",
  [BID_STATUS.領標後未參與]: "bg-gray-100 text-gray-500",
  [BID_STATUS.資格不符]: "bg-rose-100 text-rose-700",
  [BID_STATUS.未獲青睞]: "bg-rose-100 text-rose-700",
  [BID_STATUS.流標廢標]: "bg-pink-100 text-pink-700",
  [BID_STATUS.黃冊集結]: "bg-yellow-100 text-yellow-800",
  [BID_STATUS.得標]: "bg-emerald-100 text-emerald-800",
};

export const PRIORITY_COLORS_TW: Record<string, string> = {
  "第一順位": "bg-red-100 text-red-800",
  "第二順位": "bg-orange-100 text-orange-800",
  "第三順位": "bg-yellow-100 text-yellow-800",
  "不參與投標": "bg-gray-200 text-gray-500",
  "參與投標": "bg-blue-100 text-blue-800",
  "評估中": "bg-purple-100 text-purple-800",
  "尚未安排": "bg-gray-100 text-gray-600",
};

export const AUTO_COLORS_TW = [
  "bg-cyan-100 text-cyan-800",
  "bg-violet-100 text-violet-800",
  "bg-lime-100 text-lime-800",
  "bg-teal-100 text-teal-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
];

// ====== 顏色表（Hex，給 recharts 用） ======

export const STATUS_COLORS_HEX: Record<string, string> = {
  [BID_STATUS.等標期間]: "#94a3b8",
  [BID_STATUS.著手領備標]: "#3b82f6",
  [BID_STATUS.已投標]: "#f59e0b",
  [BID_STATUS.競標階段]: "#8b5cf6",
  [BID_STATUS.已出席簡報]: "#6366f1",
  [BID_STATUS.不參與]: "#9ca3af",
  [BID_STATUS.逾期未參與]: "#9ca3af",
  [BID_STATUS.領標後未參與]: "#9ca3af",
  [BID_STATUS.資格不符]: "#f43f5e",
  [BID_STATUS.未獲青睞]: "#f43f5e",
  [BID_STATUS.流標廢標]: "#ec4899",
  [BID_STATUS.黃冊集結]: "#eab308",
  [BID_STATUS.得標]: "#10b981",
};

export const DECISION_COLORS_HEX: Record<string, string> = {
  "第一順位": "#ef4444",
  "第二順位": "#f97316",
  "第三順位": "#eab308",
  "不參與投標": "#9ca3af",
  "參與投標": "#3b82f6",
  "評估中": "#8b5cf6",
  "尚未安排": "#6b7280",
};

/** 堆疊長條圖用（交叉分析） */
export const STACK_COLORS_HEX: Record<string, string> = {
  [BID_STATUS.得標]: "#10b981",
  [BID_STATUS.未獲青睞]: "#f43f5e",
  [BID_STATUS.流標廢標]: "#ec4899",
  [BID_STATUS.資格不符]: "#ef4444",
  [BID_STATUS.領標後未參與]: "#9ca3af",
  "進行中": "#6366f1",
};

// ====== 通用調色盤 ======

export const CHART_PALETTE = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];

// ====== 工具函式 ======

/** 從 Set 自動產生 Notion API filter */
export function buildStatusFilter(
  statuses: Set<string>,
  propertyName = "標案進程",
) {
  return {
    or: Array.from(statuses).map((s) => ({
      property: propertyName,
      status: { equals: s },
    })),
  };
}

/** 產生 Tailwind color map（未知狀態自動配色） */
export function buildColorMap(
  options: string[],
  defaultMap: Record<string, string>,
): Record<string, string> {
  const result = { ...defaultMap };
  let autoIdx = 0;
  for (const opt of options) {
    if (!result[opt]) {
      result[opt] = AUTO_COLORS_TW[autoIdx % AUTO_COLORS_TW.length];
      autoIdx++;
    }
  }
  return result;
}

/** 取得進程 hex 色碼（有預設就用預設，沒有就從調色盤取） */
export function getStatusHex(status: string, index = 0): string {
  return STATUS_COLORS_HEX[status] ?? CHART_PALETTE[index % CHART_PALETTE.length];
}

/** 取得決策 hex 色碼 */
export function getDecisionHex(decision: string, index = 0): string {
  return DECISION_COLORS_HEX[decision] ?? CHART_PALETTE[index % CHART_PALETTE.length];
}

/** 格式化金額（圖表 tooltip 用） */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString("zh-TW")}`;
}
