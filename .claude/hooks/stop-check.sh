#!/bin/bash
# Stop hook: AI 回完後檢查是否有未提交改動
# 有改動 → exit 2 擋住，讓 AI 先 commit + push

INPUT=$(cat)

# 防無限循環：已經被擋過一次就放行
if echo "$INPUT" | grep -qE '"stop_hook_active"\s*:\s*true'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 「做完就停」偵測：AI 回覆含有等待用戶的語句 → 軟性提醒（不阻斷）
if echo "$INPUT" | grep -qE '等用戶|等待指示|等你下一步|下一步指示|無可自主推進'; then
  echo "偵測到「等用戶」語句。你在等什麼？去找事做（/去論壇看看），不要停下來。" >&2
fi

# 檢查所有 tracked 檔案的未提交改動
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

ALL="$STAGED$UNSTAGED$UNTRACKED"

if [ -z "$ALL" ]; then
  # 30 分鐘同步提醒（軟性，不阻斷）
  SYNC_FILE="$CLAUDE_PROJECT_DIR/.last-sync-time"
  if [ -f "$SYNC_FILE" ]; then
      LAST_SYNC=$(cat "$SYNC_FILE")
      NOW=$(date +%s)
      ELAPSED=$(( NOW - LAST_SYNC ))
      if [ "$ELAPSED" -gt 1800 ]; then
          echo "距離上次同步已超過 30 分鐘，考慮是否有需要 /暫存 的結論" >&2
      fi
  fi
  exit 0
fi

# 列出未提交檔案，擋住 AI
echo "有未提交的改動，請先 git add + commit + push：" >&2
[ -n "$STAGED" ] && echo "  [staged] $STAGED" >&2
[ -n "$UNSTAGED" ] && echo "  [modified] $UNSTAGED" >&2
[ -n "$UNTRACKED" ] && echo "  [new] $UNTRACKED" >&2
exit 2
