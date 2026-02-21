#!/bin/bash
# Stop hook: 泛化行為合規檢查
# 問題定義在 stop-patterns.conf，本檔只是通用引擎
# 加新問題 = 在 conf 加一行，不改這個檔案

INPUT=$(cat)

# 防無限循環：被擋過一次就放行
if echo "$INPUT" | grep -qE '"stop_hook_active"\s*:\s*true'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

HARD_TRIGGERED=0

# ═══ 硬性：未提交改動（只在有旗標時才跑 git check）═══
FLAG="$CLAUDE_PROJECT_DIR/.file-modified-flag"
if [ -f "$FLAG" ]; then
  rm -f "$FLAG"
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
fi

# ═══ 論壇巡邏：停下前拉一次，有 P0/P1 就不讓停 ═══
SYNC_FILE="$CLAUDE_PROJECT_DIR/.last-sync-time"
NOW=$(date +%s 2>/dev/null || echo 0)
LAST=0
if [ -f "$SYNC_FILE" ]; then
  LAST=$(cat "$SYNC_FILE" 2>/dev/null || echo 0)
fi
ELAPSED=$((NOW - LAST))

# 距離上次同步超過 5 分鐘才拉（避免頻繁 pull）
if [ "$ELAPSED" -ge 300 ]; then
  git pull --rebase origin main > /dev/null 2>&1 || true
  echo "$NOW" > "$SYNC_FILE"

  # 掃論壇：找進行中的 P0/P1 thread
  THREADS="$CLAUDE_PROJECT_DIR/docs/records/forum/_threads.md"
  if [ -f "$THREADS" ]; then
    URGENT=$(grep -E '進行中\|(P0|P1)\|' "$THREADS" 2>/dev/null || true)
    if [ -n "$URGENT" ]; then
      echo "" >&2
      echo "══ 論壇巡邏 ══ 偵測到進行中的 P0/P1 討論，請先處理：" >&2
      echo "$URGENT" | while IFS='|' read -r tid status prio title rest; do
        echo "  [$prio] $title (thread:$tid)" >&2
      done
      echo "" >&2
      HARD_TRIGGERED=1
    fi
  fi
fi

# ═══ 資料驅動行為偵測 ═══
CONF="$CLAUDE_PROJECT_DIR/.claude/hooks/stop-patterns.conf"
if [ -f "$CONF" ]; then
  TAIL=$(echo "$INPUT" | tail -10)

  while IFS='|' read -r severity pattern message; do
    # 跳過空行和註解
    case "$severity" in
      ""|\#*) continue ;;
    esac

    if echo "$TAIL" | grep -qE "$pattern"; then
      echo "$message" >&2
      if [ "$severity" = "hard" ]; then
        HARD_TRIGGERED=1
      fi
    fi
  done < "$CONF"
fi

if [ "$HARD_TRIGGERED" -eq 1 ]; then
  exit 2
fi

exit 0
