# 建議書管線協調器 — 規格書

作者：A44T
日期：20260223
任務來源：JDNE 派工（infra-module-pipeline-gap）
參考：product-compass-v0.6 §建議書三階段自動化、patrol/orchestrator.ts

---

## 設計目的

複製 `patrol/orchestrator.ts` 的協調模式，為建議書撰寫流程建立端對端自動化管線：

```
PCC 情報 → 戰略分析 → 提案組裝 → 品質閘門 → 文件生成
```

協調器不替 Jin 做判斷，而是在每個階段：
1. 把上個階段的輸出整理成下一階段的輸入
2. 在需要人類決策的節點暫停等待
3. 確認後自動帶著決策結果往下走

---

## 五個階段

### Stage 1：PCC 情報蒐集（`/intelligence`）

**觸發條件**：Jin 發現目標案件（掃標頁或手動輸入）

**自動化程度**：
- 搜尋案件資料（PCCSearchPanel）
- 查詢市場趨勢（MarketTrend）、競爭分析（CompetitorAnalysis）
- 結果自動存入 localStorage（`intelligence-bridge`）

**Jin 介入點**（必須）：
- 確認這是要投的案（按「前往戰略分析 →」啟動 Stage 2）

**輸出資料**：
```
caseName: string        ← URL param 帶入下一階段
agency: string          ← URL param 帶入下一階段
caseId?: string         ← 有建案時帶入（從 /scan 建案的路徑）
intelligence cache      ← localStorage（strategy 頁自動讀取）
```

---

### Stage 2：戰略分析（`/strategy`）

**觸發條件**：收到 `?caseName=&agency=&caseId=` URL params

**自動化程度**：
- 從 localStorage 讀取情報快取（readCachedIntelligence）
- 計算五維適配度分數（useFitScore）
- 顯示結論（推薦 / 觀望 / 放棄）

**Jin 介入點**（必須）：
- 審閱適配度分析
- 確認投標意願（按「開始撰寫」啟動 Stage 3）

**輸出資料**：
```
caseName: string        ← URL param
agency: string          ← URL param
verdict: string         ← "推薦" | "觀望" | "放棄"，URL param
total: number           ← 總分，URL param
caseId?: string         ← 穿透帶入
```

---

### Stage 3：提案組裝（`/assembly`）

**觸發條件**：收到 `?stage=L1&caseName=&agency=&verdict=&total=` URL params

**自動化程度**：
- 根據 stage 選擇對應提示詞（stages.ts）
- 引用知識庫（KB Matrix）填充提示詞
- 顯示組裝後的完整 prompt

**Jin 介入點**（必須）：
- 複製 prompt → 貼到 Claude.ai 或 API
- 取回 AI 回覆後，決定是否繼續下一階段

**⚠️ GAP-2（待修）**：
- 目前無「→ 品質閘門」按鈕
- 組裝結果無法自動帶入品質閘門（需 Jin 手動複製貼上）
- 修法：加「複製並前往品質閘門」按鈕，把組裝文字存入 `localStorage['assembly-output']`

**輸出資料**：
```
assembledText: string   ← localStorage['assembly-output']（修 GAP-2 後）
caseName: string        ← URL param 或 localStorage
caseId?: string         ← URL param 穿透
```

---

### Stage 4：品質閘門（`/tools/quality-gate`）

**觸發條件**：
- 修 GAP-2 後：按「複製並前往品質閘門」時自動帶入文字
- 目前：Jin 手動貼上組裝結果

**自動化程度**：
- 分析輸入文字的 12 條規則合規性（calculateScore）
- 顯示品質分數、問題清單、鐵律檢查

**Jin 介入點**（必須）：
- 分數通過（≥80）→ 繼續文件生成
- 分數不通過 → 回 Stage 3 修改，或忽略警告強行繼續

**⚠️ GAP-3（待修）**：
- 目前無案件上下文（不知道是哪個案件）
- 無「← 回到案件/組裝」按鈕
- 修法：接受 `?caseId=&caseName=` params，顯示案件名稱，加返回按鈕

**輸出資料**：
```
qualityScore: number    ← 顯示用，不帶入下一階段
approvedText: string    ← 通過品質檢查的文字，localStorage 或 query
caseId?: string
```

---

### Stage 5：文件生成（`/tools/output`）

**觸發條件**：從品質閘門點「→ 文件生成」

**自動化程度**：
- 根據文字生成 DOCX/PDF 格式文件
- 下載按鈕

**Jin 介入點**（必須）：
- 最終確認後下載

**⚠️ GAP-4（已延期）**：
- 下載後 Notion 案件狀態不自動更新（需 Jin 手動改）
- 工作量較大，非最小展示版範圍，暫不實作

---

## 資料流總覽

```
Stage 1          Stage 2          Stage 3          Stage 4          Stage 5
/intelligence    /strategy        /assembly        /quality-gate    /tools/output
     │                │                │                │                │
     │  URL params     │  URL params    │  localStorage  │  Link/param    │
     │  caseName ───► │  caseName ───► │  assembly-text►│                │
     │  agency ──────►│  agency ───────────────────────►│                │
     │  caseId? ─────►│  caseId? ─────►│  caseId? ─────►│                │
     │                │  verdict ─────►│                │                │
     │                │  total ───────►│                │                │
     │  localStorage  │               │                │                │
     │  intel cache ──────────────────►(readCached)     │                │
```

---

## Jin 介入點摘要

| 階段 | 介入動作 | 若不介入 |
|------|---------|---------|
| Stage 1 完成 | 點「前往戰略分析 →」 | 停留在情報頁，不進入 Stage 2 |
| Stage 2 完成 | 點「開始撰寫」 | 停留在戰略分析，不進入 Stage 3 |
| Stage 3 完成 | 複製 prompt → AI → 把結果帶回來 | 外部動作，系統無法代勞 |
| Stage 4 完成 | 確認品質後點「→ 文件生成」 | 停留在品質閘門 |
| Stage 5 完成 | 下載文件 | 停留在文件生成頁 |

---

## 與 patrol/orchestrator.ts 的異同

| 項目 | patrol orchestrator | proposal pipeline |
|------|---------------------|-------------------|
| 觸發方式 | 系統自動（定時/手動掃標） | Jin 主動發起 |
| 資料傳遞 | function call chain | URL params + localStorage |
| Jin 介入 | 建案確認（`orchestrateAccept`） | 多個節點（Stage 1~5） |
| 自動化程度 | 高（整個 accept 流程一鍵） | 中（每個 stage 需 Jin 確認） |
| 協調層 | TypeScript orchestrator | URL routing + localStorage |

**結論**：建議書管線不需要另建 TypeScript orchestrator class，現有的 URL param 傳遞 + localStorage 快取機制已足夠協調資料流。真正需要的是修復 GAP-2 和 GAP-3，讓管線可以無斷點導覽。

---

## 實作優先序

| 優先 | 工作 | 預估工作量 | 負責 |
|------|------|-----------|------|
| P1 | GAP-2：assembly → quality-gate 按鈕 + localStorage 傳值 | 小 | ITEJ（已派工） |
| P2 | GAP-3：quality-gate 接收 caseId + 顯示案件名 + 返回按鈕 | 中 | 待分配 |
| P3 | GAP-4：Notion 狀態自動更新 | 大 | 延期，非最小展示版範圍 |
