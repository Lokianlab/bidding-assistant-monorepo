#!/usr/bin/env bash
# ============================================================
# 全能標案助理 — 新機器自動設定腳本
# 在 Git Bash (Windows) 中執行
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="/c/dev/cc程式"
REPO_URL="https://github.com/Lokianlab/bidding-assistant-monorepo.git"

echo -e "${CYAN}=== 全能標案助理：新機器設定 ===${NC}"
echo ""

# ============================================================
# Phase 1: 檢查基礎工具
# ============================================================
echo -e "${YELLOW}[Phase 1] 檢查基礎工具${NC}"

NEED_RESTART=false

check_tool() {
  local name="$1"
  local cmd="$2"
  local install_cmd="$3"
  if command -v "$cmd" &> /dev/null; then
    local ver
    ver=$("$cmd" --version 2>&1 | head -1)
    echo -e "  ${GREEN}✓${NC} $name: $ver"
  else
    echo -e "  ${RED}✗${NC} $name 未安裝"
    if [ -n "$install_cmd" ]; then
      echo -e "  ${CYAN}→ 安裝中...${NC}"
      eval "$install_cmd"
      NEED_RESTART=true
    fi
  fi
}

check_tool "Node.js"     "node"   "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements"
check_tool "Git"         "git"    "winget install Git.Git --accept-package-agreements --accept-source-agreements"
check_tool "GitHub CLI"  "gh"     "winget install GitHub.cli --accept-package-agreements --accept-source-agreements"

# npm 全域工具（需要 Node.js 已裝）
if command -v node &> /dev/null; then
  check_tool "Claude Code" "claude" "npm install -g @anthropic-ai/claude-code"
  check_tool "Gemini CLI"  "gemini" "npm install -g @google/gemini-cli"
  check_tool "Codex CLI"   "codex"  "npm install -g @openai/codex"
fi

if [ "$NEED_RESTART" = true ]; then
  echo ""
  echo -e "${RED}有新安裝的工具！請：${NC}"
  echo -e "  1. ${YELLOW}關閉此終端機${NC}"
  echo -e "  2. ${YELLOW}重新開啟 Git Bash${NC}"
  echo -e "  3. ${YELLOW}再次執行此腳本${NC}"
  exit 0
fi

echo ""

# ============================================================
# Phase 2: GitHub 登入
# ============================================================
echo -e "${YELLOW}[Phase 2] GitHub 登入${NC}"

if gh auth status &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} GitHub 已登入"
else
  echo -e "  ${CYAN}→ 請在瀏覽器完成 GitHub 登入${NC}"
  gh auth login --web --git-protocol https
fi

echo ""

# ============================================================
# Phase 3: 下載專案
# ============================================================
echo -e "${YELLOW}[Phase 3] 下載專案${NC}"

if [ -d "$PROJECT_DIR/.git" ]; then
  echo -e "  ${GREEN}✓${NC} 專案已存在於 $PROJECT_DIR"
  cd "$PROJECT_DIR"
  git pull origin main
else
  echo -e "  ${CYAN}→ 下載中...${NC}"
  mkdir -p "$(dirname "$PROJECT_DIR")"
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

echo ""

# ============================================================
# Phase 4: Git 設定
# ============================================================
echo -e "${YELLOW}[Phase 4] Git 設定${NC}"

git config user.name "Jin"
git config user.email "gasklath20312@gmail.com"
echo -e "  ${GREEN}✓${NC} user.name = Jin"
echo -e "  ${GREEN}✓${NC} user.email = gasklath20312@gmail.com"

echo ""

# ============================================================
# Phase 5: 安裝依賴 + 建置 MCP
# ============================================================
echo -e "${YELLOW}[Phase 5] 安裝依賴${NC}"

# 主 Web App
echo -e "  ${CYAN}→ bidding-assistant (npm install)${NC}"
cd "$PROJECT_DIR/bidding-assistant"
npm install --no-audit --no-fund 2>&1 | tail -1

# PCC API MCP Server
echo -e "  ${CYAN}→ pcc-api-mcp (npm install + build)${NC}"
cd "$PROJECT_DIR/pcc-api-mcp"
npm install --no-audit --no-fund 2>&1 | tail -1
npm run build 2>&1 | tail -1

# SmugMug MCP Server
echo -e "  ${CYAN}→ smugmug-mcp (npm install + build)${NC}"
cd "$PROJECT_DIR/smugmug-mcp"
npm install --no-audit --no-fund 2>&1 | tail -1
npm run build 2>&1 | tail -1

cd "$PROJECT_DIR"
echo -e "  ${GREEN}✓${NC} 所有依賴安裝完成"

echo ""

