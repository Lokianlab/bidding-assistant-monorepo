#!/bin/bash
# setup.sh — 新機器一鍵環境還原
# 前置條件：已安裝 Node.js v22.x + Git
# 用法：bash setup.sh
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${GREEN}[$1/$TOTAL]${NC} $2"; }

TOTAL=7
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/bidding-assistant"
MCP_DIR="$SCRIPT_DIR/smugmug-mcp"
BACKUP_DIR="$SCRIPT_DIR/.env-backup"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   全能標案助理 — 新機器環境還原        ║"
echo "╚════════════════════════════════════════╝"

# ──────────────────────────────────────────────
step 1 "檢查前置工具"
# ──────────────────────────────────────────────

command -v node &>/dev/null || fail "Node.js 未安裝！請先裝 v22.x: https://nodejs.org"
command -v git  &>/dev/null || fail "Git 未安裝！請先裝: https://git-scm.com"

ok "Node.js $(node --version)"
ok "npm $(npm --version)"
ok "Git $(git --version | cut -d' ' -f3)"

# ──────────────────────────────────────────────
step 2 "安裝 Claude Code CLI"
# ──────────────────────────────────────────────

if command -v claude &>/dev/null; then
  ok "Claude Code 已安裝 ($(claude --version 2>/dev/null || echo 'installed'))"
else
  npm install -g @anthropic-ai/claude-code@latest
  ok "Claude Code 安裝完成"
fi

# ──────────────────────────────────────────────
step 3 "安裝 bidding-assistant 依賴"
# ──────────────────────────────────────────────

[ -d "$APP_DIR" ] || fail "bidding-assistant/ 不存在，請先 clone 或同步專案"
cd "$APP_DIR" && npm install --loglevel=warn
ok "bidding-assistant 依賴安裝完成"

# ──────────────────────────────────────────────
step 4 "安裝並建構 smugmug-mcp"
# ──────────────────────────────────────────────

if [ -d "$MCP_DIR" ]; then
  cd "$MCP_DIR" && npm install --loglevel=warn && npm run build
  ok "smugmug-mcp 建構完成"
else
  warn "smugmug-mcp/ 不存在，跳過（SmugMug 功能不可用）"
fi

# ──────────────────────────────────────────────
step 5 "還原機密檔案"
# ──────────────────────────────────────────────

if [ -d "$BACKUP_DIR" ]; then
  # .env.local
  if [ -f "$BACKUP_DIR/env.local" ] && [ ! -f "$APP_DIR/.env.local" ]; then
    cp "$BACKUP_DIR/env.local" "$APP_DIR/.env.local"
    ok ".env.local 已還原"
  elif [ -f "$APP_DIR/.env.local" ]; then
    ok ".env.local 已存在，跳過"
  fi

  # .mcp.json — 還原後修正絕對路徑
  if [ -f "$BACKUP_DIR/mcp.json" ] && [ ! -f "$SCRIPT_DIR/.mcp.json" ]; then
    cp "$BACKUP_DIR/mcp.json" "$SCRIPT_DIR/.mcp.json"
    # 自動修正 smugmug-mcp 絕對路徑
    if [ -d "$MCP_DIR" ]; then
      WIN_PATH=$(cygpath -w "$MCP_DIR/dist/index.js" 2>/dev/null || echo "$MCP_DIR/dist/index.js")
      ESCAPED=$(echo "$WIN_PATH" | sed 's/\\/\\\\/g')
      # Replace the args path in .mcp.json
      sed -i "s|\"args\": \\[\"[^\"]*smugmug-mcp[^\"]*\"\\]|\"args\": [\"$ESCAPED\"]|" "$SCRIPT_DIR/.mcp.json"
    fi
    ok ".mcp.json 已還原（路徑已自動修正）"
  elif [ -f "$SCRIPT_DIR/.mcp.json" ]; then
    ok ".mcp.json 已存在，跳過"
  fi
