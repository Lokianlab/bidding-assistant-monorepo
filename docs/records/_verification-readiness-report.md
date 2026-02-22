# 驗收準備報告（2026-02-25）

**系統狀態**：✅ 所有測試通過 | ✅ 構建成功 | 📋 33 個功能待驗收

---

## 快速檢查項

```
npm test  → ✅ 76 test files passed, 1518 tests passed
npm build → ✅ Production build successful
```

---

## 待驗收項目總覽

### 統計摘要

| 機器 | 待驗收項目 | 預計驗收時間 | 備註 |
|------|-----------|-----------|------|
| **AINL** | 6 項 | 各 2-5 min | UI 驗收 + 測試確認 |
| **A44T** | 9 項 | 各 3-10 min | 大型功能 + 整合驗收 |
| **Z1FV** | 11 項 | 各 2-5 min | 品質模組 + 輸出模組 |
| **ITEJ** | 5 項 | 各 2-5 min | 重構模組 + 論壇工具 |
| **3O5L** | 2 項 | 各 2-3 min | Bug fix 小項 |
| **合計** | **33 項** | **約 3-4 小時** | 可並行驗收 |

---

## 按機器分類驗收清單

### AINL（6 項）

#### 1. `[v] feat-test-coverage`
- **內容**：補測試覆蓋 + 跨機器審查（analysis/index +6 trend 驗證、useQualityGate +10 tests）
- **驗收方式**：`npm test | grep -E "(analysis|useQualityGate|trend)"` → 確認新增測試全過
- **預期**：所有測試綠燈，test count > 1500
- **時間**：2 min

#### 2. `[v] feat-quality-refactor`
- **內容**：品質模組審查（A44T/JDNE 已審查通過）
- **驗收方式**：`npm run dev` → 進入「工具」→ 「品質閘門」→ 檢查 5 道閘門顯示正常
- **預期**：品質評分面板完整顯示，無錯誤
- **時間**：3 min

#### 3. `[v] infra-user-auth`
- **內容**：Saint 已在本機驗證（SHA-256 通過），幕僚模式啟動
- **驗收方式**：查 `docs/machine-roles.md` 確認 Saint 已列為正式成員；查論壇 0222-0223 session 確認驗證流程
- **預期**：Saint 身分確認、權限已設定
- **時間**：2 min

#### 4. `[v] feat-trend-analysis`
- **內容**：趨勢分析模組（純函式 + hook + UI 全鏈路）
- **驗收方式**：`npm run dev` → 儀表板 → 查「趨勢分析卡片」
- **預期**：趨勢圖表顯示完整，無控制台錯誤
- **時間**：2 min

#### 5. `[v] feat-dashboard-charts`
- **內容**：儀表板圖表卡片擴充（8 張圖表卡片）
- **驗收方式**：`npm run dev` → 儀表板 → 看右側卡片區域應有 8+ 張圖表卡片
- **預期**：卡片完整、圖表正常渲染
- **時間**：2 min

#### 6. `[v] feat-scout-committee`
- **內容**：P偵察加入評委情報（+6 tests、UI 接線完成）
- **驗收方式**：`npm run dev` → 案件詳情 → Scout 模組 → 檢查是否有評委情報填入
- **預期**：Scout prompt 中含評委資訊
- **時間**：2 min

**AINL 小計**：11 min（所有項目都是 UI 驗收，快速）

---

### A44T（9 項）

#### 1. `[v] feat-pcc-web`
- **內容**：情報模組完整（搜尋 + 詳情 + 機關情報 + 競爭分析 + 市場趨勢 + P偵察 + 公司設定 + 全模組快取 + 工具卡互動）
- **驗收方式**：`npm run dev` → 側邊欄「情報」→ 搜尋案件 → 點進詳情 → 查看各個子頁籤
- **預期**：完整的情報流程，markdown 渲染 + 大綱導覽 + 原始碼切換都正常
- **時間**：5 min

#### 2-3. `[v] infra-quality-tiers` / `[v] infra-new-machine-setup`
- **內容**：三級品質制度 + 安裝流程防呆改造
- **驗收方式**：查 `CLAUDE.md` 確認規則已寫入；`bash install.bat` 實際跑一次確認流程順暢
- **預期**：安裝無卡點、CLAUDE.md 有新規則章節
- **時間**：各 3 min

#### 4. `[v] feat-docx-gen`
- **內容**：文件生成（章節→DOCX 下載 + markdown 表格支援）
- **驗收方式**：`npm run dev` → 工具 → 輸出 → 生成一份 DOCX 檔案 → 在 Word 中驗證表格、樣式
- **預期**：DOCX 檔案完整、表格格式正確
- **時間**：5 min

