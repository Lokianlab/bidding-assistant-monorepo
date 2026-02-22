SNAPSHOT|20260222-1500|3O5L|Sonnet 4.6

## 行為備註
- 留守論壇（Jin 命令，持續中）
- 策略主官：優先序決定、跨機器協調、向 Jin 彙報
- 不以問句結尾，遇到下一步直接做

## 工作項目
[x] efficiency-calibration|效率校準|結案：業務基線（business-context）已建立，個別修正靠 scoring 追蹤
[x] role-assignment|工作角色分配|Jin 在 machine-profile 批准六台角色，3O5L = 策略主官
[x] all-members-upgrade|全員升為正式成員|Jin 直接宣告，CLAUDE.md 已更新，廣播完成
[x] infra-governance-phase|論壇治理階段|52 個 thread 全部 已結案，治理階段告一段落
[x] infra-dev-map-update|dev-map.md 更新|M03/M04/PCC 加入里程碑，當前階段/優先序同步修正
[x] test-useforum|useForum hook 補測試|10 tests（初次載入×5、refresh×2、並發防護×1、自動輪詢×2），74 檔 1475 tests

[v] fix-sidebar-link|Sidebar Link href undefined bug|驗收：npm run dev → 不再報 Link href undefined 錯誤
[v] cleanup-trend-dup|移除重複趨勢計算|驗收：npm run dev → 儀表板趨勢圖表仍正常顯示

[?] prod-min-demo|最小展示版驗收進度|M03✅(A44T,82T)+M04✅(Z1FV,114T)+PCC✅(ITEJ,1132T) → 三件全等 Jin 驗收；整合報告已發論壇 0230

[>] forum-participation|持續留守論壇|Jin 命令，策略主官角色

[ ] feat-test-coverage|持續找測試缺口|下一個目標未定，74 files 1475 tests

## 完成項目（近期）
[x] infra-onboarding|首次啟動 onboarding|完成
[x] fix-ssr-500|全站 500 錯誤修復（radix-ui SSR 崩潰）|commit eaacf2e
[x] fix-post-ordering|帖子排序亂序修復|commit 82e5006
[x] feat-batch-reject|批量退回按鈕|Jin 要求
[x] feat-sort-toggle|帖子排序切換|修復 Jin「找不到報告」問題
[x] feat-approval-type|[申請審核]標籤 + parser 修復|Jin 要求
[x] feat-reply-to-post|回覆特定帖子|Jin 要求
[x] feat-ref-format|ref 引用人類可讀格式|JDNE:0223-0830 → 「JDNE 在 02/23 08:30 的發言」
[x] fix-redundant-patch|移除冗餘 PATCH|省一半 API 呼叫
[x] feat-approval-filter|篩選器加 approval 類型|Jin 可篩選申請審核帖子
[x] forum-optimize-add-cut-add|先加再砍再加回方法論|論壇共識通過
[x] forum-rebase-standard|rebase 標準化|全員執行
