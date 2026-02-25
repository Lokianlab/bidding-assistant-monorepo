# SaaS Phase 1F：多租戶認證中間件規格

> 負責方：A44T｜優先級：🔴 高｜里程碑：SaaS Phase 1

---

## 目標

建立統一的多租戶隔離中間件，在請求層自動注入租戶 ID 並驗證權限：
- **自動租戶識別**：從 session/token 中提取租戶 ID
- **請求隔離**：每個請求自動綁定租戶上下文
- **資料自動過濾**：API routes 和 Supabase 查詢自動加租戶過濾
- **權限驗證**：role-based 操作檢查（admin/member/viewer）

---

## 技術棧

- **Middleware**：Next.js middleware（edge function）
- **Context**：React Context + Next.js headers 傳遞
- **Supabase RLS**：Policy 層最終安全檢查
- **API Routes**：統一守衛函式模式

---

## 架構設計

### 多層防禦

```
1. Next.js Middleware (Edge)      ← 最快速檢查，無效請求擋在外
   ↓
2. API Route Guards               ← 業務邏輯層檢查
   ↓
3. Supabase RLS Policies          ← 資料庫層最終檢查
```

### 請求流程

```
HTTP Request
    ↓
Next.js Middleware
  ├─ 無 session → redirect /login
  ├─ session.user.tenantId 註入 headers
  └─ 放行
    ↓
API Route Handler
  ├─ 提取 x-tenant-id header
  ├─ 驗證 role（如需要）
  └─ 呼叫 service 層
    ↓
Service Layer / Supabase
  ├─ 自動加 `tenant_id = {from headers}` filter
  └─ RLS 再次驗證
```

---

## 實現清單

### A. Next.js Middleware

