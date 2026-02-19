#!/bin/bash
# PreCompact hook: 壓縮前自動保存記錄層
# 壓縮無法阻止，但能確保未提交的記錄不會遺失

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 收集 docs/records/ 和 _staging/ 的未提交改動
CHANGES=""
for dir in "docs/records" "bidding-assistant/docs/dev-plan/_staging"; do
  if [ -d "$dir" ]; then
    S=$(git diff --cached --name-only -- "$dir" 2>/dev/null)
    U=$(git diff --name-only -- "$dir" 2>/dev/null)
    T=$(git ls-files --others --exclude-standard -- "$dir" 2>/dev/null)
    CHANGES="$CHANGES$S$U$T"
  fi
done

if [ -z "$CHANGES" ]; then
  exit 0
fi

# 順序：add → commit（本地保底）→ pull → push（同步遠端）
# 全部 || true：不能阻塞壓縮
git add docs/records/ bidding-assistant/docs/dev-plan/_staging/ 2>/dev/null
git commit -m "pre-compact: 自動保存記錄層（壓縮前）" 2>/dev/null || true
git pull origin main 2>/dev/null || true
git push origin main 2>/dev/null || true
date +%s > "$CLAUDE_PROJECT_DIR/.last-sync-time"

exit 0
