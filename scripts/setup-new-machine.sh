#!/usr/bin/env bash
# ============================================================
# 全能標案助理 — 新機器一鍵設定
#
# 用法（二選一）：
#   A) 已 clone repo：  bash scripts/setup-new-machine.sh
#   B) 全新機器：       把這個檔案複製過去，bash setup-new-machine.sh
#
# 腳本會自動搞定一切，中途只問你貼幾個 token。
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/c/dev/cc程式"
REPO_URL="https://github.com/Lokianlab/bidding-assistant-monorepo.git"

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   全能標案助理 — 新機器一鍵設定     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# [1] 工具檢查 + 自動安裝
# ============================================================
echo -e "${YELLOW}[1/8] 檢查工具${NC}"

NEED_RESTART=false

install_if_missing() {
  local name="$1" cmd="$2" install="$3"
  if command -v "$cmd" &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} $name"
  else
    echo -e "  ${CYAN}→${NC} 安裝 $name ..."
    eval "$install" 2>&1 | tail -2
    NEED_RESTART=true
  fi
}

install_if_missing "Node.js"    "node"  "winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements"
install_if_missing "Git"        "git"   "winget install Git.Git -e --accept-package-agreements --accept-source-agreements"
install_if_missing "GitHub CLI" "gh"    "winget install GitHub.cli -e --accept-package-agreements --accept-source-agreements"

if command -v node &> /dev/null; then
  install_if_missing "Claude Code" "claude" "npm install -g @anthropic-ai/claude-code"
  install_if_missing "Gemini CLI"  "gemini" "npm install -g @google/gemini-cli"
  install_if_missing "Codex CLI"   "codex"  "npm install -g @openai/codex"
fi

if [ "$NEED_RESTART" = true ]; then
  echo ""
  echo -e "${RED}══ 有新裝的工具！請關掉終端機、重開、再跑一次此腳本 ══${NC}"
  exit 0
fi
echo ""

# ============================================================
# [2] GitHub 登入
# ============================================================
echo -e "${YELLOW}[2/8] GitHub 登入${NC}"
if gh auth status &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} 已登入"
else
  echo -e "  ${CYAN}→${NC} 請在瀏覽器完成登入"
  gh auth login --web --git-protocol https
fi
echo ""

# ============================================================
# [3] 下載專案
# ============================================================
echo -e "${YELLOW}[3/8] 下載專案${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
  echo -e "  ${GREEN}✓${NC} 已存在，拉最新"
  cd "$PROJECT_DIR" && git pull origin main
else
  mkdir -p "$(dirname "$PROJECT_DIR")"
  git clone "$REPO_URL" "$PROJECT_DIR"
fi
cd "$PROJECT_DIR"
echo ""

# ============================================================
# [4] Git 設定 + 安裝依賴 + 建置 MCP
# ============================================================
echo -e "${YELLOW}[4/8] Git 設定 + 安裝依賴${NC}"

git config user.name "Jin"
git config user.email "gasklath20312@gmail.com"
git config core.hooksPath .githooks
echo -e "  ${GREEN}✓${NC} Git user = Jin, hooks = .githooks"

# 生成機器代號（4 字元大寫英數，記錄層用）
if [ -f "$PROJECT_DIR/.machine-id" ]; then
  MACHINE_ID=$(cat "$PROJECT_DIR/.machine-id")
  echo -e "  ${GREEN}✓${NC} 機器代號 = $MACHINE_ID"
else
  # 避免跟已有的機器碰撞
  while true; do
    MACHINE_ID=$(cat /dev/urandom | tr -dc 'A-Z0-9' | head -c 4)
    if ! ls "$PROJECT_DIR/docs/records/_snapshot-"*.md 2>/dev/null | grep -q "$MACHINE_ID"; then
      break
    fi
  done
  echo "$MACHINE_ID" > "$PROJECT_DIR/.machine-id"
  echo -e "  ${GREEN}✓${NC} 機器代號 = $MACHINE_ID（新生成）"
fi

echo -e "  ${CYAN}→${NC} bidding-assistant ..."
cd "$PROJECT_DIR/bidding-assistant" && npm install --no-audit --no-fund 2>&1 | tail -1

echo -e "  ${CYAN}→${NC} pcc-api-mcp ..."
cd "$PROJECT_DIR/pcc-api-mcp" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1

echo -e "  ${CYAN}→${NC} smugmug-mcp ..."
cd "$PROJECT_DIR/smugmug-mcp" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1

echo -e "  ${GREEN}✓${NC} 依賴全部裝好"
echo ""

# ============================================================
# [5] 互動設定機密 — .env.local
# ============================================================
echo -e "${YELLOW}[5/8] 設定環境變數（.env.local）${NC}"

ENV_FILE="$PROJECT_DIR/bidding-assistant/.env.local"

if [ -f "$ENV_FILE" ] && grep -q "^NOTION_TOKEN=." "$ENV_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} .env.local 已有 Notion Token"
else
  echo -e "  ${CYAN}需要 Notion API Token 和 Database ID${NC}"
  echo -e "  （從現有機器的 bidding-assistant/.env.local 複製，或從 Notion 設定取得）"
  echo ""

  read -rp "  NOTION_TOKEN（貼上後按 Enter，留空跳過）: " NOTION_TOKEN
  read -rp "  NOTION_DATABASE_ID（貼上後按 Enter，留空跳過）: " NOTION_DATABASE_ID

  # 從 .env.example 複製基底，填入值
  cp "$PROJECT_DIR/bidding-assistant/.env.example" "$ENV_FILE"

  if [ -n "$NOTION_TOKEN" ]; then
    sed -i "s|^NOTION_TOKEN=.*|NOTION_TOKEN=$NOTION_TOKEN|" "$ENV_FILE"
  fi
  if [ -n "$NOTION_DATABASE_ID" ]; then
    sed -i "s|^NOTION_DATABASE_ID=.*|NOTION_DATABASE_ID=$NOTION_DATABASE_ID|" "$ENV_FILE"
  fi

  echo -e "  ${GREEN}✓${NC} .env.local 已建立"
