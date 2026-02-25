# SaaS Phase 1B：Google OAuth 連接層規格

> 負責方：A44T｜優先級：🔴 高｜里程碑：SaaS Phase 1

---

## 目標

建立 Google Workspace OAuth 認證層，支援：
- 使用者透過 Google 帳號登入
- 租戶自動建立（基於 email domain）
- Session 管理 + token 刷新

---

## 技術棧

- **OAuth 2.0 Library**：`next-auth.js`（已支援 Google Provider）
- **Supabase Auth**：暫時不用，先用 next-auth 過渡到 OAuth
- **Session 儲存**：Supabase（users 表）

---

## 實現清單

### A. next-auth.js 配置

**檔案**：`src/app/api/auth/[...nextauth]/route.ts`

```ts
// 偽代碼
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // 檢查 email domain 是否允許（NEXT_PUBLIC_WORKSPACE_DOMAIN）
      // 自動建立 tenant（如果不存在）
      // 建立 users 表記錄
      return true;
    },
    async session({ session, user }) {
      // 附加 tenant_id 和角色信息
      session.user.tenantId = user.tenantId;
      session.user.role = user.role;
      return session;
    },
  },
};
```

### B. Supabase 中間件

**檔案**：`src/lib/auth/supabase-auth-sync.ts`

職責：
1. `signIn` 時同步到 Supabase（建立 tenant + user 記錄）
2. 處理已存在使用者的登入（無需重複建立）
3. 更新 `users.last_login_at`

```ts
export async function syncGoogleUserToSupabase(
  googleEmail: string,
  googleName?: string
) {
  const domain = googleEmail.split('@')[1];

  // 1. 找或建立 tenant
  let tenant = await supabase
    .from('tenants')
    .select('*')
    .eq('google_workspace_domain', domain)
    .single();

  if (!tenant.data) {
    // 建立新 tenant
    tenant = await supabase
      .from('tenants')
      .insert({ name: domain, google_workspace_domain: domain })
      .select()
      .single();
  }

  // 2. 找或建立 user
  let user = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenant.data.id)
    .eq('google_email', googleEmail)
    .single();

  if (!user.data) {
    user = await supabase
      .from('users')
      .insert({
        tenant_id: tenant.data.id,
        google_email: googleEmail,
        display_name: googleName,
        role: 'member',  // 預設，管理員後續手動設定
      })
      .select()
      .single();
  }

  return { tenant: tenant.data, user: user.data };
}
```

### C. 登入頁面修改

**檔案**：`src/app/page.tsx`（首頁）或新建 `src/app/auth/login/page.tsx`

- 新增「Google 登入」按鈕
- 使用 `next-auth` 的 `signIn('google')`
- 登入成功後重導向到 dashboard

### D. 環境變數確認

需要在 `.env.local` 設定：
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...  # next-auth 用
NEXTAUTH_URL=http://localhost:3000  # 開發環境
```

### E. RLS Policy（Supabase）

**policy 規則**：
- 使用者只能讀取自己租戶的資料
- 寫入需要 admin 角色（知識庫編輯等）

```sql
CREATE POLICY "users can read own tenant data" ON kb_items
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = current_user_id()
    )
  );
```

---

## 測試計劃

| 場景 | 預期結果 |
|------|--------|
| 首次 Google 登入（新域名） | 建立 tenant + user，自動登入 dashboard |
| 同域名第二個使用者登入 | 加入既有 tenant，建立 user 記錄 |
| 登入後重新整理頁面 | Session 保留，仍在 dashboard |
| 登出 | Session 清除，重導向首頁 |

---

## 驗收標準

- [ ] next-auth 正常運作
- [ ] 新使用者登入自動建立 tenant + user
- [ ] Supabase users 表有登入記錄
- [ ] Dashboard 頁面能正確顯示登入使用者
- [ ] 登出功能正常

---

## 後續
- P1F：多租戶認證中間件（需依賴此段完成）
- Supabase Auth 遷移（未來 Phase 2）

---

## 所需依賴

```json
{
  "next-auth": "^4.23.0",
  "@supabase/supabase-js": "^2.38.0"
}
```

確認已安裝：`npm list next-auth @supabase/supabase-js`
