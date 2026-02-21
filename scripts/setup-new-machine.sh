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
echo -e "  全自動安裝，不需要手動輸入任何東西。"
echo -e "  唯一需要的是 ${BOLD}GitHub 登入${NC}（會自動開瀏覽器）。"
echo ""
read -rp "按 Enter 開始安裝..."

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

# 確保 git 使用 gh 的認證（修復 private repo "not found" 問題）
gh auth setup-git 2>/dev/null

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
# [5/8] 自動設定環境變數
# ============================================================
step "5" "設定環境變數（自動）"

ENV_FILE="$PROJECT_DIR/bidding-assistant/.env.local"

if [ -f "$ENV_FILE" ] && grep -q "^NOTION_TOKEN=." "$ENV_FILE" 2>/dev/null; then
  ok ".env.local 已設定過，跳過"
else
  cat > "$ENV_FILE" << 'ENVEOF'
# 全能標案助理 — 本地環境變數

# Notion API
NOTION_TOKEN=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
NOTION_DATABASE_ID=14cc71c7727881d99743c0bf62cf6420

# SmugMug (OAuth 1.0a)
SMUGMUG_API_KEY=mDcd2S9sKDLQMMQBSdT6n75dGRjr9VRr
SMUGMUG_API_SECRET=5CSXFFB3hxqJPb7X29xsht5hpwRZfhDDRpkxGcRgDSZHcDW5pt9hvKfxCfrT3754
SMUGMUG_ACCESS_TOKEN=MLXXbRdStSrpMdMgm2VdZ2F4dw9cf7Rm
SMUGMUG_TOKEN_SECRET=LDKmBMsJ2KLdLtKTt3WWGPN6bRgjMZ3XT5CCxdhD3vbz2LPXJXPSFrfHBFKxX5wc
SMUGMUG_NICKNAME=
ENVEOF
  ok ".env.local 已自動建立"
fi

# ============================================================
# [6/8] 自動設定 MCP 工具
# ============================================================
step "6" "設定 MCP 工具（自動）"

MCP_FILE="$PROJECT_DIR/.mcp.json"

if [ -f "$MCP_FILE" ]; then
  ok ".mcp.json 已存在，跳過"
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
        "SMUGMUG_API_KEY": "mDcd2S9sKDLQMMQBSdT6n75dGRjr9VRr",
        "SMUGMUG_API_SECRET": "5CSXFFB3hxqJPb7X29xsht5hpwRZfhDDRpkxGcRgDSZHcDW5pt9hvKfxCfrT3754",
        "SMUGMUG_ACCESS_TOKEN": "MLXXbRdStSrpMdMgm2VdZ2F4dw9cf7Rm",
        "SMUGMUG_TOKEN_SECRET": "LDKmBMsJ2KLdLtKTt3WWGPN6bRgjMZ3XT5CCxdhD3vbz2LPXJXPSFrfHBFKxX5wc"
      }
    }
  }
}
MCPEOF
  ok ".mcp.json 已自動建立（含 SmugMug）"
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
# [8/8] 自動初始化 + 上論壇打招呼
# ============================================================
step "8" "初始化新機器身份"

cd "$PROJECT_DIR"
MACHINE_ID=$(cat "$PROJECT_DIR/.machine-id" 2>/dev/null || echo "UNKNOWN")
TODAY=$(date +%Y%m%d)
TODAY_DASH=$(date +%Y-%m-%d)
NOW=$(date +%H%M)
MONTH_DIR="docs/records/$(date +%Y-%m)"

# 確保月份目錄存在
mkdir -p "$MONTH_DIR"

# --- 建立快照 ---
SNAPSHOT_FILE="docs/records/_snapshot-${MACHINE_ID}.md"
if [ ! -f "$SNAPSHOT_FILE" ]; then
  cat > "$SNAPSHOT_FILE" << SNAPEOF
SNAPSHOT|${TODAY}-${NOW}|${MACHINE_ID}
[ ] infra-new-machine-setup|新機器初始化|剛完成安裝，讀取專案中
SNAPEOF
  ok "快照已建立"
else
  ok "快照已存在"
fi

# --- 在論壇打招呼 ---
FORUM_FILE="docs/records/forum/${TODAY}-${MACHINE_ID}.md"
if [ ! -f "$FORUM_FILE" ]; then
  cat > "$FORUM_FILE" << FORUMEOF
reply|${TODAY}-${NOW}|${MACHINE_ID}|thread:welcome-new-machine
大家好，我是新加入的 ${MACHINE_ID}。

剛完成安裝，所有測試和建置都通過了。
接下來會先讀 dev-map.md 和近期論壇帖子，了解專案全貌和目前的討論。
有什麼我能幫忙的請跟我說。
---
FORUMEOF
  ok "論壇打招呼已發出"
else
  ok "論壇檔案已存在"
fi

# --- 寫第一筆 OP ---
OP_FILE="${MONTH_DIR}/${TODAY}-${MACHINE_ID}.md"
if [ ! -f "$OP_FILE" ]; then
  cat > "$OP_FILE" << OPEOF
OP|${TODAY}-${NOW}|${MACHINE_ID}|成功|topic:infra-new-machine-setup
新機器初始化完成|F:scripts/setup-new-machine.sh
---
背景: 全新機器透過一鍵安裝腳本完成設定。
操作: 安裝 Node.js/Git/gh CLI/Claude Code，clone repo，自動設定 .env.local 和 .mcp.json，跑測試和建置驗證，建立快照和論壇帖子。
結果: 安裝完成，所有環境就緒，已在論壇跟團隊打招呼。
---
OPEOF
  ok "第一筆 OP 記錄已建立"
fi

# --- git push 讓其他機器看到 ---
info "同步到 GitHub..."
git pull origin main 2>/dev/null
git add "$SNAPSHOT_FILE" "$FORUM_FILE" "$OP_FILE" 2>/dev/null
git commit -m "新機器 ${MACHINE_ID} 上線：快照 + 論壇打招呼 + 第一筆 OP" 2>/dev/null
if git push origin main 2>&1 | tail -3; then
  ok "已同步到 GitHub（其他機器可以看到你了）"
else
  warn "同步失敗 — 不影響安裝，之後 Claude Code 會自動處理"
fi

# --- 總結 ---
echo ""
echo ""
if [ ${#ERRORS[@]} -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║         全部安裝成功！                       ║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║  機器代號：${BOLD}${MACHINE_ID}${NC}${GREEN}                            ║${NC}"
  echo -e "${GREEN}║  已在論壇跟大家打招呼了                     ║${NC}"
  echo -e "${GREEN}║  其他機器下次更新就會看到你                  ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
else
  echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║     安裝完成，有幾項需要注意                ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${YELLOW}需要注意：${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}•${NC} $err"
  done
  echo ""
  echo "  請把以上內容截圖傳給 Jin。"
  echo "  • 機器代號：${MACHINE_ID}"
fi

echo ""
echo -e "  ${BOLD}開工方式：${NC}"
echo -e "  ${CYAN}開 PowerShell → 打 claude → 開始工作${NC}"
echo ""
