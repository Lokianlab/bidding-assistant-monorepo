// ====== 功能模組註冊表 ======
// 所有可開關的功能模組在此定義
// 側欄、FeatureGuard、設定頁面都從這裡讀取

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  routes: string[];         // 此模組對應的路由
  section: "command" | "intelligence" | "planning" | "admin";
  defaultEnabled: boolean;
  dependencies?: string[];  // 依賴其他模組 ID
}

export const SECTION_LABELS: Record<FeatureDefinition["section"], string> = {
  command: "指揮部",
  intelligence: "情報部",
  planning: "企劃部",
  admin: "行政部",
};

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: "dashboard",
    name: "備標指揮部",
    description: "主要案件追蹤儀表板，含看板、統計與進度總覽",
    icon: "📋",
    routes: [],
    section: "command",
    defaultEnabled: true,
  },
  {
    id: "custom-dashboard",
    name: "自訂儀表板",
    description: "自由拖曳排列、調整大小的儀表板卡片佈局",
    icon: "🎨",
    routes: [],
    section: "command",
    defaultEnabled: true,
    dependencies: ["dashboard"],
  },
  {
    id: "case-board",
    name: "案件看板",
    description: "案件進度追蹤看板，含 L1-L8 階段進度、截標日行事曆",
    icon: "📌",
    routes: ["/case-board"],
    section: "command",
    defaultEnabled: true,
    dependencies: ["dashboard"],
  },
  {
    id: "performance",
    name: "績效檢視",
    description: "投標績效統計、趨勢分析與交叉分析報告",
    icon: "📊",
    routes: ["/performance"],
    section: "command",
    defaultEnabled: true,
  },
  // ====== 情報部：找案、情報蒐集、知識庫 ======
  {
    id: "scan",
    name: "巡標自動化",
    description: "每日自動掃描 PCC 公告，關鍵字篩選分類，一鍵建入 Notion 追蹤",
    icon: "📡",
    routes: ["/scan"],
    section: "intelligence",
    defaultEnabled: true,
    dependencies: [],
  },
  {
    id: "intelligence",
    name: "情報搜尋",
    description: "查詢政府標案公開資料：案件搜尋、廠商投標紀錄、評委名單、決標金額",
    icon: "🔍",
    routes: ["/intelligence"],
    section: "intelligence",
    defaultEnabled: true,
  },
  {
    id: "explore",
    name: "情報探索",
    description: "搜尋標案、點進詳情、再鑽進廠商或機關，無限探索關聯情報",
    icon: "🔭",
    routes: ["/explore"],
    section: "intelligence",
    defaultEnabled: false,
    dependencies: ["intelligence"],
  },
  {
    id: "intel-report",
    name: "情報分析",
    description: "案件情報自動拉取：機關歷史、競爭者、RFP 解析、勝算評估",
    icon: "📊",
    routes: [],
    section: "intelligence",
    defaultEnabled: true,
    dependencies: ["intelligence"],
  },
  {
    id: "knowledge-base",
    name: "知識庫管理",
    description: "管理各類知識文件，供提示詞組裝引用",
    icon: "📚",
    routes: ["/knowledge-base"],
    section: "intelligence",
    defaultEnabled: true,
  },
  {
    id: "knowledge-cards",
    name: "知識庫卡片",
    description: "Drive 檔案自動索引：搜尋過去的簡報、企劃、素材",
    icon: "🗂️",
    routes: ["/knowledge"],
    section: "intelligence",
    defaultEnabled: false,
  },
  // ====== 企劃部：評估、策略、撰寫 ======
  {
    id: "strategy",
    name: "戰略分析",
    description: "投標適配度評分：五維分析（領域、機關、競爭、規模、團隊），幫助決策是否投標",
    icon: "🎯",
    routes: [],
    section: "planning",
    defaultEnabled: true,
    dependencies: ["intelligence", "knowledge-base"],
  },
  {
    id: "case-work",
    name: "案件工作頁",
    description: "單一案件全視角：案件資訊、戰略分析、情報摘要，一頁看完",
    icon: "📋",
    routes: [],
    section: "planning",
    defaultEnabled: true,
    dependencies: ["case-board", "strategy"],
  },
  {
    id: "case-setup",
    name: "一鍵建案",
    description: "投標決策後自動建立 Notion 頁面和 Drive 資料夾",
    icon: "🚀",
    routes: [],
    section: "planning",
    defaultEnabled: true,
    dependencies: ["intel-report"],
  },
  {
    id: "decisions",
    name: "決策記錄",
    description: "投標/不投標決策記錄與追溯",
    icon: "⚖️",
    routes: [],
    section: "planning",
    defaultEnabled: true,
    dependencies: ["intel-report"],
  },
  {
    id: "assembly",
    name: "提示詞組裝",
    description: "AI 提示詞自動組裝，搭配知識庫與階段配置",
    icon: "🔧",
    routes: ["/assembly"],
    section: "planning",
    defaultEnabled: true,
  },
  {
    id: "prompt-library",
    name: "模板庫",
    description: "提示詞模板庫：階段總覽、知識庫引用矩陣、緊急手動協作",
    icon: "📖",
    routes: [],
    section: "planning",
    defaultEnabled: true,
  },
  // ====== 行政部：品質、報價、輸出 ======
  {
    id: "quality",
    name: "品質檢查",
    description: "建議書文字品質檢核，含禁用詞、用語修正",
    icon: "✅",
    routes: [],
    section: "admin",
    defaultEnabled: true,
  },
  {
    id: "quality-gate",
    name: "品質閘門",
    description: "四道品質檢查：文字品質、事實查核、需求對照、實務檢驗",
    icon: "🛡️",
    routes: ["/tools/quality-gate"],
    section: "admin",
    defaultEnabled: true,
    dependencies: ["quality"],
  },
  {
    id: "pricing",
    name: "報價驗算",
    description: "報價試算與成本分析工具",
    icon: "🧮",
    routes: [],
    section: "admin",
    defaultEnabled: true,
    dependencies: ["knowledge-base"],
  },
  {
    id: "docgen",
    name: "文件生成",
    description: "建議書排版與匯出（Word / Markdown / 列印）",
    icon: "📄",
    routes: [],
    section: "admin",
    defaultEnabled: true,
  },
];

