SNAPSHOT|20260223-1545|3O5L|Opus 4.6
[ ] efficiency-calibration|效率校準|第一輪答辯已提交，第二輪全員完成，待 Jin 最終裁決
[v] fix-sidebar-link|Sidebar Link href undefined bug|驗收：npm run dev → 任何頁面不再報 Link href undefined 錯誤
[v] cleanup-trend-dup|移除重複趨勢計算|驗收：npm run dev → 儀表板趨勢圖表仍正常顯示
[x] fix-ssr-500|全站 500 錯誤修復（radix-ui SSR 崩潰）|commit eaacf2e
[x] fix-post-ordering|帖子排序亂序修復（改為純時間升序）|commit 82e5006
[x] no-closing-question|禁止以問句結尾收工|已結案，已寫入 CLAUDE.md
[x] temp-machine-code|機器碼正式/臨時|共識達成（五台一致），待實作
[x] infra-onboarding|首次啟動|已完成 onboarding
[x] infra-forum-brief-directive-removal|移除 brief/directive 類型|已從 forum-format.md + CLAUDE.md + 3 個指令檔移除
[x] forum-optimize-add-cut-add|「先加再砍再加回」方法論提案|已發論壇 discuss，Z1FV 整合草案完成
[x] forum-rebase-standard|rebase 標準化回覆|同意 Z1FV 提案，CLAUDE.md 已改
[x] forum-verification-queue|驗收佇列回覆|同意放 /待辦
[x] forum-forum-optimization|論壇功能優化回覆|支持方案 A 移除摘要
[x] forum-approval-report|forum-optimization + decision-making 核准報告|已發論壇（含更正帖），等 Jin 裁決
[x] feat-batch-reject|批量退回按鈕|Jin 要求，已推送
[x] feat-sort-toggle|帖子排序切換（最新在前/最舊在前）|修復 Jin「找不到報告」問題
[x] feat-approval-type|申請審核帖子類型 + parser 修復|Jin 要求的[申請審核]標籤 + 修復內容中 --- 被誤判為帖子分隔符
[x] feat-reply-to-post|回覆特定帖子功能|Jin 要求「單獨回覆特定回覆」，commit 3c09624
[x] feat-ref-format|ref 引用人類可讀格式|JDNE:20260223-0830 → 「JDNE 在 02/23 08:30 的發言」
[x] fix-redundant-patch|移除批准/退回的冗餘 PATCH|POST updateStatus 已包含更新，省一半 API 呼叫
[x] feat-approval-filter|篩選器加 approval 類型|Jin 可篩選「申請審核」帖子
[x] feat-approval-summaries|補齊 team-optimization-draft + approval-tracking 白話摘要|待核准面板顯示完整
[ ] feat-verification-queue|/待辦 加驗收清單掃描|A44T 分配，等 Jin 批准 #13 後開始
[>] forum-participation|持續參與論壇討論|Jin 命令範圍：論壇 + 協作協議 + 論壇代碼
