# T+24h Checkpoint 執行計畫（2026-02-24 09:00）

**計劃時間**：2026-02-23 09:13
**檢查點**：2026-02-24 09:00
**協調人**：JDNE

---

## 📋 各機器目標確認

### ✅ AINL — M07 Phase 1 實裝
- **目標**：usePartners CRUD + 搜尋邏輯 ≥60 tests
- **已完成**：usePartners Hook（a53cb92）
- **待完成**：
  - [ ] Supabase schema（partner_contacts 表）
  - [ ] `/api/partners/` CRUD routes
  - [ ] UI 元件（聯絡人列表、搜尋、詳情）
  - [ ] M03 strategy 整合（「建議合作夥伴」面板）
  - [ ] 測試補齊到 ≥60 tests
- **檢查點**：測試通過 + build 成功 + commit message 清楚

### ✅ A44T — M09 UI 元件初版
- **目標**：NegotiationPanel + 模組輸出 ≥50 tests
- **已完成**：Hook + UI 框架（daea699，7a07201）
- **待完成**：
  - [ ] 編輯面板（讓步計算、輸入驗證）
  - [ ] 計算邏輯完善（底線、區間、讓步模擬）
  - [ ] case-work 整合（「議價」分頁）
  - [ ] 測試補齊到 ≥50 tests
- **檢查點**：UI 可互動 + 計算正確 + 單元測試通過

### ✅ Z1FV — M08 決策細化 → code
- **目標**：5 決策確認 + code 啟動準備
- **已完成**：規格框架 + 5 決策已確認（20260223-JDNE-to-Z1FV-m08-decisions-locked）
- **待完成**：
  - [ ] 簡報模板定義（3 種類型）
  - [ ] API 路由骨架（`/api/cases/[id]/presentation/generate`）
  - [ ] PresentationPreview 元件初版
  - [ ] Claude API 整合 skeleton（待 API key）
  - [ ] 測試框架建立（10+ tests）
- **檢查點**：code 能 build + 沒有 TypeScript error + 前 10 個 tests 定義完成

### ✅ ITEJ — M02 KB 框架啟動
- **目標**：API 端點初步完成 + 測試開始（≥20 tests）
- **已完成**：技術指南發布（1b49adc）
- **待完成**：
  - [ ] Supabase migration（3 個表 + RLS policy）
  - [ ] `/api/kb/items/` GET/POST/PUT/DELETE
  - [ ] `/api/kb/topics/` GET/POST
  - [ ] 基礎 CRUD 測試（≥20 tests）
  - [ ] 錯誤處理框架（不需全做，但需要規劃）
- **檢查點**：API 路由能 call + 基本 CRUD 測試通過 + schema 已部署

---

## 🔍 檢查清單（JDNE 於 T+24h 執行）

### 程式碼品質
- [ ] 各機器 `npm run build` 通過（無編譯錯誤）
- [ ] 各機器 `npm test` 通過（目標測試數達成）
- [ ] 無 TypeScript 型別錯誤（`npm run build` 輸出乾淨）
- [ ] 無硬編碼、敏感資訊無洩露

### 進度交付
- [ ] AINL：git commit 中見到 M07 Phase 1 完成
- [ ] A44T：git commit 中見到 M09 UI 框架完成
- [ ] Z1FV：git commit 中見到 M08 code 啟動
- [ ] ITEJ：git commit 中見到 M02 API 初版 + 測試

### 協作狀態
- [ ] 無阻塞報告（各機器未通知衝突）
- [ ] 無例外阻礙（回復時間正常）
- [ ] 快照已更新（各機器的 _snapshot-*.md）

### 決策確認
- [ ] M08 5 決策確認書已推送 → Z1FV 已收
- [ ] P1 驗收批准已推送 → 3O5L/Jin 確認執行
- [ ] M02 技術指南已推送 → ITEJ 已啟動

---

## 📊 進度評估指標

### P2 模組加速度
```
計畫進度          實際進度          加速幅度
──────────────────────────────
M07: Day2/3開始   Day1已啟動         +24h ⚡
M09: Day2/3開始   Day1已框架完成     +18h ⚡
M08: Day2/3規格   Day1決策已鎖       +12h ⚡
M02: Day2開始     Day1啟動指南       待 T+24h 檢查
```

### 風險預警（待 T+24h 確認）
| 風險 | 觸發條件 | 應對方案 |
|------|--------|---------|
| ITEJ 卡 M02 schema | 無 DB 權限/SQL 錯誤 | JDNE 協調沙盒環境 |
| Claude API quota | AI token 用盡 | JDNE 檢查 org 配額 |
| 依賴版本衝突 | npm install 失敗 | 快照報告 + rollback 上次版本 |

---

## 📢 T+24h 之後

如果各機器都達成 checkpoint 目標，則：
1. **T+48h（2026-02-25 09:00）**繼續推進階段目標
2. **協作模式保持**：無需等待，直接推進
3. **下一阻塞點**：3O5L M11（待 M02 完全完成）

如果有阻塞，則：
1. JDNE 發起協調 MSG to 受阻機器
2. 評估是否需要 Jin 介入
3. 調整 T+48h 目標

---

**監控** ✅ | **決策** ✅ | **執行** ⏳ | **驗收** ⏳
