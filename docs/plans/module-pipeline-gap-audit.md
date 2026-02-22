# 模組串接缺口審計報告

審計者：ITEJ
日期：20260223
任務來源：JDNE 派工（infra-module-pipeline-gap）
參考：docs/product-compass-v0.6.md §做歪信號

---

## 審計方法

掃描所有 `router.push`、`<Link>`、`href=` 在 `src/app/` 和 `src/components/` 中的使用，
逐一確認從 A 頁完成動作後是否有明確的下一步路徑，或是需要 Jin 手動點側欄切換。

---

## 缺口清單（按嚴重程度）

### GAP-1：嚴重 — 情報搜尋完成後無下一步

- **位置**：`/intelligence` 執行完搜尋後
- **現況**：情報資料存入 localStorage 快取（`intelligence-bridge`），但頁面無「繼續」按鈕
- **Jin 現在要做**：手動點側欄切換到 `/strategy` 或 `/case-work`
- **資料是否流通**：有（快取），但 UX 流程斷了
- **建議修法**：情報搜尋完成後顯示「前往戰略分析」按鈕，帶 `?caseName=...`

---

### GAP-2：嚴重 — 提案組裝完成後無下一步

- **位置**：`/assembly` 組裝結果顯示後
- **現況**：組裝完成只顯示文字 prompt，無「去品質檢查」或「回到案件」按鈕
- **Jin 現在要做**：手動點側欄切到 `/tools/quality-gate`，再手動貼上文字
- **額外摩擦**：品質閘門是純文字輸入，不接收 assembly 自動傳入
- **建議修法**：加「複製並前往品質檢查」按鈕（把組裝結果放到 clipboard / localStorage 帶過去）

---

### GAP-3：中 — 品質閘門無案件上下文、無回到案件路徑

- **位置**：`/tools/quality-gate`
- **現況**：純文字輸入，無案件 id；有「→ 文件生成」但無「← 回到案件 / 組裝」
- **Jin 現在要做**：品質不過想修改，手動切回 `/assembly` 或 `/case-work`
- **建議修法**：接受 `?caseId=` query param，顯示案件名稱；加「回到案件」按鈕

---

### GAP-4：中 — 文件生成後 Notion 狀態無自動更新

- **位置**：`/tools/output`（或 `/tools/docx`）完成後
- **現況**：文件下載完成，Notion 上案件狀態需 Jin 手動更新（如改為「待投遞」）
- **Jin 現在要做**：去 Notion 手動改狀態欄位
- **建議修法**：輸出完成後加「更新案件狀態」按鈕，呼叫 Notion API 更新狀態欄位（需傳入 case id）

---

### GAP-5：低 — 戰略分析無回到案件路徑

- **位置**：`/strategy` 頁面
- **現況**：有「→ 組裝提案」，無「← 回到案件」
- **Jin 現在要做**：手動點側欄
- **建議修法**：接受 `?caseId=` param，加「← 回到案件」返回按鈕

---

## 已串接的路徑（不需改動）

| 從 | 到 | 方式 |
|----|----|------|
| `/scan` | `/case-work?id=...` | `router.push`（ScanDashboard 建案成功後） |
| `/scan` | `/intelligence?search=...` | `router.push`（TenderCard 查情報） |
| `/case-work` | `/assembly?stage=...&caseName=...` | `router.push`（下一步行動區） |
| `/case-work` | `/tools/quality-gate` | `router.push`（下一步行動區，≥30% 進度才出現） |
| `/case-work` | `/strategy?caseName=...&agency=...` | `router.push`（下一步行動區） |
| `/case-work` | `/intelligence?search=...` | `router.push`（情報摘要區「搜尋更多情報」） |
| `/strategy` | `/assembly?...` | `router.push` |
| `/tools/quality-gate` | `/tools/output` | `<Link>` |
| `/case-board` | `/case-work?id=...` | `ProjectDetailSheet` 內「前往案件工作頁」 |

---

## 優先修復建議

| 優先序 | 缺口 | 工作量估計 | 效益 |
|--------|------|-----------|------|
| 1 | GAP-2（assembly → quality-gate） | 小（加按鈕 + clipboard） | 消除每次都要手動貼文字的摩擦 |
| 2 | GAP-1（intelligence → strategy） | 小（加按鈕） | 情報→戰略是必走路徑 |
| 3 | GAP-3（quality-gate 上下文） | 中（加 query param 接收） | 改善品質閘門可用性 |
| 4 | GAP-5（strategy → case-work） | 極小（加一個 Link） | 降低單向導覽摩擦 |
| 5 | GAP-4（Notion 狀態自動更新） | 大（需 Notion API 整合） | 完整閉環，但後端複雜度高 |
