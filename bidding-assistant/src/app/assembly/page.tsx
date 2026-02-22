"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  PROMPT_FILES,
  RULE_MAP,
  FILE_MAP,
} from "@/data/config/prompt-assembly";
import { STAGES } from "@/data/config/stages";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { renderKBToMarkdown } from "@/lib/knowledge-base/helpers";
import type { KBId } from "@/lib/knowledge-base/types";
import {
  estimateTokens,
  formatKB,
  buildFilename,
  computeFileList,
  computeActiveFiles,
  assembleContent,
} from "@/lib/assembly/helpers";

/** 知識庫 ID 集合，用於判斷某個檔案是否為知識庫 */
const KB_FILE_IDS = new Set<string>(["00A", "00B", "00C", "00D", "00E"]);

// ====== 主頁面 ======
export default function AssemblyPage() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") || "L1";
  const [selectedStage, setSelectedStage] = useState(
    STAGES.some((s) => s.id === initialStage) ? initialStage : "L1"
  );
  // 檔案內容快取：id → content
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  // 載入中的檔案
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  // 使用者手動勾選/取消的 optional KB
  const [optionalToggles, setOptionalToggles] = useState<Record<string, boolean>>({});
  // 案件唯一碼（只填數字部份）
  const [bidCode, setBidCode] = useState("");
  // 預覽中的檔案 id（null = 沒有預覽）
  const [previewId, setPreviewId] = useState<string | null>(null);
  // 組裝結果
  const [assembled, setAssembled] = useState<string>("");
  const [showResult, setShowResult] = useState(false);

  // 知識庫資料庫
  const { data: kbData, hydrated: kbHydrated } = useKnowledgeBase();

  // 追蹤哪些知識庫使用了資料庫內容（用於顯示指標）
  const [kbSources, setKbSources] = useState<Record<string, "db" | "file">>({});

  const rule = RULE_MAP[selectedStage];

  // 計算各知識庫的啟用條目數
  const kbActiveCount = useMemo(() => {
    if (!kbHydrated) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    for (const kbId of KB_FILE_IDS) {
      const entries = kbData[kbId as KBId] as Array<{ entryStatus: string }>;
      result[kbId] = entries.filter((e) => e.entryStatus === "active").length;
    }
    return result;
  }, [kbData, kbHydrated]);

  // 根據當前階段，計算需要載入的檔案清單
  const fileList = useMemo(() => computeFileList(rule), [rule]);

  // 計算最終要載入的檔案（required + 使用者勾選的 optional + 手動加入的）
  const activeFiles = useMemo(
    () => computeActiveFiles(fileList, optionalToggles, selectedStage),
    [fileList, optionalToggles, selectedStage]
  );

  // 載入單個檔案（知識庫優先從 DB 載入，fallback 到靜態檔案）
  const loadFile = useCallback(async (fileId: string) => {
    if (fileContents[fileId]) return fileContents[fileId];
    const f = FILE_MAP[fileId];
    if (!f) return "";

    // 知識庫檔案（00A-00E）：優先從資料庫生成
    if (KB_FILE_IDS.has(fileId) && kbHydrated) {
      const kbId = fileId as KBId;
      const entries = kbData[kbId] as Array<{ entryStatus: string }>;
      const activeCount = entries.filter((e) => e.entryStatus === "active").length;

      if (activeCount > 0) {
        // 從資料庫動態生成 markdown
        const markdown = renderKBToMarkdown(kbId, kbData);
        setFileContents((prev) => ({ ...prev, [fileId]: markdown }));
        setKbSources((prev) => ({ ...prev, [fileId]: "db" }));
        return markdown;
      }
      // 資料庫為空，fallback 到靜態檔案
    }

    setLoadingFiles((prev) => new Set(prev).add(fileId));
    try {
      const res = await fetch(`/api/prompts?file=${encodeURIComponent(f.filename)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setFileContents((prev) => ({ ...prev, [fileId]: text }));
      if (KB_FILE_IDS.has(fileId)) {
        setKbSources((prev) => ({ ...prev, [fileId]: "file" }));
      }
      return text;
    } catch {
      toast.error(`無法載入 ${f.label}`);
      return "";
    } finally {
      setLoadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  }, [fileContents, kbData, kbHydrated]);

  // 切換 optional KB
  function toggleOptional(fileId: string) {
    const key = `${selectedStage}-${fileId}`;
    setOptionalToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 預覽檔案（點一下開、再點一下關）
  async function handlePreview(fileId: string) {
    if (previewId === fileId) {
      setPreviewId(null);
      return;
    }
    // 如果還沒載入過，先載入
    if (!fileContents[fileId]) {
      await loadFile(fileId);
    }
    setPreviewId(fileId);
  }

  // 切換階段時重置結果與預覽
  useEffect(() => {
    setShowResult(false);
    setAssembled("");
    setPreviewId(null);
  }, [selectedStage]);

  // 知識庫資料變更時，清除已快取的 KB 內容（讓下次重新生成）
  useEffect(() => {
    if (!kbHydrated) return;
    setFileContents((prev) => {
      const updated = { ...prev };
      for (const kbId of KB_FILE_IDS) {
        delete updated[kbId];
      }
      return updated;
    });
  }, [kbData, kbHydrated]);

  // 執行組裝
  async function handleAssemble() {
    // 先載入尚未快取的檔案
    const updatedContents = { ...fileContents };
    for (const item of activeFiles) {
      if (!updatedContents[item.file.id]) {
        const content = await loadFile(item.file.id);
        if (content) updatedContents[item.file.id] = content;
      }
    }

    const result = assembleContent(activeFiles, updatedContents);
    setAssembled(result);
    setShowResult(true);

    const totalSize = new Blob([result]).size;
    const tokens = estimateTokens(result);
    toast.success(
      `組裝完成：${activeFiles.length} 個檔案，約 ${formatKB(totalSize)}，~${tokens.toLocaleString()} tokens`
    );
  }

  // 複製到剪貼簿
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(assembled);
      toast.success("已複製到剪貼簿！可以直接貼到 Claude");
    } catch {
      toast.error("複製失敗，請手動選取複製");
    }
  }

  // 下載檔案
  function handleDownload(ext: "md" | "txt") {
    const filename = buildFilename(selectedStage, bidCode, ext);
    const blob = new Blob([assembled], { type: "text/plain; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下載 ${filename}`);
  }

  // 統計數字
  const totalTokens = estimateTokens(assembled);
  const activeCount = activeFiles.length;

  // 不在矩陣中的檔案（可手動加入）
  const extraFiles = PROMPT_FILES.filter(
    (f) => !fileList.some((item) => item.file.id === f.id)
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* 頂部標題 */}
      <div className="mb-6 flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">提示詞組裝引擎</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            選擇階段 → 自動選取需要的檔案 → 一鍵複製到 Claude
          </p>
        </div>
      </div>

      {/* 案件上下文（從戰略分析頁帶過來） */}
      {searchParams.get("caseName") && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
          <div className="flex-1 min-w-0">
            <span className="font-medium">{searchParams.get("caseName")}</span>
            {searchParams.get("agency") && (
              <span className="text-muted-foreground ml-2">
                {searchParams.get("agency")}
              </span>
            )}
          </div>
          {searchParams.get("verdict") && searchParams.get("total") && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
              searchParams.get("verdict") === "建議投標"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : searchParams.get("verdict") === "值得評估"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : searchParams.get("verdict") === "不建議"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              {searchParams.get("verdict")} {searchParams.get("total")}/100
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ====== 左欄：階段選擇 ====== */}
        <div className="space-y-3">
          {/* 案件唯一碼 */}
          <Card>
            <CardContent className="pt-4">
              <label className="text-xs font-medium text-muted-foreground">
                案件唯一碼（選填）
              </label>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-sm text-muted-foreground whitespace-nowrap">BID-</span>
                <Input
                  value={bidCode}
                  onChange={(e) => setBidCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="00123"
                  className="font-mono text-sm h-8"
                  maxLength={7}
                />
              </div>
              {bidCode.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  檔名前綴：[BID-{bidCode.trim().padStart(5, "0")}]
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">選擇階段</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">投標階段</p>
                <div className="space-y-1">
                  {STAGES.filter((s) => s.phase === "投標").map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStage(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedStage === s.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-mono text-xs font-bold opacity-70 mr-2">{s.id}</span>
                      <span className="font-medium">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">評選階段</p>
                <div className="space-y-1">
                  {STAGES.filter((s) => s.phase === "評選").map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStage(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedStage === s.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-mono text-xs font-bold opacity-70 mr-2">{s.id}</span>
                      <span className="font-medium">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 使用提示 */}
          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">使用方式</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>左邊選擇你要做的階段</li>
                <li>中間確認要載入的檔案</li>
                <li>按「組裝提示詞」</li>
                <li>按「複製到剪貼簿」</li>
                <li>到 Claude 開新對話，貼上</li>
                <li>再貼上招標文件，輸入觸發指令</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* ====== 中欄：檔案清單 ====== */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {STAGES.find((s) => s.id === selectedStage)?.name} — 載入 {activeCount} 個檔案
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 引導說明 */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5 space-y-1">
                <p>✅ 打勾的檔案會自動載入，不需要動</p>
                <p>○ 圓圈的是選擇性檔案，看需要再點選</p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  🗃️ 知識庫有資料時自動使用最新內容，無資料時使用預設範本
                </p>
              </div>

              {/* 自動載入 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  自動載入（不需動）
                </p>
                {fileList
                  .filter((item) => item.auto)
                  .map((item) => (
                    <div key={item.file.id}>
                      <button
                        onClick={() => handlePreview(item.file.id)}
                        className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-left flex-1">
                          {item.file.label}
                          {KB_FILE_IDS.has(item.file.id) && kbActiveCount[item.file.id] > 0 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              資料庫 {kbActiveCount[item.file.id]} 筆
                            </span>
                          )}
                          {KB_FILE_IDS.has(item.file.id) && kbActiveCount[item.file.id] === 0 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              靜態檔案
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {previewId === item.file.id ? "收起 ▲" : "預覽 ▼"}
                        </span>
                      </button>
                      {previewId === item.file.id && (
                        <div className="mx-2 mb-2 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                          {loadingFiles.has(item.file.id)
                            ? "載入中..."
                            : fileContents[item.file.id]
                              ? fileContents[item.file.id].slice(0, 1500) + (fileContents[item.file.id].length > 1500 ? "\n\n... (僅顯示前 1500 字)" : "")
                              : "無內容"}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* 選擇性載入 */}
              {fileList.some((item) => item.ref === "optional") && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      可選擇加入（點一下開/關）
                    </p>
                    {fileList
                      .filter((item) => item.ref === "optional")
                      .map((item) => {
                        const key = `${selectedStage}-${item.file.id}`;
                        const isOn = optionalToggles[key] ?? false;
                        return (
                          <div key={item.file.id}>
                            <div className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
                              isOn ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
                            }`}>
                              <button
                                onClick={() => toggleOptional(item.file.id)}
                                className={`text-sm ${isOn ? "text-blue-500" : "text-muted-foreground"}`}
                              >
                                {isOn ? "✓" : "○"}
                              </button>
                              <button
                                onClick={() => handlePreview(item.file.id)}
                                className="text-sm text-left flex-1"
                              >
                                {item.file.label}
                                {KB_FILE_IDS.has(item.file.id) && kbActiveCount[item.file.id] > 0 && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    資料庫 {kbActiveCount[item.file.id]} 筆
                                  </span>
                                )}
                                {KB_FILE_IDS.has(item.file.id) && kbActiveCount[item.file.id] === 0 && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    靜態檔案
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => handlePreview(item.file.id)}
                                className="text-[10px] text-muted-foreground"
                              >
                                {previewId === item.file.id ? "收起 ▲" : "預覽 ▼"}
                              </button>
                            </div>
                            {previewId === item.file.id && (
                              <div className="mx-2 mb-2 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                                {loadingFiles.has(item.file.id)
                                  ? "載入中..."
                                  : fileContents[item.file.id]
                                    ? fileContents[item.file.id].slice(0, 1500) + (fileContents[item.file.id].length > 1500 ? "\n\n... (僅顯示前 1500 字)" : "")
                                    : "無內容"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {/* 手動加入其他檔案 */}
              {extraFiles.length > 0 && (
                <>
                  <Separator />
                  <details className="group">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer mb-2">
                      手動加入其他檔案 ▸
                    </summary>
                    <div className="mt-1 space-y-0.5">
                      {extraFiles.map((f) => {
                        const key = `${selectedStage}-${f.id}`;
                        const isOn = optionalToggles[key] ?? false;
                        return (
                          <div key={f.id}>
                            <div className={`flex items-center gap-2 py-1 px-2 rounded text-sm transition-colors ${
                              isOn ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
                            }`}>
                              <button
                                onClick={() => toggleOptional(f.id)}
                                className={isOn ? "text-blue-500" : "text-muted-foreground"}
                              >
                                {isOn ? "✓" : "○"}
                              </button>
                              <button
                                onClick={() => handlePreview(f.id)}
                                className="text-left flex-1"
                              >
                                {f.label}
                              </button>
                              <button
                                onClick={() => handlePreview(f.id)}
                                className="text-[10px] text-muted-foreground"
                              >
                                {previewId === f.id ? "▲" : "▼"}
                              </button>
                            </div>
                            {previewId === f.id && (
                              <div className="mx-2 mb-1 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                                {loadingFiles.has(f.id)
                                  ? "載入中..."
                                  : fileContents[f.id]
                                    ? fileContents[f.id].slice(0, 1500) + (fileContents[f.id].length > 1500 ? "\n\n... (僅顯示前 1500 字)" : "")
                                    : "無內容"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </>
              )}
            </CardContent>
          </Card>

          {/* 組裝按鈕 */}
          <Button
            className="w-full h-12 text-base font-bold"
            onClick={handleAssemble}
            disabled={loadingFiles.size > 0}
          >
            {loadingFiles.size > 0
              ? `載入中 (${loadingFiles.size})...`
              : `組裝提示詞（${activeCount} 個檔案）`}
          </Button>
        </div>

        {/* ====== 右欄：結果 ====== */}
        <div className="space-y-3">
          {showResult ? (
            <>
              {/* 統計 */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold">{activeCount}</p>
                      <p className="text-xs text-muted-foreground">檔案數</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {formatKB(new Blob([assembled]).size)}
                      </p>
                      <p className="text-xs text-muted-foreground">總大小</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${
                        totalTokens > 100000
                          ? "text-red-500"
                          : totalTokens > 60000
                          ? "text-amber-500"
                          : "text-green-500"
                      }`}>
                        ~{(totalTokens / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-muted-foreground">預估 tokens</p>
                    </div>
                  </div>

                  {totalTokens > 100000 && (
                    <p className="text-xs text-red-500 mt-3 text-center">
                      ⚠️ 超過 100k tokens，可能超出 Claude 限制。建議取消部分選擇性檔案。
                    </p>
                  )}
                  {totalTokens > 60000 && totalTokens <= 100000 && (
                    <p className="text-xs text-amber-500 mt-3 text-center">
                      ⚠️ 接近上限，留給招標文件和對話的空間有限。
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 複製按鈕 */}
              <Button
                className="w-full h-12 text-base font-bold"
                variant="default"
                onClick={handleCopy}
              >
                📋 複製到剪貼簿
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => handleDownload("md")}
                >
                  ⬇️ 下載 .md
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => handleDownload("txt")}
                >
                  ⬇️ 下載 .txt
                </Button>
              </div>

              {/* 載入的檔案明細 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">已載入檔案</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {activeFiles.map((item) => {
                    const content = fileContents[item.file.id] || "";
                    const tokens = estimateTokens(content);
                    const bytes = new Blob([content]).size;
                    const source = kbSources[item.file.id];
                    return (
                      <div
                        key={item.file.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <span className="flex items-center gap-1">
                          {item.file.label}
                          {source === "db" && (
                            <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px]">
                              DB
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {formatKB(bytes)} / ~{(tokens / 1000).toFixed(1)}k
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* 下一步提示 */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-bold">下一步</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>到 Claude 網頁版，開<strong>新對話</strong></li>
                    <li>
                      貼上剛才複製的提示詞
                    </li>
                    <li>上傳招標文件（PDF）</li>
                    <li>
                      輸入觸發指令：
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">
                        {STAGES.find((s) => s.id === selectedStage)?.triggerCommand}
                      </code>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </>
          ) : (
            /* 尚未組裝的空狀態 */
            <Card className="h-full min-h-[300px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <p className="text-4xl mb-3">🔧</p>
                <p className="font-medium">選好階段和檔案後</p>
                <p className="text-sm">按「組裝提示詞」開始</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
