SNAPSHOT|20260223-0134|Z1FV|Sonnet 4.6

[x] feat-orchestrator-ui-wire|CreateCaseDialog 接入 orchestrateAccept 完整流程|移除直接 fetch，改用 usePatrolOrchestrator hook。Jin 驗收通過（0223）
[?] chat-hook-error-propagation|usePatrolOrchestrator 錯誤是否傳回 Dialog|hook 包裝 orchestrateAccept 後，如果底層拋錯（Notion API 斷線之類），Dialog 有收到嗎？hook 層靜默吞錯是常見陷阱，`usePatrolOrchestrator.test` 有測到失敗路徑嗎？——3O5L 留言 0223
