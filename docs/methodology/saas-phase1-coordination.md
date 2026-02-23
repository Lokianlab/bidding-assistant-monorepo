# SaaS Phase 1 協調方案 — P1a 至 P1f

> 狀態：進行中（P1a/P1c/P1d ✅ 完成，P1b/P1e/P1f 進行中）
> 更新：2026-02-23（實況更新：Z1FV P1d KB UI 已完成，拆分登入+儀表板為 P1f）
> 機器：JDNE 協調

---

## 一、Phase 1 構成（六部分）

| 部分 | 內容 | 負責機器 | 狀態 | 完成時間 |
|------|------|---------|------|---------|
| **P1a** | Supabase schema + SDK client 初始化 | JDNE | ✅ 完成 | 0223 |
| **P1b** | OAuth 認證層（Google/Microsoft） | **待確認** | ⏳ 待規格 | — |
| **P1c** | KB API (6 端點) + RLS 隔離 + 環境配置 | ITEJ | ✅ 完成 | 0223 |
| **P1d** | KB 文件管理 UI（列表/搜尋/上傳/刪除） | Z1FV | ✅ 完成 | 0226 |
| **P1e** | Notion 同步引擎 + Cron 定時任務 | 3O5L | ⏳ 進行中 | — |
| **P1f** | 登入頁面 + 多租戶儀表板 | **待分派** | ⏳ 待規格 | — |

---

## 二、已完成部分詳情

### P1a: Supabase Schema + Client（JDNE）

**成果**：
- schema.sql：多租戶表結構（tenants / users / kb_documents / kb_chunks）
- supabase-client.ts：Supabase TypeScript client 初始化
- RLS 隔離框架定義（詳細實作在 P1c）

**下游依賴**：P1b / P1c / P1d 全部需要此

---

### P1c: KB API + RLS + 環保變數（ITEJ）

**成果清單**（commit 57c950e + 140840c + 354ccfa）：
- **6 API 端點**：
  - POST /api/kb/documents — 上傳文件
  - GET /api/kb/documents — 列表（含多租戶過濾）
  - GET /api/kb/documents/:id — 詳情
  - PUT /api/kb/documents/:id — 更新
  - DELETE /api/kb/documents/:id — 刪除
  - POST /api/kb/search — 語義搜尋（含 embedding）

- **RLS 隔離驗證**（47 個測試）：
  - 多租戶隔離完備
  - 插入/更新/刪除/查詢的邊界條件
  - 效能檢查合格

- **環境配置範本**：
  - `.env.example`：所有必需變數名稱
  - `.env.staging`：staging 環境設定
  - `.env.uat`：UAT 環境設定
  - `.env.production`：生產環境設定（實部署時才配置）

- **額外完成**：
  - Next.js 16 動態路由修復（Promise params）
  - Staging reset cron 端點（/api/cron/staging-reset）

**測試**：3434 PASS + 1 skip（總計）

**下游**：P1d（Web UI 操作這些 API）/ P1e（Notion 同步寫入 KB）

---

### P1d: KB 文件管理 UI（Z1FV）✅ 已完成

**成果**（commit 2822538 + 0226）：
- `/app/kb/` 頁面：主頁面搭鹰
- 元件：
  - KBTable：檔案表格（排序/分頁/多選）
  - KBSearchBar：搜尋 + 過濾
  - CreateKBItemDialog / EditKBItemDialog / DeleteKBItemConfirm：CRUD 對話框
  - KBSidebar：側欄導航

- Hook：
  - useKBItems：檔案列表管理（呼叫 P1c API）
  - useKBForm：表單狀態管理

- API 客戶端：api-client.ts（封裝 6 個 KB API 端點）

- 測試：207/214 PASS（內含 useKBItems + useKBForm + UI 元件測試）

**驗收**：npm run dev → /kb → 可操作檔案列表、搜尋、上傳、刪除 ✅ 通過

**下游**：P1f 登入頁面（需提供導航連結）

---

### P1e: Notion 同步引擎（3O5L）進行中

**成果**（commit 前日 + 0223）：
- notion-sync.ts（305 行）：純邏輯層 + 6 匯出函式 + 參數注入
  - `syncAllNotionPages()`：掃描全部 Notion 頁面
  - `syncPageToDB()`：單頁寫入 Supabase
  - `getNotionDatabaseStructure()`：讀 schema
  - 等 5 個輔助函式

- Cron 路由：GET /api/cron/sync-notion（需認證 + 租戶迴圈）

- 資料庫遷移：sync_logs 表

- 測試：22 項全覆蓋（邏輯 + 邊界條件）

- 編譯成功✅

**待做**：
- 與 P1d KB UI 整合（顯示同步狀態）
- 與 P1c KB API 完整測試