else
  # 沒有備份 → 互動式輸入
  warn "找不到 .env-backup/，改為手動輸入"
  echo ""

  if [ ! -f "$APP_DIR/.env.local" ]; then
    read -p "  NOTION_TOKEN: " NOTION_TOKEN
    read -p "  NOTION_DATABASE_ID: " NOTION_DB_ID
    cat > "$APP_DIR/.env.local" << EOF
NOTION_TOKEN=$NOTION_TOKEN
NOTION_DATABASE_ID=$NOTION_DB_ID
EOF
    ok ".env.local 已建立"
  fi

  if [ ! -f "$SCRIPT_DIR/.mcp.json" ]; then
    read -p "  SMUGMUG_API_KEY: " SM_KEY
    read -p "  SMUGMUG_API_SECRET: " SM_SECRET
    read -p "  SMUGMUG_ACCESS_TOKEN: " SM_TOKEN
    read -p "  SMUGMUG_TOKEN_SECRET: " SM_TSECRET
    WIN_PATH=$(cygpath -w "$MCP_DIR/dist/index.js" 2>/dev/null || echo "$MCP_DIR/dist/index.js")
    JSON_PATH=$(echo "$WIN_PATH" | sed 's/\\/\\\\/g')
    cat > "$SCRIPT_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "notebooklm": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "notebooklm-mcp@latest"]
    },
    "smugmug": {
      "command": "node",
      "args": ["$JSON_PATH"],
      "env": {
        "SMUGMUG_API_KEY": "$SM_KEY",
        "SMUGMUG_API_SECRET": "$SM_SECRET",
        "SMUGMUG_ACCESS_TOKEN": "$SM_TOKEN",
        "SMUGMUG_TOKEN_SECRET": "$SM_TSECRET"
      }
    }
  }
}
EOF
    ok ".mcp.json 已建立"
  fi
fi

# ──────────────────────────────────────────────
step 6 "設定 Claude Code"
# ──────────────────────────────────────────────

CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR"

# settings.json
if [ -f "$BACKUP_DIR/claude-settings.json" ] && [ ! -f "$CLAUDE_DIR/settings.json" ]; then
  cp "$BACKUP_DIR/claude-settings.json" "$CLAUDE_DIR/settings.json"
  ok "settings.json 已還原"
elif [ ! -f "$CLAUDE_DIR/settings.json" ]; then
  cat > "$CLAUDE_DIR/settings.json" << 'EOF'
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
EOF
  ok "settings.json 已建立（Agent Team 啟用）"
else
  ok "settings.json 已存在"
fi

# Memory files
MEMORY_TARGET="$CLAUDE_DIR/projects/C--Users-gary2-OneDrive----cc--/memory"
if [ -d "$BACKUP_DIR/claude-memory" ] && [ "$(ls -A "$BACKUP_DIR/claude-memory" 2>/dev/null)" ]; then
  mkdir -p "$MEMORY_TARGET"
  cp "$BACKUP_DIR/claude-memory/"*.md "$MEMORY_TARGET/" 2>/dev/null || true
  ok "Claude Code 記憶已還原 ($(ls "$MEMORY_TARGET/"*.md 2>/dev/null | wc -l) 個檔案)"
else
  warn "無記憶備份，Claude Code 會在首次使用時建立"
fi

# ──────────────────────────────────────────────
step 7 "驗證環境"
# ──────────────────────────────────────────────

cd "$APP_DIR"

echo "  執行 build..."
if npm run build 2>&1 | tail -3; then
  ok "Build 通過"
else
  fail "Build 失敗，請檢查錯誤"
fi

echo "  執行測試..."
if npm test 2>&1 | tail -5; then
  ok "測試通過"
else
  fail "測試失敗，請檢查錯誤"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo -e "║   ${GREEN}✓ 環境還原完成！${NC}                     ║"
echo "╠════════════════════════════════════════╣"
echo "║                                        ║"
echo "║  啟動開發：                             ║"
echo "║  cd bidding-assistant                   ║"
echo "║  npm run dev -- -p 3003                 ║"
echo "║                                        ║"
echo "║  驗證 MCP：在 Claude Code 中 /mcp       ║"
echo "║                                        ║"
echo "╚════════════════════════════════════════╝"
echo ""
