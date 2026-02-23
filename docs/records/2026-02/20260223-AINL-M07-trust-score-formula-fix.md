OP|20260223-1336|AINL|M07 trust score formula correction

## 問題
M07 Phase 1 PartnerSidebar 測試失敗：期望信任度分數 66，但顯示 79。

原因：helpers.ts 的 calculateTrustScore 公式與設計決策和測試期望不符。

## 根本原因
不同機器間的並行開發導致公式衝突：
- **設計決策（OP記錄）**：60% 評分 + 40% 合作次數 → 公式: `(rating/5 * 60) + (cooperation_count/100 * 40)`
- **實裝版本 v1**：70% 評分 + 30% 合作次數（上限 50 次）
- **遠端版本**：50% 評分 + 50% 合作次數（上限 20 次）
- **測試期望**：60% + 40% 公式

對於第一個夥伴（rating=5, cooperation_count=15）：
- 設計/測試期望：(5/5 * 60) + (15/100 * 40) = 60 + 6 = **66**
- 遠端版本結果：(5/5 * 50) + min(15/20,1) * 50 = 50 + 37.5 = **88**

## 修正
更新 src/lib/partners/helpers.ts，calculateTrustScore 函式：
- 評分權重：60%（基準 5 分）
- 合作次數權重：40%（基準 100 次）
- 移除上限限制（允許無限累積合作紀錄）

公式：`Math.round((rating/5 * 60) + (cooperation_count/100 * 40))`

## 測試驗證
✅ PartnerSidebar.test.tsx：7/7 PASS
✅ partners/helpers.test.ts：24/24 PASS
✅ 全套測試：3841 PASS / 1 SKIP

## 設計考量
評分佔 60% 是因為：
- 評分來自歷史平均（相對穩定）
- 合作次數可能累積偏差（次要參考）
- 新夥伴（合作少）仍可獲得公平評分

---
**狀態**：修正完成，與設計決策對齐。
