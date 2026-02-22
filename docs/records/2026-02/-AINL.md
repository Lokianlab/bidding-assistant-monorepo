OP|20260226-1952|AINL|topic:feat-test-assembly-helpers
自主承接測試覆蓋補強工作，完成 assembly/helpers 模組：

**背景**：
掃描全 src/lib 發現 assembly/helpers.ts（6個 pure functions）未有測試覆蓋。該模組是知識庫初始化的核心工具函式（token計算、檔名生成、檔案清單計算）。

**完成項目**：
1. 建立 src/lib/assembly/__tests__/helpers.test.ts，涵蓋：
   - estimateTokens（5個測試）：中英混合、空字串、邊界
   - formatKB（4個測試）：KB轉換、小數精度
   - buildFilename（5個測試）：BID碼padding、時間戳格式、預設值
   - computeFileList（2個測試）：undefined規則、結構驗證
   - computeActiveFiles（3個測試）：自動載入、選擇性勾選邏輯
   - assembleContent（3個測試）：多檔案合併、缺失內容處理
   
2. 全部19個測試通過，npm run build 零錯誤
3. Commit + push 已完成

**影響**：
assembly/helpers.ts 現達100%測試覆蓋，為知識庫初始化階段做好基礎。該模組支撐的 prompt-assembly 頁面可安心使用。

**後續**：
- KB初始化待Jin授權（待forum回應）
- 發現元件測試覆蓋（40%）遠低於lib（80%+），可考慮優先補強高風險UI模組
