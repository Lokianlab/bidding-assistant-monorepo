# 基礎建設：DB 安全四層沙盒方案 — 完整規劃

> 文件等級：L2 方法論｜狀態：規劃初版｜出處：快照 [>] infra-db-safety
> 優先序：P1（基礎設施）｜目標完成日：2026-03-05

---

## 一、核心問題

當前瓶頸：
- ❌ 開發、測試、UAT、生產四個環境中，未清晰隔離資料庫層的存取權限
- ❌ 環境變數分散，無統一管理模式
- ❌ 缺少環境切換時的自動驗證（RLS 隔離、機密無洩漏等）
- ❌ 無法確保本機開發不會意外修改遠端 Supabase（多租戶表結構意外改動）

需要解決：
1. **多層隔離架構**：本機（localhost）、staging、UAT、production 各自獨立
2. **環境變數標準化**：統一格式、驗證規則、密鑰管理
3. **自動化安全檢查**：環境切換前驗證、RLS 隔離驗證、commit 前檢查
4. **事故預防**：防止誤刪、誤改、機密洩漏

---

## 二、四層沙盒架構

```
┌─────────────────────────────────────────────┐
│         SaaS Multi-Tenant System            │
├─────────────────────────────────────────────┤
│ 本機開發      Staging         UAT           生產環境    │
│ (localhost)  (dev.app)       (uat.app)     (app.com)   │
├─────────────────────────────────────────────┤
│ Supabase     Supabase         Supabase      Supabase   │
│ Project_DEV  Project_STAGING  Project_UAT   Project_   │
│              (sandbox)        (sandbox)     PROD       │
├─────────────────────────────────────────────┤
│ DB:          DB:              DB:           DB:        │
│ localhost:   hosted.supabase  hosted.       production │
│ 5432         (sandbox)        supabase      (backup)   │
│              (RLS enabled)    (RLS enabled) (RLS       │
│              (reset daily)    (reset weekly)enabled)   │
└─────────────────────────────────────────────┘
```

### 特性對比

| 層級 | 用途 | RLS | 備份 | 重置 | 機密儲存 | 外部存取 |
|------|------|-----|------|------|---------|---------|
| **本機** | 開發、測試 | 本機驗證 | git | 隨時 | .env.local（git ignore） | ❌ 禁止 |
| **Staging** | 整合、演示 | ✅ 啟用 | 自動（日）| 每日 0:00 UTC | GitHub Secrets | 🔐 內部 |
| **UAT** | 使用者驗收 | ✅ 啟用 | 自動（周）| 週末 | GitHub Secrets | 🔐 測試組 |
| **Production** | 正式營運 | ✅ 啟用 | 自動（日） | ❌ 禁止 | AWS Secrets Manager | 🔐 用戶 |

---

## 三、環境變數標準化

### 3.1 變數清單與驗證規則

```typescript
// src/lib/env/schema.ts — Zod 型別驗證

export const EnvSchema = z.object({
  // === 應用基礎 ===
  NODE_ENV: z.enum(['development', 'staging', 'uat', 'production']),
  APP_ENV_LAYER: z.enum(['local', 'staging', 'uat', 'prod']),

  // === Supabase 連線 ===
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(50),     // public key
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(50), // private key（只用於伺服器）

  // === OAuth 配置 ===
  OAUTH_GOOGLE_CLIENT_ID: z.string().min(20),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().min(20), // 禁止在前端
  OAUTH_MICROSOFT_CLIENT_ID: z.string().min(20),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().min(20),

  // === JWT 簽章 ===
  JWT_SECRET: z.string().min(32),     // 本機只用開發密鑰
  JWT_EXPIRY: z.string().default('7d'),

  // === Notion API ===
  NOTION_API_KEY: z.string().min(30),
  NOTION_DATABASE_ID: z.string().length(32), // UUID format

  // === 功能開關 ===
  ENABLE_KB_FEATURE: z.enum(['true', 'false']).default('true'),
  ENABLE_NOTION_SYNC: z.enum(['true', 'false']).default('true'),

  // === 日誌與監控 ===
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
```

### 3.2 分層配置文件