**下游**：無（P1e 是末端）

---

## 三、待規格/待分派的部分

### P1b: OAuth 認證層（待規格指令）

**預期內容**：
- Google OAuth provider（建議用 Supabase Auth 原生）
- Microsoft OAuth provider（可選，但建議做）
- Callback handler + JWT token 管理
- 多租戶使用者建立邏輯

**分派候選**：A44T（根據快照期望「待 OAuth（A44T）」）

**狀態**：已撰寫規格指令文件 `saas-p1b-oauth-spec.md`，待 A44T 確認承接

**連結**：`docs/methodology/saas-p1b-oauth-spec.md`

---

### P1f: 登入頁面 + 多租戶儀表板（新增分派）

**預期內容**：
- 登入頁面（接 P1b OAuth，顯示 Google / Microsoft 按鈕）
- 多租戶儀表板（首頁，知識庫統計 + 最近上傳 + 同步狀態）
- 頂部導航 + 側邊欄（含指向 /kb 和其他模組的連結）

**分派候選**：A44T（可與 P1b OAuth 同步進行）

**狀態**：已撰寫規格指令文件 `saas-p1f-dashboard-spec.md`，待 A44T 確認承接

**連結**：`docs/methodology/saas-p1f-dashboard-spec.md`

---

## 四、依賴順序

```
P1a (schema)
  ↓
  ├─→ P1c (KB API + RLS) ✅ 完成
  │    ↓
  │    └─→ P1d (KB UI) ✅ 完成
  │         ↓
  │         └─→ P1f (儀表板：需連結到 /kb)
  │
  ├─→ P1b (OAuth) ⏳ 進行中
  │    ↓
  │    └─→ P1f (登入流程)
  │
  └─→ P1e (Notion 同步) ⏳ 進行中
       ↓
       └─→ P1f (選用：儀表板展示 sync 狀態)
```

**關鍵路徑**：P1a → P1c → P1d ✅ 完成 → P1f（待 P1b OAuth）

**預估時程**（若無阻塞）：
- P1b OAuth（A44T）：2-3 天（取決於方案選型）
- P1f 儀表板（A44T）：2-3 天（與 P1b 平行，待 OAuth 完成後串接）
- P1e 整合（3O5L）：1-2 天（與 P1b/P1f 平行，邏輯已做）

---

## 五、實況更新（2026-02-23 JDNE 協調）

- ✅ P1a 完成（JDNE）
- ✅ P1c 完成（ITEJ）
- ✅ P1d 完成（Z1FV 2026-02-26）
- ⏳ P1b 待 A44T 承接（規格已提供）
- ⏳ P1e 進行中（3O5L）
- ⏳ P1f 待 A44T 承接（規格已提供）

**規格文件**：
- `saas-phase1-coordination.md` ← 本文件
- `saas-p1b-oauth-spec.md` ← OAuth 規格
- `saas-p1f-dashboard-spec.md` ← 儀表板規格（待新增）

---

## 六、下一步工作清單（JDNE + 各機器）

**JDNE 協調工作**：
- [ ] 發送 A44T 通知：P1b OAuth 規格待承接確認
- [ ] 發送 A44T 通知：P1f 儀表板規格待承接確認
- [ ] 為 P1f 補完規格文件 `saas-p1f-dashboard-spec.md`
- [ ] 協調 3O5L P1e 與 Z1FV P1d 的儀表板整合點
- [ ] 定期巡邏進度（快照 + 一對一確認）

**各機器工作**：
- **A44T**：P1b OAuth（2-3 天） + P1f 儀表板（2-3 天）
- **3O5L**：P1e 完整測試補強 + P1d/P1f 整合
- **Z1FV**：P1d KB UI 已完成，可協助 P1f UI 審查

---

## 七、驗收標準

SaaS Phase 1 定義為**可部署的 MVP**：

- [ ] OAuth 登入通暢（Google / 可選 Microsoft）
- [ ] 多租戶隔離驗證通過（無跨租戶資料洩漏）
- [ ] 儀表板可加載、展示知識庫統計
- [ ] KB 文件上傳/搜尋/管理功能完整可用
- [ ] Notion 同步自動化運行、錯誤日誌完整
- [ ] RLS 隔離無洩漏
- [ ] 環境變數支持 local → staging → UAT → production 全程
- [ ] 所有測試 ≥95% PASS，build 成功
- [ ] 可部署到 Vercel staging 環境（不含生產機密）

**Jin 驗收通過** → Phase 1 完成 → 啟動 Phase 2（量產功能）

---

> 版本：v0.2（實況更新）| 更新時間：2026-02-23 12:30 UTC+8 | JDNE 協調 | 基礎：Z1FV P1d 完成通知
