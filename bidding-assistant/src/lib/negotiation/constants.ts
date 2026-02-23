/** 議價分析常數 */

/** 報價狀態顏色對應 */
export const QUOTE_STATUS_COLORS = {
  danger: "bg-red-100 text-red-800 border-red-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  safe: "bg-green-100 text-green-800 border-green-300",
  dream: "bg-blue-100 text-blue-800 border-blue-300",
} as const;

/** 報價狀態標籤 */
export const QUOTE_STATUS_LABELS = {
  danger: "危險 🔴",
  warning: "警告 ⚠️",
  safe: "安全 🟢",
  dream: "理想 ✨",
} as const;

/** 預設利潤率設定（百分比） */
export const DEFAULT_MARGINS = {
  minMargin: 5,         // 5%
  expectedMargin: 15,   // 15%
  idealMargin: 20,      // 20%
  maxMargin: 30,        // 30%
} as const;

/** 標準方案名稱 */
export const STANDARD_SCENARIOS = {
  baseline: "底線",
  proposed: "預案",
  target: "目標",
  ceiling: "天花板",
} as const;
