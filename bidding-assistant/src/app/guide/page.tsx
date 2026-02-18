"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-3 pl-8">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 text-sm">
      <span className="font-medium text-blue-700 dark:text-blue-400">提示：</span>{" "}
      {children}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">系統操作指南</h1>
        <p className="text-muted-foreground mt-2">
          全能標案助理使用指南 — 快速了解系統每個功能的用途和操作方式
        </p>
      </div>

      {/* 快速概覽 */}
      <Card className="mb-6">
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
          <p>
            以下逐一說明各功能的用途與操作方式。點擊各區標題可展開詳細說明。
          </p>
        </CardContent>
      </Card>

      {/* 功能說明 */}
      <Accordion type="multiple" className="space-y-2">
        {/* 1. 備標指揮部 */}
        <Section icon="🏠" title="備標指揮部（首頁）">
          <p>
            <strong className="text-foreground">用途：</strong>
            追蹤所有進行中的標案，一目了然掌握投標狀況。這是系統的首頁，也是最常使用的頁面。
          </p>
          <p>
            <strong className="text-foreground">資料來源：</strong>
            自動從 Notion 資料庫載入標案資料。如果尚未設定 Notion 連線，會使用展示模式的模擬資料。
          </p>
          <p>
            <strong className="text-foreground">檢視模式：</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>順位分頁</strong>（第一/第二/第三順位）：按投遞序位分類查看標案</li>
            <li><strong>競標階段</strong>：只看正在競標中的標案</li>
            <li><strong>已出席簡報</strong>：只看已進行簡報的標案</li>
            <li><strong>全部標案</strong>：所有案件一覽</li>
            <li><strong>看板</strong>：以進程狀態分欄的看板檢視（類似 Trello）</li>
            <li><strong>備標期限</strong>：以截標日期排序，顯示倒數天數</li>
          </ul>
          <p>
            <strong className="text-foreground">KPI 卡片說明：</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>當前全部標案</strong>：目前列表中的標案總數</li>
            <li><strong>全部標案預算總額</strong>：所有標案的預算加總</li>
            <li><strong>得標預算總額</strong>：進程為「得標」狀態的案件預算加總</li>
            <li><strong>得標率</strong>：得標件數 ÷ 已投標件數（包含投標完成、得標、未得標等狀態）</li>
            <li><strong>競標階段預算</strong>：進程為「投標完成」或「簡報出席」的案件預算加總</li>
            <li><strong>年度投標件數</strong>：今年度已投標（含得標/未得標）的案件數</li>
            <li><strong>年度目標達成率</strong>：得標預算 ÷ 年度目標金額</li>
            <li><strong>本月/本週投標</strong>：當月/當週提交投標的案件數</li>
            <li><strong>投入成本</strong>：押標金 + 領標費的合計，可選時段（全部/本年/本月/本週）</li>
          </ul>
          <Tip>
            點擊目標卡片上的「設定」或「改」連結，可即時設定年度目標金額、月目標、週目標件數。
          </Tip>
        </Section>

        {/* 2. 提示詞組裝 */}
        <Section icon="🤖" title="提示詞組裝">
          <p>
            <strong className="text-foreground">用途：</strong>
            根據標案的當前階段，自動組合 AI 提示詞（System Prompt + User Prompt），搭配知識庫內容，直接複製到 ChatGPT 或 Claude 使用。
          </p>
          <p>
            <strong className="text-foreground">操作步驟：</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>選擇標案（從 Notion 載入的案件清單中選取）</li>
            <li>選擇階段（L1 環境掃描 ~ L8 結案歸檔）</li>
            <li>系統自動組合提示詞，包含相關的知識庫文件</li>
            <li>點「複製」按鈕，貼到 AI 對話介面使用</li>
          </ol>
          <Tip>
            可在「設定 → 提示詞編輯器」中自訂各階段的提示詞模板，也可以新增自訂階段。
          </Tip>
        </Section>

        {/* 3. 績效檢視 */}
        <Section icon="📊" title="績效檢視">
          <p>
            <strong className="text-foreground">用途：</strong>
            查看投標績效統計與趨勢分析，了解歷史得標情況。
          </p>
          <p>
            <strong className="text-foreground">功能包含：</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>投標趨勢圖</strong>：按月顯示投標和得標件數走勢</li>
            <li><strong>標案類型分析</strong>：各評審方式（最有利標、評分及格最低標等）的分布</li>
            <li><strong>團隊工作量</strong>：各團隊成員的投標參與狀況</li>
          </ul>
          <Tip>
            支援按年份篩選，可查看不同年度的績效表現。
          </Tip>
        </Section>

        {/* 4. 工具箱 */}
        <Section icon="🧰" title="工具箱（知識庫、報價驗算、品質檢查）">
          <p>
            <strong className="text-foreground">知識庫管理：</strong>
            管理公司的標案知識文件（公司簡介、實績、團隊資料等），這些文件會在提示詞組裝時自動帶入。
          </p>
          <p>
            <strong className="text-foreground">報價驗算：</strong>
            輸入工作項目和費率，自動計算含稅報價。使用設定中的營業稅率和管理費費率參數。
          </p>
          <p>
            <strong className="text-foreground">品質檢查：</strong>
            對文件內容進行品質檢查，包括禁用詞偵測、用語修正建議、數字一致性驗證等。
          </p>
          <Tip>
            可在「設定 → 功能模組管理」中開關各工具，關閉後不會出現在側欄。
          </Tip>
        </Section>

        {/* 5. 文件生成 */}
        <Section icon="📄" title="文件生成">
          <p>
            <strong className="text-foreground">用途：</strong>
            將各階段 AI 產出的內容組合成 DOCX 格式的建議書文件。
          </p>
          <p>
            <strong className="text-foreground">操作方式：</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>輸入案名</li>
            <li>在各章節中貼入 AI 產出的內容（或手動撰寫）</li>
            <li>可新增、刪除、調整章節</li>
            <li>選擇輸出格式（DOCX / PDF）</li>
            <li>點「生成」按鈕輸出文件</li>
          </ol>
          <Tip>
            文件的字型、字級、頁面格式等可在「設定 → 輸出文件設定」中調整。
          </Tip>
        </Section>

        {/* 6. 設定說明 */}
        <Section icon="⚙️" title="設定">
          <p>系統設定分為以下幾個區塊：</p>

          <div className="space-y-4 mt-2">
            <div>
              <p className="font-medium text-foreground">輸出文件設定</p>
              <p>
                設定 DOCX 輸出的字型（可從下拉選單選擇或新增自訂字型）、字級、紙張大小、邊距、行距、頁首/頁尾範本等。
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">外部連線</p>
              <p>
                填入 Notion API Token 和 Database ID，讓系統能從 Notion 讀取標案資料。
                也可設定 Google Drive 連線，用於自動同步文件。
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">公司資訊</p>
              <p>設定公司名稱、統一編號、品牌（大員洛川 / 鹿山文社）。</p>
            </div>

            <div>
              <p className="font-medium text-foreground">功能模組管理</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>功能開關</strong>：開啟或關閉各功能模組，關閉後不會出現在側欄</li>
                <li><strong>欄位對照</strong>：對應 Notion 資料庫的欄位名稱（如果你的 Notion 欄位名稱不同於預設值）</li>
                <li><strong>知識庫矩陣</strong>：設定每個 AI 階段需要搭配哪些知識庫文件</li>
                <li><strong>品質規則</strong>：管理禁用詞清單、用語修正對照表、鐵律檢查開關</li>
                <li><strong>報價參數</strong>：設定營業稅率、管理費費率</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground">工作流程</p>
              <p>
                自訂 AI 八階段（L1~L8）的名稱和觸發指令，設定自動狀態規則（例如：完成某階段後自動更新 Notion 進程狀態）。
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">提示詞編輯器</p>
              <p>
                編輯每個 AI 階段的 System Prompt 和 User Prompt 模板。可以新增自訂階段、複製現有階段、刪除自訂階段。
                修改後會儲存在瀏覽器中，重新整理頁面也不會遺失。
              </p>
            </div>
          </div>
        </Section>

        {/* 7. 快捷鍵 & 小技巧 */}
        <Section icon="💡" title="小技巧">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">側欄收合：</strong>
              點擊側欄頂部的箭頭按鈕可收合側欄，增加工作區域。
            </li>
            <li>
              <strong className="text-foreground">手機版：</strong>
              在手機上使用時，點擊左上角的漢堡選單按鈕可開啟導覽。
            </li>
            <li>
              <strong className="text-foreground">搜尋：</strong>
              在備標指揮部首頁可使用搜尋欄快速找到特定標案（支援案名、機關名稱、案號搜尋）。
            </li>
            <li>
              <strong className="text-foreground">排序：</strong>
              在標案列表中，點擊表頭的欄位名稱可進行排序（截標日、預算等）。
            </li>
            <li>
              <strong className="text-foreground">展示模式：</strong>
              如果未設定 Notion 連線，系統會自動使用模擬資料，方便先了解介面功能。
            </li>
            <li>
              <strong className="text-foreground">資料自動儲存：</strong>
              所有設定變更儲存在瀏覽器的 localStorage 中，關閉瀏覽器後也不會遺失（但清除瀏覽器資料會重置）。
            </li>
          </ul>
        </Section>
      </Accordion>

      {/* 底部 */}
      <div className="mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
        全能標案助理 v1.0.0 — 大員洛川顧問有限公司
      </div>
    </div>
  );
}
