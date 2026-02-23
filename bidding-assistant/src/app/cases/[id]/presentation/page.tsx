// M08 評選簡報生成頁面

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TEMPLATES = [
  { id: 'engineering', label: '工程簡報', icon: '🏗️' },
  { id: 'consulting', label: '顧問簡報', icon: '📊' },
  { id: 'software', label: '軟體簡報', icon: '💻' },
];

export default function PresentationPage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPresentation, setGeneratedPresentation] = useState<any>(null);

  const handleGeneratePresentation = async () => {
    if (!selectedTemplate) {
      setError('請選擇簡報模板');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/presentation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: selectedTemplate,
          case_data: {
            case_id: caseId,
            template_type: selectedTemplate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('簡報生成失敗');
      }

      const result = await response.json();
      setGeneratedPresentation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '簡報生成失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* 頭部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">評選簡報生成</h1>
          <p className="text-slate-600">選擇簡報模板，自動生成專業評選簡報</p>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 簡報已生成 */}
        {generatedPresentation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-700">✅ 簡報已生成（ID: {generatedPresentation.presentation_id}）</p>
          </div>
        )}

        {/* 模板選擇 */}
        {!generatedPresentation && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">選擇簡報模板</h2>
              <div className="grid grid-cols-3 gap-4">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <div className="font-semibold text-slate-900">{template.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成按鈕 */}
            <Button
              onClick={handleGeneratePresentation}
              disabled={loading || !selectedTemplate}
              className="w-full"
              size="lg"
            >
              {loading ? '生成中...' : '生成簡報'}
            </Button>
          </>
        )}

        {/* 簡報預覽 */}
        {generatedPresentation && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">簡報內容</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">簡報 ID</p>
                <p className="font-mono text-slate-900">{generatedPresentation.presentation_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">幻燈片數量</p>
                <p className="text-lg font-semibold text-slate-900">
                  {generatedPresentation.slides?.length || 0} 張
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">幻燈片清單</p>
                <div className="space-y-2">
                  {generatedPresentation.slides?.map((slide: any, idx: number) => (
                    <div key={slide.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <p className="font-medium text-slate-900">{idx + 1}. {slide.title}</p>
                      <p className="text-sm text-slate-600">相關度: {Math.round(slide.relevance * 100)}%</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {slide.speaker_notes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Button
                onClick={() => setGeneratedPresentation(null)}
                variant="outline"
                className="flex-1"
              >
                重新生成
              </Button>
              <Button className="flex-1">下載簡報（待集成）</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
