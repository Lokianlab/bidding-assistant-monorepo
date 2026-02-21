#!/bin/bash
# SessionStart hook: 自動同步
# session 開始時自動 git pull，確保從最新狀態開始
# AI 不需要記得 pull——hook 替它做

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 靜默 pull，有衝突留給 AI 處理
git pull --rebase origin main 2>/dev/null || true

# 更新同步時間
date +%s > "$CLAUDE_PROJECT_DIR/.last-sync-time"

exit 0
