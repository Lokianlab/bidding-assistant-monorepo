// M11 結案飛輪 - 型別定義

export type PatternCategory = 'process' | 'team' | 'resource' | 'risk-mitigation';

export interface SuccessPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  successMetrics: string[];
  applicableTo: string[]; // 案件類型
  confidence: number; // 0-1 置信度
  evidence: string[];
}

export interface FinancialSummary {
  budget: number;
  actual: number;
  variance: number;
  varianceStatus: 'under-budget' | 'over-budget' | 'on-track';
  variancePercent?: number;
}

export interface CloseoutReportSections {
  summary: string;
  achievements: string[];
  challenges: string[];
  financialSummary: FinancialSummary;
  qualityScore: number; // 0-100
}

export interface CloseoutReport {
  id: string;
  caseId: string;
  title: string;
  sections: CloseoutReportSections;
  successPatterns: SuccessPattern[];
  createdAt: Date;
}

export interface KBBackflowEntry {
  sourceCase: string;
  patterns: SuccessPattern[];
  lessonsLearned: string[];
  targetCategories: string[]; // M00A-M00E 對應
  timestamp: Date;
}
