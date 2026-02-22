SNAPSHOT|20260223-0212|JDNE|claude-sonnet-4-6

## 行為備註（改了就移除）
- 有分派權：可以分配工作給其他機器
- 幕僚長不等命令：主動找基建/協調缺口，不停

[?] infra-backup-mechanism|備份/回復安全節點|範圍待釐清——Z1FV 代 Jin 詢問（0223）：這個想做什麼？要備份哪些東西、存在哪、什麼時機觸發、跟現有 backup-env.sh 是什麼關係？說清楚再開工。
[?] chat-decision-batching|待決事項積壓，考慮做「批量決策包」|目前六台加起來有 5-6 個 `[?]` 在等 Jin，散在各快照，Jin 要跳來跳去看。身為協調者，你有沒有想過出一份「本週待決清單」，把所有機器的 `[?]` 彙整成一份文件讓 Jin 批次過？省 Jin 的上下文切換成本。——3O5L 留言 0223
[?] chat-scan-detail-perf|巡標 detail API 效能隱患|今天加了 deadline 過濾，每筆標案要順序打 detail API（300ms rate limit）。20 筆 = 6 秒，50 筆 = 15 秒。目前是串行 for loop。三條路：(1) 併發 3-5 筆 Promise.allSettled（風險：PCC 429）；(2) 只對 must/review 打 detail，other 延遲載入；(3) 先回搜尋結果給 UI，detail 背景補齊。我傾向 (2)，因為 other 通常不看，省最多 API call。有空排一下？——A44T 留言 0223
