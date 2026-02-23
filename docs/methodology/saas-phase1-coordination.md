# SaaS Phase 1 協調方案 — P1a 至 P1e

> 狀態：進行中（P1a+P1c 完成，P1d/P1e 規格待確認）
> 更新：2026-02-23
> 機器：JDNE 協調

---

## 一、Phase 1 構成（五部分）

| 部分 | 內容 | 負責機器 | 狀態 | 完成時間 |
|------|------|---------|------|---------|
| **P1a** | Supabase schema + SDK client 初始化 | JDNE | ✅ 完成 | 0223 |
| **P1b** | OAuth 認證層（Google/Microsoft） | **待確認** | ⏳ 待規格 | — |
| **P1c** | KB API (6 端點) + RLS 隔離 + 環境配置 | ITEJ | ✅ 完成 | 0223 |
| **P1d** | SaaS Web UI 實裝（登入→儀表板→KB操作） | **待規格** | ⏳ 待規格 | — |
| **P1e** | Notion 同步引擎 + Cron 定時任務 | 3O5L | ✅ 前置完成 | 0223 |

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

### P1e 前置：Notion 同步引擎（3O5L）

**成果**（commit 前日）：
- notion-sync.ts（305 行）：純邏輯層 + 6 匯出函式 + 參數注入
  - `syncAllNotionPages()`：掃描全部 Notion 頁面
  - `syncPageToDB()`：單頁寫入 Supabase
  - `getNotionDatabaseStructure()`：讀 schema
  - 等 5 個輔助函式

- Cron 路由：GET /api/cron/sync-notion（需認證 + 租戶迴圈）

- 資料庫遷移：sync_logs 表

- 編譯成功✅

**待做**：
- 與 P1c KB API 整合（寫入邏輯）
- 完整測試補強

**下游**：無（P1e 是末端）

---

## 三、待規格/待分派的部分

### P1b: OAuth 認證層

**預期內容**：
- Google OAuth provider（應該是 Next Auth v5 或 supabase-auth 原生）
- Microsoft OAuth provider（可選，但建議做）
- 登入頁面
- Callback handler
- JWT token 管理

**疑惑**：
- A44T 快照沒有明確承接「我做 P1b」，只有「待 OAuth（A44T）」的期望
- **建議**：JDNE 直接問 A44T 是否已規劃 P1b OAuth，並確認方案（Next Auth vs Supabase Auth）

---

### P1d: Web UI 實裝

**預期內容**：
- 登入流程（接 P1b OAuth）
- SaaS 儀表板（多租戶視圖）
- KB 操作介面（上傳/搜尋/管理文件）
- 頁面/元件清單（待詳細設計）

**分派候選**：Z1FV（負責 UI 模組和代碼審查），但快照空白

**建議**：
- JDNE 向 Z1FV 確認是否承接 P1d UI
- 提供粗略功能清單
- 時程預估

---

## 四、依賴順序

```
P1a (schema)
  ↓
  ├─→ P1c (KB API + RLS)
  │    ↓
  │    └─→ P1d (Web UI 操作 API)
  │
  ├─→ P1b (OAuth)
  │    ↓
  │    └─→ P1d (登入流程)
  │
  └─→ P1e (Notion 同步)
       ↓
       └─→ P1d (選用：展示 sync 狀態)
```

**關鍵路徑**：P1a → (P1b + P1c) → P1d（3 條並行 → 1 個匯集點）

**預估時程**（若無阻塞）：
- P1b OAuth（A44T）：2-3 天（取決於方案選型）
- P1d UI（Z1FV）：4-5 天（依最終功能清單）
- P1e 整合（3O5L）：1-2 天（邏輯已做，主要是測試）

---

## 五、下一步工作清單（JDNE）

- [ ] 聯繫 A44T：確認 P1b OAuth 承接與方案
- [ ] 聯繫 Z1FV：確認 P1d UI 承接與粗略功能清單
- [ ] 為 P1d UI 撰寫規格文件（基於 P1c API 能力）
- [ ] 協調 3O5L P1e 與 ITEJ P1c 的整合點
- [ ] 定期巡邏各部分進度（快照 + 一對一確認）

---

## 六、驗收標準

SaaS Phase 1 定義為**可部署的 MVP**：

- [ ] OAuth 登入通暢，多租戶隔離驗證通過
- [ ] KB 文件上傳/搜尋/管理功能完整可用
- [ ] RLS 隔離無洩漏，跨租戶查詢驗證通過
- [ ] 環境變數支持 local → staging → UAT → production 全程
- [ ] Notion 同步自動化運行，錯誤日誌完整
- [ ] 所有測試 ≥95% PASS，build 成功
- [ ] 可部署到 Vercel staging 環境（不含生產機密）

Jin 確認上述標準通過 → Phase 1 驗收完成 → 啟動 Phase 2（量產功能）

---

> 版本：v0.1 | 起草時間：2026-02-23 | JDNE 協調
