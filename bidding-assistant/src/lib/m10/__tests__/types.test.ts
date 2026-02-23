/**
 * M10 型別定義測試
 */

import { describe, it, expect } from 'vitest';
import {
  MilestoneStatus,
  Milestone,
  Contract,
  ContractProgress,
  ProgressReport,
  ReportSection,
} from '../types';

describe('M10 Types', () => {
  describe('MilestoneStatus', () => {
    it('應該接受所有有效的里程碑狀態', () => {
      const statuses: MilestoneStatus[] = [
        'pending',
        'in-progress',
        'completed',
        'overdue',
        'at-risk',
      ];

      expect(statuses).toHaveLength(5);

      for (const status of statuses) {
        expect(typeof status).toBe('string');
      }
    });
  });

  describe('Milestone', () => {
    it('應該具有所有必需欄位', () => {
      const milestone: Milestone = {
        id: 'milestone-1',
        name: '里程碑 1',
        description: '這是里程碑描述',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        completedDate: new Date('2026-03-28'),
        progress: 100,
        status: 'completed',
        paymentAmount: 300000,
      };

      expect(milestone.id).toBeDefined();
      expect(milestone.name).toBeDefined();
      expect(milestone.weight).toBeDefined();
      expect(milestone.dueDate).toBeInstanceOf(Date);
      expect(milestone.progress).toBeDefined();
      expect(milestone.status).toBeDefined();
      expect(milestone.paymentAmount).toBeDefined();
    });

    it('description 和 completedDate 應該是可選的', () => {
      const milestone: Milestone = {
        id: 'milestone-1',
        name: '里程碑 1',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        progress: 0,
        status: 'pending',
        paymentAmount: 300000,
      };

      expect(milestone.description).toBeUndefined();
      expect(milestone.completedDate).toBeUndefined();
    });

    it('weight 應該在 0-1 之間', () => {
      const milestone1: Milestone = {
        id: 'milestone-1',
        name: '里程碑 1',
        weight: 0,
        dueDate: new Date('2026-03-31'),
        progress: 0,
        status: 'pending',
        paymentAmount: 300000,
      };

      const milestone2: Milestone = {
        id: 'milestone-2',
        name: '里程碑 2',
        weight: 1,
        dueDate: new Date('2026-03-31'),
        progress: 100,
        status: 'completed',
        paymentAmount: 300000,
      };

      expect(milestone1.weight).toBeGreaterThanOrEqual(0);
      expect(milestone1.weight).toBeLessThanOrEqual(1);
      expect(milestone2.weight).toBeGreaterThanOrEqual(0);
      expect(milestone2.weight).toBeLessThanOrEqual(1);
    });

    it('progress 應該在 0-100 之間', () => {
      const milestone: Milestone = {
        id: 'milestone-1',
        name: '里程碑 1',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      expect(milestone.progress).toBeGreaterThanOrEqual(0);
      expect(milestone.progress).toBeLessThanOrEqual(100);
    });

    it('status 應該是有效的 MilestoneStatus', () => {
      const validStatuses: MilestoneStatus[] = [
        'pending',
        'in-progress',
        'completed',
        'overdue',
        'at-risk',
      ];

      for (const status of validStatuses) {
        const milestone: Milestone = {
          id: 'milestone-1',
          name: '里程碑 1',
          weight: 0.3,
          dueDate: new Date('2026-03-31'),
          progress: 50,
          status,
          paymentAmount: 300000,
        };

        expect(validStatuses).toContain(milestone.status);
      }
    });
  });

  describe('Contract', () => {
    it('應該具有所有必需欄位', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發合約',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        milestones: [],
        status: 'active',
      };

      expect(contract.id).toBeDefined();
      expect(contract.caseId).toBeDefined();
      expect(contract.tenantId).toBeDefined();
      expect(contract.title).toBeDefined();
      expect(contract.budget).toBeDefined();
      expect(contract.startDate).toBeInstanceOf(Date);
      expect(contract.endDate).toBeInstanceOf(Date);
      expect(Array.isArray(contract.milestones)).toBe(true);
      expect(contract.status).toBeDefined();
    });

    it('milestones 應該是陣列', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發合約',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        milestones: [
          {
            id: 'milestone-1',
            name: '里程碑 1',
            weight: 0.3,
            dueDate: new Date('2026-03-31'),
            progress: 0,
            status: 'pending',
            paymentAmount: 300000,
          },
        ],
        status: 'active',
      };

      expect(Array.isArray(contract.milestones)).toBe(true);
      expect(contract.milestones[0].id).toBe('milestone-1');
    });

    it('status 應該是有效值', () => {
      const validStatuses = ['active', 'completed', 'cancelled'];

      for (const status of validStatuses) {
        const contract: Contract = {
          id: 'contract-1',
          caseId: 'case-1',
          tenantId: 'tenant-1',
          title: '系統開發合約',
          budget: 1000000,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          milestones: [],
          status: status as 'active' | 'completed' | 'cancelled',
        };

        expect(validStatuses).toContain(contract.status);
      }
    });

    it('budget 應該是正數', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發合約',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        milestones: [],
        status: 'active',
      };

      expect(contract.budget).toBeGreaterThan(0);
    });
  });

  describe('ContractProgress', () => {
    it('應該具有所有欄位', () => {
      const progress: ContractProgress = {
        overallProgress: 55,
        completedCount: 2,
        overdueCount: 1,
        atRiskCount: 0,
      };

      expect(progress.overallProgress).toBeDefined();
      expect(progress.completedCount).toBeDefined();
      expect(progress.overdueCount).toBeDefined();
      expect(progress.atRiskCount).toBeDefined();
    });

    it('overallProgress 應該在 0-100 之間', () => {
      const progress: ContractProgress = {
        overallProgress: 75,
        completedCount: 2,
        overdueCount: 0,
        atRiskCount: 0,
      };

      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);
    });

    it('各計數應該是非負整數', () => {
      const progress: ContractProgress = {
        overallProgress: 55,
        completedCount: 2,
        overdueCount: 1,
        atRiskCount: 0,
      };

      expect(progress.completedCount).toBeGreaterThanOrEqual(0);
      expect(progress.overdueCount).toBeGreaterThanOrEqual(0);
      expect(progress.atRiskCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(progress.completedCount)).toBe(true);
      expect(Number.isInteger(progress.overdueCount)).toBe(true);
      expect(Number.isInteger(progress.atRiskCount)).toBe(true);
    });
  });

  describe('ProgressReport', () => {
    it('應該具有所有必需欄位', () => {
      const report: ProgressReport = {
        id: 'report-1',
        contractId: 'contract-1',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
        description: '2月進度報告',
        sections: [
          {
            title: '完成進度',
            content: '完成 50%',
          },
        ],
        attachments: [],
      };

      expect(report.id).toBeDefined();
      expect(report.contractId).toBeDefined();
      expect(report.periodStart).toBeInstanceOf(Date);
      expect(report.periodEnd).toBeInstanceOf(Date);
      expect(report.description).toBeDefined();
      expect(Array.isArray(report.sections)).toBe(true);
      expect(Array.isArray(report.attachments)).toBe(true);
    });

    it('sections 應該是 ReportSection 陣列', () => {
      const report: ProgressReport = {
        id: 'report-1',
        contractId: 'contract-1',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
        description: '2月進度報告',
        sections: [
          {
            title: '完成進度',
            content: '完成 50%',
          },
          {
            title: '風險分析',
            content: '無重大風險',
          },
        ],
        attachments: ['report.pdf'],
      };

      expect(report.sections).toHaveLength(2);
      expect(report.sections[0].title).toBe('完成進度');
      expect(report.sections[0].content).toBe('完成 50%');
    });
  });

  describe('ReportSection', () => {
    it('應該具有 title 和 content 欄位', () => {
      const section: ReportSection = {
        title: '進度摘要',
        content: '本月完成 3 個里程碑',
      };

      expect(section.title).toBeDefined();
      expect(section.content).toBeDefined();
      expect(typeof section.title).toBe('string');
      expect(typeof section.content).toBe('string');
    });
  });

  describe('型別完整性檢查', () => {
    it('Milestone 的 dueDate 必須是 Date 物件', () => {
      const milestone: Milestone = {
        id: 'milestone-1',
        name: '里程碑 1',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        progress: 0,
        status: 'pending',
        paymentAmount: 300000,
      };

      expect(milestone.dueDate).toBeInstanceOf(Date);
      expect(typeof milestone.dueDate.getTime()).toBe('number');
    });

    it('Contract 的 startDate 和 endDate 必須是 Date 物件', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發合約',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        milestones: [],
        status: 'active',
      };

      expect(contract.startDate).toBeInstanceOf(Date);
      expect(contract.endDate).toBeInstanceOf(Date);
    });

    it('所有 MilestoneStatus 值都應該被識別', () => {
      const statusCounts: Record<MilestoneStatus, number> = {
        pending: 0,
        'in-progress': 0,
        completed: 0,
        overdue: 0,
        'at-risk': 0,
      };

      const statuses: MilestoneStatus[] = [
        'pending',
        'in-progress',
        'completed',
        'overdue',
        'at-risk',
      ];

      for (const status of statuses) {
        statusCounts[status]++;
      }

      expect(Object.keys(statusCounts)).toHaveLength(5);
    });
  });
});
