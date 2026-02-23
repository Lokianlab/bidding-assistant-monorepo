# SaaS Phase 1b：OAuth 認證層 — 規格指令

> 狀態：待 A44T 承接確認
> 分派者：JDNE
> 優先序：P1（關鍵路徑）
> 目標完成日：2026-02-27（4 天）

---

## 一、任務概述

為 SaaS Web App 實裝多租戶 OAuth 認證層。使用者透過 Google/Microsoft 登入，自動建立租戶和使用者記錄，獲取 JWT token，存取被 RLS 隔離的 KB 資料。

**依賴**：P1a Supabase schema ✅ 完成
**被依賴**：P1d Web UI（需要登入流程）
**協作方**：ITEJ P1c（KB API 驗證）

---

## 二、技術決策

### 2.1 認證方案選項

| 方案 | 優點 | 缺點 | 推薦 |
|------|------|------|------|
| **Next Auth v5** | 完整框架、支多種 provider、社群大 | 需額外配置 | 推薦 |
| **Supabase Auth 原生** | Supabase 官方、JWT 預設、RLS 無縫整合 | 文件少於 Next Auth | 替代方案 |
| **自製 OAuth** | 完全控制 | 工作量大、易出 bug | 不推薦 |

**建議決策**：使用 **Supabase Auth 原生**（理由：無縫整合 P1c RLS，減少配置複雜度，符合五層決策 Level 2「減少 Jin 時間」）

---

## 三、功能清單

### 3.1 認證流程

```
使用者訪問 /login
  ↓
選擇 Google / Microsoft 登入
  ↓
跳轉到 OAuth provider
  ↓
使用者授權同意
  ↓
Provider 回傳 code
  ↓
後端交換 token（/api/auth/callback）
  ↓
寫入 Supabase users 表（多租戶化）
  ↓
自動建立 tenant 記錄（首次登入）
  ↓
設定 session cookie + JWT
  ↓
重導到 /dashboard
```

### 3.2 核心功能

