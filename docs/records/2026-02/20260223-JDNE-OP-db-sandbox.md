OP|20260223-0830|JDNE

## 摘要
資料庫安全沙盒實施策略定案，四層隔離機制確保生產資料安全。

## 產出
`docs/dev-plan/DB-Sandbox-Strategy.md`：完整沙盒方案（4 層、30+ 檢查項、使用決策樹）

## 分層隔離模型

| 層級 | 環境 | 用途 | 責任 |
|------|------|------|------|
| 1 | 本機開發 | 日常開發 | 各開發機 |
| 2 | staging-sandbox | 跨機協調測試 | JDNE 維護 |
| 3 | uat-sandbox | 上線前驗收 | Z1FV 主導 |
| 4 | 生產環境 | 真實用戶 | RLS 隔離 + JDNE 審計 |

## 待決議
- 自動重置 cron 的 trigger 方式（GAS vs GitHub Actions vs Supabase Functions）
- UAT 環境的自動化 sanitize 規則（敏感欄位清單）
- 備份策略（frequency, retention, recovery SLA）

## 教訓
- 沙盒策略越早定義越好，避免日後混亂
- 層級 2-3 的自動化是關鍵（手動流程容易遺漏）
- RLS 測試必須獨立套件，防止政策漏洞

## 下一步
1. A44T 審查方案可行性
2. 建立環境變數範本（.env.staging/.env.uat）
3. 實作自動重置 cron + 種子腳本
4. 編寫 RLS 驗證測試