#### 5. `[v] feat-m03-strategy`
- **內容**：M03 戰略分析引擎（5維評分 + FitScore UI + /strategy 頁面）
- **驗收方式**：`npm run dev` → /strategy → 查看 RadarChart 和卡片顯示
- **預期**：策略頁面完整、評分引擎運作無誤
- **時間**：3 min

#### 6. `[v] feat-cross-module-nav`
- **內容**：跨模組導航串流（情報→戰略→組裝→品質→匯出）
- **驗證方式**：`npm run dev` → 選案件 → 點情報 → 点進戰略 → 点進組裝 → 完成整個流程
- **預期**：每個模組都有按鈕導至下一個，流程順暢
- **時間**：3 min

#### 7-9. 其他（infra-stop-hook、cleanup 等）
- **驗收方式**：查 `.claude/hooks/` 目錄確認 5 個 hook 存在；`npm test` 確認無失敗
- **時間**：各 2-3 min

**A44T 小計**：28 min（含 2 個大型功能）

---

### Z1FV（11 項）

#### 大項（需重點驗收）
- `[v] feat-m04-quality-gate`：4 道閘門 + 報告 + UI + Hook（114 tests）→ `/tools/quality-gate` 走一遍流程
- `[v] feat-m06-output-phase1`：文件組裝管線 + 範本系統 + DOCX 匯出（39 tests）→ `/tools/output` 生成一份文件
- `[v] feat-trend-dashboard`：趨勢整合儀表板 → 儀表板查看圖表

#### 小項（快速驗收）
- `[v] feat-docgen-markdown` / `[v] feat-docgen-cover-toc`：格式支援 → markdown 表格、封面、目錄正常渲染
- `[v] fix-connections-page`：ConnectionsPage 錯誤修復 → 進入連線設定頁確認無 undefined
- 其他（pricing 審查、論壇回覆、業務基線）：確認無誤即可

**Z1FV 小計**：25 min（含 3 個大型功能）

---

### ITEJ（5 項）

- `[v] feat-pcc-web` / `[v] feat-quality-refactor` / `[v] feat-pricing-refactor`：重構模組 → 在對應工具走一遍流程確認功能正常
- `[v] infra-forum` / `[v] infra-claude-md-modular`：基建項目 → 查檔案確認格式無誤、CLAUDE.md 結構正確

**ITEJ 小計**：15 min

---

### 3O5L（2 項）

- `[v] fix-sidebar-link`：Bug 修復 → 儀表板側邊欄無 href undefined 錯誤
- `[v] cleanup-trend-dup`：清理重複計算 → 趨勢圖表仍正常顯示

**3O5L 小計**：4 min

---

## 驗收順序建議

### 第 1 輪（快速驗收）
優先驗收所有「UI 驗收」項目（需 UI 檢查但無複雜邏輯）：
- AINL 全部 6 項 → **11 min**
- 3O5L 全部 2 項 → **4 min**
- Z1FV 小項（markdown/cover/fix）→ **8 min**
- **小計：23 min**

### 第 2 輪（大型功能驗收）
- A44T 大項（feat-pcc-web、feat-docx-gen、feat-m03-strategy、cross-module-nav）→ **16 min**
- Z1FV 大項（feat-m04、feat-m06、feat-trend-dashboard）→ **15 min**
- **小計：31 min**

### 第 3 輪（基建 + 審查項驗收）
- 所有基建項（install、forum、CLAUDE.md、business-context）→ **12 min**
- 跨機器審查項（pricing 審查、assembly 審查）→ **5 min**
- **小計：17 min**

---

## 風險評估

| 項目 | 風險等級 | 備註 |
|------|--------|------|
| 所有測試 | ✅ 低 | 1518 tests 全過 |
| 生產構建 | ✅ 低 | npm build 成功 |
| UI 驗收 | ✅ 低 | 多數是簡單頁面查看 |
| 大型功能 | ⚠️ 中 | M03/M04/M06 涉及複雜邏輯，但測試覆蓋充分 |
| 跨機器整合 | ⚠️ 中 | PCC Web 依賴多個模組，但已過審 |

---

## 後續計畫（驗收通過後）

1. **立即**：全部 33 項驗收完成 → 更新快照標記 [x]
2. **本週**：收集使用者反饋 → 識別優化點
3. **下週**：啟動「提案寫作駕駛艙」系統開發（基於 AINL 的分析方案）

---

**準備狀態**：✅ 已就緒
**建議時間投入**：3-4 小時（可分多次進行）
**建議起始時間**：當前（無待決因素）

