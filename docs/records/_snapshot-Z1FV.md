SNAPSHOT|20260223-1840|Z1FV|Opus 4.6
[>] infra-collab-protocol|論壇機制優化|Jin 指示留在論壇。已完成：帖子排序修復、批量退回、自動輪詢、13 項核准報告、待核准卡片白話摘要（APPROVAL_SUMMARIES）、[申請審核]標記偵測。回覆 5 個新 thread（team-optimization-draft/approval-tracking/forum-pending-visibility/n-minus-1-escalation/forum-realtime）
[v] feat-docgen-markdown|docgen 支援完整 markdown 格式|標題+列表+粗斜體，+19 tests，待用戶驗收。驗收：npm run dev → /tools/docx → 貼入含 ## 標題和 - 列表的內容 → 生成 DOCX 確認格式
[v] feat-docgen-cover-toc|docgen 封面頁+自動目錄|封面（案名/公司名/民國日期）+目錄（HeadingLevel 1-4）+heading 樣式，+19 tests，待用戶驗收。驗收：npm run dev → /tools/docx → 生成 DOCX → 用 Word 開啟確認有封面和目錄
[v] feat-trend-dashboard|趨勢分析整合到儀表板卡片|滾動勝率趨勢（LineChart）+季度比較（BarChart），6 檔修改+測試更新，待用戶驗收。驗收：npm run dev → 儀表板 → 新增卡片 → 選「滾動勝率趨勢」和「季度比較」確認有圖表
[v] feat-pricing-refactor|pricing 模組跨機器審查|品質好無 bug，一處一致性建議（page.tsx:127 改用 itemAmount），ITEJ 已採納
[v] fix-connections-page|ConnectionsPage apiKey undefined|deepMerge 設定+防禦性 fallback+修復 7 個既有測試，待用戶驗收。驗收：npm run dev → /settings/connections → 頁面正常載入不報錯
[v] feat-m04-phase1|M04 品質閘門 Phase 1 — 事實查核|幻覺偵測+KB來源追溯，26 tests，待跨機器審查+用戶驗收。驗收：70 檔 1411 tests 全過
[v] feat-m04-quality-gate|M04 品質閘門全模組完成（Phase 1-4）|四道閘門純函式 + 品質報告 + 6 UI 元件 + Hook + Feature Registry + 頁面，70 檔 1412 tests 全過。驗收：npm run dev → /tools/quality-gate → 貼入文字 → 點「開始檢查」→ 看四道閘門結果和總評
[v] feat-assembly-refactor|ITEJ 提案組裝引擎跨機器審查|審查通過：6 純函式正確抽離、32 tests 全過、無 bug
[v] infra-forum-replies|論壇進行中 thread 回覆|efficiency-calibration 第二輪+push-then-continue+role-assignment+scoring-architecture 已回覆
[v] infra-review-mechanisms|幕僚任務：三系統檢討|分析已交付，待用戶裁決哪些要動
