/** M04 品質閘門 — 確定性規則常數 */

/** 幻覺偵測模式（確定性規則，不靠 AI） */
export const HALLUCINATION_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    name: "ungrounded_percentage",
    pattern: /(?:提升|增加|降低|節省|改善|成長|提高).{0,15}(?:達|高達|超過)?\s*\d{2,3}%|(?:達|高達|超過)\s*\d{2,3}%/,
    message: "具體百分比數字需要明確數據來源，AI 容易憑空捏造",
  },
  {
    name: "fabricated_research",
    pattern: /根據.{0,20}調查|根據.{0,20}研究|研究(指出|顯示|發現|證明)|調查(顯示|指出|結果)/,
    message: "引用的研究或調查需要具體出處（作者、年份、機構）",
  },
  {
    name: "superlative_claim",
    pattern: /業界(首創|領先|第一|唯一|最佳|最先進)|國內(首創|第一|唯一)|全台(首創|第一|唯一)/,
    message: "業界最高/唯一等宣稱需要有佐證，容易被評委質疑",
  },
  {
    name: "ungrounded_volume",
    pattern: /每年(服務|接待|處理|輔導|協助).{0,10}[萬千百]\s*(人次?|件|場|個|家)/,
    message: "具體服務量數字需要來源（如：年報、實績記錄）",
  },
  {
    name: "vague_international",
    pattern: /與.*國際(機構|組織|學術|大學|夥伴|合作).{0,20}(合作|交流|聯盟|締結)/,
    message: "國際合作宣稱需要具體名稱和合作內容，模糊描述易被認定為虛構",
  },
  {
    name: "fabricated_award",
    pattern: /(獲得|榮獲|獲頒).{0,30}(獎|獎項|認證|認可)|通過.{0,20}(認證|驗證|評鑑)/,
    message: "獎項或認證宣稱需要具體名稱、年份，以及 00B 實績記錄佐證",
  },
  {
    name: "overspecific_stats",
    pattern: /滿意度\s*(?:達|超過|高達)?\s*\d{2,3}(?:\.\d+)?%|回覆率\s*(?:達|超過|高達)?\s*\d{2,3}(?:\.\d+)?%/,
    message: "滿意度或回覆率數字需要來源（問卷報告、記錄文件）",
  },
];

/** 來源比對的關鍵字提取規則 */
export const SOURCE_MATCH_MIN_LENGTH = 4;  // 比對關鍵字最短長度

/** 分數計算常數 */
export const SCORE_WEIGHTS = {
  /** 有完整來源的句子，每句加分 */
  verifiedBonus: 2,
  /** 無來源的宣稱，每個扣分（有 KB 時適用） */
  unverifiedPenalty: 3,
  /** 幻覺旗標，每個扣分 */
  hallucinationPenalty: 10,
  /** 分數下限 */
  minScore: 0,
  /** 分數上限 */
  maxScore: 100,
  /** 基礎分 */
  baseScore: 80,
} as const;

// ── 閘門 2：需求追溯常數 ──────────────────────────────────

/** 需求追溯預設閾值 */
export const REQUIREMENT_TRACE_DEFAULTS = {
  coverageThreshold: 0.5,
  partialThreshold: 0.2,
} as const;

// ── 閘門 3：實務檢驗常數 ──────────────────────────────────

/** 常識檢查規則（確定性規則，不靠 AI） */
export const COMMON_SENSE_RULES: Array<{
  name: string;
  pattern: RegExp;
  contextCheck: (ctx: { budget?: number; participants?: number }) => boolean;
  message: string;
}> = [
  {
    name: "ar_vr_low_budget",
    pattern: /AR|VR|元宇宙|擴增實境|虛擬實境|混合實境|MR/,
    contextCheck: (ctx) => (ctx.budget ?? Infinity) < 500_000,
    message: "預算低於 50 萬的案子不太可能負擔 AR/VR/元宇宙技術",
  },
  {
    name: "big_data_low_scale",
    pattern: /大數據分析|巨量資料分析|大量資料探勘/,
    contextCheck: (ctx) => (ctx.participants ?? Infinity) < 100,
    message: "參與者不到 100 人不需要大數據分析",
  },
  {
    name: "ai_dev_low_budget",
    pattern: /AI\s*(模型|系統|平台|引擎).*?(開發|建置|建構)|自建\s*AI|訓練\s*AI\s*模型/,
    contextCheck: (ctx) => (ctx.budget ?? Infinity) < 1_000_000,
    message: "自建 AI 系統通常需要百萬以上預算",
  },
  {
    name: "international_low_budget",
    pattern: /國際(連線|合作|交流|論壇|工作坊|參訪)|海外(參訪|交流|考察)/,
    contextCheck: (ctx) => (ctx.budget ?? Infinity) < 300_000,
    message: "國際合作涉及旅費/翻譯，低預算案件需謹慎承諾",
  },
  {
    name: "blockchain_no_context",
    pattern: /區塊鏈|NFT|Web3|智慧合約|分散式帳本/,
    contextCheck: (ctx) => (ctx.budget ?? Infinity) < 800_000,
    message: "區塊鏈技術整合需要專門團隊和時間，低預算案件不切實際",
  },
];

/** 預算判定閾值 */
export const BUDGET_THRESHOLDS = {
  /** 餘裕 ≥ 此比例 = 充裕 */
  ampleMargin: 30,
  /** 餘裕 ≥ 此比例 = 合理 */
  reasonableMargin: 10,
  /** 餘裕 ≥ 0 但 < reasonableMargin = 緊繃 */
  // 低於 0 = 超支
} as const;

/** 閘門 3 分數計算常數 */
export const FEASIBILITY_SCORE = {
  baseScore: 85,
  budgetExceededPenalty: 40,
  budgetTightPenalty: 15,
  commonSensePenalty: 12,
  minScore: 0,
  maxScore: 100,
} as const;
