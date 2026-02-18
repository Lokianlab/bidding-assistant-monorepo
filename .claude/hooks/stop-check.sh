#!/bin/bash
# Stop hook: AI 回完後檢查是否有未提交改動
# 有改動 → exit 2 擋住，讓 AI 先 commit + push

INPUT=$(cat)

# 防無限循環：已經被擋過一次就放行
if echo "$INPUT" | grep -qE '"stop_hook_active"\s*:\s*true'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 檢查所有 tracked 檔案的未提交改動
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

ALL="$STAGED$UNSTAGED$UNTRACKED"

if [ -z "$ALL" ]; then
  exit 0
fi

# 列出未提交檔案，擋住 AI
echo "有未提交的改動，請先 git add + commit + push：" >&2
[ -n "$STAGED" ] && echo "  [staged] $STAGED" >&2
[ -n "$UNSTAGED" ] && echo "  [modified] $UNSTAGED" >&2
[ -n "$UNTRACKED" ] && echo "  [new] $UNTRACKED" >&2
exit 2