# ============================================================
# Phase 6: 環境變數
# ============================================================
echo -e "${YELLOW}[Phase 6] 環境變數${NC}"

if [ -f "$PROJECT_DIR/bidding-assistant/.env.local" ]; then
  echo -e "  ${GREEN}✓${NC} .env.local 已存在"
else
  cp "$PROJECT_DIR/bidding-assistant/.env.example" "$PROJECT_DIR/bidding-assistant/.env.local"
  echo -e "  ${YELLOW}!${NC} 已建立 .env.local（從 .env.example 複製）"
  echo -e "  ${RED}→ 請手動編輯 bidding-assistant/.env.local 填入 API Key${NC}"
fi

echo ""

# ============================================================
# Phase 7: Claude Code MCP 設定
# ============================================================
echo -e "${YELLOW}[Phase 7] MCP Server 設定${NC}"

MCP_FILE="$PROJECT_DIR/.mcp.json"
if [ -f "$MCP_FILE" ]; then
  echo -e "  ${GREEN}✓${NC} .mcp.json 已存在"
else
  cat > "$MCP_FILE" << 'MCPEOF'
{
  "mcpServers": {
    "notebooklm": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "notebooklm-mcp@latest"]
    },
    "pcc-api": {
      "command": "node",
      "args": ["C:\\dev\\cc程式\\pcc-api-mcp\\dist\\index.js"]
    },
    "smugmug": {
      "command": "node",
      "args": ["C:\\dev\\cc程式\\smugmug-mcp\\dist\\index.js"],
      "env": {
        "SMUGMUG_API_KEY": "填入你的 SmugMug API Key",
        "SMUGMUG_API_SECRET": "填入你的 SmugMug API Secret",
        "SMUGMUG_ACCESS_TOKEN": "填入你的 SmugMug Access Token",
        "SMUGMUG_TOKEN_SECRET": "填入你的 SmugMug Token Secret"
      }
    }
  }
}
MCPEOF
  echo -e "  ${YELLOW}!${NC} 已建立 .mcp.json 範本"
  echo -e "  ${RED}→ 請手動編輯 .mcp.json 填入 SmugMug OAuth Token${NC}"
fi

echo ""

# ============================================================
# Phase 8: 驗證
# ============================================================
echo -e "${YELLOW}[Phase 8] 驗證${NC}"

cd "$PROJECT_DIR/bidding-assistant"

echo -e "  ${CYAN}→ 執行測試...${NC}"
if npx vitest run 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 測試通過"
else
  echo -e "  ${RED}✗${NC} 測試失敗！嘗試重裝..."
  rm -rf node_modules
  npm install --no-audit --no-fund
  npx vitest run
fi

echo ""
echo -e "  ${CYAN}→ 執行建置...${NC}"
if npm run build 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 建置成功"
else
  echo -e "  ${RED}✗${NC} 建置失敗！請檢查錯誤訊息"
fi

echo ""

# ============================================================
# Phase 9: 檢查 MCP Server
# ============================================================
echo -e "${YELLOW}[Phase 9] 檢查 MCP Server${NC}"

cd "$PROJECT_DIR"

if [ -f "pcc-api-mcp/dist/index.js" ]; then
  echo -e "  ${GREEN}✓${NC} pcc-api-mcp 已建置"
else
  echo -e "  ${RED}✗${NC} pcc-api-mcp 未建置"
fi

if [ -f "smugmug-mcp/dist/index.js" ]; then
  echo -e "  ${GREEN}✓${NC} smugmug-mcp 已建置"
else
  echo -e "  ${RED}✗${NC} smugmug-mcp 未建置"
fi

echo ""

# ============================================================
# 完成
# ============================================================
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  設定完成！${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  還需要手動做的事："
echo ""

MANUAL_STEPS=0

if ! grep -q "^NOTION_TOKEN=." "$PROJECT_DIR/bidding-assistant/.env.local" 2>/dev/null; then
  MANUAL_STEPS=$((MANUAL_STEPS + 1))
  echo -e "  ${YELLOW}$MANUAL_STEPS.${NC} 編輯 bidding-assistant/.env.local，填入 Notion API Key"
fi

if grep -q "填入你的" "$MCP_FILE" 2>/dev/null; then
  MANUAL_STEPS=$((MANUAL_STEPS + 1))
  echo -e "  ${YELLOW}$MANUAL_STEPS.${NC} 編輯 .mcp.json，填入 SmugMug OAuth Token"
fi

if [ $MANUAL_STEPS -eq 0 ]; then
  echo -e "  ${GREEN}沒有！所有設定已完成。${NC}"
fi

echo ""
echo -e "  開工方式："
echo -e "  ${CYAN}cd C:\\dev\\cc程式${NC}"
echo -e "  ${CYAN}claude${NC}"
echo ""
