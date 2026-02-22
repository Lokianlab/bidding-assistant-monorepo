OP|20260223-0745|JDNE

## 摘要
SaaS 架構 Phase 1a 完成：Supabase schema 設計 + 客戶端初始化層。

## 背景
商業脈絡指出驗收後下一步是 SaaS 網頁 + SDK 整合。基於既有的 SaaS 架構討論（Layer 1-2 已確認），推進 Layer 3（基礎設施決策）。

## 決策
1. **知識庫儲存**：Supabase PostgreSQL（vs Notion API）
   - 理由：高頻讀寫、支援巢狀結構、pgvector 預留語意搜尋、Phase 1 免費方案
2. **認證系統**：Google Workspace OAuth
   - 理由：員工已有帳號、無額外成本
3. **多租戶模型**：tenant 維度隔離

## 產出
### Layer 3 確認（決策文件）
- `bidding-assistant/docs/dev-plan/SaaS-Architecture-v0.2-Decision.md`
- Layer 1-5 完整規劃
- P1A-P1F 分階段實施計劃

### 代碼準備
- `src/lib/db/supabase-init.sql`：7 表結構（tenants, users, kb_items, bids, settings, sync_logs）
- `src/lib/db/supabase-client.ts`：Supabase 客戶端初始化
- `.env.supabase.example`：環境變數配置指南

## 待決議
1. 員工知識庫編輯權限模型（全員 vs 角色限制）
2. 標案資料跨租戶共享策略
3. Notion 同步頻率（即時 vs 定時）

## 教訓
- 架構決策需文件化以便追蹤決策依據
- Schema 設計應包含 RLS 預留，便於未來安全加強
- 環境變數範本可加速新機器 onboarding

## 下一步
P1B（Google OAuth 連接層）由 A44T 推進
