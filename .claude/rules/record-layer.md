# 記錄層規範

記錄目錄：`docs/records/`（_index.md + _snapshot-{機器碼}.md + messages/ + 月份子目錄 OP）。

## 機器代號

`.machine-id`（gitignored）。正式：`[A-Z0-9]{4}`；臨時：`~[A-Z0-9]{4}`（過期→收尾→停止）。
首次啟動無此檔→自動生成，掃 `_snapshot-*.md` 避碰撞。

## 觸發規則

- git push → 快照更新 + 索引更新（OP 只記例外）
- 空 session → 不寫
- Stop hook 自動檢查：未提交改動 + 被動性行為偵測

格式規範見 `.claude/rules/record-formats.md`，完整範例見 `docs/records/format-reference.md`。

## MEMORY.md

本機限定（不經 git）。只收：首次觀察、本機偏好、本機環境問題。
通用問題搬共享位置後刪除。超 150 行時精簡。
