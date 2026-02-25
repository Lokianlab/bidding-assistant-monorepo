# TASKS — 全能標案助理待辦清單

> 最後更新：2026-02-26
> 操作方式：完成一項就把 [ ] 改成 [x]，加上日期。

---

## Phase 0：程式碼除重（瘦身階段五）

- [ ] T-001 統一知識模組
  - 現狀：kb/（8檔）、knowledge/（9檔,0測試,死碼）、knowledge-base/（15檔,有測試）
  - 做法：以 knowledge-base/ 為準，合併 kb/ 中有用的邏輯，刪除 knowledge/
  - 先讀：src/lib/modules/knowledge-base/、src/lib/modules/kb/
  - 驗收：knowledge/ 和 kb/ 目錄不存在，knowledge-base/ 測試全過

- [ ] T-002 統一品質模組
  - 現狀：quality/（7檔）、quality-gate/（16檔,有測試）
  - 做法：以 quality-gate/ 為準，合併 quality/ 中有用的邏輯，刪除 quality/
  - 先讀：src/lib/modules/quality-gate/、src/lib/modules/quality/
  - 驗收：quality/ 目錄不存在，quality-gate/ 測試全過

- [ ] T-003 統一結案模組
  - 現狀：closure/（1檔）、case-closing/（5檔）
  - 做法：以 case-closing/ 為準，把 closure/ 的邏輯併入，刪除 closure/
  - 驗收：closure/ 目錄不存在

- [ ] T-004 清除孤兒模組
  - 目標模組：m10、backup、docgen、kb-import、presentation、decisions
  - 做法：逐一確認無 import 引用後刪除。有引用的先解耦再刪
  - 驗收：上述目錄不存在，build + test 通過

- [ ] T-005 清除殭屍頁面
  - 做法：grep 所有 src/app/ 頁面中 import 死模組的路徑，修正或刪除
  - 驗收：npm run build 零錯誤

---

## Phase 1：接通情報管線

- [ ] T-006 設定 Supabase 環境變數
  - 做法：建 .env.local.example，列出必要 key；README 加設定說明
  - 驗收：.env.local.example 存在且含 SUPABASE_URL、SUPABASE_ANON_KEY

- [ ] T-007 移除假資料（mock data）
  - 做法：找出所有 hardcoded 假標案/假公司資料，改為從 API 或 DB 讀取
  - 驗收：grep -r "mock" src/lib/modules/intelligence/ 回傳空

- [ ] T-008 接通 Perplexity 面板
  - 現狀：UI 存在但 prompt 是假的
  - 做法：把 intelligence/ 的 prompt builder 接到 Perplexity 面板的呼叫點
  - 驗收：面板送出的 prompt 來自 prompt builder，非 hardcoded 字串

- [ ] T-009 接通 trigger.ts
  - 現狀：trigger.ts 存在但未 hook 到任何 UI 觸發點
  - 做法：從掃描結果頁的按鈕接到 trigger.ts
  - 驗收：點「深入分析」按鈕會呼叫 trigger.ts 中的函式

- [ ] T-010 掃描→情報導航
  - 現狀：掃描完畢後無法直接進入情報分析頁
  - 做法：掃描結果頁加「查看情報」連結，導向 intelligence 頁面並帶入標案 ID
  - 驗收：從掃描結果可一鍵進入情報頁，且正確帶入標案資料