```
bidding-assistant/
  ├── .env.example          ← 所有可用變數（無值）
  ├── .env.local            ← 本機開發（git ignore）
  ├── .env.staging          ← staging 樣板（git 提交，機密用 GitHub Secrets）
  ├── .env.uat              ← UAT 樣板
  ├── .env.production       ← 生產樣板（生產環境值不入 git）
  └── .env.schema.ts        ← 驗證規則
```

### 3.3 .env.example — 標準範本

```bash
# ========== 應用層級 ==========
NODE_ENV=development
APP_ENV_LAYER=local              # local / staging / uat / prod

# ========== Supabase 連線 ==========
# 本機開發用：連接本地 Supabase（docker 或遠端 sandbox）
SUPABASE_URL=http://localhost:54321       # 本機
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... # 匿名公鑰
SUPABASE_SERVICE_ROLE_KEY=...             # 禁止在前端代碼中使用

# 使用者簽名密鑰（本機用隨機密鑰測試，生產用 Supabase 官方簽鑰）
NEXT_PUBLIC_SUPABASE_JWT_SECRET=test-jwt-secret-local-only

# ========== OAuth 設定 ==========
# Google OAuth（申請自 Google Cloud Console）
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=... # 禁止提交到 git

# Microsoft OAuth（申請自 Azure Portal）
OAUTH_MICROSOFT_CLIENT_ID=...
OAUTH_MICROSOFT_CLIENT_SECRET=...

# ========== JWT 簽章 ==========
JWT_SECRET=your-secret-key-min-32-chars  # 本機用開發密鑰，生產環境由 GitHub Secrets 設定
JWT_EXPIRY=7d

# ========== Notion API ==========
NOTION_API_KEY=noti_...  # Notion Integration Token
NOTION_DATABASE_ID=...   # 知識庫資料庫 ID

# ========== 功能開關 ==========
ENABLE_KB_FEATURE=true
ENABLE_NOTION_SYNC=true

# ========== 日誌與監控 ==========
LOG_LEVEL=debug          # 本機用 debug，production 用 warn/error
SENTRY_DSN=             # 可選：Sentry 錯誤追蹤
```

### 3.4 .env.staging / .env.uat — 樣板

```bash
# .env.staging（提交 git，值由 GitHub Actions 替換）
NODE_ENV=production
APP_ENV_LAYER=staging

SUPABASE_URL=https://[project].supabase.co  # Supabase Cloud
SUPABASE_ANON_KEY=${STAGING_SUPABASE_ANON_KEY}    # 從 GitHub Secrets 注入
SUPABASE_SERVICE_ROLE_KEY=${STAGING_SUPABASE_SERVICE_ROLE_KEY}

# OAuth：staging 專用應用
OAUTH_GOOGLE_CLIENT_ID=${STAGING_OAUTH_GOOGLE_CLIENT_ID}
OAUTH_GOOGLE_CLIENT_SECRET=${STAGING_OAUTH_GOOGLE_CLIENT_SECRET}

# JWT：staging 簽章
JWT_SECRET=${STAGING_JWT_SECRET}
JWT_EXPIRY=7d

# Notion：staging 資料庫
NOTION_API_KEY=${STAGING_NOTION_API_KEY}
NOTION_DATABASE_ID=${STAGING_NOTION_DATABASE_ID}

LOG_LEVEL=info
```

---

## 四、本機開發環境設定

### 4.1 本機 Supabase 初始化

```bash
# 步驟 1：啟動 Docker（如果用本機 Supabase）
docker run --rm -p 54321:5432 -p 54322:3000 \
  -e POSTGRES_PASSWORD=postgres \
  supabase/postgres:latest

# 步驟 2：初始化 schema（如果尚未存在）
psql -h localhost -p 54321 -U postgres -d postgres \
  -f src/lib/supabase/schema.sql

# 步驟 3：啟動應用
npm run dev

# 應用應在 http://localhost:3000 啟動
# 本機 Supabase Studio：http://localhost:54322
```

### 4.2 本機 .env.local 樣板（開發者協作）

