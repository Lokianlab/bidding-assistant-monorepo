#!/usr/bin/env bash
# ============================================================
# 全能標案助理 — 新機器一鍵設定
#
# 用法（三選一）：
#   A) 推薦：雙擊「一鍵安裝.bat」（它會自動呼叫這個腳本）
#   B) 已 clone repo：  bash scripts/setup-new-machine.sh
#   C) 全新機器：       把這個檔案複製過去執行
#
# 可以安全地重複執行 — 已完成的步驟會自動跳過。
# ============================================================

# 不用 set -e：每個步驟手動處理錯誤，避免 npm 警告就整個中斷

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="/c/dev/cc程式"
REPO_URL="https://github.com/Lokianlab/bidding-assistant-monorepo.git"

# 追蹤錯誤，最後統一報告
ERRORS=()

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS+=("$1"); }
info() { echo -e "  ${CYAN}→${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
step() { echo ""; echo -e "${YELLOW}[$1/8] $2${NC}"; }

# npm install 重試（最多 3 次）
npm_install_retry() {
  local dir="$1"
  local label="$2"
  local attempt=1
  local max=3
  cd "$dir" || return 1
  while [ $attempt -le $max ]; do
    if npm install --no-audit --no-fund 2>&1 | tail -5; then
      # 用 node_modules 是否存在來補充確認
      if [ -d "node_modules" ]; then
        return 0
      fi
    fi
    if [ $attempt -lt $max ]; then
      warn "安裝 $label 失敗，5 秒後重試（第 $((attempt+1))/$max 次）..."
      sleep 5
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

# ============================================================
# 前置說明
# ============================================================
clear 2>/dev/null || true
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   全能標案助理 — 新機器一鍵設定     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}安裝前請確認你手邊有：${NC}"
echo "  1. Notion Token（長得像 secret_abc123... 的一串文字）"
echo "  2. Notion Database ID（32 個字元的英文數字混合）"
echo "  3. SmugMug Token × 4 組（沒有的話可以跳過）"
echo ""
echo -e "  這些跟 Jin 拿。沒有的話先按 Enter 開始，"
echo -e "  到時候再一個一個跳過就好。"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  重要：在這個視窗裡要「貼上」文字時，   │${NC}"
echo -e "${YELLOW}│  請用「滑鼠右鍵」→ Paste               │${NC}"
echo -e "${YELLOW}│  Ctrl+V 在這裡沒有用！                  │${NC}"
echo -e "${YELLOW}└─────────────────────────────────────────┘${NC}"
echo ""
read -rp "準備好了按 Enter 開始安裝..."

# ============================================================
# [1/8] 工具檢查 + 自動安裝
# ============================================================
step "1" "檢查工具"

NEED_RESTART=false

install_if_missing() {
  local name="$1" cmd="$2" install_cmd="$3"
  if command -v "$cmd" &> /dev/null; then
    ok "$name"
    return 0
  fi
  info "安裝 $name 中..."
  if eval "$install_cmd" 2>&1 | tail -3; then
    # 再確認一次是否真的裝好了
    if command -v "$cmd" &> /dev/null; then
      ok "$name（剛裝好）"
    else
      ok "$name（已安裝，重開終端後生效）"
      NEED_RESTART=true
    fi
    return 0
  else
    fail "$name 安裝失敗 — 請手動安裝後重新執行此腳本"
    return 1
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
  echo -e "${RED}══════════════════════════════════════════════${NC}"
  echo -e "  有新裝的工具需要重新啟動才能用。"
  echo -e "  請${BOLD}關掉這個視窗${NC}，然後："
  echo -e "  → 如果有 ${BOLD}一鍵安裝.bat${NC}：重新雙擊它"
  echo -e "  → 否則：重新開 Git Bash，再跑一次此腳本"
  echo -e "  ${GREEN}（已裝好的不會重裝，放心）${NC}"
  echo -e "${RED}══════════════════════════════════════════════${NC}"
  echo ""
  read -rp "按 Enter 關閉..."
  exit 0
fi

# ============================================================
# [2/8] GitHub 登入
# ============================================================
step "2" "GitHub 登入"

if gh auth status &> /dev/null; then
  ok "已登入 GitHub"
else
  info "需要登入 GitHub"
  echo "  等一下會自動開瀏覽器，用 Jin 的 GitHub 帳號登入就好。"
  echo ""
  if gh auth login --web --git-protocol https; then
    ok "GitHub 登入成功"
  else
    fail "GitHub 登入失敗"
    echo ""
    echo "  可能原因：網路問題，或瀏覽器沒完成登入。"
    echo "  解法：重新執行這個腳本，到這一步會再問一次。"
  fi
fi

# ============================================================
# [3/8] 下載專案
# ============================================================
step "3" "下載專案"

if [ -d "$PROJECT_DIR/.git" ]; then
  ok "專案已存在，拉最新版本"
  cd "$PROJECT_DIR" && git pull origin main 2>&1 | tail -3
else
  info "下載中（約 1-2 分鐘）..."
  mkdir -p "$(dirname "$PROJECT_DIR")"
  if git clone "$REPO_URL" "$PROJECT_DIR"; then
    ok "下載完成"
  else
    fail "下載失敗 — 請確認網路和 GitHub 登入狀態"
    echo ""
    echo "  這一步失敗就沒辦法繼續了。"
    echo "  請檢查網路連線，然後重新執行腳本。"
    echo ""
    read -rp "按 Enter 關閉..."
    exit 1
  fi
fi
cd "$PROJECT_DIR"

# ============================================================
# [4/8] Git 設定 + 安裝依賴 + 建置 MCP
# ============================================================
step "4" "安裝程式依賴（這一步比較久，請耐心等）"

git config user.name "Jin"
git config user.email "gasklath20312@gmail.com"
git config core.hooksPath .githooks 2>/dev/null
ok "Git 使用者設定完成"

# 生成機器代號（4 字元大寫英數，不跟現有的撞）
if [ -f "$PROJECT_DIR/.machine-id" ]; then
  MACHINE_ID=$(cat "$PROJECT_DIR/.machine-id")
  ok "機器代號 = $MACHINE_ID"
else
  while true; do
    MACHINE_ID=$(cat /dev/urandom | tr -dc 'A-Z0-9' | head -c 4)
    if ! ls "$PROJECT_DIR/docs/records/_snapshot-"*.md 2>/dev/null | grep -q "$MACHINE_ID"; then
      break
    fi
  done
  echo "$MACHINE_ID" > "$PROJECT_DIR/.machine-id"
  ok "機器代號 = $MACHINE_ID（新生成）"
fi

# --- 主程式依賴 ---
info "安裝主程式依賴（會出現很多文字，這是正常的）..."
if npm_install_retry "$PROJECT_DIR/bidding-assistant" "主程式"; then
  ok "主程式依賴安裝完成"
else
  fail "主程式依賴安裝失敗 — 可能是網路問題"
fi

# --- PCC API MCP ---
info "建置 PCC API MCP..."
cd "$PROJECT_DIR/pcc-api-mcp"
if npm install --no-audit --no-fund > /dev/null 2>&1 && npm run build > /dev/null 2>&1; then
  ok "PCC API MCP"
else
  fail "PCC API MCP 建置失敗"
fi

# --- SmugMug MCP ---
info "建置 SmugMug MCP..."
cd "$PROJECT_DIR/smugmug-mcp"
if npm install --no-audit --no-fund > /dev/null 2>&1 && npm run build > /dev/null 2>&1; then
  ok "SmugMug MCP"
else
  fail "SmugMug MCP 建置失敗"
fi

cd "$PROJECT_DIR"

# ============================================================
# [5/8] 互動設定機密 — .env.local
# ============================================================
step "5" "設定 Notion 連線"

ENV_FILE="$PROJECT_DIR/bidding-assistant/.env.local"

if [ -f "$ENV_FILE" ] && grep -q "^NOTION_TOKEN=." "$ENV_FILE" 2>/dev/null; then
  ok ".env.local 已設定過，跳過"
else
  echo ""
  echo -e "  ${BOLD}現在要填 Notion 的兩個值。${NC}"
  echo ""
  echo "  沒有的話直接按 Enter 跳過（之後可以補）。"
  echo ""
  echo -e "  ${YELLOW}提醒：貼上請用「滑鼠右鍵」→ Paste${NC}"
  echo ""

  read -rp "  Notion Token: " NOTION_TOKEN
  read -rp "  Notion Database ID: " NOTION_DATABASE_ID

  # 建立 .env.local
  if [ -f "$PROJECT_DIR/bidding-assistant/.env.example" ]; then
    cp "$PROJECT_DIR/bidding-assistant/.env.example" "$ENV_FILE"
  else
    echo "NOTION_TOKEN=" > "$ENV_FILE"
    echo "NOTION_DATABASE_ID=" >> "$ENV_FILE"
  fi

  if [ -n "$NOTION_TOKEN" ]; then
    sed -i "s|^NOTION_TOKEN=.*|NOTION_TOKEN=$NOTION_TOKEN|" "$ENV_FILE"
  fi
  if [ -n "$NOTION_DATABASE_ID" ]; then
    sed -i "s|^NOTION_DATABASE_ID=.*|NOTION_DATABASE_ID=$NOTION_DATABASE_ID|" "$ENV_FILE"
  fi

  # 驗證 Token 是否有效
  if [ -n "$NOTION_TOKEN" ]; then
    info "驗證 Notion Token..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $NOTION_TOKEN" \
      -H "Notion-Version: 2022-06-28" \
      "https://api.notion.com/v1/users/me" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      ok "Notion Token 確認有效"
    else
      warn "Notion Token 可能無效（回應碼 $HTTP_CODE）— 不影響安裝，之後可修正"
    fi
  fi

  if [ -n "$NOTION_TOKEN" ] || [ -n "$NOTION_DATABASE_ID" ]; then
    ok ".env.local 已建立"
  else
    warn "跳過了 Notion 設定 — 之後找 Jin 補"
  fi
fi

# ============================================================
# [6/8] 互動設定機密 — .mcp.json
# ============================================================
step "6" "設定 MCP 工具"

MCP_FILE="$PROJECT_DIR/.mcp.json"
MCP_TEMPLATE="$PROJECT_DIR/.mcp.json.example"

if [ -f "$MCP_FILE" ]; then
  ok ".mcp.json 已存在，跳過"
else
  if [ -f "$MCP_TEMPLATE" ]; then
    WIN_PATH="C:\\\\dev\\\\cc程式"

    echo ""
    echo -e "  ${BOLD}SmugMug 設定（選填）${NC}"
    echo "  需要 4 個值。沒有的話直接按 Enter 全部跳過。"
    echo ""

    read -rp "  SmugMug API Key（沒有直接按 Enter）: " SM_KEY

    if [ -n "$SM_KEY" ]; then
      read -rp "  SmugMug API Secret: " SM_SECRET
      read -rp "  SmugMug Access Token: " SM_ACCESS
      read -rp "  SmugMug Token Secret: " SM_TOKEN

      sed -e "s|__PROJECT_DIR__|$WIN_PATH|g" \
          -e "s|__SMUGMUG_API_KEY__|$SM_KEY|g" \
          -e "s|__SMUGMUG_API_SECRET__|$SM_SECRET|g" \
          -e "s|__SMUGMUG_ACCESS_TOKEN__|$SM_ACCESS|g" \
          -e "s|__SMUGMUG_TOKEN_SECRET__|$SM_TOKEN|g" \
          "$MCP_TEMPLATE" > "$MCP_FILE"
      ok ".mcp.json 已建立（含 SmugMug）"
    else
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
      ok ".mcp.json 已建立（不含 SmugMug — 之後要用再補）"
    fi
  else
    warn "找不到 .mcp.json.example 範本 — 需要手動建立"
  fi
fi

# ============================================================
# [7/8] 驗證
# ============================================================
step "7" "驗證安裝結果（約 2 分鐘）"

cd "$PROJECT_DIR/bidding-assistant"

info "跑測試..."
if npx vitest run 2>&1 | tail -5; then
  ok "測試通過"
else
  warn "測試未通過 — 嘗試重新安裝..."
  rm -rf node_modules
  if npm install --no-audit --no-fund > /dev/null 2>&1; then
    if npx vitest run 2>&1 | tail -5; then
      ok "重試後測試通過"
    else
      fail "測試未通過 — 不影響安裝，之後處理"
    fi
  else
    fail "重裝依賴失敗"
  fi
fi

info "跑建置..."
if npm run build 2>&1 | tail -5; then
  ok "建置成功"
else
  fail "建置失敗 — 之後處理"
fi

info "啟動網頁測試（約 15 秒，請等待）..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 15
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
  ok "網頁正常啟動"
else
  warn "網頁沒回應 — 可能電腦比較慢，不影響安裝"
fi
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null

# ============================================================
# [8/8] 總結
# ============================================================
step "8" "安裝總結"

cd "$PROJECT_DIR"

echo ""
echo -e "  ${BOLD}各組件狀態：${NC}"
[ -f "pcc-api-mcp/dist/index.js" ]  && ok "PCC API MCP"    || warn "PCC API MCP 未建置"
[ -f "smugmug-mcp/dist/index.js" ]  && ok "SmugMug MCP"    || warn "SmugMug MCP 未設定（不影響主功能）"
[ -f ".mcp.json" ]                   && ok "MCP 設定檔"     || fail "MCP 設定檔缺失"
[ -f "bidding-assistant/.env.local" ] && ok "環境變數"      || warn "環境變數未設定"
[ -f ".machine-id" ]                  && ok "機器代號 = $(cat .machine-id)" || fail "機器代號缺失"

echo ""

if [ ${#ERRORS[@]} -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║         全部安裝成功！               ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""
  echo "  請把以下資訊傳給 Jin："
  echo "  • 機器代號：$(cat .machine-id 2>/dev/null || echo '未知')"
  echo "  • 安裝結果：全部成功"
else
  echo -e "${YELLOW}╔══════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║     安裝完成，有幾項需要注意        ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${YELLOW}需要注意：${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}•${NC} $err"
  done
  echo ""
  echo "  請把以上內容截圖傳給 Jin。"
  echo "  • 機器代號：$(cat .machine-id 2>/dev/null || echo '未知')"
fi

echo ""
echo -e "  安裝完成後的開工方式（Jin 用）："
echo -e "  ${CYAN}1. 開 Git Bash${NC}"
echo -e "  ${CYAN}2. cd /c/dev/cc程式${NC}"
echo -e "  ${CYAN}3. claude${NC}"
echo ""
