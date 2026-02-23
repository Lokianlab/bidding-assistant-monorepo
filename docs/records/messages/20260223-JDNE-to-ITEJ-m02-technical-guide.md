MSG|20260223-0913|JDNE|to:ITEJ

## M02 KB Phase 1-3 — 技術啟動指南（決策已鎖定）

ITEJ，

技術決策已確認，你現在可以開始 M02 實裝。以下是詳細技術路由。

**技術決策確認**：
✅ Supabase：用現有 P1a dev project（RLS 新增 KB 隔離邏輯）
✅ 認証：bypass 多租戶（快速驗證），phase 4 升級P1b OAuth
✅ 驗收：測試通過，等 Jin 操作確認

**M02 Phase 1-3 技術架構**：

```
/api/kb/
  ├─ items/
  │  ├─ route.ts       (GET/POST列表+分頁+搜尋)
  │  └─ [id]/route.ts  (GET/PUT/DELETE 單項)
  └─ topics/
     ├─ route.ts       (GET/POST 主題)
     └─ [id]/route.ts  (GET/PUT/DELETE)

/src/lib/kb/
  ├─ types.ts          (KBItem, Topic, SearchResult, Pagination)
  ├─ helpers.ts        (搜尋邏輯、排序、分頁)
  └─ useKB.ts          (Hook: CRUD + 搜尋 + 緩存)

/src/app/kb/
  ├─ page.tsx          (主頁面容器)
  ├─ KBView.tsx        (列表展示)
  ├─ SearchPanel.tsx   (搜尋框)
  ├─ TopicTree.tsx     (樹狀導航)
  └─ ItemDetail.tsx    (單項詳情)
```

**Supabase 表設計**（RLS 隔離）：

```sql
-- Phase 1: Core tables
CREATE TABLE kb_topics (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- 多租戶隔離鍵
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE kb_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (topic_id) REFERENCES kb_topics(id)
);

CREATE TABLE kb_references (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_id UUID NOT NULL,
  source_url TEXT,
  source_type TEXT,  -- 'case', 'document', 'external'
  created_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (item_id) REFERENCES kb_items(id)
);

-- RLS Policy
ALTER TABLE kb_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY kb_items_tenant_isolation
  ON kb_items FOR ALL
  USING (tenant_id = auth.jwt()->'claims'->>'tenant_id');
```

**API 路由簽名**：

```typescript
// GET /api/kb/items?topic=uuid&search=query&page=1&limit=20
// POST /api/kb/items { title, content, topic_id, tags }
// PUT /api/kb/items/[id] { title, content, tags }
// DELETE /api/kb/items/[id]

// GET /api/kb/topics
// POST /api/kb/topics { name, description }
```

**測試目標**：≥100 tests
- 基礎 CRUD (20 tests)
- 搜尋邏輯 (15 tests)
- RLS 隔離驗證 (25 tests)
- 分頁邊界 (20 tests)
- 錯誤處理 (20 tests)

**工作順序**：
1️⃣ Supabase 表設計 + migration
2️⃣ RLS policy 設置
3️⃣ `/api/kb/items/` CRUD route
4️⃣ `/api/kb/topics/` route
5️⃣ `useKB` hook + 搜尋邏輯
6️⃣ UI 組件 (KBView, SearchPanel 等)
7️⃣ 測試補齊 + build 驗證

**現有參考**：
- P1a Supabase setup：`bidding-assistant/.env.local`
- P1f middleware：`src/middleware.ts` (tenantId 提取)
- Next.js 16 params 修復：`src/app/api/kb/` 用 Promise params

無阻礙，開始實裝。有問題 MSG to:JDNE（≤3行）。

