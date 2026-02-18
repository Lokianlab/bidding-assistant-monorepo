# Debugging & Development Lessons

## 1. 修 Bug 必須深挖根因，不可頭痛醫頭

**案例（2026-02-17 case-board 搜尋測試）：**

問題：測試搜尋 "台北" 預期配對 1 筆，實際配對 3 筆。

錯誤做法（頭痛醫頭）：
- 只改搜尋詞 "台北" → "公園" 讓測試通過
- 沒有追問：為什麼 3 筆都 match？

正確做法（深挖根因）：
- 發現 `makePage` helper 把所有 agency 硬寫成 "台北市政府"
- 搜尋 "台北" 同時匹配 name + agency，所以 3 筆全中
- 修正：`makePage` 加 agency 參數 + 每筆測試資料用不同 agency
- 拆分 4 個精確測試：name-only / agency-only / OR 邏輯 / 組合篩選

**原則 — 測試不通過時的調查流程：**
1. **先理解失敗訊息**：expected 1 got 3 — 為什麼是 3？不是「怎麼改成 pass」
2. **追溯資料流**：搜尋 "台北" → `applyBoardFilters` → 比對 name + agency → 3 筆 agency 都含「台北」
3. **判斷錯在哪一層**：是產品代碼有 bug？還是測試寫錯？還是測試資料有缺陷？
4. **從根源修正**：本例根因是測試資料設計不良，所以修 makePage + 測試資料，而非改斷言

**絕對不做：**
- 看到 expected 1 got 3 就把斷言改成 3
- 換一個搜尋詞碰巧讓結果 = 1 就收工
- 只看表面（「搜尋詞選錯了」）而不追問底層（「為什麼這個詞會配對到不該配的資料」）

## 2. 測試資料設計原則

- 每筆 mock 資料的區分欄位必須不同，否則無法隔離測試
- 避免所有 mock 共用同一個值（如 agency 全部 "台北市政府"）
- 測試名稱要明確說明測試的是哪條路徑（e.g. "matching name only" 而非 "search keyword"）

## 3. 閉環開發流程順序

CLAUDE.md 規定的正確順序：
1. 寫代碼
2. **自我審查**（逐檔檢查型別、import、無硬編碼、SSOT）
3. **寫測試**（和代碼同一輪完成，不能事後補）
4. 跑測試（`npm test`）
5. 跑 build（`npm run build`）
6. 讀報錯
7. 修 bug → 回到步驟 2
8. 自證正確（build + test + dev server）

常犯錯誤：
- 跳過步驟 2（自我審查）直接跑 build
- 先跑 build 再寫測試（順序反了）
- 測試當事後補丁而非開發流程的一部分
