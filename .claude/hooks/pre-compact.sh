#!/bin/bash
# PreCompact hook: 壓縮前自動保存記錄層 + 快照更新提醒

cd "$CLAUDE_PROJECT_DIR" || exit 0

# === 記錄層保存（優先，確保不丟資料）===
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

# === 快照更新提醒 ===
# 每次壓縮提醒一次，防重複用 flag 檔
FLAG="$CLAUDE_PROJECT_DIR/.pre-compact-snapshot-flag"

if [ -f "$FLAG" ]; then
  rm -f "$FLAG"
  exit 0
fi

MACHINE_ID=$(cat .machine-id 2>/dev/null)
if [ -z "$MACHINE_ID" ]; then
  exit 0
fi

touch "$FLAG"
echo "壓縮即將發生。請先更新快照 docs/records/_snapshot-${MACHINE_ID}.md，確認所有進行中的討論都有記錄。" >&2
exit 2
