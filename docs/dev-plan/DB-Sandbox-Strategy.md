# 資料庫安全沙盒實施策略

> 文件等級：L2 技術規劃｜狀態：提案｜出處：JDNE @20260223

---

## 背景

CLAUDE.md 已規定：「禁止直接修改原始資料庫。實驗、測試、開發一律使用沙盒或複製的資料庫。」

本文定義四類沙盒環境及其使用場景，為各機器提供明確的操作指南。

---

## 原始資料來源確認

| 系統 | 所有者 | 狀態 | 存取規則 |
|------|-------|------|--------|
| **Notion 標案庫** | 大員洛川（實客） | 生產環境 | 只讀（PCC API 抓取） |
| **Supabase 知識庫** | 我們 | 開發/生產混用 | 需隔離 |
| **localhost:3000** | 開發者 | 本機開發 | 無限制 |

### 決策：為什麼需要沙盒？

- **Notion**：客戶實時資料，不能碰 ✓ 已由 API 層隔離
- **Supabase**：自有系統，但 SaaS 上線後會有真實用戶資料 → 需提前建立隔離文化
- **本機 localhost**：開發者獨享，但新機器上線前要驗證設定 → 需要標準化沙盒

---

## 四層沙盒策略

### 層級 1：本機開發環境隔離（每台開發機）

**場景**：日常開發、測試新功能

**方案**：
- **Database**：`localhost:5432/bidding_assistant_dev`（本機 PostgreSQL）
- **Notion Token**：`.env.local` 中 TEST_NOTION_TOKEN（指向測試 DB）
- **Supabase URL**：`http://localhost:54321`（Supabase local emulator）

**操作步驟**：

```bash
# 1. 啟動本機 Supabase emulator
supabase start

# 2. 初始化 schema（使用 P1A 的 init 腳本）
supabase db push

# 3. 填入測試資料
npm run seed:dev

# 4. 驗證隔離（確保連線到本機，不是遠端）
echo $SUPABASE_URL | grep localhost

# 5. 開發後清理（可選）
supabase stop
```

**安全檢查**：
- [ ] git 中 `.env.local` 已加入 `.gitignore`
- [ ] 連線字串驗證本機地址（localhost 或 127.0.0.1）
- [ ] 定期 `npm run seed:dev` 重置測試資料

**責任**：各開發機自維護

---

### 層級 2：整合測試沙盒（shared staging DB）

**場景**：跨機器協調測試、regression 測試、效能測試

**方案**：
- **Supabase Project**：`staging-sandbox` (獨立 Project ID)
- **Database**：`bidding_assistant_staging`
- **環境變數**：`.env.staging`
- **資料生命週期**：每日 00:00 UTC 自動重置（Cron job）
- **容量**：生產環境的 10%（測試資料量）

**操作步驟**：

```bash
# 1. 連線到 staging
export SUPABASE_URL="https://xxx-staging.supabase.co"
export SUPABASE_KEY="staging_anon_key"

# 2. 執行測試
npm test -- --env staging

# 3. 驗證隔離
npm run check:staging-isolation

# 4. 查詢測試資料量（應 << 生產）
supabase db stats --project-id staging-sandbox
```

**自動重置 Cron**：

```ts
// src/app/api/cron/staging-reset/route.ts
export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.STAGING_CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.STAGING_SUPABASE_URL!);

  // 清空所有表（保留 schema）
  await supabase.rpc('reset_staging_schema');

  // 重新填入測試資料
  await seed('staging');

  return Response.json({ success: true, message: 'Staging reset completed' });
}
```

**安全檢查**：
- [ ] staging 與生產完全分離（不同 Project）
- [ ] 定期自動重置
- [ ] 無真實用戶資料（100% synthetic）

**責任**：JDNE 維護 + A44T 協助監控

---

### 層級 3：驗收預演環境（production-like staging）

**場景**：上線前完整驗收、負載測試、安全測試

**方案**：
- **Supabase Project**：`uat-sandbox`（UAT = User Acceptance Test）
- **Database**：`bidding_assistant_uat`
- **資料**：生產環境的複製（sanitized）
- **環境變數**：`.env.uat`
- **特點**：與生產環境配置完全相同，除了資料和 token

**操作步驟**：

```bash
# 1. 從生產庫複製 schema（不複製資料）
supabase db clone \
  --project-id production-id \
  --clone-name uat-sandbox \
  --schema-only

# 2. 填入 sanitized 測試資料（去敏感信息）
npm run seed:uat -- --sanitize

# 3. 負載測試
npm run load-test -- --target uat

# 4. 安全掃描
npm run security:scan -- --target uat

# 5. 驗收通過後，保留快照供查詢
supabase db export --project-id uat-sandbox > /backups/uat-pre-launch.sql
```

**Sanitization 規則**：

```ts
// src/scripts/sanitize-data.ts
export async function sanitizeForUAT(supabase: SupabaseClient) {
  // 去除真實 email，換成 test-{id}@example.com
  await supabase.rpc('sanitize_emails', { domain: 'example.com' });

  // 去除真實電話號碼
  await supabase.rpc('sanitize_phone_numbers');

  // 保留結構，不改業務邏輯
}
```

