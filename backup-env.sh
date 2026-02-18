#!/bin/bash
# backup-env.sh — 在舊機器上打包機密檔案 + Claude Code 記憶
# 用法：bash backup-env.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/.env-backup"

echo "=== 全能標案助理 — 環境備份 ==="
echo ""

rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/claude-memory"

# 1. 機密檔案
[ -f "$SCRIPT_DIR/bidding-assistant/.env.local" ] && \
  cp "$SCRIPT_DIR/bidding-assistant/.env.local" "$BACKUP_DIR/env.local"

[ -f "$SCRIPT_DIR/.mcp.json" ] && \
  cp "$SCRIPT_DIR/.mcp.json" "$BACKUP_DIR/mcp.json"

# 2. Claude Code 記憶
MEMORY_DIR="$HOME/.claude/projects/C--Users-gary2-OneDrive----cc--/memory"
if [ -d "$MEMORY_DIR" ]; then
  cp "$MEMORY_DIR/"*.md "$BACKUP_DIR/claude-memory/" 2>/dev/null || true
fi

# 3. Claude Code 設定
[ -f "$HOME/.claude/settings.json" ] && \
  cp "$HOME/.claude/settings.json" "$BACKUP_DIR/claude-settings.json"

echo "已備份到: $BACKUP_DIR/"
ls -la "$BACKUP_DIR/"
echo ""
echo "請將 .env-backup/ 資料夾安全地帶到新機器（USB / 加密雲端）"
echo "⚠  內含 API 密鑰，不要 commit 到 git"
