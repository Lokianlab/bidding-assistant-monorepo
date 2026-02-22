MSG|20260223-0840|AINL|OP:db-sandbox-evaluation

## A44T db-sandbox-方案評估

**評估對象**：`bidding-assistant/docs/dev-plan/_staging/db-sandbox-方案.md`（方案 D：混合模式）
**評估角度**：實現可行性、風險點、測試完備性
**結論**：方案可行，但需要澄清 4 個技術細節，建議 R2 先驗證再全面推進

---

## 技術風險分析

### R1: JSON Mock 同步漂移風險（中）
**問題**：Notion DB schema 演進時，JSON mock 如果沒有自動同步機制，會與實際欄位狀態不一致。
**影響範圍**：單元測試和整合測試間的差異、新欄位遺漏
**建議**：
- export 腳本應包含 schema 驗證（欄位類型、選項值）
- 在 CI/CD 中定期校驗 JSON mock 的欄位完整性
- 新增欄位時，增加 pre-commit hook 檢查 mock 版本

### R2: Relation/Rollup 複製完整度（高）
**問題**：A44T 明確指出 relation 和 rollup 「無法完美複製」，但未說明具體缺陷。
**影響**：
- 如果 KB matrix 中的 relation fields 複製不完美，沙盒 DB 的查詢邏輯可能與生產環境差異
- 測試在沙盒通過，生產環境失敗的風險
**建議**：
- **先驗證**：創建沙盒 DB，實際複製一筆含 relation 的資料，測試 relation 欄位的查詢結果
- 若複製成功率 > 95%，可放心推進；若 < 80%，需調整策略（如只複製基本欄位子集）

### R3: 環境變數管理（中）
**問題**：三層環境（local mock / staging sandbox / production live）都需要環境變數，多機器協作時易出錯。
**具體風險**：
- 機器 A 在 `.env.sandbox` 上設錯 DB ID，被其他機器抄到
- 新機器設定 `.env.staging` 時，不知道 sandbox DB ID 從哪裡來
**建議**：
- 在 `.env.example` 明確標示：
  - `NOTION_MODE=mock|sandbox|live`（預設 `mock`）
  - `NOTION_SANDBOX_DB_ID=<由 Notion UI 複製後的值>`（無預設值，必填）
  - `NOTION_LIVE_DB_ID=<生產環境 DB ID>`（無預設值，必填）
- 在 `docs/dev-environment.md` 加入「設定沙盒的步驟」

### R4: 多機器測試隔離（低）
**問題**：若有機器跑 `NOTION_MODE=sandbox`，所有機器的測試都會使用同一份沙盒 DB，測試間可能互相污染。
**影響**：如果沙盒 DB 被一台機器修改，其他機器的測試結果不穩定
**建議**：
- **推薦做法**：開發階段推薦用 `NOTION_MODE=mock`（JSON 離線，無污染風險）
- `NOTION_MODE=sandbox` 只用於整合測試或 staging 驗證，不用於單元測試
- 在 `.env.example` 加註，提醒「不同環境的適用場景」

---

## 實現清單

### 第 1 優先級（必須）
- [ ] 編寫 `scripts/export-notion-data.ts`
  - 讀所有 pages，輸出 `public/notion-mock-data.json`
  - 包含 schema 驗證（欄位數量、型別）
  - 輸出 log：「匯出 XX 筆資料，YY 個欄位，版本：<timestamp>」

- [ ] API route 加 mock 模式
  - 讀環境變數 `NOTION_MODE`
  - 若為 `mock` 或 undefined（預設），從 JSON 讀數據
  - 若為 `sandbox` 或 `live`，使用 Notion API

- [ ] `.env.example` 加詳細說明
  ```
  # Notion 資料庫模式
  # mock: 使用本地 JSON（開發/單元測試，推薦）
  # sandbox: 使用 Notion 沙盒 DB（整合測試）
  # live: 使用生產環境 DB（僅 production）
  NOTION_MODE=mock

  # 沙盒 DB ID（從 Notion UI 複製，需先手動建立沙盒 DB）
  # NOTION_SANDBOX_DB_ID=...
  ```

### 第 2 優先級（建議）
- [ ] Notion UI 建立沙盒 DB（手動操作）
  - 複製一份原始 DB（透過 Notion 的「複製資料庫」功能）
  - 記錄沙盒 DB 的 ID，填入 `.env.staging`

- [ ] 驗證 relation/rollup 複製完整度
  - 在沙盒 DB 中建一筆含有 relation 的記錄
  - 透過 API 查詢，確認 relation 欄位正確返回

- [ ] 在 CI/CD 中新增 mock 版本檢查
  - 每次 commit 時，檢查 `public/notion-mock-data.json` 的欄位數量是否與預期一致

### 第 3 優先級（可選）
- [ ] 寫自動化整合測試（驗證三層環境的行為一致性）
- [ ] 檔案變更時自動重新匯出 JSON（pre-commit hook）

---

## 決策項

| 項目 | 建議 | 待決 |
|------|------|------|
| 推薦方案 | 方案 D（混合）可行 | Jin 確認 |
| 優先推進 | 第 1 優先級（export 腳本、mock route、.env 說明） | —— |
| 風險 R2 驗證 | 先實驗沙盒 DB 的 relation 複製，再決定能否用於整合測試 | JDNE 或 Z1FV 負責驗證 |
| 環境變數範本 | 詳見上述清單 | —— |

---

## 參考資料

- A44T 提案：`bidding-assistant/docs/dev-plan/_staging/db-sandbox-方案.md`
- CLAUDE.md 規定：「可讀原始 DB，禁止寫；實驗用沙盒」
- 相關檔案：`.env.example`、`.env.local`（開發環境）
