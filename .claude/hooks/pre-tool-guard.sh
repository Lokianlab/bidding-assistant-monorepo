#!/bin/bash
# PreToolUse hook: 危險命令攔截
# 在 bash 命令執行前檢查，攔截破壞性操作
# 格式同 stop-patterns.conf：設定驅動，加新規則不改程式碼

INPUT=$(cat)

# 提取 bash 命令內容
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"\K[^"]+' 2>/dev/null | head -1)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# 讀取攔截規則
CONF="$CLAUDE_PROJECT_DIR/.claude/hooks/dangerous-commands.conf"
if [ ! -f "$CONF" ]; then
  exit 0
fi

while IFS='|' read -r pattern message; do
  case "$pattern" in
    ""|\#*) continue ;;
  esac

  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "$message" >&2
    exit 2
  fi
done < "$CONF"

exit 0
