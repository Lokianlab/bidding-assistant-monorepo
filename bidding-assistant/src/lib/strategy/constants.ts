// ====== M03 戰略分析引擎：常數定義 ======

import type { FitWeights, VerdictThresholds, StrategySettings } from "./types";

/** 預設五維權重（各 20，總和 100） */
export const DEFAULT_FIT_WEIGHTS: FitWeights = {
  domain: 20,
  agency: 20,
  competition: 20,
  scale: 20,
  team: 20,
};

/** 預設決策門檻 */
export const DEFAULT_VERDICT_THRESHOLDS: VerdictThresholds = {
  recommend: 70,
  evaluate: 50,
};

/** 預設戰略設定 */
export const DEFAULT_STRATEGY_SETTINGS: StrategySettings = {
  fitWeights: DEFAULT_FIT_WEIGHTS,
  thresholds: DEFAULT_VERDICT_THRESHOLDS,
  maxConcurrentBids: 3,
  teamCapacityDays: 60,
};

/** 五個維度的中文標籤 */
export const DIMENSION_LABELS: Record<string, string> = {
  domain: "領域匹配",
  agency: "機關熟悉度",
  competition: "競爭強度",
  scale: "規模適合度",
  team: "團隊可用性",
};

/**
 * 業務類型詞彙表 — 用於案名關鍵字提取。
 * 當案名包含這些詞時，視為一個完整關鍵字不拆分。
 */
export const BUSINESS_TYPE_VOCABULARY: string[] = [
  // 活動類
  "展覽策展", "展覽", "策展", "特展", "巡迴展", "常設展",
  "藝術節", "音樂節", "文化節", "嘉年華",
  "開幕式", "閉幕式", "頒獎典禮", "記者會",
  "論壇", "研討會", "工作坊", "講座", "座談會",
  // 設計類
  "視覺設計", "平面設計", "空間設計", "展場設計",
  "識別系統", "品牌設計", "包裝設計",
  // 影音類
  "紀錄片", "宣傳片", "形象影片", "動畫", "微電影",
  // 出版類
  "出版品", "專刊", "年報", "成果報告", "手冊", "摺頁",
  // 規劃類
  "總體規劃", "可行性評估", "調查研究", "委託研究",
  "計畫管理", "專案管理", "顧問服務",
  // 行銷類
  "行銷推廣", "社群經營", "數位行銷", "媒體公關",
  // 教育類
  "教育推廣", "導覽解說", "環境教育", "培訓",
  // 文化資產
  "文化資產", "古蹟修復", "歷史建築", "文資調查",
  // 公共工程
  "景觀工程", "公共藝術", "裝置藝術",
  // 資訊類
  "資訊系統", "網站建置", "APP開發", "數位典藏",
];

/** 案名分隔符號（用於斷詞） */
export const TITLE_DELIMITERS = /[、，,\s—–\-()（）「」《》：:；;／/&＆+＋·．.]+/;

/** 各維度分數上限 */
export const DIMENSION_MAX_SCORE = 20;

/** 領域匹配：滿分需要的最少匹配數 */
export const DOMAIN_FULL_SCORE_MATCHES = 3;

/** 機關熟悉度：在位者連續得標次數門檻 */
export const INCUMBENT_STRONG_THRESHOLD = 3;

/** 競爭強度：藍海/紅海投標家數門檻 */
export const COMPETITION_BLUE_OCEAN = 3;
export const COMPETITION_RED_OCEAN = 6;

/** 規模適合度：IQR 倍數門檻 */
export const SCALE_IQR_COMFORTABLE = 1.5;
export const SCALE_IQR_STRETCH = 2.0;

/** 團隊可用性：滿分需要的最少匹配人數 */
export const TEAM_FULL_SCORE_MEMBERS = 3;

/** 「資料不足」判定：低信心維度佔比門檻 */
export const LOW_CONFIDENCE_RATIO_THRESHOLD = 0.4;
