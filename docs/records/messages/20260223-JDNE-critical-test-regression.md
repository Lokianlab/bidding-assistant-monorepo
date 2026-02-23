MSG|20260223-1000|JDNE|critical-blocker

## 🔴 CRITICAL：12 個測試失敗（測試迴歸）

**嚴重程度**：🔴 CRITICAL（驗收阻塞）
**發現時間**：10:00
**測試狀態**：3531 PASS + **12 FAIL** + 1 SKIP（比 30 分鐘前惡化）

---

## 失敗測試分類

### 1. Checkbox `data-state` 屬性問題（7 個失敗）
**文件**：
- `src/app/settings/workflow/__tests__/page.test.tsx`（3 個）
- `src/app/settings/modules/__tests__/page.test.tsx`（2 個）

**根因**：
- 測試期望 `data-state="checked"|"unchecked"` 屬性
- radix-ui Checkbox 實際提供的是 `aria-checked` 或其他屬性
- 本質問題：測試對 radix-ui API 的錯誤假設

**解決方案**：
```javascript
// 錯誤
expect(checkbox.getAttribute("data-state")).toBe("checked");

// 正確（試試這些）
expect(checkbox.getAttribute("aria-checked")).toBe("true");
// 或
expect(checkbox.checked).toBe(true);
// 或
expect(checkbox).toBeChecked(); // Testing Library 方式
```

### 2. KB 頁面組件問題（5 個失敗）
**文件**：`src/app/kb/__tests__/page.test.tsx`

**失敗測試**：
- ❌ 應該預設顯示全部分類
- ❌ 點擊分類應該切換選擇
- ❌ 應該能輸入搜尋關鍵字
- ❌ 按 Enter 應該執行搜尋
- ❌ 清除按鈕應該清空搜尋
- ❌ 應該能選擇單個項目
- ❌ 應該能全選所有項目

**根因**：P1d Z1FV KB UI 引入 @tanstack/react-table，但測試未相應更新
- TanStack Table 的 DOM 結構與預期不符
- Select/Checkbox mock 與實際集成有差異

---

## 時間軸

| 時間 | 事件 | 測試狀態 |
|------|------|---------|
| 09:40 | 初次檢查 | 3500 PASS / 5 FAIL |
| 09:50 | 安裝 @tanstack/react-table | 編譯通過 |
| 10:00 | 重新測試 | 3531 PASS / **12 FAIL** |

**回歸原因**：@tanstack/react-table 導入改變了 DOM 結構，原有測試失效

---

## 驗收影響

| 項目 | 影響 |
|------|------|
| 驗收準備 OP | ❌ 阻塞（需 3506+ 全過） |
| 新增依賴推送 | ❌ 無法推送（失敗） |
| P1d 驗收 | ❌ 延期（KB 測試失敗） |

---

## 緊急行動項

### 優先級 1（立即）
- [ ] **誰負責**：Z1FV（P1d 知識庫 UI）或 ITEJ（測試更新）
- [ ] **任務**：修復 KB 頁面測試，與 TanStack Table 集成
- [ ] **方法**：
  1. 檢查 TanStack Table 的實際 DOM 結構（使用 screen.debug()）
  2. 更新 KB 測試的選擇器和期望值
  3. 驗證 Checkbox/Select mock 與 TanStack 兼容性

### 優先級 2（30 分鐘內）
- [ ] **誰負責**：ITEJ 或測試負責人
- [ ] **任務**：修復 checkbox `data-state` 屬性問題
- [ ] **方法**：統一改用 `aria-checked` 或 `toBeChecked()` 方式

---

## 預估修復時間

- KB 頁面測試：1-2 小時（可能涉及 mock 調整）
- Checkbox 屬性：30 分鐘（批量替換）
- **總計**：1.5-2.5 小時

---

## 建議

**選項 A：先驗收不涉及 KB/modules/workflow 的模組**
- module-pipeline-closure（A44T）可先驗收
- 延期 KB API 和 modules 設定驗收

**選項 B：推延所有驗收，集中修復**
- 給 Z1FV/ITEJ 1-2 小時修復
- 驗收改為下一個時段（11:30 或 14:00）

**建議**：Option B（品質優先，修復一次性解決）