fi
echo ""

# ============================================================
# [6] 互動設定機密 — .mcp.json
# ============================================================
echo -e "${YELLOW}[6/8] 設定 MCP Server（.mcp.json）${NC}"

MCP_FILE="$PROJECT_DIR/.mcp.json"
MCP_TEMPLATE="$PROJECT_DIR/.mcp.json.example"

if [ -f "$MCP_FILE" ]; then
  echo -e "  ${GREEN}✓${NC} .mcp.json 已存在"
else
  if [ -f "$MCP_TEMPLATE" ]; then
    # Windows 路徑：C:\dev\cc程式 → C:\\dev\\cc程式
    WIN_PATH="C:\\\\dev\\\\cc程式"

    echo -e "  ${CYAN}需要 SmugMug OAuth Token${NC}"
    echo -e "  （從現有機器的 .mcp.json 複製 smugmug.env 區塊的四個值）"
    echo ""

    read -rp "  SMUGMUG_API_KEY（留空跳過 SmugMug）: " SM_KEY

    if [ -n "$SM_KEY" ]; then
      read -rp "  SMUGMUG_API_SECRET: " SM_SECRET
      read -rp "  SMUGMUG_ACCESS_TOKEN: " SM_ACCESS
      read -rp "  SMUGMUG_TOKEN_SECRET: " SM_TOKEN

      sed -e "s|__PROJECT_DIR__|$WIN_PATH|g" \
          -e "s|__SMUGMUG_API_KEY__|$SM_KEY|g" \
          -e "s|__SMUGMUG_API_SECRET__|$SM_SECRET|g" \
          -e "s|__SMUGMUG_ACCESS_TOKEN__|$SM_ACCESS|g" \
          -e "s|__SMUGMUG_TOKEN_SECRET__|$SM_TOKEN|g" \
          "$MCP_TEMPLATE" > "$MCP_FILE"
    else
      # 沒有 SmugMug token，只設定 PCC 和 NotebookLM
      cat > "$MCP_FILE" << MCPEOF
{
  "mcpServers": {
    "notebooklm": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "notebooklm-mcp@latest"]
    },
    "pcc-api": {
      "command": "node",
      "args": ["$WIN_PATH\\\\pcc-api-mcp\\\\dist\\\\index.js"]
    }
  }
}
MCPEOF
      echo -e "  ${YELLOW}!${NC} 跳過 SmugMug，之後要用再補"
    fi

    echo -e "  ${GREEN}✓${NC} .mcp.json 已建立"
  else
    echo -e "  ${YELLOW}!${NC} 找不到 .mcp.json.example 範本，需手動建立"
  fi
fi
echo ""

# ============================================================
# [7] 驗證
# ============================================================
echo -e "${YELLOW}[7/8] 驗證${NC}"
cd "$PROJECT_DIR/bidding-assistant"

echo -e "  ${CYAN}→${NC} 執行測試 ..."
if npx vitest run 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 測試通過"
else
  echo -e "  ${RED}✗${NC} 測試失敗，嘗試重裝 ..."
  rm -rf node_modules && npm install --no-audit --no-fund 2>&1 | tail -1
  npx vitest run 2>&1 | tail -3
fi

echo -e "  ${CYAN}→${NC} 執行建置 ..."
if npm run build 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 建置成功"
else
  echo -e "  ${RED}✗${NC} 建置失敗"
fi

echo -e "  ${CYAN}→${NC} Dev server 冒煙測試 ..."
npm run dev &
DEV_PID=$!
sleep 8
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
  echo -e "  ${GREEN}✓${NC} Dev server 正常啟動"
else
  echo -e "  ${YELLOW}!${NC} Dev server 無回應（可能需要更長啟動時間，手動確認）"
fi
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
echo ""

# ============================================================
# [8] 完成
# ============================================================
echo -e "${YELLOW}[8/8] 最終檢查${NC}"
cd "$PROJECT_DIR"
[ -f "pcc-api-mcp/dist/index.js" ]  && echo -e "  ${GREEN}✓${NC} PCC API MCP"    || echo -e "  ${RED}✗${NC} PCC API MCP"
[ -f "smugmug-mcp/dist/index.js" ]  && echo -e "  ${GREEN}✓${NC} SmugMug MCP"    || echo -e "  ${YELLOW}—${NC} SmugMug MCP（未設定）"
[ -f ".mcp.json" ]                   && echo -e "  ${GREEN}✓${NC} .mcp.json"      || echo -e "  ${RED}✗${NC} .mcp.json"
[ -f "bidding-assistant/.env.local" ] && echo -e "  ${GREEN}✓${NC} .env.local"    || echo -e "  ${RED}✗${NC} .env.local"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          設定完成！                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  開工："
echo -e "  ${CYAN}cd C:\\dev\\cc程式${NC}"
echo -e "  ${CYAN}claude${NC}"
echo ""
