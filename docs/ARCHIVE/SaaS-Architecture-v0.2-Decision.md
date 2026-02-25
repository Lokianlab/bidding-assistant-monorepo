# SaaS 架構決策文件 v0.2（待批準）

> 日期：2026-02-23｜決策方：JDNE｜級別：L3

---

## 執行摘要

| 項目 | 決策 | 理由 |
|------|------|------|
| **知識庫存儲** | Supabase PostgreSQL | 高頻讀寫、巢狀結構、語意搜尋預留、免費方案足夠 |
| **認證系統** | Google Workspace (OAuth) | 員工已有帳號、Google Apps 生態成熟、Phase 1 不需額外服務 |
| **多租戶模型** | 基於 tenant_id（公司維度） | 支援員工協作、多公司場景（未來） |
| **第一步** | 資料架構設計 + DB Schema | 並行 Supabase 連接層開發 |

---

## Layer 3 確認：基礎設施決策

### 知識庫：Notion vs Supabase（決議）

**決策：Supabase PostgreSQL**

理由：
1. **高頻讀寫** — 知識庫（00A-00E）用戶每天查詢/編輯多次，Notion 3 req/s limit 會成瓶頸
2. **巢狀結構** — 00C 範本有子項目、00D SOP 有步驟，SQL 查詢優於 Notion linked DB
3. **語意搜尋預留** — pgvector 擴展為未來 RAG 做準備（Notion API 沒這能力）
4. **成本低** — 免費方案 500MB，Phase 1 夠用；Phase 2 $25/月

### 認證：Google Workspace OAuth

**決策：Google Workspace OAuth（Phase 1）**

狀態：
- ✅ 員工已有 Google Workspace 帳號
- ✅ 無額外成本
- 📅 Phase 2 考慮 Supabase Auth（多組織支援）

### 其他服務（維持不變）
- 託管：Vercel（Next.js 最佳）
- 標案追蹤：Notion API（現有）
- 實績照片：SmugMug MCP（現有）
- 文件存儲：Google Drive（現有）

---

## Layer 4：資料架構（草案）

### 多租戶模型

```
公司（tenant）
├── 知識庫
│   ├── 00A 團隊名單
│   ├── 00B 實績案例
│   ├── 00C 範本庫
│   ├── 00D SOP
│   └── 00E 檢討報告
├── 標案資料（Notion → 同步）
├── 員工（users）
└── 設定（偏好、欄位對照）
```

### 核心表結構（初稿）

```sql
-- 租戶
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  google_workspace_domain TEXT,  -- 例：example.com
  created_at TIMESTAMP DEFAULT NOW()
);

-- 員工（多租戶）
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  google_email TEXT NOT NULL,
  role TEXT,  -- admin / member
  created_at TIMESTAMP,
  UNIQUE(tenant_id, google_email)
);

-- 知識庫項目（00A-00E）
CREATE TABLE kb_items (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  category TEXT,  -- 00A / 00B / 00C / 00D / 00E
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB,  -- 子項目、標籤等
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 標案同步（Notion 來源）
CREATE TABLE bids (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  notion_page_id TEXT,  -- Notion 頁面 ID
  title TEXT NOT NULL,
  status TEXT,  -- 來自 Notion
  synced_at TIMESTAMP DEFAULT NOW()
);
```

### 架構決議待確認
- [ ] 員工編輯知識庫的權限模型（全員可編輯 vs 角色受限）
- [ ] 標案資料是否跨租戶共享（現在假設 tenant 隔離）
- [ ] 同步頻率（即時 vs 定時 sync）

---

## Layer 5：實施計劃（Phase 1）

### 第一階段分解（4-6 週估計）

| 階段 | 工作 | 優先級 | 責任方 |
|------|------|--------|--------|
| **P1A** | Supabase 專案建立 + 表結構設計定案 | 🔴 | JDNE |
| **P1B** | Google OAuth 連接層 | 🔴 | A44T |
| **P1C** | 知識庫 API 路由（CRUD） | 🟠 | ITEJ |
| **P1D** | 知識庫 UI（查詢 + 編輯） | 🟠 | Z1FV |
| **P1E** | Notion 標案→Supabase 同步 | 🟡 | 3O5L |
| **P1F** | 多租戶認證中間件 | 🟠 | A44T |

### 最小可行產品（MVP）定義
- ✅ 員工登入（Google OAuth）
- ✅ 查詢知識庫（00A-00E）
- ✅ 編輯知識庫（簡易編輯框）
- ✅ 標案資料讀取（Notion 同步）

不含：
- 協作鎖定機制
- 版本控制
- 進階搜尋

---

## 後續待決項目

1. **認證方案**：是否直接從 Google Workspace OAuth 升級到 Supabase Auth（支援多組織登入）？
2. **權限模型**：知識庫編輯是全員可編輯還是角色限制？
3. **同步策略**：Notion 標案資料是即時 vs 定時同步？每天一次可嗎？

---

## 下一步行動

### 立即推進（本 session）
1. ✅ 決策文件定案（本文檔）
2. [ ] 創建 Supabase 專案 + 初始 schema
3. [ ] 設計多租戶認證中間件

### 並行軌道
- A44T：規劃 Google OAuth 連接層
- ITEJ：準備知識庫 API 規格

---

## 決策依據

### 商業脈絡
- 驗收三件最小展示版後，下一步：SaaS 網頁 + SDK 整合
- 成本考量：Phase 1 保持 $0 月費（免費方案）

### 技術理性
- Supabase：PostgreSQL 是業界標準，性能可靠，無 lock-in
- Google OAuth：員工已有帳號，減少登入摩擦
- 漸進式遷移：現有單用戶邏輯可逐步改造為多租戶

---

**狀態**：待 Jin 批准 → 進入實施
