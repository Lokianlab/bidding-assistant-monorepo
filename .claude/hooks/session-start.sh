#!/bin/bash
# SessionStart hook: 自動同步 + 收件匣檢查
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
    echo ""
    echo "如果快照有 [>]，繼續做。如果有 [ ]，挑一個做。不要等用戶。"
  fi

  # ═══ 收件匣：掃描寄給本機或 ALL 的訊息 ═══
  MSG_DIR="$CLAUDE_PROJECT_DIR/docs/records/messages"
  if [ -d "$MSG_DIR" ]; then
    MSGS=$(find "$MSG_DIR" -maxdepth 1 -name "*.md" \( -name "*-to-${MACHINE_ID}.md" -o -name "*-to-ALL.md" \) 2>/dev/null | sort)
    if [ -n "$MSGS" ]; then
      echo ""
      echo "=== 收件匣（${MACHINE_ID}）==="
      for MSG_FILE in $MSGS; do
        echo "--- $(basename "$MSG_FILE") ---"
        cat "$MSG_FILE"
        echo ""
      done
      echo "=== 收件匣結束 ==="
      echo ""
      echo "讀完訊息後：(1) 處理內容 (2) 把已讀檔案搬到 messages/archive/"
    fi
  fi
fi

exit 0
