/**
 * 提示詞組裝引擎 — 核心資料定義
 *
 * 依據 00-3_階段索引_v2.0.md 中的 KB 引用矩陣，
 * 定義每個階段需要載入的檔案清單。
 */

// ====== 所有提示詞檔案定義 ======

export interface PromptFile {
  /** 檔案唯一 ID */
  id: string;
  /** 顯示名稱 */
  label: string;
  /** public/prompts/ 下的檔名 */
  filename: string;
  /** 分類 */
  category: "system" | "stage" | "kb" | "spec" | "tool" | "ref";
  /** 分類顯示名稱 */
  categoryLabel: string;
}

export const PROMPT_FILES: PromptFile[] = [
  // ── Tier 1：系統核心（永遠載入） ──
  { id: "core",  label: "系統核心",   filename: "00-1_系統核心_v2.0.md",  category: "system", categoryLabel: "系統核心" },
  { id: "index", label: "階段索引",   filename: "00-3_階段索引_v2.0.md",  category: "system", categoryLabel: "系統核心" },

  // ── Tier 2-A：撰寫規範（僅 L3/L4） ──
  { id: "spec",  label: "撰寫規範",   filename: "00-2_撰寫規範_v2.0.md",  category: "spec",   categoryLabel: "撰寫規範" },

  // ── Tier 2-B：階段提示詞 ──
  { id: "L1", label: "L1 戰略分析", filename: "01_戰略分析_v2.3.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L2", label: "L2 備標規劃", filename: "02_備標規劃_v2_1.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L3", label: "L3 企劃草稿", filename: "03_企劃草稿_v2.1.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L4", label: "L4 定稿撰寫", filename: "04_定稿撰寫_v2_0.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L5", label: "L5 評選分析", filename: "05_評選分析_v2.0.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L6", label: "L6 簡報規劃", filename: "06_簡報規劃_v2.0.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L7", label: "L7 講稿腳本", filename: "07_講稿腳本_v2.0.md",   category: "stage", categoryLabel: "階段提示詞" },
  { id: "L8", label: "L8 模擬演練", filename: "08_模擬演練_v2.0.md",   category: "stage", categoryLabel: "階段提示詞" },

  // ── Tier 2-C：知識庫 ──
  { id: "00A", label: "00A 團隊資料庫",  filename: "00A_團隊成員資料庫_v4.0.md", category: "kb", categoryLabel: "知識庫" },
  { id: "00B", label: "00B 實績資料庫",  filename: "00B_公司實績資料庫_v4.0.md", category: "kb", categoryLabel: "知識庫" },
  { id: "00C", label: "00C 時程範本庫",  filename: "00C_時程範本庫_v1.0.md",     category: "kb", categoryLabel: "知識庫" },
  { id: "00D", label: "00D 應變SOP庫",  filename: "00D_應變SOP範本庫_v1.0.md",  category: "kb", categoryLabel: "知識庫" },
  { id: "00E", label: "00E 案後檢討庫",  filename: "00E_案後檢討筆記_v1.0.md",   category: "kb", categoryLabel: "知識庫" },

  // ── 外部偵察（Perplexity 專用，非 Claude 載入） ──
  { id: "P",   label: "P 偵察報告提示詞", filename: "P_偵察報告_v1.0.md",       category: "tool", categoryLabel: "工具" },

  // ── 工具 & 參考（手動加入） ──
  { id: "T1",  label: "T1 知識庫維護精靈", filename: "T1_知識庫維護精靈_v2.0.md", category: "tool", categoryLabel: "工具" },
  { id: "T3",  label: "T3 報價編列指南",   filename: "T3_報價編列指南_v2.0.md",   category: "tool", categoryLabel: "工具" },
  { id: "R1",  label: "R1 撰寫訓練手冊",   filename: "R1_撰寫訓練手冊_v2.0.md",   category: "ref",  categoryLabel: "參考文件" },
  { id: "R2",  label: "R2 公司資訊對照表", filename: "R2_公司資訊需求對照表_v1.0.md", category: "ref", categoryLabel: "參考文件" },
  { id: "R3",  label: "R3 架構重組方案",   filename: "R3_標案智囊_Project架構重組方案_v1.0.md", category: "ref", categoryLabel: "參考文件" },
];

export const FILE_MAP = Object.fromEntries(PROMPT_FILES.map((f) => [f.id, f]));

// ====== KB 引用矩陣 ======
// "required" = ● 必要引用, "optional" = ○ 選擇性引用, undefined = 不需引用

export type KBRef = "required" | "optional";

export interface StageKBRule {
  /** 階段 ID */
  stageId: string;
  /** 永遠載入的檔案 ID（Tier 1） */
  alwaysLoad: string[];
  /** 該階段的提示詞檔案 ID */
  stageFile: string;
  /** 額外必載的規範檔案（如 00-2 撰寫規範） */
  extraSpecs: string[];
  /** 知識庫引用 */
  kb: Partial<Record<string, KBRef>>;
}

/**
 * 完整的 KB 引用矩陣
 * 來源：00-3_階段索引_v2.0.md → KNOWLEDGE_BASE_MAP
 */
export const STAGE_KB_RULES: StageKBRule[] = [
  {
    stageId: "L1",
    alwaysLoad: ["core", "index"],
    stageFile: "L1",
    extraSpecs: [],
    kb: { "00A": "optional", "00B": "required", "00E": "optional" },
  },
  {
    stageId: "L2",
    alwaysLoad: ["core", "index"],
    stageFile: "L2",
    extraSpecs: [],
    kb: { "00A": "optional", "00B": "optional", "00E": "optional" },
  },
  {
    stageId: "L3",
    alwaysLoad: ["core", "index"],
    stageFile: "L3",
    extraSpecs: ["spec"],  // 00-2 撰寫規範
    kb: { "00C": "required", "00D": "required" },
  },
  {
    stageId: "L4",
    alwaysLoad: ["core", "index"],
    stageFile: "L4",
    extraSpecs: ["spec"],  // 00-2 撰寫規範
    kb: { "00A": "required", "00B": "required", "00C": "required", "00D": "required" },
  },
  {
    stageId: "L5",
    alwaysLoad: ["core", "index"],
    stageFile: "L5",
    extraSpecs: [],
    kb: { "00B": "optional" },
  },
  {
    stageId: "L6",
    alwaysLoad: ["core", "index"],
    stageFile: "L6",
    extraSpecs: [],
    kb: {},
  },
  {
    stageId: "L7",
    alwaysLoad: ["core", "index"],
    stageFile: "L7",
    extraSpecs: [],
    kb: { "00A": "optional" },
  },
  {
    stageId: "L8",
    alwaysLoad: ["core", "index"],
    stageFile: "L8",
    extraSpecs: [],
    kb: {},
  },
];

export const RULE_MAP = Object.fromEntries(STAGE_KB_RULES.map((r) => [r.stageId, r]));