/** 從 settings 的 featureToggles 取得最終的啟用狀態 */
export function isFeatureEnabled(
  featureId: string,
  toggles: Record<string, boolean>,
): boolean {
  const def = FEATURE_REGISTRY.find((f) => f.id === featureId);
  if (!def) return false;
  return toggles[featureId] ?? def.defaultEnabled;
}

/** 產生預設的 featureToggles（全部用 defaultEnabled） */
export function getDefaultToggles(): Record<string, boolean> {
  const toggles: Record<string, boolean> = {};
  for (const f of FEATURE_REGISTRY) {
    toggles[f.id] = f.defaultEnabled;
  }
  return toggles;
}

/** 取得某路由對應的 feature（沒有對應的表示不受管控，如 /settings） */
export function getFeatureByRoute(pathname: string): FeatureDefinition | undefined {
  // 精確匹配優先
  const exact = FEATURE_REGISTRY.find((f) => f.routes.includes(pathname));
  if (exact) return exact;
  // 前綴匹配
  return FEATURE_REGISTRY.find((f) =>
    f.routes.some((r) => r !== "/" && pathname.startsWith(r)),
  );
}

/** 取得所有已啟用的模組（給側欄用） */
export function getEnabledFeatures(
  toggles: Record<string, boolean>,
): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => isFeatureEnabled(f.id, toggles));
}

/** 檢查依賴：關閉某模組時，哪些依賴它的模組也會失效 */
export function getDependents(featureId: string): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) =>
    f.dependencies?.includes(featureId),
  );
}