```bash
# 最低配置（本機 Supabase + OAuth 沙盒）
NODE_ENV=development
APP_ENV_LAYER=local

# 本機 Supabase（Docker 或本地安裝）
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OAuth：本機測試用（向 Google/Microsoft 申請 localhost 應用）
OAUTH_GOOGLE_CLIENT_ID=<local-google-app-id>
OAUTH_GOOGLE_CLIENT_SECRET=<local-secret>

# JWT：本機測試用密鑰
JWT_SECRET=local-test-key-this-is-not-secret

# Notion：本機測試（指向自己的測試資料庫）
NOTION_API_KEY=noti_<your-token>
NOTION_DATABASE_ID=<your-db-id>

LOG_LEVEL=debug
```

### 4.3 .gitignore 更新

```bash
# 禁止提交任何本機機密
.env.local
.env.*.local
.env

# 允許提交樣板（用 GitHub Secrets 替換值）
!.env.example
!.env.staging
!.env.uat
```

---

## 五、自動化驗證系統

### 5.1 環境驗證 Hook（Pre-commit）

```typescript
// .husky/pre-commit
#!/bin/sh

echo "🔒 Checking environment safety..."

# 1. 檢查 .env 是否意外提交
if git diff --cached --name-only | grep -E "\.env\.local|\.env\..*\.local"; then
  echo "❌ ERROR: .env.local 不能提交到 git"
  exit 1
fi

# 2. 檢查是否有機密（密鑰、token）洩漏
if git diff --cached -S "PRIVATE_KEY=" --name-only | grep -E "\.ts|\.js"; then
  echo "❌ ERROR: 發現機密洩漏（PRIVATE_KEY）"
  exit 1
fi

# 3. 驗證環境變數格式（若有 .env 改動）
npm run env:validate

echo "✅ Environment check passed"
```

### 5.2 環境驗證工具

```typescript
// src/lib/env/validate.ts

import { EnvSchema } from './schema';

export function validateEnv(envFile: string): void {
  try {
    EnvSchema.parse(process.env);
    console.log(`✅ ${envFile} validation passed`);
  } catch (error) {
    console.error(`❌ ${envFile} validation failed:`, error);
    process.exit(1);
  }
}

// CLI 使用
// npm run env:validate
```

### 5.3 RLS 隔離驗證（部署前）

```typescript
// scripts/verify-rls-isolation.ts

export async function verifyRLSIsolation() {
  const supabase = createSupabaseClient();

  console.log('🔍 Verifying RLS isolation...\n');

  // 測試 1：無認證用戶無法查詢
  const { data, error } = await supabase
    .from('kb_documents')
    .select('*');

  if (!error) {
    console.error('❌ FAIL: 無認證用戶能查詢 kb_documents（RLS 未啟用）');
    process.exit(1);
  }

  // 測試 2：不同租戶隔離
  const tenant1 = 'tenant-uuid-1';
  const tenant2 = 'tenant-uuid-2';

  // 以 tenant1 身份查詢
  const t1Data = await supabase
    .from('kb_documents')
    .select('*')
    .eq('tenant_id', tenant1)
    .headers({ 'X-Tenant-ID': tenant1 });

  // 以 tenant2 身份查詢
  const t2Data = await supabase
    .from('kb_documents')
    .select('*')
    .eq('tenant_id', tenant2)
    .headers({ 'X-Tenant-ID': tenant2 });

  // 驗證租戶 2 看不到租戶 1 的資料
  if (t1Data.data?.some(doc => doc.tenant_id === tenant1)) {
    console.error('❌ FAIL: 租戶隔離失敗（租戶 2 看到租戶 1 資料）');
    process.exit(1);
  }

  console.log('✅ RLS isolation verification passed');
}
```

### 5.4 環境切換驗證（GitHub Actions）

```yaml
# .github/workflows/env-switch-check.yml

name: Environment Switch Safety Check

on:
  pull_request:
    paths:
      - '.env.staging'
      - '.env.uat'
      - '.github/workflows/**'

jobs:
  env-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate environment files
        run: npm run env:validate

      - name: Check for secret leaks
        run: |
          if grep -r "PRIVATE_KEY=" .env.*; then
            echo "❌ Secret leak detected"
            exit 1
          fi

      - name: Verify RLS configuration
        run: npm run verify:rls
        env:
          SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SERVICE_ROLE_KEY }}
```

---

## 六、部署流程與檢查清單

### 6.1 本機 → Staging 部署

