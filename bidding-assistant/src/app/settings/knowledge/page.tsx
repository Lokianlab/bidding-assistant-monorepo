'use client';

import { useState, useEffect } from 'react';

interface IndexStatusData {
  total_cards: number;
  total_files: number;
  last_indexed: string | null;
  scan_errors: number;
}

interface InitProgress {
  total_files: number;
  processed_files: number;
  total_cards: number;
  errors: string[];
  status: string;
  started_at: string;
  current_file?: string;
}

export default function KnowledgeSettingsPage() {
  const [status, setStatus] = useState<IndexStatusData | null>(null);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ new_cards: number; updated_cards: number } | null>(null);

  useEffect(() => {
    fetch('/api/knowledge/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  // 輪詢初始化進度
  useEffect(() => {
    if (!isInitializing) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/knowledge/initialize');
        const data = await res.json();
        setInitProgress(data);
        if (data.status === 'done' || data.status === 'error' || data.status === 'idle') {
          setIsInitializing(false);
          // 重新載入狀態
          fetch('/api/knowledge/status').then(r => r.json()).then(setStatus);
        }
      } catch {
        // 忽略
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isInitializing]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitProgress(null);
    try {
      await fetch('/api/knowledge/initialize', { method: 'POST' });
    } catch {
      setIsInitializing(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/knowledge/update', { method: 'POST' });
      const data = await res.json();
      setUpdateResult(data);
      // 重新載入狀態
      const statusRes = await fetch('/api/knowledge/status');
      setStatus(await statusRes.json());
    } catch {
      // 忽略
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">知識庫設定</h1>

      {/* 索引狀態 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">索引狀態</h3>
        {status ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">已索引卡片：</span>
              <span className="font-medium">{status.total_cards} 張</span>
            </div>
            <div>
              <span className="text-gray-500">已索引檔案：</span>
              <span className="font-medium">{status.total_files} 個</span>
            </div>
            <div>
              <span className="text-gray-500">最後更新：</span>
              <span className="font-medium">
                {status.last_indexed
                  ? new Date(status.last_indexed).toLocaleString('zh-TW')
                  : '尚未索引'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">解析錯誤：</span>
              <span className="font-medium">{status.scan_errors} 個</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">載入中...</p>
        )}
      </div>

      {/* 初始化進度 */}
      {initProgress && isInitializing && (
        <div className="rounded-lg border p-4 bg-blue-50">
          <h3 className="text-sm font-semibold mb-2">初始化進行中...</h3>
          <div className="text-sm space-y-1">
            <div>進度：{initProgress.processed_files} / {initProgress.total_files} 檔案</div>
            <div>已生成：{initProgress.total_cards} 張卡片</div>
            {initProgress.current_file && <div>正在處理：{initProgress.current_file}</div>}
            {initProgress.errors.length > 0 && (
              <div className="text-red-600">錯誤：{initProgress.errors.length} 個</div>
            )}
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${initProgress.total_files > 0
                    ? (initProgress.processed_files / initProgress.total_files * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 更新結果 */}
      {updateResult && (
        <div className="rounded-lg border p-3 bg-green-50 text-sm">
          增量更新完成：新增 {updateResult.new_cards} 張，更新 {updateResult.updated_cards} 張
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <button
          onClick={handleUpdate}
          disabled={isUpdating || isInitializing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {isUpdating ? '更新中...' : '索引新檔案'}
        </button>
        <button
          onClick={handleInitialize}
          disabled={isInitializing}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
        >
          {isInitializing ? '初始化中...' : '重新全部索引'}
        </button>
      </div>

      {/* 說明 */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>索引範圍由環境變數 GOOGLE_KB_FOLDER_IDS 控制（需 Jin 設定）</p>
        <p>全部索引需要數小時，可以邊建索引邊使用已完成的部分</p>
      </div>
    </div>
  );
}
