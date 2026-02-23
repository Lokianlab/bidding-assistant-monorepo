/**
 * M10 輔助函式測試
 */

import { describe, it, expect } from 'vitest';
import {
  generateStandardMilestones,
  calculateOverallProgress,
  determineMilestoneStatus,
  calculatePaymentSchedule,
  generateProgressSummary,
} from '../helpers';
import { Milestone, Contract } from '../types';

describe('M10 Helpers', () => {
  // ==================
  // generateStandardMilestones: 5 個測試
  // ==================
  describe('generateStandardMilestones', () => {
    it('應該為 90 天的合約產生 3 個標準里程碑', () => {
      const startDate = new Date('2026-01-01');
      const result = generateStandardMilestones(90, 1000000, startDate);

      expect(result).toHaveLength(3);
      expect(result[0].weight).toBe(0.3);
      expect(result[1].weight).toBe(0.5);
      expect(result[2].weight).toBe(0.2);
    });

    it('應該正確分配預算', () => {
      const startDate = new Date('2026-01-01');
      const budget = 1000000;
      const result = generateStandardMilestones(90, budget, startDate);

      expect(result[0].paymentAmount).toBe(300000);
      expect(result[1].paymentAmount).toBe(500000);
      expect(result[2].paymentAmount).toBe(200000);

      const totalPayment = result.reduce((sum, m) => sum + m.paymentAmount, 0);
      expect(totalPayment).toBe(budget);
    });

    it('應該正確計算截止日期', () => {
      const startDate = new Date('2026-01-01');
      const result = generateStandardMilestones(90, 1000000, startDate);

      // 每個里程碑根據自己的 weight 計算
      // Milestone 0: 30% * 90 = 27 天
      const expectedDate1 = new Date('2026-01-01');
      expectedDate1.setDate(expectedDate1.getDate() + 27);
      expect(result[0].dueDate).toEqual(expectedDate1);

      // Milestone 1: 50% * 90 = 45 天
      const expectedDate2 = new Date('2026-01-01');
      expectedDate2.setDate(expectedDate2.getDate() + 45);
      expect(result[1].dueDate).toEqual(expectedDate2);

      // Milestone 2: 20% * 90 = 18 天
      const expectedDate3 = new Date('2026-01-01');
      expectedDate3.setDate(expectedDate3.getDate() + 18);
      expect(result[2].dueDate).toEqual(expectedDate3);
    });

    it('邊界值：durationDays = 0 應返回空陣列', () => {
      const result = generateStandardMilestones(0, 1000000, new Date());
      expect(result).toEqual([]);
    });

    it('邊界值：budget = 0 或 null 應返回空陣列', () => {
      const startDate = new Date('2026-01-01');
      const result1 = generateStandardMilestones(90, 0, startDate);
      const result2 = generateStandardMilestones(90, null as unknown as number, startDate);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  // ==================
  // calculateOverallProgress: 8 個測試
  // ==================
  describe('calculateOverallProgress', () => {
    it('空陣列應返回 0', () => {
      const result = calculateOverallProgress([]);
      expect(result).toBe(0);
    });

    it('單一里程碑：100% 進度應返回 100', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 1,
        dueDate: new Date('2026-03-01'),
        progress: 100,
        status: 'completed',
        paymentAmount: 100000,
      };

      const result = calculateOverallProgress([milestone]);
      expect(result).toBe(100);
    });

    it('單一里程碑：0% 進度應返回 0', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 1,
        dueDate: new Date('2026-03-01'),
        progress: 0,
        status: 'pending',
        paymentAmount: 100000,
      };

      const result = calculateOverallProgress([milestone]);
      expect(result).toBe(0);
    });

    it('多個里程碑：應正確計算加權平均', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 300000,
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.5,
          dueDate: new Date('2026-06-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 500000,
        },
        {
          id: 'test-3',
          name: 'Phase 3',
          weight: 0.2,
          dueDate: new Date('2026-09-01'),
          progress: 0,
          status: 'pending',
          paymentAmount: 200000,
        },
      ];

      // 計算：(0.3 * 100 + 0.5 * 50 + 0.2 * 0) / 1 = (30 + 25) / 1 = 55
      const result = calculateOverallProgress(milestones);
      expect(result).toBe(55);
    });

    it('權重不等於 1 的情況', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.4,
          dueDate: new Date('2026-03-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 400000,
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.6,
          dueDate: new Date('2026-06-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 600000,
        },
      ];

      // 計算：(0.4 * 100 + 0.6 * 50) / 1 = (40 + 30) / 1 = 70
      const result = calculateOverallProgress(milestones);
      expect(result).toBe(70);
    });

    it('所有里程碑 50% 進度應返回 50', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 300000,
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.5,
          dueDate: new Date('2026-06-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 500000,
        },
        {
          id: 'test-3',
          name: 'Phase 3',
          weight: 0.2,
          dueDate: new Date('2026-09-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 200000,
        },
      ];

      const result = calculateOverallProgress(milestones);
      expect(result).toBe(50);
    });

    it('浮點數進度的四捨五入', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.5,
          dueDate: new Date('2026-03-01'),
          progress: 33,
          status: 'in-progress',
          paymentAmount: 500000,
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.5,
          dueDate: new Date('2026-06-01'),
          progress: 34,
          status: 'in-progress',
          paymentAmount: 500000,
        },
      ];

      // 計算：(0.5 * 33 + 0.5 * 34) / 1 = 33.5 → 四捨五入為 34
      const result = calculateOverallProgress(milestones);
      expect(result).toBe(34); // 33.5 四捨五入
    });
  });

  // ==================
  // determineMilestoneStatus: 12 個測試
  // ==================
  describe('determineMilestoneStatus', () => {
    const now = new Date('2026-02-23');

    it('進度 100% 應返回 completed', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-03-01'),
        progress: 100,
        status: 'pending',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('completed');
    });

    it('進度 0% 應返回 pending', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-03-01'),
        progress: 0,
        status: 'pending',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('pending');
    });

    it('進度 > 0 且截止日期未到應返回 in-progress', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('in-progress');
    });

    it('進度 > 0 且逾期應返回 overdue', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-01-01'),
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('overdue');
    });

    it('進度 100% 且逾期應返回 completed（優先度更高）', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-01-01'),
        progress: 100,
        status: 'completed',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('completed');
    });

    it('距離截止日期 < 7 天且進度 < 50% 應返回 at-risk', () => {
      // 截止日期：2026-02-26（3 天後）
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-02-26'),
        progress: 40,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('at-risk');
    });

    it('距離截止日期 >= 7 天應返回 in-progress（不論進度）', () => {
      // 截止日期：2026-03-02（7 天後）
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-03-02'),
        progress: 30,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('in-progress');
    });

    it('距離截止日期 < 7 天但進度 >= 50% 應返回 in-progress', () => {
      // 截止日期：2026-02-26（3 天後）
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-02-26'),
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('in-progress');
    });

    it('進度 99% 但逾期應返回 overdue', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-01-01'),
        progress: 99,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('overdue');
    });

    it('邊界值：進度恰好 50% 且接近截止日期應返回 in-progress', () => {
      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: new Date('2026-02-26'),
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone, now);
      expect(result).toBe('in-progress');
    });

    it('使用預設 today（新增測試覆蓋預設參數）', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const milestone: Milestone = {
        id: 'test-1',
        name: 'Phase 1',
        weight: 0.3,
        dueDate: futureDate,
        progress: 50,
        status: 'in-progress',
        paymentAmount: 300000,
      };

      const result = determineMilestoneStatus(milestone); // 不傳 today，使用預設
      expect(result).toBe('in-progress');
    });
  });

  // ==================
  // calculatePaymentSchedule: 5 個測試
  // ==================
  describe('calculatePaymentSchedule', () => {
    it('空陣列應返回空陣列', () => {
      const result = calculatePaymentSchedule([]);
      expect(result).toEqual([]);
    });

    it('未完成的里程碑不應包含在付款清單中', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 300000,
        },
      ];

      const result = calculatePaymentSchedule(milestones);
      expect(result).toEqual([]);
    });

    it('已完成的里程碑應加入付款清單', () => {
      const completedDate = new Date('2026-02-20');
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 300000,
          completedDate,
        },
      ];

      const result = calculatePaymentSchedule(milestones);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(300000);

      // 應該延遲 7 天付款
      const expectedPaymentDate = new Date(completedDate);
      expectedPaymentDate.setDate(expectedPaymentDate.getDate() + 7);
      expect(result[0].date).toEqual(expectedPaymentDate);
    });

    it('多個已完成里程碑應排序', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-3',
          name: 'Phase 3',
          weight: 0.2,
          dueDate: new Date('2026-09-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 200000,
          completedDate: new Date('2026-08-01'),
        },
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 300000,
          completedDate: new Date('2026-02-20'),
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.5,
          dueDate: new Date('2026-06-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 500000,
          completedDate: new Date('2026-05-15'),
        },
      ];

      const result = calculatePaymentSchedule(milestones);
      expect(result).toHaveLength(3);

      // 驗證排序（由早到晚）
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].date.getTime()).toBeLessThanOrEqual(result[i + 1].date.getTime());
      }
    });

    it('混合已完成和未完成的里程碑', () => {
      const milestones: Milestone[] = [
        {
          id: 'test-1',
          name: 'Phase 1',
          weight: 0.3,
          dueDate: new Date('2026-03-01'),
          progress: 100,
          status: 'completed',
          paymentAmount: 300000,
          completedDate: new Date('2026-02-20'),
        },
        {
          id: 'test-2',
          name: 'Phase 2',
          weight: 0.5,
          dueDate: new Date('2026-06-01'),
          progress: 50,
          status: 'in-progress',
          paymentAmount: 500000,
        },
      ];

      const result = calculatePaymentSchedule(milestones);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(300000);
    });
  });

  // ==================
  // generateProgressSummary: 5 個測試
  // ==================
  describe('generateProgressSummary', () => {
    it('應該生成正確的進度摘要文字', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
        milestones: [
          {
            id: 'test-1',
            name: 'Phase 1',
            weight: 0.3,
            dueDate: new Date('2026-03-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 300000,
          },
          {
            id: 'test-2',
            name: 'Phase 2',
            weight: 0.5,
            dueDate: new Date('2026-06-01'),
            progress: 50,
            status: 'in-progress',
            paymentAmount: 500000,
          },
          {
            id: 'test-3',
            name: 'Phase 3',
            weight: 0.2,
            dueDate: new Date('2026-09-01'),
            progress: 0,
            status: 'pending',
            paymentAmount: 200000,
          },
        ],
      };

      const result = generateProgressSummary(contract);
      expect(result).toContain('里程碑完成');
      expect(result).toContain('%進度');
      expect(result).toMatch(/\d+\/\d+/); // 匹配 completed/total
    });

    it('應該正確計算完成里程碑數量', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
        milestones: [
          {
            id: 'test-1',
            name: 'Phase 1',
            weight: 0.3,
            dueDate: new Date('2026-03-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 300000,
          },
          {
            id: 'test-2',
            name: 'Phase 2',
            weight: 0.5,
            dueDate: new Date('2026-06-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 500000,
          },
          {
            id: 'test-3',
            name: 'Phase 3',
            weight: 0.2,
            dueDate: new Date('2026-09-01'),
            progress: 0,
            status: 'pending',
            paymentAmount: 200000,
          },
        ],
      };

      const result = generateProgressSummary(contract);
      expect(result).toContain('2/3');
    });

    it('所有里程碑完成應顯示 100%', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
        milestones: [
          {
            id: 'test-1',
            name: 'Phase 1',
            weight: 0.3,
            dueDate: new Date('2026-03-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 300000,
          },
          {
            id: 'test-2',
            name: 'Phase 2',
            weight: 0.5,
            dueDate: new Date('2026-06-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 500000,
          },
          {
            id: 'test-3',
            name: 'Phase 3',
            weight: 0.2,
            dueDate: new Date('2026-09-01'),
            progress: 100,
            status: 'completed',
            paymentAmount: 200000,
          },
        ],
      };

      const result = generateProgressSummary(contract);
      expect(result).toContain('3/3');
      expect(result).toContain('100%');
    });

    it('無里程碑應返回 0/0', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
        milestones: [],
      };

      const result = generateProgressSummary(contract);
      expect(result).toContain('0/0');
      expect(result).toContain('0%');
    });

    it('應該包含月份資訊', () => {
      const contract: Contract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '系統開發',
        budget: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
        milestones: [],
      };

      const result = generateProgressSummary(contract);
      expect(result).toMatch(/\d+月進度/);
    });
  });
});
