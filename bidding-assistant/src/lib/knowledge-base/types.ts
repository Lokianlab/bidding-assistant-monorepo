// ====== 知識庫資料庫：型別定義 ======
// 五大知識庫（00A-00E）的資料結構

/** 知識庫 ID */
export type KBId = "00A" | "00B" | "00C" | "00D" | "00E";

/** 通用 entry 狀態 */
export type KBEntryStatus = "active" | "draft" | "archived";

// ====== 00A 團隊資料庫 ======

export interface TeamMemberEducation {
  school: string;
  department: string;
  degree: string;
}

export interface TeamMemberCertification {
  name: string;
  issuer: string;
  expiry: string; // "永久" | 日期 | "已過期"
}

export interface TeamMemberExperience {
  period: string;      // "2018-2022"
  organization: string;
  title: string;
  description: string; // 50-80字
}

export interface TeamMemberProject {
  role: string;        // "計畫主持人"
  projectName: string;
  client: string;
  year: string;
  outcome: string;
}

export interface KBEntry00A {
  id: string;          // "M-001", "E-001"
  name: string;
  title: string;       // 職稱
  status: "在職" | "已離職" | "外部合作";
  authorizedRoles: string[]; // 公司授權可擔任角色
  education: TeamMemberEducation[];
  certifications: TeamMemberCertification[];
  experiences: TeamMemberExperience[];
  projects: TeamMemberProject[];
  additionalCapabilities: string;
  entryStatus: KBEntryStatus;
  updatedAt: string;   // ISO 日期
}

// ====== 00B 實績資料庫 ======

export interface ProjectWorkItem {
  item: string;        // "開幕式統籌"
  description: string; // 具體描述
}

/** SmugMug 實績照片資訊 */
export interface ProjectPhoto {
  imageKey: string;     // SmugMug image key
  title: string;
  caption: string;
  thumbnailUrl: string; // 縮圖 URL
  webUrl: string;       // 網頁檢視 URL
  largeUrl?: string;    // 大圖 URL
}

export interface KBEntry00B {
  id: string;          // "P-2025-001"
  projectName: string;
  client: string;      // 委託機關
  contractAmount: string;
  period: string;      // "民國 114 年 3 月至 8 月"
  entity: string;      // "大員洛川股份有限公司" | "臺灣鹿山文社"
  role: string;        // "得標廠商（與機關簽約）" | "協力廠商"
  completionStatus: string; // "已驗收結案" | "履約中"
  teamMembers: string; // "計畫主持人：黃偉誠（M-001）"
  workItems: ProjectWorkItem[];
  outcomes: string;    // 量化成果
  documentLinks: string;
  /** SmugMug 相簿連結（Album Key 或完整 URL） */
  smugmugAlbumKey?: string;
  /** 已選取的實績照片 */
  photos?: ProjectPhoto[];
  entryStatus: KBEntryStatus;
  updatedAt: string;
}

// ====== 00C 時程範本庫 ======

export interface TimelinePhase {
  phase: string;
  duration: string;
  deliverables: string;
  checkpoints: string;
}

export interface KBEntry00C {
  id: string;          // "T-EXH"
  templateName: string;
  applicableType: string; // "展覽策展"
  budgetRange: string;
  durationRange: string;
  phases: TimelinePhase[];
  warnings: string;    // 常見低估提醒
  entryStatus: KBEntryStatus;
  updatedAt: string;
}

// ====== 00D 應變SOP庫 ======

export interface SOPStep {
  step: string;
  action: string;
  responsible: string;
}

export interface KBEntry00D {
  id: string;          // "R-MED"
  riskName: string;
  riskLevel: string;   // "低" | "中" | "高"
  prevention: string;
  responseSteps: SOPStep[];
  notes: string;
  entryStatus: KBEntryStatus;
  updatedAt: string;
}

// ====== 00E 案後檢討庫 ======

export interface KBEntry00E {
  id: string;
  projectName: string;
  result: string;      // "得標" | "未得標" | "流標"
  year: string;
  bidPhaseReview: string;   // L1-L4 分析
  executionReview: string;  // 執行階段檢討
  kbUpdateSuggestions: string;
  aiToolFeedback: string;
  oneSentenceSummary: string;
  entryStatus: KBEntryStatus;
  updatedAt: string;
}

// ====== 統一型別 ======

export type KBEntry = KBEntry00A | KBEntry00B | KBEntry00C | KBEntry00D | KBEntry00E;

/** 知識庫整體資料 */
export interface KnowledgeBaseData {
  "00A": KBEntry00A[];
  "00B": KBEntry00B[];
  "00C": KBEntry00C[];
  "00D": KBEntry00D[];
  "00E": KBEntry00E[];
  /** 最後更新時間 */
  lastUpdated: string;
  /** 版本號（用於未來資料遷移） */
  version: number;
}

/** 知識庫類別定義 */
export interface KBCategoryDef {
  id: KBId;
  label: string;
  icon: string;
  description: string;
  idPrefix: string;    // "M-" | "P-" | "T-" | "R-"
  idFormat: string;    // "M-001" | "P-2025-001"
}
