# 全生命周期功能分派 — JDNE 主題公告

**日期**：2026-02-23
**主題**：12 階段缺口補全 + 5 個新模組規格分派
**狀態**：[>] 執行中

---

## 阻塞點（待 Jin 決策）

在以下 3 點決定前，**ITEJ 無法啟動 M02**（其他模組可平行進行）：

1. **M02 Supabase project 選擇**
   用現有 P1 dev project，還是新開獨立 project？

2. **M02 認證策略**
   Phase 1-3 先 bypass 多租戶認證（快速跑通功能），還是直接串 P1b OAuth？

3. **Jin 驗收 M03+M04+PCC**
   最小展示版（M03 戰略分析、M04 品質閘門、PCC 情報搜尋）驗收狀態？

---

## 分派清單

### 1️⃣ ITEJ — M02 知識庫系統（待 Jin 決策）

**任務**：M02 Phase 1-3 基礎層
**模組**：
- KB 資料表設計（topics, lessons, references）
- CRUD API routes (`/api/kb/items/`, `/api/kb/topics/`)
- React Hooks 層（useKB, useSearch）
- UI 元件（KBView, SearchPanel, TopicTree）

**規格文件**：`bidding-assistant/docs/dev-plan/M02-知識庫系統.md`
**測試目標**：≥ 100 tests
**依賴**：⏸️ 待 Jin 決策 Supabase + 認證

---

### 2️⃣ AINL — M07 外包資源庫

**任務**：聯絡人管理 + M03 集成
**模組**：
- `partner_contacts` Supabase 資料表
- `/api/partners/` CRUD routes
- `usePartners` Hook
- KBSidebar 集成面板

**規格文件**：`bidding-assistant/docs/dev-plan/M07-外包資源庫.md`
**測試目標**：≥ 60 tests
**依賴**：Supabase P1a（已完成）

---

### 3️⃣ A44T — M09 議價分析工具

**任務**：底線計算 + 讓步模擬
**模組**：
- `src/lib/negotiation/` helpers（底線、區間、模擬邏輯）
- `useNegotiation` Hook
- `NegotiationPanel` 元件
- case-work 整合

**規格文件**：`bidding-assistant/docs/dev-plan/M09-議價分析.md`
**測試目標**：≥ 50 tests
**依賴**：pricing 模組（已完成）

---

### 4️⃣ Z1FV — M02 Phase 4 + M10 履約管理

**分項A**：M02 Phase 4（Notion 拉取遷移精靈）
- 規格文件：`bidding-assistant/docs/dev-plan/M02-Phase4-Notion拉取.md`
- 測試目標：≥ 80 tests
- 依賴：ITEJ M02 完成 + Notion MCP

**分項B**：M10 履約管理
- 規格文件：`bidding-assistant/docs/dev-plan/M10-履約管理.md`
- 測試目標：≥ 80 tests
- 依賴：M02 完成

---

### 5️⃣ JDNE — M08 評選簡報生成規格確認

**任務**：規格文件 + 技術可行性評估 → 分派 Z1FV 或 A44T 實裝
**輸出**：`bidding-assistant/docs/dev-plan/M08-評選簡報.md`
**決策點**：
- 簡報結構模板決定？
- 講稿生成用 Claude 哪個 endpoint？
- PPTX 匯出用 docx-assembler 擴充還是獨立模組？

**規格文件內容預期**：M06 docgen 的簡報路徑已有，Phase 1-2 補強投影片生成 + 講稿生成即可。

---

### 6️⃣ 3O5L — M11 結案飛輪（依賴 M02 完成）

**任務**：結案流程 + KB 回流機制
**模組**：
- `case_learnings` Supabase 資料表
- `/api/cases/[id]/close/` 結案 endpoint
- `useCaseClosing` Hook
- 結案文件生成（AI）

**規格文件**：`bidding-assistant/docs/dev-plan/M11-結案飛輪.md`
**測試目標**：≥ 60 tests
**依賴**：M02（KB 寫入）

---

## 執行順序（含并行）

```
阻塞點決策（Jin）
  ↓
① ITEJ：M02 Phase 1-3 ← 前置，解鎖所有下游
  ↓
② 并行：
  AINL：M07 外包資源庫（獨立）
  A44T：M09 議價分析（獨立）
  JDNE：M08 簡報規格確認
  ↓
③ Z1FV：M02 Phase 4 + M10（依賴 M02 完成）
  ↓
④ 3O5L：M11 結案飛輪（依賴 M02 完成）
  ↓
⑤ 全機整合驗收 + 12 階段全通
```

---

## 規格文件清單

每個模組產出一份規格文件，存 `bidding-assistant/docs/dev-plan/`：

| 規格 | 由誰寫 | 格式 |
|-----|--------|------|
| M02-知識庫系統.md | ITEJ | API + Hook + 測試清單 |
| M07-外包資源庫.md | AINL | API + 聯絡人表 schema |
| M08-評選簡報.md | JDNE | 決策框架 + 技術路由 |
| M09-議價分析.md | A44T | 邏輯模型 + 計算公式 |
| M02-Phase4-Notion拉取.md | Z1FV | 遷移流程 + 錯誤處理 |
| M10-履約管理.md | Z1FV | 里程碑模型 + 警示規則 |
| M11-結案飛輪.md | 3O5L | KB 回流設計 + 評分規則 |

---

## 協調方式

- 各機器寫規格完成後 → push `bidding-assistant/docs/dev-plan/` → Slack 通知 JDNE
- JDNE 確認規格無循環依賴 → /暫存 提案給 Jin 審批（如有 L3 決策）
- 或直接授權 P2 開發（P1 工作照常推進）

---

## 優先序

1. **阻塞決策**（Jin）
2. **P0 前置**：ITEJ M02 Phase 1-3
3. **P1 核心**：AINL/A44T/Z1FV 并行 + 規格確認
4. **P2 收尾**：3O5L + 整合驗收

---

**下一步**：等待 Jin 決策 3 個阻塞點 → ITEJ 啟動 → 各機器同時推規格文件。

