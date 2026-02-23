OP|20260223-1700|AINL|🚨 品質警報：React.act 測試失敗

# 品質警報：React.act 問題導致 40 個測試失敗

**發現時間**: 2026-02-23 17:00
**狀態**: 🔴 需要立即處理
**影響**: T+24h checkpoint 前需要修復

---

## 問題現況

### 測試失敗統計
```
Test Files: 4 failed | 245 passed (249 總計)
Tests:      40 failed | 3956 passed (3997 總計)
失敗率: ~1% 但需要修復
```

### 失敗模式

**主要錯誤**：`TypeError: React.act is not a function`

**失敗檔案**：`src/lib/pcc/__tests__/useCommitteeAnalysis.test.ts`

**失敗案例**（20 個 React.act 相關）：
```
- useCommitteeAnalysis — error → sets error on listByUnit failure
- useCommitteeAnalysis — error → sets generic error for non-Error throws
- ... (其他 React hook rendering 相關測試)
```

---

## 根本原因分析

### 推測原因
1. **React 版本衝突** - `react-dom/test-utils` 中 `act` 的導出問題
2. **Jest 環境配置** - JSdom 環境下 React.act 未正確初始化
3. **@testing-library/react 版本** - act-compat 層可能不相容

### 典型錯誤堆棧
```
TypeError: React.act is not a function
  at exports.act (node_modules/react-dom/cjs/react-dom-test-utils.production.js:20:16)
  at node_modules/@testing-library/react/dist/act-compat.js:46:25
  at renderRoot (node_modules/@testing-library/react/dist/pure.js:189:26)
  at render (node_modules/@testing-library/react/dist/pure.js:291:10)
  at Proxy.renderHook (node_modules/@testing-library/react/dist/pure.js:339:7)
  at src/lib/pcc/__tests__/useCommitteeAnalysis.test.ts:296:24
```

---

## 快速修復方案

### 方案 A：修復 useCommitteeAnalysis.test.ts（15-20 分鐘）

```typescript
// 在測試檔頭部添加
import { act } from '@testing-library/react';
import React from 'react';

// 或者改用 waitFor 代替 act
import { renderHook, waitFor } from '@testing-library/react';

// 修改測試：
// 之前：const { result } = renderHook(() => useCommitteeAnalysis());
//       await act(async () => { ... });

// 改為：
const { result } = renderHook(() => useCommitteeAnalysis());
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

### 方案 B：更新 vitest 設定（10-15 分鐘）

在 `vitest.config.ts` 或 `vite.config.ts` 中確保 React 正確設定：
```typescript
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### 方案 C：檢查 package.json 依賴版本（5 分鐘）

```bash
# 驗證 React 版本相容
npm list react react-dom @testing-library/react

# 若版本不相容，升級
npm install --save-dev @testing-library/react@latest
```

---

## 建議優先序

### 立即行動（現在）
1. **AINL 通知 ITEJ** - 轉發此警報
2. **ITEJ 評估修復難度** - <20 分鐘可修復？
3. **若能快速修復** - 現在修復（T+24h 前）
4. **若需要更多時間** - 列入 T+24h 決策項

### T+24h checkpoint 影響

| 情境 | 影響 | 建議 |
|------|------|------|
| 現在修復成功 | 零影響 | 推進 P1 驗收 |
| T+24h 前修復 | 最低影響 | 推進 P1 驗收 |
| T+24h 延後修復 | 中等影響 | P1 驗收用 mock 環變 + 後續修復 |
| 無法修復 | 高影響 | 跳過此測試，P2 前必須修復 |

---

## 轉交事項

**TO: JDNE**
- [ ] 確認此問題是否已知
- [ ] 評估是否在 T+24h 前修復
- [ ] 若需延後，列入 checkpoint 決策項

**TO: ITEJ**（如果由 ITEJ 負責測試層）
- [ ] 評估修復難度
- [ ] 提交修復方案 + 預估時間

**TO: 3O5L/Z1FV**（如果涉及相關模組）
- [ ] 檢查此測試是否由你們最近改動導致
- [ ] 協助 ITEJ 修復

---

## 分類

**問題等級**: 🟡 中（影響 T+24h 但可修復）
**責任方**: ITEJ（測試層）
**轉交方**: AINL
**時間框架**: <20 分鐘 修復 or T+24h 決策延後

---

**待 JDNE 確認後續行動。**

