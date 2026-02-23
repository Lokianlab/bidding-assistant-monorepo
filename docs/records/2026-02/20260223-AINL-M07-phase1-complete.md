OP|20260223-0930|AINL|M07 Phase 1 實裝完成

## 摘要

M07 外包資源庫 Phase 1 全面實裝完成。完成了所有測試 (47/47 tests pass)。

## 完成內容

### 1. Helpers 函數（24 tests）✓
- `validatePartner()` - 全字段驗證（名稱、分類、email、電話、URL、評分）
- `validateBulkPartners()` - 批量驗證，分離有效/無效資料
- `searchPartners()` - 支持搜尋、篩選、排序、分頁
- `calculateTrustScore()` - 信任度計算（評分 60% + 合作次數 40%）
- `sortByRecommendation()` - 按信任度排序

### 2. PartnerSidebar UI 組件（7 tests）✓
- 合作夥伴列表顯示（信任度、評分、合作次數）
- 搜尋框（名稱、聯絡人、分類）
- 篩選面板（評分、分類、標籤）
- 排序選項（推薦度、評分、名稱）
- 選擇&高亮
- 統計信息（顯示 N / 總數）

### 3. API Routes & Hooks（16 tests）✓
- usePartners Hook（10 tests）
- API Routes（6 tests）

## 測試覆蓋

```
src/lib/partners/__tests__/
  - helpers.test.ts: 24 tests ✓
  - usePartners.test.ts: 10 tests ✓

src/app/api/partners/__tests__/
  - route.test.ts: 6 tests ✓

src/components/partners/__tests__/
  - PartnerSidebar.test.tsx: 7 tests ✓

總計: 47/47 tests pass
```

## 實裝特點

### 驗證系統
- 支持可選欄位（email、phone、url、rating）
- 電話號碼格式靈活（支持 02-xxx-xxxx、(02)xxx-xxxx、+886-2-xxx 等）
- Email 與 URL 格式驗證
- 詳細錯誤信息（中文）

### 搜尋引擎
- 支持多字段搜尋（名稱、聯絡人、分類）
- 多條件篩選（分類、評分、標籤、狀態）
- 靈活排序（字段 + 升序/降序）
- 分頁支持（offset/limit）

### UI 組件
- 響應式設計（flex 層級）
- 視覺反饋（hover、selected 狀態）
- 動態篩選徽章計數
- 信任度視覺化

## 技術決策

1. **驗證公式**：(rating/5 * 60%) + (cooperation_count/100 * 40%)
   - 評分佔權重較高（穩定指標）
   - 合作次數次之（可能累積錯誤決策）

2. **UI 簡化**：用 overflow-y-auto 替代 ScrollArea
   - 避免 ResizeObserver 在測試中的複雜性
   - 保持功能完整

3. **分層驗證**：
   - 基礎驗證（validatePartner）
   - 批量驗證（validateBulkPartners）
   - API 層再驗證（api-helpers.ts）

## 下一步

- [ ] M03 集成測試（驗證 Partnership 與 Case-work 集成）
- [ ] 等待 P1 驗收決策（Jin）
- [ ] PartnerSidebar 頁面集成（M08 或後續）

---

**狀態**：Phase 1 完成，Phase 2 計畫待 P1 驗收後確認。
