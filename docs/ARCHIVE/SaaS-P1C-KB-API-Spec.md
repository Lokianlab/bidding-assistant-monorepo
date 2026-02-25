# SaaS Phase 1C：知識庫 API 規格

> 負責方：ITEJ｜優先級：🟠 中高｜依賴：P1B（OAuth）完成

---

## 目標

實現知識庫（00A-00E）的 CRUD API 路由，支援：
- 多層次查詢（分類 + 搜尋 + 階層）
- 即時編輯同步
- 多租戶隔離

---

## API 端點清單

### 查詢端點

**GET `/api/kb/items`**
- 參數：`category` (00A|00B|00C|00D|00E), `search?`, `parent_id?`
- 返回：陣列 + 分頁
- 驗證：需認證 + 租戶隔離

```ts
// 使用範例
GET /api/kb/items?category=00B&search=實績&parent_id=uuid
Response: {
  data: [
    {
      id: "uuid",
      title: "2024 標案 A 勝投",
      category: "00B",
      content: "...",
      created_at: "2026-02-23T...",
      created_by: "user@example.com"
    }
  ],
  total: 1,
  page: 1
}
```

**GET `/api/kb/items/:id`**
- 返回：單一項目 + 子項目列表
- 包含：完整內容、編輯歷史（簡化版）

### 建立/編輯端點

**POST `/api/kb/items`**
- 參數：`category`, `title`, `content`, `parent_id?`, `tags?`
- 驗證：需認證 + 檢查權限
- 返回：新建項目

**PATCH `/api/kb/items/:id`**
- 參數：`title?`, `content?`, `tags?`
- 記錄：自動設定 `updated_by` 和 `updated_at`
- 返回：更新後項目

**DELETE `/api/kb/items/:id`**
- 驗證：admin 角色或項目建立者
- 返回：成功訊息

---

## 實現清單

### A. API 路由框架

**檔案組織**：
```
src/app/api/kb/
  ├── items/
  │   ├── route.ts          # GET (list) + POST (create)
  │   ├── [id]/
  │   │   └── route.ts      # GET (single) + PATCH + DELETE
  │   └── __tests__/
  └── search/
      └── route.ts          # 進階搜尋
```

### B. 認證 + 租戶隔離中間件

**檔案**：`src/lib/api/kb-middleware.ts`

```ts
export async function requireAuth(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized', { cause: 401 });
  return session;
}

export async function getTenantFromSession(session: Session) {
  // 從 next-auth session 取 tenantId
  return session.user.tenantId;
}

export function withTenantFilter(query: PostgrestQueryBuilder) {
  // 自動加上 .eq('tenant_id', tenantId)
  return query;
}
```

### C. 查詢實現（初稿）

```ts
// src/app/api/kb/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { requireAuth, getTenantFromSession } from '@/lib/api/kb-middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const tenantId = await getTenantFromSession(session);

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const parentId = url.searchParams.get('parent_id');

    const supabase = getSupabaseClient();
    let query = supabase
      .from('kb_items')
      .select('*')
      .eq('tenant_id', tenantId);

    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('title', `%${search}%`);
    if (parentId) query = query.eq('parent_id', parentId);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      total: count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const tenantId = await getTenantFromSession(session);
    const userId = session.user.id;

    const body = await request.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('kb_items')
      .insert({
        tenant_id: tenantId,
        category: body.category,
        title: body.title,
        content: body.content,
        parent_id: body.parent_id,
        tags: body.tags,
        created_by: userId,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### D. 搜尋優化

利用 PostgreSQL 全文搜尋（tsvector）：
```ts
// 進階搜尋
const { data } = await supabase
  .from('kb_items')
  .select('*')
  .textSearch('search_text', `'${searchTerm}':*`)
  .eq('tenant_id', tenantId);
```

---

## 測試計劃

| 端點 | 測試用例 | 預期 |
|------|--------|------|
| GET /api/kb/items | 列出所有知識庫 | 200 + 陣列 |
| GET /api/kb/items?category=00B | 篩選分類 | 200 + 只有 00B |
| GET /api/kb/items?search=關鍵字 | 搜尋標題 | 200 + 相符項目 |
| POST /api/kb/items | 新建知識庫項目 | 201 + 新 UUID |
| PATCH /api/kb/items/:id | 編輯項目 | 200 + 更新內容 |
| DELETE /api/kb/items/:id | 刪除項目 | 204 + 資料庫確認已刪 |
| (未認證) GET /api/kb/items | 無 token | 401 |

---

## 驗收標準

- [ ] 6 個 API 端點功能正常
- [ ] 租戶隔離有效（A 租戶看不到 B 租戶資料）
- [ ] 認證檢查生效
- [ ] 搜尋功能工作
- [ ] 層級關係（parent_id）正確保存和查詢
- [ ] 40+ 測試用例全過

---

## 效能要求

- 列表查詢 < 500ms（含 Supabase 網路延遲）
- 搜尋 < 1s
- 索引應覆蓋：`(tenant_id, category)`, `search_text`, `parent_id`

---

## 後續

- P1D：知識庫 UI（呼叫這些 API）
- P1E：Notion 同步（更新知識庫項目）

---

## 所需依賴

已安裝：
- next.js (api routes)
- @supabase/supabase-js
- next-auth (用於 getServerSession)

新增：
```json
{
  "next-auth": "^4.23.0"
}
```
