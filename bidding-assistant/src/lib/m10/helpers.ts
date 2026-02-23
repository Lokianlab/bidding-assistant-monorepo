/**
 * M10 履約管理輔助函式（純函式，可獨立測試）
 */

import { Milestone, MilestoneStatus, Contract, MilestoneStatus as Status } from './types';
import {
  STANDARD_MILESTONE_WEIGHTS,
  MILESTONE_STATUS_RULES,
} from './constants';

/**
 * 產生標準里程碑
 * 按 30%/50%/20% 分配 duration 和預算
 *
 * @param durationDays 合約期限（天）
 * @param budgetAmount 總預算
 * @param startDate 開始日期
 * @returns 三個里程碑陣列
 */
export function generateStandardMilestones(
  durationDays: number,
  budgetAmount: number,
  startDate: Date
): Milestone[] {
  // 邊界值檢查
  if (durationDays <= 0) {
    return [];
  }

  if (!budgetAmount || budgetAmount < 0) {
    return [];
  }

  const milestones: Milestone[] = [];

  STANDARD_MILESTONE_WEIGHTS.forEach((weight, index) => {
    const dueDateOffset = Math.round(durationDays * weight);
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + dueDateOffset);

    const paymentAmount = budgetAmount * weight;

    const milestone: Milestone = {
      id: `milestone-${index + 1}`,
      name: `里程碑 ${index + 1}`,
      weight,
      dueDate,
      progress: 0,
      status: 'pending',
      paymentAmount,
    };

    milestones.push(milestone);
  });

  return milestones;
}

/**
 * 計算加權平均進度
 *
 * @param milestones 里程碑陣列
 * @returns 整體進度 (0-100)
 */
export function calculateOverallProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) {
    return 0;
  }

  const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weightedProgress = milestones.reduce(
    (sum, m) => sum + m.weight * m.progress,
    0
  );

  return Math.round(weightedProgress / totalWeight);
}

/**
 * 決定里程碑狀態
 *
 * 邏輯：
 * - progress === 100 → completed
 * - progress === 0 → pending
 * - 0 < progress < 100：檢查期限
 *   - today > dueDate && progress < 100 → overdue
 *   - (dueDate - today) < 7days && progress < 50 → at-risk
 *   - 其他 → in-progress
 *
 * @param milestone 里程碑
 * @param today 參考日期（預設今日）
 * @returns 里程碑狀態
 */
export function determineMilestoneStatus(
  milestone: Milestone,
  today: Date = new Date()
): MilestoneStatus {
  if (milestone.progress === 100) {
    return 'completed';
  }

  if (milestone.progress === 0) {
    return 'pending';
  }

  // 0 < progress < 100
  const dueDate = milestone.dueDate;

  // 逾期檢查
  if (today > dueDate && milestone.progress < 100) {
    return 'overdue';
  }

  // 風險檢查
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (
    daysUntilDue < MILESTONE_STATUS_RULES.AT_RISK_THRESHOLD_DAYS &&
    milestone.progress < MILESTONE_STATUS_RULES.AT_RISK_PROGRESS_THRESHOLD
  ) {
    return 'at-risk';
  }

  return 'in-progress';
}

/**
 * 計算付款時程
 *
 * @param milestones 里程碑陣列
 * @returns 付款清單 (日期、金額)
 */
export function calculatePaymentSchedule(
  milestones: Milestone[]
): Array<{ date: Date; amount: number }> {
  return milestones
    .filter((m) => m.completedDate) // 只計算已完成的里程碑
    .map((m) => {
      const paymentDate = new Date(m.completedDate!);
      paymentDate.setDate(
        paymentDate.getDate() + MILESTONE_STATUS_RULES.PAYMENT_DELAY_DAYS
      );

      return {
        date: paymentDate,
        amount: m.paymentAmount,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 生成進度報告摘要
 *
 * @param contract 合約
 * @returns 摘要文字
 */
export function generateProgressSummary(contract: Contract): string {
  const completedCount = contract.milestones.filter(
    (m) => m.status === 'completed'
  ).length;
  const totalCount = contract.milestones.length;
  const overallProgress = calculateOverallProgress(contract.milestones);

  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  return `${month}月進度：${completedCount}/${totalCount}里程碑完成，${overallProgress}%進度`;
}
