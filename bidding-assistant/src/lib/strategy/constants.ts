// ====== M03 戰略分析引擎：常數定義 ======

import type { FitWeights, StrategySettings } from "./types";

/** 預設權重（五維各 20，總分 0-100） */
export const DEFAULT_FIT_WEIGHTS: FitWeights = {
  domain: 20,
  agency: 20,
  competition: 20,
  scale: 20,
  team: 20,
};

/** 決策門檻 */
export const FIT_THRESHOLDS = {
  recommend: 70,
  evaluate: 50,
} as const;

/** 預設戰略設定 */
export const DEFAULT_STRATEGY_SETTINGS: StrategySettings = {
  fitWeights: DEFAULT_FIT_WEIGHTS,
  thresholds: { ...FIT_THRESHOLDS },
  maxConcurrentBids: 3,
  teamCapacityDays: 60,
};

/** 業務類型詞彙表（用於案名分詞） */
export const BUSINESS_KEYWORDS: Record<string, string[]> = {
  活動: ["活動", "典禮", "開幕", "記者會", "慶典", "祭典", "節慶", "嘉年華"],
  展覽: ["展覽", "策展", "展示", "展場", "展演", "特展", "常設展"],
  演出: ["演出", "表演", "演唱", "音樂會", "舞台", "劇場", "演藝"],
  文化: ["文化", "藝術", "文創", "文資", "古蹟", "博物館", "美術館"],
  行銷: ["行銷", "推廣", "宣傳", "廣告", "公關", "媒體", "社群"],
  規劃: ["規劃", "計畫", "研究", "調查", "評估", "顧問", "諮詢"],
  設計: ["設計", "視覺", "平面", "多媒體", "影像", "攝影", "影片"],
  教育: ["教育", "培訓", "研習", "工作坊", "講座", "導覽", "解說"],
  觀光: ["觀光", "旅遊", "旅行", "遊程", "導遊", "民宿"],
  資訊: ["資訊", "系統", "網站", "APP", "數位", "平台", "軟體"],
  工程: ["工程", "施工", "營建", "裝修", "裝潢", "設備"],
  採購: ["採購", "供應", "租賃", "印刷", "製作物"],
};

/** 計畫主持人相關關鍵字 */
export const PI_KEYWORDS = [
  "計畫主持人",
  "主持人",
  "專案經理",
  "計畫經理",
];

/** 紅旗偵測規則 */
export const RED_FLAG_RULES = [
  { pattern: /限制性招標/, flag: "限制性招標：可能有指定廠商" },
  { pattern: /最有利標/, flag: "最有利標：需要完整簡報能力" },
  { pattern: /統包/, flag: "統包案：需要跨領域整合能力" },
  { pattern: /共同供應契約/, flag: "共同供應契約：價格競爭為主" },
] as const;

/** 競爭程度門檻（投標家數） */
export const COMPETITION_THRESHOLDS = {
  blueOcean: 3,
  redSea: 6,
} as const;
