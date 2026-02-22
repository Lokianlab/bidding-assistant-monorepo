# 記錄層規範

所有 Claude Code session 的操作透過 `docs/records/` 自動記錄。

## 目錄結構

```
docs/records/
  _index.md                 ← 主題索引（所有主題的一句話結論）
  _snapshot-{機器碼}.md      ← 各機器的工作備忘錄
  messages/                  ← 跨 session 點對點訊息（SessionStart hook 自動檢查）
    archive/                 ← 已讀已處理的訊息
  forum/                     ← 機器論壇（已廢除，保留為歷史檔案）
  2026-02/                   ← 按月分子目錄
    20260219-JDNE.md         ← 每日每台機器一個檔案
```

## 機器代號

- 存放在專案根目錄 `.machine-id`（已 gitignored）
- **正式機器**：格式 `[A-Z0-9]{4}`，隨機生成，生成後永不改變
- **臨時機器**：格式 `~[A-Z0-9]{4}`（5 字元，`~` 前綴），有效期限由用戶指定
  - 過期行為：過期 → 收尾（push 所有改動 + 快照標「中斷」） → 停止 → 等續期或升級
- 首次啟動沒有此檔時：自動生成隨機碼，掃描已存在的 `_snapshot-*.md` 避免碰撞（出處：temp-machine-code 共識 0224）

## 觸發規則

| 事件 | 動作 |
|------|------|
| git push | OP 記錄（只記例外：失敗、意外、重要決策、教訓；例行成功靠 commit message）+ 快照更新 + 主題索引更新 |
| 空 session | 不寫任何東西 |

Stop hook（`.claude/hooks/stop-check.sh`）自動檢查兩件事：(1) 未提交改動（透過 PostToolUse flag 觸發，只在 Edit/Write/Bash 後才檢查）；(2) 被動性行為偵測（從 `stop-patterns.conf` 讀取模式，比對回覆尾部）。兩者觸發 exit 2 強制 AI 繼續。

OP、快照、主題索引的格式規範在 `.claude/rules/record-formats.md`。

## MEMORY.md 維護規則

MEMORY.md（`.claude/projects/` 內）是本機限定暫存筆記，不經 git 同步。

只有三類內容進 MEMORY.md：首次觀察（根因不明的除錯現象）、本機限定偏好、本機環境問題。其他全寫共享位置（除錯→debugging.md、規範→CLAUDE.md、決策→/暫存、方法論→methodology/）。

首次觀察再次遇到且確認為通用問題 → 搬到共享位置 → 從 MEMORY.md 刪除。超過 150 行時精簡。
