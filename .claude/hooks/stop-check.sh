#!/bin/bash
# Stop hook: 行為合規檢查（泛化版）
# 設計原則：不逐條拼症狀，按嚴重度分兩層
#   exit 2 = 硬性阻斷（AI 不能停，必須繼續）
#   stderr = 軟性提醒（AI 可以停但下次注意）

INPUT=$(cat)

# 防無限循環：被擋過一次就放行
if echo "$INPUT" | grep -qE '"stop_hook_active"\s*:\s*true'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# ═══ 硬性阻斷 ═══

# 1. 未提交改動 → 必須先 commit + push
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
ALL="$STAGED$UNSTAGED$UNTRACKED"

if [ -n "$ALL" ]; then
  echo "有未提交的改動，請先 git add + commit + push：" >&2
  [ -n "$STAGED" ] && echo "  [staged] $STAGED" >&2
  [ -n "$UNSTAGED" ] && echo "  [modified] $UNSTAGED" >&2
  [ -n "$UNTRACKED" ] && echo "  [new] $UNTRACKED" >&2
  exit 2
fi

# 2. 被動性偵測：回覆尾部把決策丟給用戶 → 強制繼續
#    覆蓋：做完就停、不主動表態、報告不行動、分析不行動
#    這些 pattern 的共同特徵：AI 該自己判斷/行動，卻轉交用戶
TAIL=$(echo "$INPUT" | tail -10)
if echo "$TAIL" | grep -qE '需要我做什麼|有什麼.*要我做|要我.*繼續嗎|接下來做什麼|要不要我|你來決定|你.*選擇|還是你'; then
  echo "被動性阻斷：你把決策丟給用戶了。規則：只在用戶手上有 AI 拿不到的東西時才停。自己判斷，直接做。" >&2
  exit 2
fi

# ═══ 軟性提醒 ═══

# 等待語句：可能合理（真的需要用戶輸入），但提醒邊等邊做
if echo "$TAIL" | grep -qE '等用戶|等待指示|等你下一步|下一步指示|無可自主推進'; then
  echo "偵測到等待語句。確認：用戶手上有什麼是你拿不到的？有其他能自主推進的工作嗎？" >&2
fi

# 30 分鐘同步提醒
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
