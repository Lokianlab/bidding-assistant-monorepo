// ====== 功能模組註冊表 ======
// 所有可開關的功能模組在此定義
// 側欄、FeatureGuard、設定頁面都從這裡讀取

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  routes: string[];         // 此模組對應的路由
  section: "core" | "tools" | "output";
  defaultEnabled: boolean;
  dependencies?: string[];  // 依賴其他模組 ID
}

export const SECTION_LABELS: Record<FeatureDefinition["section"], string> = {
  core: "核心功能",
  tools: "工具箱",
  output: "輸出",
};

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: "dashboard",
    name: "備標指揮部",
    description: "主要案件追蹤儀表板，含看板、統計與進度總覽",
    icon: "📋",
    routes: ["/"],
    section: "core",
    defaultEnabled: true,
  },
  {
    id: "assembly",
    name: "提示詞組裝",
    description: "AI 提示詞自動組裝，搭配知識庫與階段配置",
    icon: "🔧",
    routes: ["/assembly"],
    section: "core",
    defaultEnabled: true,
  },
  {
    id: "performance",
    name: "績效檢視",
    description: "投標績效統計、趨勢分析與交叉分析報告",
    icon: "📊",
    routes: ["/performance"],
    section: "core",
    defaultEnabled: true,
  },
  {
    id: "knowledge-base",
    name: "知識庫管理",
    description: "管理各類知識文件，供提示詞組裝引用",
    icon: "📚",
    routes: ["/knowledge-base"],
    section: "tools",
    defaultEnabled: true,
  },
  {
    id: "pricing",
    name: "報價驗算",
    description: "報價試算與成本分析工具",
    icon: "🧮",
    routes: ["/tools/pricing"],
    section: "tools",
    defaultEnabled: true,
    dependencies: ["knowledge-base"],
  },
  {
    id: "quality",
    name: "品質檢查",
    description: "建議書文字品質檢核，含禁用詞、用語修正",
    icon: "✅",
    routes: ["/tools/quality"],
    section: "tools",
    defaultEnabled: true,
  },
  {
    id: "docgen",
    name: "文件生成",
    description: "建議書排版與匯出（Word / Markdown / 列印）",
    icon: "📄",
    routes: ["/tools/docx", "/tools/output"],
    section: "output",
    defaultEnabled: true,
  },
  {
    id: "custom-dashboard",
    name: "自訂儀表板",
    description: "自由拖曳排列、調整大小的儀表板卡片佈局",
    icon: "🎨",
    routes: [],
    section: "core",
    defaultEnabled: true,
    dependencies: ["dashboard"],
  },
  {
    id: "case-board",
    name: "案件看板",
    description: "案件進度追蹤看板，含 L1-L8 階段進度、截標日行事曆",
    icon: "📌",
    routes: ["/case-board"],
    section: "core",
    defaultEnabled: true,
    dependencies: ["dashboard"],
  },
  {
    id: "prompt-library",
    name: "模板庫",
    description: "提示詞模板庫：階段總覽、知識庫引用矩陣、緊急手動協作",
    icon: "📖",
    routes: ["/prompt-library"],
    section: "core",
    defaultEnabled: true,
  },
  {
    id: "intelligence",
    name: "情報搜尋",
    description: "查詢政府標案公開資料：案件搜尋、廠商投標紀錄、評委名單、決標金額",
    icon: "🔍",
    routes: ["/intelligence"],
    section: "tools",
    defaultEnabled: true,
  },
  {
    id: "quality-gate",
    name: "品質閘門",
    description: "三道品質檢查：事實查核、需求對照、實務檢驗",
    icon: "🛡️",
    routes: ["/tools/quality-gate"],
    section: "tools",
    defaultEnabled: true,
    dependencies: ["quality"],
  },
  {
    id: "scan",
    name: "巡標自動化",
    description: "每日自動掃描 PCC 公告，關鍵字篩選分類，一鍵建入 Notion 追蹤",
    icon: "📡",
    routes: ["/scan"],
    section: "tools",
    defaultEnabled: true,
    dependencies: [],
  },
  {
    id: "strategy",
    name: "戰略分析",
    description: "投標適配度評分：五維分析（領域、機關、競爭、規模、團隊），幫助決策是否投標",
    icon: "🎯",
    routes: ["/strategy"],
    section: "core",
    defaultEnabled: true,
    dependencies: ["intelligence", "knowledge-base"],
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
