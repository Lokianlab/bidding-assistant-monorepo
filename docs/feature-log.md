# 功能日誌

所有機器寫的程式碼，一功能一行。
格式：`功能 | 實作者 | 路徑/範圍 | 說明 | Tests | 狀態`
狀態：`✅ 完成` / `✅ Jin驗收` / `🔄 待驗收` / `⏳ 進行中` / `❌ 放棄`

更新規則：新功能完成時 append，不改舊行（改了在末尾加備註行）。

---

## Web App 主功能

| 功能 | 實作者 | 路徑 | 說明 | Tests | 狀態 |
|------|--------|------|------|-------|------|
| PCC 情報搜尋 (M01) | ITEJ | `src/app/intelligence/` | 搜尋 + 詳情 + 機關情報 + 競爭分析 + P偵察 + 市場趨勢，4 tab 跨 tab 導航 | 1132 | ✅ Jin驗收 |
| 戰略分析引擎 (M03) | A44T | `src/app/strategy/` | 5 維適配度評分（技術/規模/競爭/財務/時程）+ 雷達圖 UI | 82 | ✅ Jin驗收 |
| 品質閘門 (M04) | Z1FV | `src/app/quality-gate/` `src/lib/quality-gate/` | 四道閘門（合規/品質/財務/實績）+ 驗收報告 + UI + Hook | 114 | ✅ Jin驗收 |
| 排版輸出 (M06 Phase 1-3) | Z1FV | `src/app/tools/output/` | 文件組裝管線 + 範本系統 + KB 佔位符注入 + 列印/PDF 匯出 | 96 | ✅ 完成 |
| 案件工作頁 | A44T | `src/app/case-work/` | 案件資訊 + L1-L8 備標進度 + 自動 M03 評分 + PCC 情報摘要 | — | ✅ 完成 |
| 自訂儀表板 | A44T/AINL | `src/app/dashboard/` | 拖曳佈局 + 8 張圖表卡片，19 張卡片總計 | — | ✅ 完成 |
| 趨勢分析 | AINL | `src/lib/trends/` | 月度彙總 + 滾動勝率 + 季度比較，純函式 + hook + UI 全鏈路 | — | ✅ 完成 |
| 文件生成 (docgen) | Z1FV | `src/lib/docgen/` | DOCX + Markdown + 封面頁 + 自動目錄 + 標題/列表/粗斜體 | 38 | ✅ 完成 |
| 報價計算模組 | ITEJ | `src/lib/pricing/` | 重構：types + helpers，純函式 | 28 | ✅ 完成 |
| 品質檢查模組 | ITEJ | `src/lib/quality/` | 重構：types + rules + score，5 鐵律 flag + 履約實績 + 模糊量化詞 | 68 | ✅ 完成 |
| 提案組裝引擎 | ITEJ | `src/lib/assembly/` | 重構：6 純函式 | 31 | ✅ 完成 |

---

## W01 巡標自動化（各層分工）

| 功能 | 實作者 | 路徑 | 說明 | Tests | 狀態 |
|------|--------|------|------|-------|------|
| 關鍵字引擎 + 掃描 API + 巡標 UI | ITEJ | `src/app/scan/` `src/lib/patrol/` | Phase 1：關鍵字過濾 + PCC API 串接 + /scan 頁面 | 73 | ✅ 完成 |
| notion-mapper | ITEJ | `src/lib/patrol/notion-mapper.ts` | W01 Phase 2 前置：PCC 標案 → Notion 欄位映射 | 11 | ✅ 完成 |
| Layer B：Notion/Drive writers + API routes | AINL | `src/lib/patrol/notion-writer.ts` `src/lib/patrol/drive-writer.ts` `src/app/api/patrol/` | 建案寫入 Notion + Drive，3 個 API routes | 187 | ✅ 完成 |
| Layer C：分類引擎 + 編排器 | AINL | `src/lib/patrol/classifier.ts` `src/lib/patrol/converter.ts` `src/lib/patrol/orchestrator.ts` | 標案分類 + 格式轉換 + 建案流程編排 | 94 | ✅ 完成 |
| Layer D：排除記憶模組 | JDNE | `src/lib/patrol/exclusion.ts` | 記住已建案標案，防止重複建案，localStorage 持久化 | 18 | ✅ 完成 |
| CreateCaseDialog + usePatrolOrchestrator | Z1FV/3O5L | `src/components/scan/CreateCaseDialog.tsx` `src/hooks/usePatrolOrchestrator.ts` | 建案對話框 + hook 層封裝，串接 orchestrateAccept 完整流程 | — | ✅ Jin驗收 |
| 截標日過濾（detail API） | A44T | `src/lib/patrol/` | 改用 PCC detail API 取實際截標日，保守策略（查不到就保留）| 16 | ✅ 完成 |
| UX 改善 | A44T | `src/app/scan/` | 預算未公告提示 + 截標日顯示 + 建案 spinner | — | ✅ 完成 |
| KeywordManager 元件 + 設定頁 | 3O5L | `src/components/scan/KeywordManager.tsx` | 關鍵字自訂管理 UI，settings/modules tab 接線 | 11 | ✅ 完成 |

---

## MCP Server

| 功能 | 實作者 | 路徑 | 說明 | 狀態 |
|------|--------|------|------|------|
| PCC API MCP | JDNE | `pcc-api-mcp/` | 政府標案查詢，6 個工具（搜尋/得標/機關/廠商等） | ✅ 完成 |
| SmugMug MCP | — | `smugmug-mcp/` | 實績照片存取，7 個工具 | ✅ 完成 |
| PCC Monitor | JDNE | `pcc-monitor/` | PCC API 更新延遲監控，GAS 每小時執行 | ✅ 完成 |

---

## 進行中 / 待開發

| 功能 | 負責機器 | 說明 | 狀態 |
|------|---------|------|------|
| 知識庫初始化 | AINL | Phase 1-4 去重腳本已就緒（33.4K 檔案），待 Jin 授權執行 | ⏳ 待授權 |
| M02 知識庫模組 | — | v0.1 規格草案完成（ITEJ 0227），待排開發 | ⏳ 待排程 |

---

## 放棄

| 功能 | 原計畫 | 放棄原因 |
|------|--------|---------|
| Discord Bot | 通知推播 | 改為 SaaS 網頁 |
| ITEJ M03 Phase 1 | 戰略分析引擎 | 與 A44T 碰撞，保留 A44T 版本 |
| 機器間互相諮詢機制 | 跨機器即時溝通 | 需求不存在（單機使用為主） |
| 論壇 UI | 機器討論板 | Jin 決定廢除（0224），改快照協調 |
