MSG|20260223-0945|JDNE|blocker-alert

## ⚠️ 阻塞項：5 個測試失敗（驗收前必須修復）

**嚴重程度**：🔴 HIGH（驗收卡點）
**發現時間**：09:40 協調檢查中
**測試運行結果**：3500 PASS + **5 FAIL** + 1 SKIP

---

## 失敗測試詳情

### 文件：src/app/settings/workflow/__tests__/page.test.tsx
**失敗測試**：3 個
- ❌ 點取消還原 checkbox 狀態（line 162）
  - 期望：`data-state="unchecked"`
  - 實際：`null`

- ❌ 保存改動（line 184）
  - checkbox `data-state` 屬性缺失

- ❌ 應用改動（line 173）
  - 同上

### 文件：src/app/settings/workflow/__tests__/page.test.tsx（另一組失敗）
**失敗測試**：2 個
- ❌ 點取消還原 checkbox 狀態（重複）
- ❌ 其他 checkbox 相關測試

---

## 根因分析

**最後修改**：commit 26c2f63 (ITEJ)
```
[fix] 修正三個頁面測試 timeout：mock Accordion + Select（ITEJ）
```

**問題**：
1. 測試期望 `<Checkbox>` 有 `data-state` 屬性
2. 實際 `<Checkbox>` 組件（radix-ui）可能：
   - 不支持該屬性
   - 屬性名稱不同（可能是 `aria-checked` 或 `aria-pressed`）
   - mock 的 Accordion 導致組件狀態丟失

---

## 建議修復策略

### 快速修復（推薦，< 15 分鐘）
1. 檢查 radix-ui Checkbox 的實際 API
2. 改用 `aria-checked` 或 `getAttribute("checked")`
3. 或檢查 mock 是否破壞了狀態傳遞
4. 重新執行 `npm test`，驗證通過

### 分派
- **責任方**：ITEJ（修改了測試）或 Z1FV（程式碼審查）
- **優先級**：立即（驗收前必須修復）

---

## 驗收影響

| 項目 | 狀態 | 影響 |
|------|------|------|
| module-pipeline-closure (A44T) | ✅ | 不受影響（不涉及 workflow） |
| KB API (ITEJ) | ⚠️ | ITEJ 負責修復 workflow 測試 |
| 整體驗收 | 🔴 | **阻塞**（需 3500+ PASS） |

---

## 即時行動項

- [ ] ITEJ：檢查 radix-ui Checkbox API + 修復測試
- [ ] 驗證修復：執行 `npm test`，確認 3506 全過
- [ ] 回報：更新協調記錄

**預計修復時間**：15-30 分鐘

