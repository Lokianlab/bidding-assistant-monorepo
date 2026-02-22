# 同步規範

Monorepo 透過 GitHub 同步。遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`

## 基本節奏

- 推送用 `bash .claude/hooks/push-retry.sh`（自動 fetch+rebase+push，失敗重試 3 次）。有 rebase conflict 才手動處理。
- 每完成一個工作單元就推一次，不累積。一次 push 包含代碼 + 快照（例外時加 OP）。
- **推完就巡邏**：每次 `git push` 後立刻 `git fetch origin && git rebase origin/main` 一次，然後快速掃其他機器快照有無需要協調的事項。有就處理，沒有就繼續下一步工作。
- 長時間討論產生重要決策 → 主動暫停，先推結論再繼續。
- 不要隨意更新 CLAUDE.md，日常結論用 `/暫存`。例外：用戶明確說了行為規範，可直接寫入 CLAUDE.md（須標出處）。架構決策除外，仍走第三級。
- 不能只寫進本機 MEMORY.md——其他機器看不到。

## 衝突處理

| 衝突類型 | 處理方式 |
|----------|----------|
| 記錄層檔案（`_index.md`、OP、快照） | 保留兩邊內容 |
| 程式碼 | 讀懂兩邊改動，合併後跑測試 |
| package-lock.json | 刪掉重裝 |
| CLAUDE.md | 重啟或 `/更新` 時讀 diff 檢查語義一致性 |
| 暫存檔矛盾 | 都保留，`/修改計畫` 時讓用戶裁決 |
| Topic ID 重複 | 重啟或 `/更新` 時掃描偵測，提醒用戶合併 |
| 平行決策（同 topic 多台） | 重啟時自動偵測，標出提醒用戶 |

## 分支策略

- main = 穩定主幹，大功能用分支（格式 `{machine}/{topic}`）
- 機器對等，不限數量，互相可審閱
- **分工協調**：每台機器有自己擅長的領域，跨域協調由 JDNE 統籌（詳見 governance.md）
- **持續自我迭代**：每台機器應主動改進自己的流程、規則和做法，不只是執行任務

## 重啟流程（新 session 開始時）

SessionStart hook 自動執行 `git pull --rebase`（失敗時手動處理）→ git status → 有未提交就 commit → 條件觸發碰撞偵測（只在 CLAUDE.md 有改動時）→ 代碼變化時 npm test → 讀 dev-map + business-context + 自己的 snapshot 恢復上下文 → `.claude/rules/` 下規範檔由系統自動載入（不需手動讀取）→ 一句話報告

首次啟動（找不到自己的 `_snapshot-{機器碼}.md`）時，額外讀 `docs/collaboration-onboarding.md` 了解協作方式。

## 壓縮流程（context compact 後）

pre-compact hook 自動 commit/push（不保證完成）→ 檢查 hook 遺漏 → 讀自己的 snapshot → 接回工作
