#!/bin/bash
# SessionStart hook: 自動同步
# session 開始時自動 git pull，確保從最新狀態開始
# AI 不需要記得 pull——hook 替它做

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 靜默 pull，有衝突留給 AI 處理
git pull --rebase origin main 2>/dev/null || true

# 更新同步時間
date +%s > "$CLAUDE_PROJECT_DIR/.last-sync-time"

# 自動輸出本機快照（壓縮恢復時零成本接回工作）
MACHINE_ID=$(cat "$CLAUDE_PROJECT_DIR/.machine-id" 2>/dev/null)
if [ -n "$MACHINE_ID" ]; then
  SNAPSHOT="$CLAUDE_PROJECT_DIR/docs/records/_snapshot-${MACHINE_ID}.md"
  if [ -f "$SNAPSHOT" ]; then
    echo "=== 本機快照（${MACHINE_ID}）==="
    cat "$SNAPSHOT"
    echo "=== 快照結束 ==="
  fi
fi

exit 0