**檔案**：`middleware.ts`（專案根目錄）

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const protectedRoutes = ['/api/kb', '/api/bids', '/kb', '/dashboard', '/settings'];
const publicRoutes = ['/', '/login', '/auth'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 公開路由直接放行
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 受保護路由需要驗證
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const session = await getSessionFromRequest(request);

    if (!session?.user?.tenantId) {
      // 無 session 重導至登入
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 注入租戶 ID 到 headers（傳遞給 API routes）
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', session.user.tenantId);
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-role', session.user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### B. API Route Guards

**檔案**：`src/lib/api/guards.ts`（新增）

```ts
import { NextRequest } from 'next/server';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
}

/**
 * 從請求 headers 提取租戶上下文
 * 用於 API routes
 */
export function getTenantContext(request: NextRequest): TenantContext {
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') as TenantContext['role'];

  if (!tenantId || !userId || !role) {
    throw new Error('Missing tenant context headers');
  }

  return { tenantId, userId, role };
}

/**
 * API route 路由守衛
 * 使用方式：
 *   export async function GET(req: NextRequest) {
 *     const { tenantId, userId, role } = withTenant(req);
 *     // ... 業務邏輯
 *   }
 */
export function withTenant(request: NextRequest) {
  return getTenantContext(request);
}

/**
 * 權限檢查
 * 使用方式：
 *   const { tenantId, userId, role } = getTenantContext(req);
 *   requireRole(role, ['admin']); // 只允許 admin
 */
export function requireRole(
  userRole: string,
  allowedRoles: string[]
) {
  if (!allowedRoles.includes(userRole)) {
    throw new HttpError(403, `Forbidden: requires role ${allowedRoles.join(' or ')}`);
  }
}

/**
 * 錯誤類
 */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
```

### C. Supabase 客戶端增強

**檔案**：`src/lib/db/supabase-client.ts`（修改 P1A）

```ts
/**
 * 建立租戶隔離查詢
 * 自動在所有 SELECT/INSERT/UPDATE/DELETE 上加租戶過濾
 */
export function createTenantQuery<T>(
  supabase: SupabaseClient,
  tenantId: string,
  tableName: string
) {
  return {
    select: (columns = '*') =>
      supabase
        .from(tableName)
        .select(columns)
        .eq('tenant_id', tenantId),

    insert: (data: T) =>
      supabase
        .from(tableName)
        .insert({ ...data, tenant_id: tenantId }),

    update: (data: Partial<T>) =>
      supabase
        .from(tableName)
        .update(data)
        .eq('tenant_id', tenantId),

    delete: () =>
      supabase
        .from(tableName)
        .delete()
        .eq('tenant_id', tenantId),
  };
}

// 使用方式
export async function getKBItemsForTenant(tenantId: string) {
  const { data, error } = await createTenantQuery(supabase, tenantId, 'kb_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### D. API Route 範例

**檔案**：`src/app/api/kb/items/route.ts`（P1C 修改）

```ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/api/guards';
import { getSupabaseClient } from '@/lib/db/supabase-client';

export async function GET(req: NextRequest) {
  try {
    // 1. 提取租戶上下文
    const { tenantId } = withTenant(req);

    // 2. 查詢（自動帶租戶過濾）
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kb_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = withTenant(req);
    const body = await req.json();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kb_items')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        ...body,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

### E. Supabase RLS 策略

**檔案**：已在 P1B 中定義，P1F 補充完整 policy

```sql
-- kb_items 表的 RLS policies

-- Policy 1: 使用者只能讀取自己租戶的資料
CREATE POLICY "users can read own tenant data" ON kb_items
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy 2: 只有 admin 和 editor 能寫入
CREATE POLICY "only admin and editor can insert" ON kb_items
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM users
      WHERE id = auth.uid()
    ) IN ('admin', 'editor')
  );

-- Policy 3: 只能更新自己租戶的資料
CREATE POLICY "can update own tenant data" ON kb_items
  FOR UPDATE USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy 4: 只有 admin 能刪除
CREATE POLICY "only admin can delete" ON kb_items
  FOR DELETE USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM users
      WHERE id = auth.uid()
    ) = 'admin'
  );
```

### F. 錯誤處理

**檔案**：`src/lib/api/errors.ts`（新增）

```ts
export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function handleApiError(error: Error) {
  if (error.name === 'TenantError') {
    return { status: 400, message: error.message };
  }
  if (error.name === 'UnauthorizedError') {
    return { status: 401, message: error.message };
  }
  if (error.name === 'ForbiddenError') {
    return { status: 403, message: error.message };
  }
  return { status: 500, message: 'Internal Server Error' };
}
```

---

## 測試計劃

| 場景 | 預期結果 |
|------|--------|
| 無 session 訪問 /kb | 重導至 /login |
| 有 session 訪問 /kb | 正常載入 |
| 租戶 A 的使用者呼叫 /api/kb/items | 只返回租戶 A 的項目 |
| 租戶 B 的使用者呼叫 /api/kb/items | 只返回租戶 B 的項目 |
| Member 呼叫 POST /api/kb/items | 成功建立（201） |
| Viewer 呼叫 POST /api/kb/items | 403 Forbidden |
| Admin 呼叫 DELETE /api/kb/items/{id} | 成功刪除（200） |
| Member 呼叫 DELETE /api/kb/items/{id} | 403 Forbidden |
| 手動修改 x-tenant-id header | Supabase RLS 攔截（0 rows） |

---

## 驗收標準

- [ ] Middleware 正常注入租戶 ID
- [ ] API routes 自動過濾租戶資料
- [ ] 無租戶 ID 的請求返回 400 Bad Request
- [ ] 租戶隔離檢查通過（租戶 A 無法看到租戶 B 的資料）
- [ ] 角色檢查生效（viewer 無法寫入）
- [ ] 30+ 測試通過
- [ ] Lighthouse 效能無退化（middleware overhead < 10ms）

---

## 後續與進階

### 常見改進

- **Token 刷新**：Session 過期自動刷新
- **Rate Limiting**：租戶級 rate limit（防濫用）
- **Audit Logging**：所有修改操作記錄到 audit_logs 表
- **Tenant Switching**：管理員多租戶切換（未來支援）

### 安全加強

- CSRF token 驗證
- CORS 政策（租戶隔離）
- API key 隔離（如有 B2B 場景）

---

## 依賴關係

- **需要 P1B 完成**（Session 管理）
- **需要 P1A 完成**（Supabase 初始化）
- **需要 P1C 完成**（API routes 基礎）

---

## 所需依賴

```json
{
  "next": "^16.x",
  "@supabase/supabase-js": "^2.38.0"
}
```

無額外依賴，使用 Next.js 原生 middleware。
