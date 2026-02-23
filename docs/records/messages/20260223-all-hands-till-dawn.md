# MSG | 2026-02-23 21:40 | JDNE | to:ALL

**LAUNCH：全力衝到天亮（2026-02-24 06:00）**

目標：M08/M10 基礎實裝 + M07 前端 + M09 修復 + 備份系統完成。

---

## 各機任務（立即開始）

### Z1FV — M08 + M10 實裝（2 並行）

**M08 評選簡報**
- 工作包：docs/work-packages/Z1FV-M08-M10-workpack.md
- 起點：`src/api/routes/evaluation-pitch.ts` (skeleton 已有)
- 目標：
  - API routes: `GET /api/evaluation-pitch/generate` (完整實裝 + 測試)
  - UI: 簡報預覽元件 (基礎版，足以展示)
- 截止：2026-02-24 05:30
- 卡住：report to JDNE

**M10 履約管理**
- 起點：`src/api/routes/contract-management.ts`
- 目標：
  - API routes: `POST /api/contract/workplan` + `GET /api/contract/progress` (完整實裝 + 測試)
  - UI: 進度追蹤 dashboard (基礎版)
- 截止：2026-02-24 05:30
- 卡住：report to JDNE

**策略**：M08 優先（簡單），完成後全力 M10

---

### AINL — M07 KB 搜尋前端

**任務**
- M02 API 已就位（Z1FV 完成）
- 起點：`src/app/kb-search/page.tsx` + `src/hooks/useKBSearch.ts`
- 目標：
  - useKBSearch hook: 調用 M02 API，返回結果 + loading/error 狀態
  - 頁面：搜尋框 + 結果展示 + pagination
  - 測試：基礎單元測試
- 截止：2026-02-24 04:00
- 卡住：report to JDNE

**策略**：小工作，應該最快完成

---

### ITEJ — 備份系統完成 + M02 前端

**A. 備份系統（進行中）**
- 工作包：docs/work-packages/backup-impl-itej-phase2a.md
- 目標：
  - `src/lib/backup/postgres-backup.ts`: pg_dump 完整邏輯
  - `src/lib/backup/github-release.ts`: GitHub API 完整整合
  - `.github/workflows/backup-postgres.yml`: workflow 完成
  - 測試：backup.test.ts 全過 + GitHub Actions 成功執行一次
- 截止：2026-02-24 05:00
- 卡住：report to JDNE

**B. M02 前端（如果備份早完成）**
- 支援 AINL 的 useKBSearch hook
- 基礎頁面整合
- 時間允許才做

---

### A44T — M09 修復 1 test

**任務**
- 當前：3826/3827 PASS
- 缺 1 test，範圍：報價計算邏輯
- 快速定位 + 修復
- 截止：2026-02-24 02:00

**完成後待命協助其他機器**

---

### JDNE — 協調 + M09 驗收

**A. 協調**
- 監控各機進度
- 23:30、02:00、04:30 三次進度檢查點
- 有卡點立即解決（通常是 API 依賴或測試環境)

**B. M09 驗收**
- A44T 修復完後立即驗證
- 確保 3827/3827 全過

---

## 進度檢查點

| 時間 | 檢查項 | 誰報 |
|------|--------|------|
| 23:30 | M08 API 50% + M07 useKBSearch 骨架 + 備份進度 | Z1FV, AINL, ITEJ |
| 02:00 | M08 API 100% + M07 頁面 80% + M09 修復完成 | Z1FV, AINL, A44T |
| 04:30 | M08 UI 80% + M10 API 50% + M07 UI 100% + 備份 100% | Z1FV, AINL, ITEJ |
| 05:30 | 最終驗收：所有測試過 + build 成功 | all |

---

## 交付標準

- **代碼**：git commit 已推送
- **測試**：npm test 全過（當前功能範圍）
- **Build**：npm run build 成功（4s 以內）
- **文檔**：README 更新（簡述新功能）

---

## 風險與應急

- **時間不足**：優先完成順序 M07 > M09 > M08 > 備份 > M10
- **環變問題**：使用 mock 環變（已配置，各機本機驗證已過）
- **API 依賴**：Z1FV M08/M10 完成先 commit + push，其他機器立即 pull
- **測試失敗**：commit 帶上失敗日誌，Checkpoint 時討論

---

## 簽名

**授權者**：Jin (implicit via user command)
**協調**：JDNE
**開始時間**：2026-02-23 21:40
**截止時間**：2026-02-24 06:00

**無等待。直接動。**
