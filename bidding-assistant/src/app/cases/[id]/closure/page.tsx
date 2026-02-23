// M11 結案飛輪頁面

'use client';

import { useState } from 'react';
import { useCaseClosure } from '@/hooks/useCaseClosure';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CaseClosureRequest } from '@/lib/closure/types';

const CLOSURE_CATEGORIES = [
  { id: 'delivery', label: '交付' },
  { id: 'quality', label: '品質' },
  { id: 'client_satisfaction', label: '客戶滿意度' },
  { id: 'team_performance', label: '團隊績效' },
  { id: 'profitability', label: '獲利性' },
];

export default function CaseClosurePage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const { loading, error, closure, submitClosure, resetError } = useCaseClosure();
  const [patterns, setPatterns] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    final_status: 'completed' as 'completed' | 'cancelled' | 'suspended',
    scores: CLOSURE_CATEGORIES.map((cat) => ({
      category: cat.id as any,
      score: 0,
      notes: '',
    })),
    success_patterns: [{ pattern_name: '', description: '', tags: [] }],
    kb_feedback: {
      lessons_learned: '',
      best_practices: [''],
      challenges_faced: [''],
      solutions_applied: [''],
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();

    const payload: CaseClosureRequest = {
      case_id: caseId,
      closure_date: new Date().toISOString().split('T')[0],
      ...formData,
    };

    await submitClosure(caseId, payload);
  };

  const analyzeSuccessPatterns = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/closure/patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('分析失敗');
      const data = await response.json();
      setPatterns(data);
    } catch (err) {
      resetError();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* 頭部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">案件結案</h1>
          <p className="text-slate-600">完成案件評分、知識庫回流與成功模式識別</p>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 結案成功 */}
        {closure && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-700">✅ 案件已成功結案（ID: {closure.closure_id}）</p>
          </div>
        )}

        {/* 結案表單 */}
        {!closure && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 結案狀態 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">結案狀態</h2>
              <select
                value={formData.final_status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    final_status: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
                <option value="suspended">已暫停</option>
              </select>
            </div>

            {/* 評分 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">案件評分</h2>
              <div className="space-y-4">
                {formData.scores.map((score, idx) => (
                  <div key={score.category} className="border-l-4 border-blue-500 pl-4">
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {CLOSURE_CATEGORIES.find((c) => c.id === score.category)?.label}
                    </label>
                    <div className="flex gap-4 mb-2">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={score.score}
                          onChange={(e) => {
                            const newScores = [...formData.scores];
                            newScores[idx].score = parseInt(e.target.value);
                            setFormData({ ...formData, scores: newScores });
                          }}
                          className="w-full"
                        />
                      </div>
                      <span className="text-lg font-bold text-blue-600 w-12">{score.score}</span>
                    </div>
                    <Textarea
                      placeholder="評分說明"
                      value={score.notes}
                      onChange={(e) => {
                        const newScores = [...formData.scores];
                        newScores[idx].notes = e.target.value;
                        setFormData({ ...formData, scores: newScores });
                      }}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 知識庫回流 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">知識庫回流</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">主要學習</label>
                  <Textarea
                    placeholder="本案從中獲得的主要經驗教訓"
                    value={formData.kb_feedback.lessons_learned}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kb_feedback: {
                          ...formData.kb_feedback,
                          lessons_learned: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">最佳實踐</label>
                  {formData.kb_feedback.best_practices.map((practice, idx) => (
                    <Input
                      key={idx}
                      placeholder={`最佳實踐 ${idx + 1}`}
                      value={practice}
                      onChange={(e) => {
                        const newPractices = [...formData.kb_feedback.best_practices];
                        newPractices[idx] = e.target.value;
                        setFormData({
                          ...formData,
                          kb_feedback: { ...formData.kb_feedback, best_practices: newPractices },
                        });
                      }}
                      className="mb-2"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 提交按鈕 */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '結案中...' : '完成結案'}
              </Button>
            </div>
          </form>
        )}

        {/* 結案完成後的總結 */}
        {closure && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">結案總結</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">狀態</p>
                  <p className="text-lg font-semibold text-slate-900">{closure.final_status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">結案日期</p>
                  <p className="text-lg font-semibold text-slate-900">{closure.closure_date}</p>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">評分總結</h3>
                <div className="space-y-2">
                  {closure.scores.map((score) => (
                    <div key={score.id} className="flex justify-between items-center">
                      <span className="text-slate-600">
                        {CLOSURE_CATEGORIES.find((c) => c.id === score.category)?.label}
                      </span>
                      <span className="text-lg font-semibold text-blue-600">{score.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {!patterns && (
                <Button onClick={analyzeSuccessPatterns} disabled={isAnalyzing} className="w-full mt-6">
                  {isAnalyzing ? '分析中...' : '分析成功模式'}
                </Button>
              )}
            </div>

            {/* 成功模式分析結果 */}
            {patterns && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">成功模式識別</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">識別的模式</h3>
                    <div className="space-y-3">
                      {patterns.patterns_identified?.map((pattern: any) => (
                        <div key={pattern.name} className="border-l-4 border-green-500 pl-4">
                          <p className="font-semibold text-slate-900">{pattern.name}</p>
                          <p className="text-sm text-slate-600 mt-1">{pattern.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>頻率: {pattern.frequency}x</span>
                            <span>可複製性: {pattern.replicability_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-2">關鍵成功因素</h3>
                    <div className="flex flex-wrap gap-2">
                      {patterns.key_success_factors?.map((factor: string) => (
                        <span key={factor} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-2">複製潛力: {patterns.replication_potential}%</h3>
                    <p className="text-sm text-slate-600">此案件成功經驗可應用到類似專案的程度</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-2">建議</h3>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {patterns.recommendations?.map((rec: string) => (
                        <li key={rec} className="flex gap-2">
                          <span>•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
