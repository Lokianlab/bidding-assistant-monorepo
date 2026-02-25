'use client';

import { useState } from 'react';

interface WinCheck {
  id: string;
  label: string;
  status: 'red' | 'yellow' | 'green' | 'unknown';
  evidence: string;
  source: string;
  auto_filled: boolean;
}

interface WinAssessmentPanelProps {
  checks: WinCheck[];
  overall: 'red' | 'yellow' | 'green' | 'unknown';
  recommendation: string;
  onUpdateCheck?: (checkId: string, status: 'red' | 'yellow' | 'green', evidence: string) => void;
}

const STATUS_EMOJI: Record<string, string> = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
  unknown: '⬜',
};

const STATUS_LABEL: Record<string, string> = {
  red: '紅燈',
  yellow: '黃燈',
  green: '綠燈',
  unknown: '未知',
};

export function WinAssessmentPanel({ checks, overall, recommendation, onUpdateCheck }: WinAssessmentPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'red' | 'yellow' | 'green'>('green');
  const [editEvidence, setEditEvidence] = useState('');

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">勝算評估</h3>
        <span className="text-lg">
          {STATUS_EMOJI[overall]} 整體：{STATUS_LABEL[overall]}
        </span>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.id} className="border rounded p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{STATUS_EMOJI[check.status]}</span>
                  <span className="font-medium">{check.label}</span>
                  {check.auto_filled && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      自動
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{check.evidence}</p>
                <p className="text-xs text-gray-400 mt-0.5">來源：{check.source}</p>
              </div>
              {!check.auto_filled && onUpdateCheck && editingId !== check.id && (
                <button
                  onClick={() => {
                    setEditingId(check.id);
                    setEditStatus(check.status === 'unknown' ? 'green' : check.status as 'red' | 'yellow' | 'green');
                    setEditEvidence(check.evidence);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  手動更新
                </button>
              )}
            </div>

            {editingId === check.id && onUpdateCheck && (
              <div className="mt-2 space-y-2 border-t pt-2">
                <div className="flex gap-2">
                  {(['green', 'yellow', 'red'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`px-2 py-1 text-xs rounded ${
                        editStatus === s ? 'bg-blue-100 border-blue-400' : 'bg-gray-50'
                      } border`}
                    >
                      {STATUS_EMOJI[s]} {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  className="w-full text-sm border rounded p-2"
                  rows={2}
                  placeholder="輸入判斷依據..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onUpdateCheck(check.id, editStatus, editEvidence);
                      setEditingId(null);
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    確認
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {recommendation && (
        <div className="bg-gray-50 rounded p-3 text-sm">
          <span className="font-medium">建議：</span>{recommendation}
        </div>
      )}
    </div>
  );
}
