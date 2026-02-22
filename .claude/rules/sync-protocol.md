# 同步規範

遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`

- 推送用 `bash .claude/hooks/push-retry.sh`（自動 fetch+rebase+push，3次重試）
- **push 節奏**：session 最多 2-3 次（中段+收尾），admin 改動攢一批
- **巡邏**：code commit 推完才巡邏；admin commit 推完不巡邏
- 長時間討論有重要決策 → 暫停推結論再繼續
- 不能只寫進本機 MEMORY.md——其他機器看不到

**重啟**：hook 自動 pull+rebase → git status → 有未提交就 commit → `.claude/rules/` 已自動載入 → 一句話報告
**compact 後**：检查 hook 遺漏 → 讀自己快照 → 接回工作

衝突處理、分支策略見 `docs/records/format-reference.md`（按需讀）
