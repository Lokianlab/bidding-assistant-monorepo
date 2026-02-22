#!/bin/bash
# push-retry: fetch+rebase+push 一氣呵成，失敗自動重試
# 用法：bash .claude/hooks/push-retry.sh
# 取代手動分開跑 fetch/rebase/push

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(git rev-parse --show-toplevel)" || exit 1

MAX=3
for i in $(seq 1 $MAX); do
  git fetch origin 2>/dev/null
  git rebase origin/main 2>/dev/null || { echo "rebase conflict, manual fix needed" >&2; exit 1; }
  if git push origin main 2>/dev/null; then
    exit 0
  fi
  [ $i -lt $MAX ] && sleep 1
done

echo "push failed after $MAX retries" >&2
exit 1
