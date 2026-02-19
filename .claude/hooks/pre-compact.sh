#!/bin/bash
# PreCompact hook: 壓縮前自動保存記錄層

cd "$CLAUDE_PROJECT_DIR" || exit 0

CHANGES=""
for dir in "docs/records" "bidding-assistant/docs/dev-plan/_staging"; do
  if [ -d "$dir" ]; then
    S=$(git diff --cached --name-only -- "$dir" 2>/dev/null)
    U=$(git diff --name-only -- "$dir" 2>/dev/null)
    T=$(git ls-files --others --exclude-standard -- "$dir" 2>/dev/null)
    CHANGES="$CHANGES$S$U$T"
  fi
done

if [ -n "$CHANGES" ]; then
  git add docs/records/ bidding-assistant/docs/dev-plan/_staging/ 2>/dev/null
  git commit -m "pre-compact: 自動保存記錄層（壓縮前）" 2>/dev/null || true
  git pull origin main 2>/dev/null || true
  git push origin main 2>/dev/null || true
  date +%s > "$CLAUDE_PROJECT_DIR/.last-sync-time"
fi
