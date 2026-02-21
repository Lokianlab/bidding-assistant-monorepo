#!/bin/bash
# PostToolUse hook: 檔案修改旗標
# Edit/Write/Bash 執行後設旗標，讓 Stop hook 知道需要跑 git check
# 沒有旗標 = 這輪沒改檔案 = Stop hook 跳過 git check

INPUT=$(cat)

# 只在 Edit/Write/Bash 工具觸發時設旗標
TOOL=$(echo "$INPUT" | grep -oP '"tool_name"\s*:\s*"\K[^"]+' 2>/dev/null | head -1)

case "$TOOL" in
  Edit|Write|Bash|NotebookEdit)
    touch "$CLAUDE_PROJECT_DIR/.file-modified-flag"
    ;;
esac

exit 0
