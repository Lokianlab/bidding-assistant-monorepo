'use client';

import { useState } from 'react';

interface DecisionPanelProps {
  caseId: string;
  currentDecision?: 'bid' | 'no_bid' | 'conditional' | null;
  onDecide: (decision: 'bid' | 'no_bid' | 'conditional', reason: string) => void;
  isSubmitting?: boolean;
}

const DECISION_OPTIONS = [
  { value: 'bid' as const, label: '投', emoji: '✅', color: 'bg-green-600 hover:bg-green-700' },
  { value: 'no_bid' as const, label: '不投', emoji: '❌', color: 'bg-red-600 hover:bg-red-700' },
  { value: 'conditional' as const, label: '有條件投', emoji: '⚠️', color: 'bg-yellow-500 hover:bg-yellow-600' },
] as const;

export function DecisionPanel({ currentDecision, onDecide, isSubmitting }: DecisionPanelProps) {
  const [selected, setSelected] = useState<'bid' | 'no_bid' | 'conditional' | null>(null);
  const [reason, setReason] = useState('');

  if (currentDecision) {
    const opt = DECISION_OPTIONS.find(o => o.value === currentDecision);
    return (
      <div className="rounded-lg border p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">決策結果</h3>
        <p className="text-lg">
          {opt?.emoji} {opt?.label}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="text-lg font-semibold">你的決定</h3>

      <div className="flex gap-3">
        {DECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
              selected === opt.value
                ? `${opt.color} ring-2 ring-offset-2 ring-blue-500`
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div>
            <label className="block text-sm text-gray-600 mb-1">理由（選填）</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              placeholder="記錄這個決定的原因..."
            />
          </div>

          <button
            onClick={() => onDecide(selected, reason)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '處理中...' : '確認決定'}
          </button>
        </>
      )}
    </div>
  );
}
