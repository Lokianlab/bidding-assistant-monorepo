'use client';

import { useState, useCallback } from 'react';

interface RFPSummary {
  title: string;
  budget: number;
  deadline: string;
  award_method: string;
  scoring_items: { item: string; weight: number; description: string }[];
  key_requirements: string[];
  hidden_needs: string[];
  qualification_requirements: string[];
}

interface RFPUploadProps {
  caseId: string;
  existingSummary?: RFPSummary | null;
}

export function RFPUpload({ caseId, existingSummary }: RFPUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<RFPSummary | null>(existingSummary ?? null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);

      const res = await fetch('/api/intelligence/rfp', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '上傳失敗');
      }

      if (data.rfp_summary) {
        setSummary(data.rfp_summary);
      } else {
        setError('無法解析檔案內容');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setIsUploading(false);
    }
  }, [caseId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="text-lg font-semibold">RFP 招標文件</h3>

      {!summary && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
        >
          {isUploading ? (
            <p className="text-gray-600">解析中...</p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">拖曳 PDF 或 DOCX 到這裡</p>
              <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                或點擊選擇檔案
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={onFileSelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {summary && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">決標方式：</span>{summary.award_method}</div>
              <div><span className="text-gray-500">預算：</span>{summary.budget ? `${(summary.budget / 10000).toFixed(0)} 萬元` : '未知'}</div>
            </div>
          </div>

          {summary.scoring_items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">評分項目</h4>
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border">項目</th>
                    <th className="text-right p-2 border w-16">權重</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.scoring_items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{item.item}</td>
                      <td className="p-2 border text-right">{item.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.key_requirements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">重點需求</h4>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {summary.key_requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            </div>
          )}

          {summary.hidden_needs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">AI 推斷的隱藏需求</h4>
              <ul className="text-sm list-disc list-inside space-y-0.5 text-amber-700">
                {summary.hidden_needs.map((need, i) => <li key={i}>{need}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={() => setSummary(null)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            重新上傳
          </button>
        </div>
      )}
    </div>
  );
}
