# 代碼審查框架準備 | AINL | 循環 24

## 背景
根據 2026-02-24 工作授權，AINL 備戰 Z1FV M08/M10 代碼審查。

## 審查重點

### M08 評選簡報（Z1FV）
**待審查項**：
- [ ] API routes：`/api/m08/generate-presentation`, `/api/m08/templates`, `/api/m08/export`
- [ ] Hook：`useM08Presentation`
- [ ] 型別定義和介面
- [ ] 錯誤處理邏輯

**審查標準**：
1. **正確性**：邏輯無誤，邊界條件完備
2. **測試覆蓋**：單元測試 ≥ 20 個
3. **型別安全**：TypeScript 編譯無誤，無 `any` 濫用
4. **程式碼風格**：符合專案規範（見 bidding-assistant/CLAUDE.md）
5. **文檔完整**：有 JSDoc 或註解
6. **效能**：無顯著的 N+1 或死迴圈

### M10 履約管理（Z1FV）
**待審查項**：
- [ ] API routes：`/api/m10/create-contract`, `/api/m10/list-milestones`, `/api/m10/update-progress`
- [ ] Helper：`milestone-status.ts`
- [ ] Hook：相關狀態管理
- [ ] 單元測試 ≥ 20 個

**審查標準**：
同 M08

## 審查流程

1. **Z1FV 提交** → 審查清單通知
2. **AINL 掃描** → 快速檢查 TS 編譯、測試數量
3. **細項審查** → 邏輯、型別、風格檢查
4. **反饋** → 列出 issues（PASS/改進/待修復）
5. **結論** → 簽核或退回

## Issue 分類

### 🟢 Info（資訊性）
- 文檔建議、可選最佳實踐
- 不阻塞合併

### 🟡 Improvement（改進）
- 代碼品質或效能提升
- 不阻塞，但建議修正

### 🔴 Must Fix（必修）
- 型別錯誤、邏輯 bug、安全問題
- 阻塞合併

## 審查檢查清單範本

```
# M08/M10 代碼審查 | AINL | [日期]

## 快速檢查
- [ ] TypeScript 編譯無誤
- [ ] 單元測試 ≥ 20 個
- [ ] `npm run build` 成功
- [ ] 無明顯 linting 錯誤

## 邏輯審查
- [ ] 邊界條件完備（空值、異常輸入）
- [ ] 錯誤處理到位
- [ ] 無死迴圈或 N+1 查詢
- [ ] 非同步操作正確（await、Promise 鏈）

## 型別和風格
- [ ] TypeScript 型別正確，無濫用 `any`
- [ ] 符合專案命名規範
- [ ] JSDoc 或註解清楚
- [ ] 符合 prettier/eslint 風格

## 結論
- ✅ PASS：可合併
- 🟡 改進建議：列出編號 issue
- 🔴 必修問題：列出編號 issue，待修正後重審
```

## 時間安排
- 2026-02-24 09:30：Checkpoint 開始
- 2026-02-24 下午：Z1FV 可能提交代碼審查
- 2026-02-24 17:00-18:00：AINL 進行審查
- 2026-02-25 早上：反饋結論

## 備註
- 此框架為預備，待 Z1FV 實際提交後啟動
- 若 Z1FV 未提交，則在 2026-02-25 checkpoint 時檢查進度
