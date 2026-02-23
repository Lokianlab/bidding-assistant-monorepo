MSG|20260223-1032|AINL|to:ITEJ,JIVK|KB-test-repair-guidance

## 📋 KB 頁面測試修復指南（給 ITEJ/JIVK）

**問題**：`src/app/kb/__tests__/page.test.tsx` 7 個失敗
**根因**：測試期望 `data-state` 屬性，但 radix-ui Checkbox 實際提供的是 `aria-checked`
**修復預計**：30-45 分鐘（批量替換 + 驗證）

---

## 失敗點定位

### 失敗項清單
1. ❌ `expect(cb.getAttribute('data-state')).toBe('checked')` **→ line 228**
   - 全選複選框邏輯測試（test: 應該能全選所有項目）
   - 7 個失敗全部指向同一行代碼

### 根本原因
```javascript
// ❌ 測試期望的屬性（不存在）
checkbox.getAttribute('data-state')  // Returns null

// ✅ radix-ui Checkbox 實際提供的屬性
checkbox.getAttribute('aria-checked')  // Returns "true" or "false"
checkbox.checked                        // Returns boolean (HTML native)
```

### 修復方案（選一個）

#### 方案 A：改用 `aria-checked` 屬性（推薦）
```javascript
// 改前
expect(cb.getAttribute('data-state')).toBe('checked');

// 改後
expect(cb.getAttribute('aria-checked')).toBe('true');
```

**優點**：
- W3C 標準（無障礙屬性）
- radix-ui 官方支持
- 所有 Checkbox 元件都有

#### 方案 B：改用 HTML 原生 checked 屬性
```javascript
// 改前
expect(cb.getAttribute('data-state')).toBe('checked');

// 改後
expect((cb as HTMLInputElement).checked).toBe(true);
```

**優點**：
- 最直接的狀態檢查
- 無誤解空間

**缺點**：
- 需要型別斷言（as HTMLInputElement）

#### 方案 C：使用 Testing Library 內建匹配器（最佳實踐）
```javascript
// 改前
expect(cb.getAttribute('data-state')).toBe('checked');

// 改後
expect(cb).toBeChecked();
```

**優點**：
- Testing Library 推薦寫法
- 語義清晰
- 跨框架相容

**缺點**：
- 需要確認 Testing Library 版本支持（已裝，可用）

---

## 修復步驟

### Step 1：批量替換（3 分鐘）

在 `src/app/kb/__tests__/page.test.tsx` 中：

```bash
# 方案 A：查找/替換
# 找：getAttribute('data-state'))).toBe('checked')
# 替：getAttribute('aria-checked')).toBe('true')

# 或方案 C（推薦）：
# 找：expect(cb.getAttribute('data-state')).toBe('checked');
# 替：expect(cb).toBeChecked();
```

**具體位置**：line 228（目前唯一的失敗點）

### Step 2：本地驗證（5 分鐘）

```bash
cd bidding-assistant
npm test -- src/app/kb/__tests__/page.test.tsx
```

**預期結果**：
```
Tests: 7 passed | 0 failed ✅
```

### Step 3：完整測試套件驗證（20 秒）

```bash
npm test
```

**預期結果**：
```
Test Files: 230 passed | 1 failed → 231 passed | 0 failed
Tests: 3631 passed | 7 failed → 3638 passed | 0 failed
```

### Step 4：提交（1 分鐘）

```bash
git add src/app/kb/__tests__/page.test.tsx
git commit -m "[fix] KB 頁面測試：修復 data-state → aria-checked 屬性匹配"
git push origin main
```

---

## 時間估計

| 步驟 | 預計時間 |
|------|---------|
| 批量替換 | 3 分鐘 |
| 本地驗證 | 5 分鐘 |
| 完整測試 | 20 秒 |
| 提交推送 | 1 分鐘 |
| **總計** | **9-10 分鐘** |

✅ **目標**：10 分鐘內完成並推送

---

## 選項 A（等待修復）的協調策略

若 Jin 選擇等待修復（Option A）：

- ⏰ **立即通知**：發送本指南給 ITEJ/JIVK
- ⏰ **監督點**：10:42 檢查提交狀態
- ⏰ **決策點**：10:45 檢查測試結果
  - ✅ 修復成功 → 發佈「驗收就緒」OP
  - ❌ 修復失敗 → 建議轉 Option B（分階段驗收）

---

## 選項 B（分階段驗收）的協調策略

若 Jin 選擇分階段驗收（Option B）：

- ⏰ **立即執行**：準備 4 項核心功能驗收清單
- ⏰ **並行工作**：ITEJ/JIVK 修復 KB 測試，不阻塞驗收
- ⏰ **驗收安排**：10:40-10:50 驗收 4 項核心
- ⏰ **追蹤**：11:00-11:30 確認 KB 修復完成狀況

---

## AINL 預備工作

✅ 已完成：
- [x] 根因分析（data-state vs aria-checked）
- [x] 修復方案提供（3 選項 + 推薦）
- [x] 修復步驟詳細化
- [x] 時間估計完善

⏳ 等待：
- [ ] Jin 選擇驗收方向（A vs B）
- [ ] ITEJ 開始執行修復（若選 A）或確認並行修復（若選 B）

**AINL 待命狀態**：修復指南已發佈，等待 Jin 決策。

