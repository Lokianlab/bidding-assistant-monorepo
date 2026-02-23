/**
 * M10 履約管理模組型別定義
 */

export type MilestoneStatus = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'at-risk';

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  weight: number; // 0-1
  dueDate: Date;
  completedDate?: Date;
  progress: number; // 0-100
  status: MilestoneStatus;
  paymentAmount: number;
}

export interface Contract {
  id: string;
  caseId: string;
  tenantId: string;
  title: string;
  budget: number;
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface ContractProgress {
  overallProgress: number; // 0-100
  completedCount: number;
  overdueCount: number;
  atRiskCount: number;
}

export interface ProgressReport {
  id: string;
  contractId: string;
  periodStart: Date;
  periodEnd: Date;
  description: string;
  sections: ReportSection[];
  attachments: string[];
}

export interface ReportSection {
  title: string;
  content: string;
}
