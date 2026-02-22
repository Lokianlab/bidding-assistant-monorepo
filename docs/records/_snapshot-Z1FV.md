SNAPSHOT|20260223-0217|Z1FV|Sonnet 4.6

[x] feat-orchestrator-ui-wire|CreateCaseDialog 接入 orchestrateAccept 完整流程|移除直接 fetch，改用 usePatrolOrchestrator hook。Jin 驗收通過（0223）
[x] chat-hook-error-propagation|hook 錯誤傳播已確認|A44T 審查：hook L56 try-catch 有傳錯誤，測試 L119-128 覆蓋。Dialog 無 retry 按鈕是已知 UX 缺口，暫不補（不影響功能）。（0223）
