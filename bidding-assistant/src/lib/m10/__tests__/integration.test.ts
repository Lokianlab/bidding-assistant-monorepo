/**
 * M10 整合測試 — 多個 helper 函式的協作場景
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

describe('M10 Integration Tests', () => {
  // ==================
  // 工作流程完整性（5 個）
  // ==================
  describe('Complete workflow: Create → Generate → Calculate → Report', () => {
    it('應該完整執行合約建立到里程碑生成的工作流', () => {
      // 步驟 1：定義合約參數
      const contractStartDate = new Date('2026-02-01');
      const contractDuration = 180; // 180 天
      const contractBudget = 1000000;

      // 步驟 2：生成里程碑
      const milestones = generateStandardMilestones(
        contractDuration,
        contractBudget,
        contractStartDate
      );

      expect(milestones).toHaveLength(3);
      expect(milestones[0].weight).toBe(0.3);
      expect(milestones[1].weight).toBe(0.5);
      expect(milestones[2].weight).toBe(0.2);

      // 驗證預算完整性
      const totalBudget = milestones.reduce((sum, m) => sum + m.paymentAmount, 0);
      expect(totalBudget).toBe(contractBudget);
    });

    it('應該正確計算進度並生成報告', () => {
      // 設置
      const startDate = new Date('2026-02-01');
      const milestones = generateStandardMilestones(180, 1000000, startDate);

      // 模擬進度：前兩個里程碑各 50% 進度
      milestones[0].progress = 50;
      milestones[1].progress = 50;
      milestones[2].progress = 0;

      // 計算整體進度
      const overallProgress = calculateOverallProgress(milestones);

      // 加權計算：0.3*50 + 0.5*50 + 0.2*0 = 15 + 25 + 0 = 40
      expect(overallProgress).toBe(40);
    });

    it('應該在完成里程碑時正確生成付款清單', () => {
      const startDate = new Date('2026-02-01');
      const milestones = generateStandardMilestones(180, 1000000, startDate);

      // 模擬完成前兩個里程碑
      milestones[0].progress = 100;
      milestones[0].status = 'completed';
      milestones[0].completedDate = new Date('2026-02-28');

      milestones[1].progress = 100;
      milestones[1].status = 'completed';
      milestones[1].completedDate = new Date('2026-04-30');

      // 計算付款清單
      const paymentSchedule = calculatePaymentSchedule(milestones);

      expect(paymentSchedule).toHaveLength(2);
      expect(paymentSchedule[0].amount).toBe(300000);
      expect(paymentSchedule[1].amount).toBe(500000);

      const totalPayment = paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPayment).toBe(800000);
    });

    it('應該根據進度和日期狀態生成準確的摘要', () => {
      const startDate = new Date('2026-01-01');
      const milestones = generateStandardMilestones(90, 1000000, startDate);

      // 設置進度
      milestones[0].progress = 100;
      milestones[0].status = 'completed';

      // generateProgressSummary 需要 Contract 物件，不是 Milestone 陣列
      const mockContract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '測試',
        budget: 1000000,
        startDate,
        endDate: new Date('2026-04-01'),
        status: 'active' as const,
        milestones,
      };

      const summary = generateProgressSummary(mockContract);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('1/3');
    });

    it('整個工作流應保持資料一致性', () => {
      const startDate = new Date('2026-01-01');
      const budget = 1500000;
      const duration = 120;

      // 生成
      const milestones = generateStandardMilestones(duration, budget, startDate);

      // 驗證基本一致性
      const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);
      const totalPayment = milestones.reduce((sum, m) => sum + m.paymentAmount, 0);

      expect(Math.abs(totalWeight - 1.0) < 0.01).toBe(true);
      expect(totalPayment).toBe(budget);

      // 驗證每個里程碑的邏輯
      milestones.forEach((m, idx) => {
        expect(m.paymentAmount).toBe(budget * m.weight);
        expect(m.progress).toBeGreaterThanOrEqual(0);
        expect(m.progress).toBeLessThanOrEqual(100);
        expect(['pending', 'in-progress', 'completed', 'overdue', 'at-risk']).toContain(
          m.status
        );
      });
    });
  });

  // ==================
  // 多里程碑場景（3 個）
  // ==================
  describe('Multi-milestone scenarios', () => {
    it('應該正確處理多個里程碑的進度混合', () => {
      const startDate = new Date('2026-02-01');
      const milestones = generateStandardMilestones(180, 1000000, startDate);

      // 各自不同的進度
      milestones[0].progress = 100;
      milestones[1].progress = 75;
      milestones[2].progress = 25;

      const overallProgress = calculateOverallProgress(milestones);

      // 0.3*100 + 0.5*75 + 0.2*25 = 30 + 37.5 + 5 = 72.5 ≈ 73
      expect(overallProgress).toBeGreaterThan(70);
      expect(overallProgress).toBeLessThan(75);
    });

    it('應該正確判斷多個里程碑的狀態組合', () => {
      const startDate = new Date('2026-01-01');
      const milestones = generateStandardMilestones(90, 1000000, startDate);

      const today = new Date('2026-02-15');

      // determineMilestoneStatus 需要完整的 Milestone 物件和 today 參數
      milestones[0].progress = 100;
      milestones[0].status = determineMilestoneStatus(milestones[0], today);

      milestones[1].progress = 50;
      milestones[1].status = determineMilestoneStatus(milestones[1], today);

      milestones[2].progress = 0;
      milestones[2].status = determineMilestoneStatus(milestones[2], today);

      // 驗證狀態多樣性
      const statuses = new Set(milestones.map((m) => m.status));
      expect(statuses.size).toBeGreaterThan(1);
    });

    it('應該在計算整體進度時維持準確度', () => {
      const startDate = new Date('2026-01-01');
      const milestones = generateStandardMilestones(365, 5000000, startDate);

      // 精確測試
      milestones[0].progress = 0;
      milestones[1].progress = 100;
      milestones[2].progress = 50;

      const progress = calculateOverallProgress(milestones);

      // 0.3*0 + 0.5*100 + 0.2*50 = 0 + 50 + 10 = 60
      expect(progress).toBe(60);
    });
  });

  // ==================
  // 邊界和特殊情況（2 個）
  // ==================
  describe('Edge cases and special scenarios', () => {
    it('應該優雅地處理極端的里程碑配置', () => {
      // 極短的合約（10 天）
      const shortStartDate = new Date('2026-02-01');
      const shortMilestones = generateStandardMilestones(10, 50000, shortStartDate);

      expect(shortMilestones).toHaveLength(3);
      const totalPayment = shortMilestones.reduce((sum, m) => sum + m.paymentAmount, 0);
      expect(totalPayment).toBe(50000);

      // 極長的合約（2 年）
      const longStartDate = new Date('2026-01-01');
      const longMilestones = generateStandardMilestones(730, 50000000, longStartDate);

      expect(longMilestones).toHaveLength(3);
      const longTotalPayment = longMilestones.reduce((sum, m) => sum + m.paymentAmount, 0);
      expect(longTotalPayment).toBe(50000000);
    });

    it('應該在全部完成時生成準確的完成報告', () => {
      const startDate = new Date('2026-01-01');
      const milestones = generateStandardMilestones(90, 1000000, startDate);

      // 全部完成
      milestones.forEach((m) => {
        m.progress = 100;
        m.status = 'completed';
        m.completedDate = new Date();
      });

      const mockContract = {
        id: 'contract-1',
        caseId: 'case-1',
        tenantId: 'tenant-1',
        title: '測試',
        budget: 1000000,
        startDate,
        endDate: new Date('2026-04-01'),
        status: 'active' as const,
        milestones,
      };

      const summary = generateProgressSummary(mockContract);
      const paymentSchedule = calculatePaymentSchedule(milestones);

      expect(summary).toContain('3/3');
      expect(paymentSchedule).toHaveLength(3);
      expect(
        paymentSchedule.reduce((sum, p) => sum + p.amount, 0)
      ).toBe(1000000);
    });
  });
});