| 功能 | 說明 | 優先序 |
|------|------|--------|
| **Google OAuth Provider** | 整合 Google 登入 | P0（必須） |
| **Microsoft OAuth Provider** | 整合 Microsoft 登入 | P1（建議） |
| **使用者首次登入自動建立租戶** | users 表 + tenants 表 auto-link | P0 |
| **JWT Token 管理** | 簽發 / 驗證 / 刷新 | P0 |
| **登出流程** | 清除 session + JWT | P0 |
| **驗證中間件** | 保護 /api/* 路由 | P0 |
| **多租戶隔離驗證** | 確認無跨租戶洩漏 | P0 |

---

## 四、實作指南

### 4.1 檔案結構

```
src/lib/auth/
  ├── types.ts              ← 認證相關型別（User / Session / Claims）
  ├── supabase-auth.ts      ← Supabase Auth 設定
  ├── middleware.ts         ← 路由驗證中間件
  └── utils.ts              ← 幫助函式（getSession / createTenant）

src/app/api/auth/
  ├── callback/
  │   └── route.ts          ← OAuth callback handler（GET /api/auth/callback）
  ├── logout/
  │   └── route.ts          ← POST /api/auth/logout
  └── session/
      └── route.ts          ← GET /api/auth/session（回傳目前 session）

src/app/auth/
  └── login/
      └── page.tsx          ← 登入頁面（Google / Microsoft 選項）
```

### 4.2 核心邏輯

```typescript
// src/lib/auth/utils.ts
export async function createTenantIfNew(
  supabase: SupabaseClient,
  user: AuthUser
): Promise<string> {
  // 檢查 tenants 表是否有該使用者
  // 無 → 建立新 tenant（自動帶 user_id）
  // 有 → 回傳既有 tenant_id
}

export async function getSessionWithTenant(
  req: Request
): Promise<{ user: AuthUser; tenant_id: string } | null> {
  // 從 request 取出 JWT
  // 驗證簽章
  // 確認 tenant_id 有效
  // 回傳或 null
}
```

### 4.3 測試清單

| 測試項 | 目標 | 預期結果 |
|--------|------|---------|
| **Google 登入流程** | 完整登入 → 儲存 JWT | 可順暢登入，JWT 簽章有效 |
| **首次登入建立租戶** | 新使用者登入 | 自動建立 tenant 記錄 |
| **再次登入重用租戶** | 既有使用者登入 | 不產生重複 tenant |
| **多租戶隔離** | 租戶 A 查詢租戶 B 資料 | 被 RLS 擋掉（403） |
| **登出清除 session** | 登出後存取受保護路由 | 重導回 /login |
| **JWT 刷新** | token 過期，使用 refresh token | 自動發新 token |
| **跨裝置登入** | 同一帳號多裝置 | 每個裝置有獨立 session |

---

## 五、驗收標準

### 5.1 功能驗收

- [ ] Google OAuth 可成功登入
- [ ] Microsoft OAuth 可成功登入（或標記為可選）
- [ ] 首次登入自動建立租戶 ✅ 驗證無誤
- [ ] 既有使用者重新登入不產生重複租戶 ✅ 驗證無誤
- [ ] 登出成功清除 session
- [ ] JWT token 正確簽章，過期後自動刷新

### 5.2 安全驗收

- [ ] 多租戶隔離：跨租戶查詢被 RLS 擋掉（無法讀到其他租戶資料）
- [ ] CSRF 防護：state parameter 正確使用
- [ ] 機密安全：OAuth client secret / JWT secret 不出現在前端代碼
- [ ] 驗證中間件：未認證請求被擋掉（401）

### 5.3 測試驗收

- [ ] ≥15 個單元測試（Google/Microsoft 流程各 5+ 個，多租戶隔離 5+ 個）
- [ ] ≥5 個整合測試（完整登入流程、logout、token 刷新）
- [ ] `npm test` PASS（無 skip）
- [ ] `npm run build` 成功

---

## 六、時程預估

| 里程碑 | 預計日期 | 完成 |
|--------|---------|------|
| 方案決策 + 檔案結構 | 2026-02-23 | — |
| Google OAuth 實作 + 測試 | 2026-02-24 | — |
| Microsoft OAuth 實作 + 多租戶建立 | 2026-02-25 | — |
| 安全測試 + 隔離驗證 | 2026-02-26 | — |
| 完整測試 + 文件 + 整合就緒 | 2026-02-27 | — |

---

## 七、依賴和協作

### 7.1 上游依賴

- **P1a Supabase schema**：users / tenants 表結構 ✅ JDNE 完成

### 7.2 協作檢查點

1. **與 ITEJ 確認**：P1c KB API 的驗證中間件與 P1b JWT 簽章相容性
   - 檢查 JWT 格式、claims 結構、過期時間設定

2. **與 Z1FV 協調**：P1d UI 登入頁面設計
   - Google / Microsoft 按鈕樣式
   - 登入成功後重導到何處

### 7.3 推送點

完成後推送 commit：`[feat] SaaS P1b OAuth 認證層 + 多租戶建立 + 測試（A44T）`

隨後更新 `.claude/records/_snapshot-A44T.md`：
```
[x] saas-p1b-oauth|OAuth + 多租戶建立 + RLS 隔離驗證|commit XYZ，20+ tests PASS
```

---

## 八、溝通窗口

- **統籌者**：JDNE（遇到阻塞或方案改變直接通知）
- **協作方**：ITEJ（P1c 驗證中間件相容性）
- **下游**：Z1FV（P1d 登入流程 UI）

---

## 九、加分項（若時間充裕）

- [ ] 社交登入信息（頭像 / 姓名）存入 users 表
- [ ] 帳號連結功能（同一使用者多個 OAuth provider）
- [ ] 登入狀態持久化（localStorage + server-side verify）
- [ ] 2FA（雙因子認證） ← 可延後到 Phase 2

---

> **版本**：v0.1
> **發布**：2026-02-23
> **分派者**：JDNE
> **待 A44T 確認承接**

---

## 附錄：參考資源

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/app/building-your-application/authentication)
- [JWT 101](https://datatracker.ietf.org/doc/html/rfc7519)
