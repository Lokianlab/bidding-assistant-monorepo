SNAPSHOT|20260222-1530|AINL|sonnet-4.6
[x] infra-sync|首次同步完成|@op:20260221-AINL#1924
[ ] feat-test-coverage|補測試覆蓋+跨機器審查|64 檔 1317 tests。本次：+useDashboardMetrics 65 + useFitScore 修正。跨機器審查：A44T docgen/ToolFileDialog 通過、ITEJ KB/CustomOptions/Logger/PCC 邊界/pricing/assembly 通過、Z1FV M04 quality-gate Phase 1（發現 extractKeywords 死碼+comment 不一致）
[ ] feat-quality-refactor|品質模組審查|型別 bug 修復+邊界測試 +2，A44T/JDNE 已審查通過，待用戶驗收
[v] infra-user-auth|Saint 註冊轉交|Jin 已核准 Saint 為 collaborator（0222），JDNE 執行寫入 user-auth.md。本機 .user-pins 已設。待 Saint 下次在本機驗證登入確認
[x] infra-self-review|自我審查|累計 -14, +3。同一模式 ≥3 次，已提議寫規則
[v] feat-trend-analysis|趨勢分析模組|純函式 26 tests + hook 7 tests + UI 整合完成（滾動勝率折線圖+季度比較柱狀圖），全鏈路打通。驗收：npm run dev → 儀表板 → 新增趨勢卡片檢視
[v] feat-dashboard-charts|儀表板圖表卡片擴充|8 張圖表卡片（+3：狀態分布甜甜圈+預算分布橫條+決策分布甜甜圈）。驗收：npm run dev → 儀表板 → 新增三張圖表卡片
[v] feat-scout-committee|P偵察加入評委情報|純函式+6 tests，UI 接線修正（committee prop 正確傳入）。驗收：開啟有評委的案件詳情 → 按 Scout 按鈕 → 檢視 prompt 含評委段落
