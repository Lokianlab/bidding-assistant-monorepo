'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { WinAssessmentPanel } from '@/components/intelligence/WinAssessmentPanel';
import { PerplexityPanel } from '@/components/intelligence/PerplexityPanel';
import { DecisionPanel } from '@/components/intelligence/DecisionPanel';
import { RFPUpload } from '@/components/intelligence/RFPUpload';

interface AgencyCase {
  job_number: string;
  title: string;
  award_date: string;
  award_amount: number | null;
  winner_name: string;
  bidder_count: number;
}

interface TopWinner {
  name: string;
  win_count: number;
  total_amount: number;
  consecutive_years: number;
}

export default function IntelligencePage() {
  const params = useParams();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<Record<string, unknown>>({});
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    async function loadIntel() {
      try {
        const res = await fetch(`/api/intelligence/fetch?case_id=${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setIntel(data);
        }
      } catch {
        // 靜默失敗，頁面仍可用
      } finally {
        setLoading(false);
      }
    }
    loadIntel();
  }, [caseId]);

  const agencyHistory = intel.agency_history as {
    unit_name?: string;
    total_cases?: number;
    cases?: AgencyCase[];
    top_winners?: TopWinner[];
  } | undefined;

  const competitors = intel.competitor as {
    competitors?: { name: string; win_count: number; total_amount: number; consecutive_years: number; specializations?: string[] }[];
  } | undefined;

  const rfpSummary = intel.rfp_summary as Record<string, unknown> | undefined;
  const winAssessment = intel.win_assessment as {
    checks?: { id: string; label: string; status: 'red' | 'yellow' | 'green' | 'unknown'; evidence: string; source: string; auto_filled: boolean }[];
    overall?: 'red' | 'yellow' | 'green' | 'unknown';
    recommendation?: string;
  } | undefined;

  const perplexityData = intel.perplexity as { rounds?: { round: number; result: string; findings: string[]; timestamp: string }[] } | undefined;

  const handleDecide = useCallback(async (decision: 'bid' | 'no_bid' | 'conditional', reason: string) => {
    setIsSubmittingDecision(true);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, decision, reason }),
      });

      if (res.ok && decision === 'bid') {
        // 觸發一鍵建案
        await fetch('/api/case-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseId,
            title: (agencyHistory as Record<string, unknown>)?.unit_name ?? caseId,
            agency: (agencyHistory as Record<string, unknown>)?.unit_name ?? '',
            pcc_job_number: caseId,
            pcc_unit_id: '',
          }),
        });
      }
    } catch {
      // 錯誤處理
    } finally {
      setIsSubmittingDecision(false);
    }
  }, [caseId, agencyHistory]);

  const handleSavePerplexityResult = useCallback(async (round: number, resultText: string) => {
    await fetch('/api/intelligence/perplexity-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, round, result_text: resultText }),
    });
    // 重新載入情報
    const res = await fetch(`/api/intelligence/fetch?case_id=${caseId}`);
    if (res.ok) setIntel(await res.json());
  }, [caseId]);

  if (loading) {
    return <div className="p-6 text-gray-500">載入情報中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">案件情報分析</h1>
      <p className="text-sm text-gray-500">案件 ID：{caseId}</p>

      {/* 機關歷史 */}
      {agencyHistory && (
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">機關歷史</h3>
          <p className="text-sm text-gray-600 mb-2">
            {agencyHistory.unit_name} — 近期 {agencyHistory.total_cases ?? 0} 筆案件
          </p>
          {agencyHistory.top_winners && agencyHistory.top_winners.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">常得標廠商</h4>
              <div className="space-y-1">
                {agencyHistory.top_winners.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                    <span>{w.name}</span>
                    <span className="text-gray-500">
                      {w.win_count} 次得標 | 連續 {w.consecutive_years} 年 | {(w.total_amount / 10000).toFixed(0)} 萬
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 競爭者分析 */}
      {competitors?.competitors && competitors.competitors.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">競爭者分析</h3>
          <div className="space-y-2">
            {competitors.competitors.map((c) => (
              <div key={c.name} className="bg-gray-50 rounded p-3 text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-gray-600">
                  得標 {c.win_count} 次 | 連續 {c.consecutive_years} 年 | {(c.total_amount / 10000).toFixed(0)} 萬元
                </div>
                {c.specializations && c.specializations.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {c.specializations.map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RFP 上傳解析 */}
      <RFPUpload
        caseId={caseId}
        existingSummary={rfpSummary as Parameters<typeof RFPUpload>[0]['existingSummary']}
      />

      {/* Perplexity 調查 */}
      <PerplexityPanel
        prompts={[
          { round: 1, title: '競爭者與甲方關係', prompt: '（需先拉取 PCC 情報後自動生成）', purpose: '確認最強競爭者跟甲方有沒有非標案合作關係' },
          { round: 2, title: '評審委員與市場背景', prompt: '（待生成）', purpose: '推測評審偏好和市場空白' },
          { round: 3, title: '案件策略意涵', prompt: '（待生成）', purpose: '這個案子對甲方的策略意義' },
        ]}
        results={perplexityData?.rounds ?? []}
        onSaveResult={handleSavePerplexityResult}
      />

      {/* 勝算評估 */}
      {winAssessment?.checks ? (
        <WinAssessmentPanel
          checks={winAssessment.checks}
          overall={winAssessment.overall ?? 'unknown'}
          recommendation={winAssessment.recommendation ?? ''}
        />
      ) : (
        <div className="rounded-lg border p-4 text-gray-500 text-sm">
          勝算評估：等待 PCC 情報載入後自動產生
        </div>
      )}

      {/* 決策面板 */}
      <DecisionPanel
        caseId={caseId}
        onDecide={handleDecide}
        isSubmitting={isSubmittingDecision}
      />
    </div>
  );
}