**安全檢查**：
- [ ] UAT 環境配置與生產相同
- [ ] 所有敏感資料已 sanitized
- [ ] 無真實用戶接觸
- [ ] 驗收簽核記錄

**責任**：Z1FV 主導驗收 + JDNE 協調

---

### 層級 4：生產環境隔離（多租戶隔離）

**場景**：真實用戶資料，需要租戶級隔離

**方案**：
- **Database**：`bidding_assistant_prod`（單一真實生產庫）
- **隔離機制**：Supabase RLS policies（P1F 實作）
- **訪問控制**：
  - 讀：只能讀自己租戶資料
  - 寫：role-based（admin/member/viewer）
  - 刪除：admin only
- **審計日誌**：所有修改記錄到 `audit_logs` 表

**操作步驟**：

```bash
# 1. 啟用 RLS（P1A 已設定，P1F 補完 policies）
supabase db alter-table kb_items --enable-rls

# 2. 驗證 RLS 生效（試圖讀取其他租戶資料應失敗）
npm run test:rls-policies

# 3. 監控異常（定期審查 audit_logs）
npm run audit:suspicious-queries -- --prod

# 4. 緊急回滾計劃（如有資料誤操作）
supabase db restore --backup-id <backup-id>
```

**Safety Rails**：

| 操作 | 風險級 | 防護機制 |
|------|-------|--------|
| SELECT | 低 | RLS policy + audit log |
| INSERT | 中 | 租戶 ID 驗證 + RLS |
| UPDATE | 中 | 同上 + 變更日誌 |
| DELETE | 高 | admin only + 軟刪除（added deleted_at） |
| DDL (ALTER TABLE) | 超高 | 只有 JDNE + 備份前置條件 |

**責任**：JDNE + 每月安全審計

---

## 使用決策樹

```
開發者做什麼？
├─ 日常開發、寫代碼、測試功能
│  └─ 使用【層級 1】本機環境
│     └─ 流程：.env.local + localhost:5432
│
├─ 跨機器協調、共同測試
│  └─ 使用【層級 2】staging 沙盒
│     └─ 流程：.env.staging + staging-sandbox
│
├─ 上線前驗收、負載測試
│  └─ 使用【層級 3】UAT 沙盒
│     └─ 流程：.env.uat + uat-sandbox
│
└─ 真實用戶、生產資料
   └─ 使用【層級 4】生產環境（RLS 隔離）
      └─ 流程：.env.production + bidding_assistant_prod + RLS policies
```

---

## 檢查清單：新機器上線驗證

| 項目 | 檢查方式 | 通過標準 |
|------|--------|--------|
| 本機 DB 隔離 | `npm run check:env` | 連線到 localhost:5432 |
| Notion 隔離 | `echo $TEST_NOTION_TOKEN` | 指向 TEST DB ID |
| 種子資料 | `npm run seed:dev && npm test` | 全測試通過 |
| git 隔離 | `git diff --check` | 無 `.env.local` 提交 |
| 連線驗證 | `npm run db:status` | 顯示 localhost |

---

## 常見失誤 & 預防

| 失誤 | 原因 | 預防方式 |
|------|------|--------|
| 誤修改生產庫 | `.env.local` 沒配對 | 啟動時驗證 `SUPABASE_URL` |
| 測試資料污染 staging | 種子腳本寫錯 | 每次推送前 `npm run seed:dev` 驗證 |
| 忘記重置 UAT | 手動流程繁瑣 | 自動 cron + 提醒 |
| RLS policy 寫錯洩漏資料 | P1F 實作不當 | 單獨 RLS 測試套件 + code review |

---

## 後續優化

- **Phase 2**：Docker Compose 一鍵啟動沙盒（含 Supabase local）
- **Phase 3**：資料集市（合成資料生成器，支援各種場景）
- **Phase 4**：自動化 regression suite（每次 PR 自動跑多層沙盒測試）

---

## 文件與腳本清單

| 檔案 | 目的 | 狀態 |
|------|------|------|
| `.env.example` | 環境變數範本 | ✅ 已有 |
| `.env.local` | 本機配置 | 🔧 待補完 |
| `.env.staging` | staging 配置 | 🔧 待建立 |
| `.env.uat` | UAT 配置 | 🔧 待建立 |
| `scripts/seed:dev` | 本機種子資料 | 🔧 待優化 |
| `scripts/seed:staging` | staging 種子資料 | 🔧 待建立 |
| `scripts/seed:uat` | UAT 種子資料 + sanitize | 🔧 待建立 |
| `src/app/api/cron/staging-reset` | 自動重置 cron | 🔧 待實作 |
| `tests/rls-policies.test.ts` | RLS 驗證測試 | 🔧 待實作 |

---

## 簽核

- **提案者**：JDNE
- **技術審查**：（待 A44T 審查）
- **最終批准**：Jin