```bash
# 前置檢查
npm run env:validate          # ✅ 環境變數驗證
npm run test                  # ✅ 測試通過
npm run build                 # ✅ 編譯成功

# 部署
npm run deploy:staging        # 自動注入 GitHub Secrets

# 部署後驗證
npm run verify:rls:staging    # ✅ RLS 隔離驗證
curl https://staging.app/health  # ✅ 健康檢查
```

### 6.2 Staging → UAT 部署

同上，但注入 UAT 環境變數

### 6.3 UAT → Production 部署

```bash
# 前置檢查（更嚴格）
npm run env:validate          # ✅ 環境變數驗證
npm run test                  # ✅ 所有測試通過（≥95%）
npm run build                 # ✅ 編譯成功
npm run lint                  # ✅ Lint 檢查通過

# 生產環境變數不入 git，由 AWS Secrets Manager 注入
npm run deploy:production --secrets-from=aws

# 部署後驗證（嚴格）
npm run verify:rls:production
npm run verify:backup         # ✅ 備份完成
npm run verify:health         # ✅ 監控告警正常
```

---

## 七、開發者協作流程

### 7.1 新開發者啟動

```bash
# 1. Clone 專案
git clone ...
cd bidding-assistant

# 2. 複製環境模板
cp .env.example .env.local

# 3. 填入本機值（向 Tech Lead 要）
# 編輯 .env.local：
#  - SUPABASE_URL（本機 Supabase）
#  - OAuth 本機應用 ID/Secret
#  - NOTION_API_KEY（指向測試資料庫）

# 4. 驗證環境
npm run env:validate

# 5. 啟動開發
npm run dev
```

### 7.2 環境切換檢查清單

| 準備 | 檢查項 | 命令 | 結果 |
|------|--------|------|------|
| 本機 → Staging | 環境變數驗證 | `npm run env:validate` | ✅ |
| 本機 → Staging | 無機密洩漏 | `grep -r "SECRET=" .env.*` | ❌ 無匹配 |
| 本機 → Staging | 測試通過 | `npm run test` | ✅ 95%+ |
| Staging → UAT | RLS 隔離驗證 | `npm run verify:rls:uat` | ✅ |
| UAT → Production | 完整驗收 | `npm run verify:production` | ✅ |

---

## 八、實裝路線圖

### Phase 1：基礎（1 週）
- [ ] 環境變數標準化（Zod 型別定義）
- [ ] .env 模板完成（四層標準化）
- [ ] Pre-commit hook 實裝（機密檢查）
- [ ] 本機 Supabase 啟動指南

### Phase 2：自動化（1 週）
- [ ] GitHub Actions 環境驗證工作流
- [ ] RLS 隔離驗證腳本
- [ ] 環境切換前置檢查
- [ ] Sentry 監控整合

### Phase 3：運維（1 週）
- [ ] 日誌管理（本機/staging/uat/prod 隔離）
- [ ] 定期備份驗證
- [ ] 告警規則設定
- [ ] 災難復原演練

---

## 九、成功指標

✅ **Phase 1 完成**：
- [ ] 環境變數通過 Zod 驗證
- [ ] 四層環境獨立運作（本機 100% 隔離）
- [ ] 無任何機密在 git 中
- [ ] 開發者能在 5 分鐘內啟動本機環境

✅ **Phase 2 完成**：
- [ ] GitHub Actions 自動驗證每次 push
- [ ] RLS 隔離驗證 100% 通過
- [ ] 部署前檢查清單 100% 執行

✅ **Phase 3 完成**：
- [ ] 無誤刪誤改事件
- [ ] 備份復原時間 < 1 小時
- [ ] 生產環境穩定性 > 99.9%

---

## 十、風險與應對

| 風險 | 症狀 | 應對 |
|------|------|------|
| 機密洩漏 | OAuth secret 上傳到 git | Pre-commit hook + GitHub Secret Scanning |
| 環境混淆 | 本機開發意外改到 staging DB | 環境變數驗證 + 連線字串檢查 |
| RLS 失效 | 跨租戶查詢成功 | 部署前 RLS 驗證測試 |
| 備份失敗 | 無法恢復生產資料 | 定期備份驗證 + 告警通知 |

---

> **版本**：v0.1 規劃
> **優先序**：P1（基礎設施）
> **下一步**：與技術團隊確認，著手 Phase 1 實裝

