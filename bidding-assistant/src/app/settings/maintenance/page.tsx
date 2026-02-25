"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { CHANGELOG } from "@/data/changelog";
import { ChangelogPanel } from "@/components/settings/ChangelogPanel";
import { DebugLogPanel } from "@/components/settings/DebugLogPanel";
import { getExcludedJobNumbers, clearExclusions, getCreatedJobNumbers, clearCreatedCases } from "@/lib/scan/exclusion";

const currentVersion = CHANGELOG[0]?.version ?? "0.0.0";

export default function MaintenancePage() {
  const { settings, resetSettings } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  useEffect(() => {
    setSkipCount(getExcludedJobNumbers().length);
    setCreatedCount(getCreatedJobNumbers().length);
  }, []);

  function exportSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidding-assistant-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("設定已匯出");
  }

  function importSettings(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          toast.error("匯入失敗：檔案內容必須是 JSON 物件");
          return;
        }
        localStorage.setItem("bidding-assistant-settings", JSON.stringify(data));
        toast.success("設定已匯入，重新整理頁面以套用");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error("匯入失敗：JSON 格式不正確");
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetSettings();
    toast.success("已還原為預設值");
    setConfirmReset(false);
  }

  function clearCache() {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("bidding-assistant")
      );
      keys.forEach((k) => localStorage.removeItem(k));
      toast.success(`已清除 ${keys.length} 個快取項目`);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">系統維護</h1>
        <p className="text-muted-foreground mt-1">系統管理、更新日誌、除錯日誌</p>
      </div>

      <Tabs defaultValue="maintenance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="maintenance">系統維護</TabsTrigger>
          <TabsTrigger value="changelog">更新日誌</TabsTrigger>
          <TabsTrigger value="debug-log">除錯日誌</TabsTrigger>
          <TabsTrigger value="guide">操作指南</TabsTrigger>
        </TabsList>

        {/* ── 系統維護 ── */}
        <TabsContent value="maintenance" className="space-y-6">
          {/* 設定備份 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">設定備份</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={exportSettings}>匯出設定（JSON）</Button>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("import-file")?.click()}
                >
                  匯入設定
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importSettings(file);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 快取管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快取管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                清除瀏覽器中的所有 bidding-assistant 相關快取資料
              </p>
              <Button variant="outline" onClick={clearCache}>
                清除快取
              </Button>
            </CardContent>
          </Card>

          {/* 巡標記憶 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">巡標記憶</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                巡標頁面的「跳過」和「建案」記憶儲存在瀏覽器中，不受上方「清除快取」影響。
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearExclusions();
                    setSkipCount(0);
                    toast.success("已清空跳過記憶");
                  }}
                >
                  清空跳過記憶（{skipCount} 筆）
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearCreatedCases();
                    setCreatedCount(0);
                    toast.success("已清空建案記憶");
                  }}
                >
                  清空建案記憶（{createdCount} 筆）
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 危險區域 */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">危險區域</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                還原所有設定為出廠預設值。此操作無法復原。
              </p>
              <Button variant="destructive" onClick={handleReset}>
                {confirmReset ? "確認還原？再按一次" : "還原預設設定"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>版本：v{currentVersion}</p>
            <p>建置框架：Next.js + shadcn/ui + Tailwind CSS</p>
          </div>
        </TabsContent>

        {/* ── 更新日誌 ── */}
        <TabsContent value="changelog">
          <ChangelogPanel />
        </TabsContent>

        {/* ── 除錯日誌 ── */}
        <TabsContent value="debug-log">
          <DebugLogPanel />
        </TabsContent>

        {/* ── 操作指南 ── */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">系統簡介</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">全能標案助理</strong>是一套整合 Notion
                資料庫的標案管理系統，涵蓋從案件追蹤、AI 提示詞組裝、績效分析到文件生成的完整工作流程。
              </p>
              <p>
                系統透過左側導覽列分為三大區塊：<Badge variant="outline">核心功能</Badge>、
                <Badge variant="outline">工具箱</Badge>、<Badge variant="outline">輸出</Badge>，
                以及底部的<Badge variant="outline">設定</Badge>區。
              </p>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="dashboard">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">🏠</span>備標指揮部（首頁）</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>追蹤所有進行中的標案，一目了然掌握投標狀況。這是系統的首頁，也是最常使用的頁面。</p>
                <p><strong className="text-foreground">資料來源：</strong>自動從 Notion 資料庫載入標案資料。如果尚未設定 Notion 連線，會使用展示模式的模擬資料。</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>順位分頁</strong>：按投遞序位分類查看標案</li>
                  <li><strong>競標階段</strong>：只看正在競標中的標案</li>
                  <li><strong>全部標案</strong>：所有案件一覽</li>
                  <li><strong>看板</strong>：以進程狀態分欄的看板檢視</li>
                  <li><strong>備標期限</strong>：以截標日期排序，顯示倒數天數</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="assembly">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">🤖</span>提示詞組裝</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>根據標案的當前階段，自動組合 AI 提示詞，搭配知識庫內容，直接複製到 ChatGPT 或 Claude 使用。</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>選擇標案和階段（L1 環境掃描 ~ L8 結案歸檔）</li>
                  <li>系統自動組合提示詞，包含相關的知識庫文件</li>
                  <li>點「複製」按鈕，貼到 AI 對話介面使用</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="case-board">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">📌</span>案件看板 &amp; 案件工作頁</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">案件看板：</strong>從 Notion 載入的案件以看板形式呈現，可按進程狀態分欄檢視。點擊任一案件可查看詳細資訊和快速操作按鈕。</p>
                <p><strong className="text-foreground">案件工作頁：</strong>單一案件的全視角頁面。一頁看完案件資訊、L1-L8 備標進度、五維適配度評分、PCC 情報摘要。</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>從案件看板點擊案件 → 側邊詳情面板</li>
                  <li>點「前往案件工作頁」進入完整工作頁</li>
                  <li>更新各階段進度，從工作頁可直接跳到戰略分析、情報搜尋、提示詞組裝</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="strategy">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">🎯</span>戰略分析</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>五維適配度評分（領域、機關、競爭、規模、團隊），幫助決定一個標案值不值得投。</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>輸入案件名稱、機關名稱、預算金額</li>
                  <li>點「開始分析」，查看五維雷達圖和總分（0-100 分）</li>
                  <li>根據評分建議決定是否投標</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="intelligence">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">🔍</span>情報搜尋（PCC 公開資料）</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>查詢政府標案公開資料，了解競爭對手和市場情況。</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>案件搜尋</strong>：用關鍵字搜尋 PCC 標案</li>
                  <li><strong>競爭分析</strong>：輸入對手公司名稱，查看歷年得標紀錄</li>
                  <li><strong>市場趨勢</strong>：搜尋特定領域的標案數量和預算趨勢</li>
                  <li><strong>評委名單</strong>：查看特定機關的採購評選委員會名單</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality-gate">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">🛡️</span>品質閘門</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>四道品質檢查，在提交建議書前確保內容品質。</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>文字品質</strong>：禁用詞、模糊量化詞、用語一致性</li>
                  <li><strong>事實查核</strong>：數字一致性、日期正確性</li>
                  <li><strong>需求對照</strong>：是否回應了招標文件的評分項目</li>
                  <li><strong>實務檢驗</strong>：履約實績是否充足、團隊資格是否符合</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scan">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">📡</span>巡標自動化</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <p><strong className="text-foreground">用途：</strong>自動掃描 PCC 最新公告，按關鍵字分類後呈現，幫助快速篩選值得投標的案件。</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>點「手動掃描」開始搜尋</li>
                  <li>系統分為「推薦」「需要看」「其他」三類</li>
                  <li>點「建案」一鍵建入 Notion 資料庫，或點「跳過」不再出現</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><span className="text-lg">💡</span>小技巧</div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-foreground">側欄收合：</strong>點擊側欄頂部的箭頭按鈕可收合側欄，增加工作區域。</li>
                  <li><strong className="text-foreground">手機版：</strong>在手機上使用時，點擊左上角的漢堡選單按鈕可開啟導覽。</li>
                  <li><strong className="text-foreground">搜尋：</strong>在備標指揮部首頁可使用搜尋欄快速找到特定標案（支援案名、機關名稱、案號搜尋）。</li>
                  <li><strong className="text-foreground">展示模式：</strong>如果未設定 Notion 連線，系統會自動使用模擬資料，方便先了解介面功能。</li>
                  <li><strong className="text-foreground">資料自動儲存：</strong>所有設定變更儲存在瀏覽器的 localStorage 中，關閉瀏覽器後也不會遺失。</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
}
