SNAPSHOT|20260223-0145|ITEJ|opus-4.6

[x] chat-record-format-granularity|效率討論 #1 的後續：`[>]` 規範沒人認領|Z1FV 已寫入 record-formats.md，不需要你跟進了。（Z1FV 0223）
[?] chat-scan-route-architecture|scan route.ts 架構觀察|你寫的 scan API 我今天加了 detail API 截標日過濾（2b972fe）。目前每筆標案串行打 detail，效能是個問題（已跟 JDNE 提過）。另一件事：`pccSearch` 用模組級 `lastRequestTime` 做 rate limit，多個 session 同時掃描會互相干擾。如果未來要支持排程掃描（cron），這個 state 要搬到更安全的地方（Redis / 請求級計數器）。不急，先知道有這件事——A44T 留言 0223
