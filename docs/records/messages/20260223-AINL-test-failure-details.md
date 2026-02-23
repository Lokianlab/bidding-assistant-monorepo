MSG|20260223-1037|AINL|test-failure-details

## 🔍 KB 頁面測試失敗詳細分析（7 FAIL）

**來源檔案**：`src/app/kb/__tests__/page.test.tsx`
**失敗數**：7 個
**失敗模式**：3 種根本原因

---

## 失敗清單

### 失敗 1-2：搜尋功能（2 個失敗）

#### 失敗 1：搜尋 API 調用檢驗 (line 142)
```
❌ 應該執行搜尋功能
   期望：listItems() 被 { search: '測試' } 呼叫
   實際：toHaveBeenCalledWith 失敗
   位置：line 142

   測試代碼：
   expect(mockListItems).toHaveBeenCalledWith(
     expect.objectContaining({ search: '測試' })
   )
```

**根因**：KB API mock 與實際調用不符

#### 失敗 2：清除搜尋按鈕（line 154）
```
❌ 清除按鈕應該清空搜尋
   期望：找到標籤為 '清除搜尋' 的按鈕
   實際：Unable to find element with label text '清除搜尋'
   位置：line 154

   測試代碼：
   const clearButton = screen.getByLabelText('清除搜尋');
```

**根因**：UI 元素命名或結構不符（按鈕可能用 aria-label 或 title，而非 label）

---

### 失敗 3-7：複選框 data-state 屬性（5 個失敗）

#### 失敗 3-4：分類篩選（line 142+）
```
❌ 點擊分類應該切換選擇（部分失敗）
```

#### 失敗 5：搜尋功能（line 142+）
```
❌ 按 Enter 應該執行搜尋（部分失敗）
```

#### 失敗 6：單選項目（line 210）
```
❌ 應該能選擇單個項目
   期望：firstCheckbox.getAttribute('data-state') === 'checked'
   實際：getAttribute('data-state') 返回 'unchecked'
   位置：line 210

   根本原因：radix-ui Checkbox 不提供 data-state 屬性
             → 需改用 aria-checked 或 checked 屬性
```

#### 失敗 7：全選項目（line 228）
```
❌ 應該能全選所有項目
   期望：所有 checkboxes 的 data-state === 'checked'
   實際：getAttribute('data-state') 返回 null / 'unchecked'
   位置：line 228（forEach 循環內）

   代碼：
   allCheckboxes.forEach((cb) => {
     expect(cb.getAttribute('data-state')).toBe('checked');
   })
```

---

## 失敗分類統計

| 根本原因 | 失敗個數 | 嚴重程度 | 修復時間 |
|---------|---------|---------|---------|
| radix-ui data-state → aria-checked | 4 | 🔴 高 | 5 分鐘 |
| API mock 與實際呼叫不符 | 1 | 🟡 中 | 10 分鐘 |
| UI 元素標籤不符 | 1 | 🟡 中 | 5 分鐘 |
| 搜尋邏輯集成 | 1 | 🟡 中 | 10 分鐘 |
| **總計** | **7** | — | **30 分鐘** |

---

## 修復優先序

### 優先級 1（立即修復，解決 4 個失敗）
**問題**：radix-ui Checkbox `data-state` 屬性
**文件**：`src/app/kb/__tests__/page.test.tsx`
**行數**：210, 228（及相關行）
**修復方案**：
```javascript
// ❌ 改前（錯誤）
expect(cb.getAttribute('data-state')).toBe('checked');

// ✅ 改後（推薦）
expect(cb).toBeChecked();
```
**預期成果**：4 失敗 → 4 通過

### 優先級 2（次要修復，解決 1-2 個失敗）
**問題**：API 呼叫 mock 不符
**文件**：`src/app/kb/__tests__/page.test.tsx`
**行數**：142
**修復方案**：檢查 listItems() API 的實際簽名，調整 expect

### 優先級 3（配置修復，解決 1 個失敗）
**問題**：清除按鈕標籤不符
**文件**：UI 元件或測試
**行數**：154
**修復方案**：檢查按鈕的 aria-label 或 title，調整 selector

---

## 修復建議順序

```
Step 1（5 分鐘）：修復優先級 1（data-state → toBeChecked）
  ✅ 解決 4 個失敗

Step 2（10 分鐘）：修復優先級 2（API mock）
  ✅ 解決 1 個失敗

Step 3（5 分鐘）：修復優先級 3（UI 標籤）
  ✅ 解決 1 個失敗

預期結果：7 FAIL → 0 FAIL（20 分鐘內完成）
```

---

## 測試覆蓋範圍

### 通過的測試（3624 PASS）
- ✅ 其他 229 個測試檔案全數通過
- ✅ KB API 端點（RLS 隔離）：47 tests 全過
- ✅ 多租戶認證：42 tests 全過
- ✅ PCC 情報搜尋：1132 tests 全過

### 失敗的測試（7 FAIL，集中在 KB UI）
- ❌ KB 頁面整合測試：7 個失敗（同一個檔案）
- ❌ 失敗原因：radix-ui + TanStack Table 整合的 mock 策略

---

## 修復風險評估

| 風險 | 概率 | 影響 | 預案 |
|------|------|------|------|
| 修復後仍有未知失敗 | 低 | 需追加修復 | 逐一檢查失敗根因 |
| 修復導致其他測試失敗 | 極低 | 回歸風險 | 執行完整測試套件 |
| 環境/快取問題 | 中低 | 需清理快取 | `npm test -- --clearCache` |

---

## 執行準備

### 修復人員
- **推薦**：ITEJ（原負責人）
- **協助者**：JIVK（settings 測試經驗）

### 測試驗證
- 修復後執行：`npm test -- src/app/kb/__tests__/page.test.tsx`
- 預期：7 PASS（0 FAIL）

### 推送前檢查
- [ ] 完整測試通過（npm test）
- [ ] 無回歸失敗
- [ ] commit message 清晰

---

## AINL 協調支援

✅ **已提供**：
- 根因分析
- 優先序建議
- 修復方案
- 時間估計

⏳ **等待**：
- ITEJ 開始修復（若 Jin 選 Option A）
- 或並行修復確認（若 Jin 選 Option B）

