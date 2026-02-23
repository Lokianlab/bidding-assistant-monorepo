// M10 履約管理頁面

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Milestone {
  date: string;
  description: string;
  completed?: boolean;
}

export default function ContractPage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workplan, setWorkplan] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { date: '2026-03-31', description: '需求確認完成', completed: false },
    { date: '2026-05-31', description: '設計文件交付', completed: false },
    { date: '2026-07-31', description: '開發完成', completed: false },
    { date: '2026-08-31', description: '測試驗收完成', completed: false },
  ]);

  useEffect(() => {
    loadWorkplan();
  }, []);

  const loadWorkplan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/contract/workplan`);
      if (!response.ok) throw new Error('工作計畫書查詢失敗');
      const data = await response.json();
      setWorkplan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const generateWorkplan = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/contract/workplan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          milestones,
        }),
      });

      if (!response.ok) throw new Error('工作計畫書生成失敗');
      const data = await response.json();
      setWorkplan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗');
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = (idx: number) => {
    const newMilestones = [...milestones];
    newMilestones[idx].completed = !newMilestones[idx].completed;
    setMilestones(newMilestones);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* 頭部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">履約管理</h1>
          <p className="text-slate-600">工作計畫書、里程碑與進度追蹤</p>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 工作計畫書摘要 */}
        {workplan && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-700">✅ 工作計畫書已生成（ID: {workplan.id}）</p>
          </div>
        )}

        {/* 里程碑管理 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">項目里程碑</h2>
          <div className="space-y-3">
            {milestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 transition-colors ${
                  milestone.completed
                    ? 'border-green-500 bg-green-50 opacity-60'
                    : 'border-blue-500 bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={milestone.completed || false}
                    onChange={() => toggleMilestone(idx)}
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{milestone.description}</p>
                    <p className="text-sm text-slate-600 mt-1">目標日期: {milestone.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 進度統計 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">進度概覽</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100)}%
              </p>
              <p className="text-sm text-slate-600 mt-1">完成度</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{milestones.filter((m) => m.completed).length}</p>
              <p className="text-sm text-slate-600 mt-1">完成里程碑</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {milestones.filter((m) => !m.completed).length}
              </p>
              <p className="text-sm text-slate-600 mt-1">待完成</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-600">{milestones.length}</p>
              <p className="text-sm text-slate-600 mt-1">總里程碑</p>
            </div>
          </div>
        </div>

        {/* 工作計畫書內容 */}
        {workplan && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">工作計畫書內容</h2>
            <div className="space-y-4">
              {workplan.sections?.map((section: any, idx: number) => (
                <div key={idx} className="border-b pb-4 last:border-b-0">
                  <h3 className="font-semibold text-slate-900 mb-2">{section.title}</h3>
                  <p className="text-slate-600 text-sm">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 動作按鈕 */}
        <div className="flex gap-4">
          <Button
            onClick={generateWorkplan}
            disabled={loading}
            className="flex-1"
            size="lg"
          >
            {loading ? '生成中...' : '生成工作計畫書'}
          </Button>
          {workplan && (
            <Button variant="outline" className="flex-1" size="lg">
              下載工作計畫書（待集成）
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
