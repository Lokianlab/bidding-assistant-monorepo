import type { KBRequirement } from "@/data/config/kb-matrix";
import type { FieldMappingKey } from "@/lib/constants/field-mapping";
import type { DashboardLayout } from "@/lib/dashboard/card-layout/types";
import type { StrategySettings } from "@/lib/strategy/types";

export interface DocumentSettings {
  fonts: {
    body: string;
    heading: string;
    headerFooter: string;
    customFonts: { name: string; filename: string }[];
  };
  fontSize: {
    body: number;
    h1: number;
    h2: number;
    h3: number;
    h4: number;
  };
  page: {
    size: "A4" | "Letter" | "custom";
    customWidth?: number;
    customHeight?: number;
    margins: { top: number; bottom: number; left: number; right: number };
    lineSpacing: number;
    paragraphSpacing: { before: number; after: number };
  };
  header: { template: string; logoPath?: string };
  footer: { template: string };
  driveNamingRule: string;
}

export interface ConnectionSettings {
  notion: {
    token: string;
    databaseId: string;
    lastSync?: string;
  };
  googleDrive: {
    refreshToken: string;
    sharedDriveFolderId: string;
  };
  smugmug: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    tokenSecret: string;
    /** 使用者暱稱（OAuth 完成後自動取得） */
    nickname?: string;
    lastSync?: string;
  };
}

export interface CompanySettings {
  name: string;
  taxId: string;
  brand: string;
  logoPath?: string;
}

export interface QualityRuleSettings {
  blacklist: string[];
  terminology: { wrong: string; correct: string }[];
  ironLawEnabled: Record<string, boolean>;
  customRules: { pattern: string; message: string; severity: "error" | "warning" | "info" }[];
}

export interface PricingSettings {
  taxRate: number;
  managementFeeRate: number;
  marketRates: Record<string, { min: number; max: number }>;
}

export interface NegotiationSettings {
  minMargin: number;       // 底線利潤率（e.g., 0.05 = 5%）
  expectedMargin: number;  // 預期利潤率（e.g., 0.15 = 15%）
  idealMargin: number;     // 理想利潤率（e.g., 0.20 = 20%）
  maxMargin: number;       // 天花板利潤率（e.g., 0.30 = 30%）
}

export interface ModuleSettings {
  kbMatrix: Record<string, Record<string, KBRequirement>>;
  qualityRules: QualityRuleSettings;
  pricing: PricingSettings;
  negotiation?: NegotiationSettings;  // 新增
}

export interface StageConfig {
  id: string;
  name: string;
  triggerCommand: string;
  guidanceText: string;
}

export interface AutoStatusRule {
  id: string;
  trigger: string;
  actions: { property: string; value: string | boolean | string[] }[];
  enabled: boolean;
}

export interface ViewConfig {
  id: string;
  name: string;
  type: "table" | "board" | "calendar" | "timeline";
  filter: Record<string, unknown>;
  sorts: Record<string, unknown>[];
  groupBy?: string;
  calendarBy?: string;
  timelineBy?: string;
  displayProperties: string[];
}

export interface WorkflowSettings {
  stages: StageConfig[];
  autoStatusRules: AutoStatusRule[];
  viewOverrides: Record<string, Partial<ViewConfig>>;
  customViews: ViewConfig[];
}

export interface ScanSettings {
  /** 搜尋 PCC 用的關鍵字清單（決定抓哪些公告） */
  searchKeywords: string[];
}

export interface AppSettings {
  document: DocumentSettings;
  connections: ConnectionSettings;
  company: CompanySettings;
  modules: ModuleSettings;
  workflow: WorkflowSettings;
  /** 年度目標金額（用於計算達成率） */
  yearlyGoal?: number;
  /** 每月投標件數目標 */
  monthlyBidTarget?: number;
  /** 每週投標件數目標 */
  weeklyBidTarget?: number;
  /** 功能模組開關（key = feature id，value = 是否啟用） */
  featureToggles?: Record<string, boolean>;
  /** Notion 欄位名稱覆蓋（只有使用者自訂過的才會有值） */
  fieldMapping?: Partial<Record<FieldMappingKey, string>>;
  /** 自訂儀表板佈局 */
  dashboardLayout?: DashboardLayout;
  /** 戰略分析設定 */
  strategy?: StrategySettings;
  /** 品質閘門設定 */
  qualityGate?: QualityGateSettings;
  /** 文件工作台設定 */
  output?: OutputSettings;
  /** 巡標設定 */
  scan?: ScanSettings;
}

export interface RecentExport {
  projectName: string;
  template: string;
  format: "docx" | "markdown" | "print";
  exportedAt: string;
  chapterCount: number;
}

export interface OutputSettings {
  defaultTemplate: string;
  customTemplates: unknown[]; // DocumentTemplate[] — 避免循環 import，UI 層自行 cast
  recentExports: RecentExport[];
  kbAutoSuggest: boolean;
}

export interface QualityGateSettings {
  /** 各閘門個別開關 */
  gates: {
    factCheck: boolean;
    requirementTrace: boolean;
    feasibility: boolean;
  };
  /** 無來源宣稱超過幾個才報 error */
  factCheckThreshold: number;
  /** 預算餘裕低於幾 % 才警告 */
  feasibilityMarginMin: number;
  /** 總評「通過」門檻分數 */
  overallPassThreshold: number;
  /** 總評「有風險」門檻分數 */
  overallRiskThreshold: number;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  target: string;
  details: string;
  source: "notion" | "drive" | "settings" | "system";
}
