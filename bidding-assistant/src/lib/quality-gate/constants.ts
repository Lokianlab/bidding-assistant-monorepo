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
