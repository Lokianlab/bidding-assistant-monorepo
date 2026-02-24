'use client';

import { useState } from 'react';

interface PerplexityPromptItem {
  round: number;
  title: string;
  prompt: string;
  purpose: string;
}

interface PerplexityResult {
  round: number;
  result: string;
  findings: string[];
  timestamp: string;
}

interface PerplexityPanelProps {
  prompts: PerplexityPromptItem[];
  results: PerplexityResult[];
  onSaveResult: (round: number, resultText: string) => void;
}

export function PerplexityPanel({ prompts, results, onSaveResult }: PerplexityPanelProps) {
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [resultText, setResultText] = useState('');
  const [copiedRound, setCopiedRound] = useState<number | null>(null);

  const getResultForRound = (round: number) =>
    results.find(r => r.round === round);

  const handleCopy = async (prompt: string, round: number) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedRound(round);
    setTimeout(() => setCopiedRound(null), 2000);
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="text-lg font-semibold">Perplexity 調查</h3>

      <div className="space-y-3">
        {prompts.map((p) => {
          const result = getResultForRound(p.round);
          const isEditing = activeRound === p.round;

          return (
            <div key={p.round} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">第 {p.round} 輪：{p.title}</span>
                  <p className="text-xs text-gray-500">{p.purpose}</p>
                </div>
                <span className="text-sm">
                  {result ? '✅ 已貼回' : '⬜ 未執行'}
                </span>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => handleCopy(p.prompt, p.round)}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                >
                  {copiedRound === p.round ? '已複製！' : '複製提示詞'}
                </button>
                {!result && (
                  <button
                    onClick={() => {
                      setActiveRound(isEditing ? null : p.round);
                      setResultText('');
                    }}
                    className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                  >
                    {isEditing ? '收起' : '貼回結果'}
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <textarea
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    className="w-full text-sm border rounded p-2"
                    rows={8}
                    placeholder="在 Perplexity 跑完後，複製結果貼到這裡..."
                  />
                  <button
                    onClick={() => {
                      if (resultText.trim()) {
                        onSaveResult(p.round, resultText);
                        setActiveRound(null);
                        setResultText('');
                      }
                    }}
                    disabled={!resultText.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    儲存結果
                  </button>
                </div>
              )}

              {result && (
                <div className="mt-2 bg-green-50 rounded p-2 text-sm">
                  <p className="text-xs text-gray-500 mb-1">
                    已於 {new Date(result.timestamp).toLocaleString('zh-TW')} 貼回
                  </p>
                  <p className="line-clamp-3">{result.result}</p>
                  {result.findings.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs font-medium">關鍵發現：</span>
                      <ul className="text-xs list-disc list-inside">
                        {result.findings.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
