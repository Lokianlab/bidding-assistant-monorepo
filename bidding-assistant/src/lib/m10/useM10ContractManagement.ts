/**
 * M10 履約管理 React Hook
 * 管理合約狀態、里程碑更新、報告生成
 */

import { useState, useCallback, useEffect } from 'react';
import { Contract, Milestone, ProgressReport } from './types';

// Mock 資料（實際應用中使用 Supabase）
const MOCK_CONTRACTS: Record<string, Contract> = {
  'case-001': {
    id: 'contract-001',
    caseId: 'case-001',
    tenantId: 'tenant-001',
    title: '系統開發合約',
    budget: 1000000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'active',
    milestones: [
      {
        id: 'milestone-1',
        name: '需求分析與設計',
        weight: 0.3,
        dueDate: new Date('2026-03-31'),
        progress: 100,
        status: 'completed',
        paymentAmount: 300000,
        completedDate: new Date('2026-03-28'),
      },
      {
        id: 'milestone-2',
        name: '開發與測試',
        weight: 0.5,
        dueDate: new Date('2026-08-31'),
        progress: 75,
        status: 'in-progress',
        paymentAmount: 500000,
      },
      {
        id: 'milestone-3',
        name: '部署與交付',
        weight: 0.2,
        dueDate: new Date('2026-12-31'),
        progress: 0,
        status: 'pending',
        paymentAmount: 200000,
      },
    ],
  },
};

export interface UseM10ContractManagementResult {
  contract: Contract | null;
  loading: boolean;
  error: string | null;
  createContract: (data: Partial<Contract>) => Promise<Contract>;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<Milestone>;
  fetchReport: (reportType: 'monthly' | 'quarterly') => Promise<ProgressReport>;
}

/**
 * M10 履約管理 Hook
 *
 * @param caseId 案件 ID
 * @returns 合約管理功能集
 */
export function useM10ContractManagement(caseId: string): UseM10ContractManagementResult {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化：載入合約
  useEffect(() => {
    const loadContract = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock 實裝：直接從 MOCK_CONTRACTS 取得
        if (MOCK_CONTRACTS[caseId]) {
          setContract(MOCK_CONTRACTS[caseId]);
        } else {
          setContract(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入合約失敗');
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [caseId]);

  // 建立合約
  const createContract = useCallback(async (data: Partial<Contract>): Promise<Contract> => {
    try {
      const newContract: Contract = {
        id: `contract-${Date.now()}`,
        caseId,
        tenantId: data.tenantId || 'unknown',
        title: data.title || '未命名合約',
        budget: data.budget || 0,
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(),
        milestones: data.milestones || [],
        status: 'active',
      };

      setContract(newContract);
      MOCK_CONTRACTS[caseId] = newContract;

      return newContract;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '建立合約失敗';
      setError(errorMsg);
      throw err;
    }
  }, [caseId]);

  // 更新里程碑
  const updateMilestone = useCallback(
    async (milestoneId: string, updates: Partial<Milestone>): Promise<Milestone> => {
      if (!contract) {
        throw new Error('合約未載入');
      }

      try {
        const updatedMilestones = contract.milestones.map((m) => {
          if (m.id === milestoneId) {
            return { ...m, ...updates };
          }
          return m;
        });

        const updatedContract: Contract = {
          ...contract,
          milestones: updatedMilestones,
        };

        setContract(updatedContract);
        MOCK_CONTRACTS[caseId] = updatedContract;

        const updatedMilestone = updatedMilestones.find((m) => m.id === milestoneId);
        if (!updatedMilestone) {
          throw new Error('里程碑未找到');
        }

        return updatedMilestone;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '更新里程碑失敗';
        setError(errorMsg);
        throw err;
      }
    },
    [contract, caseId]
  );

  // 生成報告
  const fetchReport = useCallback(
    async (reportType: 'monthly' | 'quarterly'): Promise<ProgressReport> => {
      if (!contract) {
        throw new Error('合約未載入');
      }

      try {
        const now = new Date();
        const periodStart =
          reportType === 'monthly'
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(
                now.getFullYear(),
                Math.floor(now.getMonth() / 3) * 3,
                1
              );

        const report: ProgressReport = {
          id: `report-${Date.now()}`,
          contractId: contract.id,
          periodStart,
          periodEnd: now,
          description: `${reportType === 'monthly' ? '月' : '季'}度進度報告`,
          sections: [
            {
              title: '完成進度',
              content: `整體進度達成 ${Math.round(
                contract.milestones.reduce((sum, m) => sum + m.progress * m.weight, 0) /
                  contract.milestones.reduce((sum, m) => sum + m.weight, 0)
              )}%`,
            },
            {
              title: '里程碑狀態',
              content: contract.milestones
                .map(
                  (m) =>
                    `${m.name}: ${m.progress}% (${m.status})`
                )
                .join(', '),
            },
          ],
          attachments: [],
        };

        return report;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '生成報告失敗';
        setError(errorMsg);
        throw err;
      }
    },
    [contract]
  );

  return {
    contract,
    loading,
    error,
    createContract,
    updateMilestone,
    fetchReport,
  };
}
