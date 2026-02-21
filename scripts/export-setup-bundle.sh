#!/usr/bin/env bash
# ============================================================
# 在現有機器上跑：打包「新機器安裝包」
# 用法：bash scripts/export-setup-bundle.sh [輸出路徑]
# 範例：bash scripts/export-setup-bundle.sh /d/USB
#       bash scripts/export-setup-bundle.sh ~/Desktop
# ============================================================
set -euo pipefail

PROJECT_DIR="/c/dev/cc程式"
OUTPUT_DIR="${1:-$HOME/Desktop}/cc-setup-bundle"

echo "=== 打包新機器安裝包 ==="
echo ""

# 建立輸出資料夾
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 1. 複製機密檔
if [ -f "$PROJECT_DIR/bidding-assistant/.env.local" ]; then
  cp "$PROJECT_DIR/bidding-assistant/.env.local" "$OUTPUT_DIR/env.local"
  echo "✓ .env.local"
else
  echo "✗ .env.local 不存在，跳過"
fi

if [ -f "$PROJECT_DIR/.mcp.json" ]; then
  cp "$PROJECT_DIR/.mcp.json" "$OUTPUT_DIR/mcp.json"
  echo "✓ .mcp.json"
else
  echo "✗ .mcp.json 不存在，跳過"
fi

# 2. 寫入一體化安裝腳本（不依賴 repo，自己包含所有邏輯）
cat > "$OUTPUT_DIR/install.sh" << 'SCRIPTEOF'
#!/usr/bin/env bash
# ============================================================
# 全能標案助理 — 一鍵安裝（從安裝包執行）
# 用法：在 Git Bash 中 → bash install.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BUNDLE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="/c/dev/cc程式"
REPO_URL="https://github.com/Lokianlab/bidding-assistant-monorepo.git"

echo -e "${CYAN}=== 全能標案助理：一鍵安裝 ===${NC}"
echo ""

# ─── Phase 1: 工具 ───
echo -e "${YELLOW}[1/7] 檢查工具${NC}"

NEED_RESTART=false

install_if_missing() {
  local name="$1" cmd="$2" install="$3"
  if command -v "$cmd" &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} $name"
  else
    echo -e "  ${CYAN}→${NC} 安裝 $name ..."
    eval "$install"
    NEED_RESTART=true
  fi
}

install_if_missing "Node.js"     "node"   "winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements"
install_if_missing "Git"         "git"    "winget install Git.Git -e --accept-package-agreements --accept-source-agreements"
install_if_missing "GitHub CLI"  "gh"     "winget install GitHub.cli -e --accept-package-agreements --accept-source-agreements"

if command -v node &> /dev/null; then
  install_if_missing "Claude Code" "claude" "npm install -g @anthropic-ai/claude-code"
  install_if_missing "Gemini CLI"  "gemini" "npm install -g @google/gemini-cli"
  install_if_missing "Codex CLI"   "codex"  "npm install -g @openai/codex"
fi

if [ "$NEED_RESTART" = true ]; then
  echo ""
  echo -e "${RED}有新裝的工具，請關掉終端機、重開、再跑一次 install.sh${NC}"
  exit 0
fi

# ─── Phase 2: GitHub 登入 ───
echo -e "${YELLOW}[2/7] GitHub 登入${NC}"
if gh auth status &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} 已登入"
else
  gh auth login --web --git-protocol https
fi

# ─── Phase 3: 下載專案 ───
echo -e "${YELLOW}[3/7] 下載專案${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
  echo -e "  ${GREEN}✓${NC} 已存在，拉最新"
  cd "$PROJECT_DIR" && git pull origin main
else
  mkdir -p "$(dirname "$PROJECT_DIR")"
  git clone "$REPO_URL" "$PROJECT_DIR"
fi

# ─── Phase 4: Git 設定 + 依賴 ───
echo -e "${YELLOW}[4/7] Git 設定 + 安裝依賴${NC}"
cd "$PROJECT_DIR"
git config user.name "Jin"
git config user.email "gasklath20312@gmail.com"

echo -e "  ${CYAN}→${NC} bidding-assistant"
cd "$PROJECT_DIR/bidding-assistant" && npm install --no-audit --no-fund 2>&1 | tail -1

echo -e "  ${CYAN}→${NC} pcc-api-mcp"
cd "$PROJECT_DIR/pcc-api-mcp" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1

echo -e "  ${CYAN}→${NC} smugmug-mcp"
cd "$PROJECT_DIR/smugmug-mcp" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1

# ─── Phase 5: 放入機密檔 ───
echo -e "${YELLOW}[5/7] 設定機密檔${NC}"

if [ -f "$BUNDLE_DIR/env.local" ]; then
  cp "$BUNDLE_DIR/env.local" "$PROJECT_DIR/bidding-assistant/.env.local"
  echo -e "  ${GREEN}✓${NC} .env.local 已就位"
else
  cp "$PROJECT_DIR/bidding-assistant/.env.example" "$PROJECT_DIR/bidding-assistant/.env.local"
  echo -e "  ${YELLOW}!${NC} 安裝包裡沒有 env.local，用了空範本，記得手動填"
fi

if [ -f "$BUNDLE_DIR/mcp.json" ]; then
  cp "$BUNDLE_DIR/mcp.json" "$PROJECT_DIR/.mcp.json"
  echo -e "  ${GREEN}✓${NC} .mcp.json 已就位"
else
  echo -e "  ${YELLOW}!${NC} 安裝包裡沒有 mcp.json，需手動建立"
fi

# ─── Phase 6: 驗證 ───
echo -e "${YELLOW}[6/7] 驗證${NC}"
cd "$PROJECT_DIR/bidding-assistant"

echo -e "  ${CYAN}→${NC} 測試..."
if npx vitest run 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 測試通過"
else
  echo -e "  ${RED}✗${NC} 測試失敗，嘗試重裝..."
  rm -rf node_modules && npm install --no-audit --no-fund && npx vitest run
fi

echo -e "  ${CYAN}→${NC} 建置..."
if npm run build 2>&1 | tail -3; then
  echo -e "  ${GREEN}✓${NC} 建置成功"
else
  echo -e "  ${RED}✗${NC} 建置失敗"
fi

# ─── Phase 7: 完成 ───
echo -e "${YELLOW}[7/7] MCP Server 檢查${NC}"
cd "$PROJECT_DIR"
[ -f "pcc-api-mcp/dist/index.js" ] && echo -e "  ${GREEN}✓${NC} pcc-api-mcp" || echo -e "  ${RED}✗${NC} pcc-api-mcp"
[ -f "smugmug-mcp/dist/index.js" ] && echo -e "  ${GREEN}✓${NC} smugmug-mcp" || echo -e "  ${RED}✗${NC} smugmug-mcp"

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}  安裝完成！${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo -e "  開工指令："
echo -e "  ${CYAN}cd C:\\dev\\cc程式 && claude${NC}"
echo ""
SCRIPTEOF

chmod +x "$OUTPUT_DIR/install.sh"
echo "✓ install.sh"

# 3. 寫 README
cat > "$OUTPUT_DIR/README.txt" << 'EOF'
全能標案助理 — 新機器安裝包
============================

在新機器上：

1. 安裝 Git（如果還沒有）
   → 去 https://git-scm.com 下載安裝

2. 打開 Git Bash，執行：
   bash /路徑/到這個資料夾/install.sh

就這樣。腳本會自動搞定所有事情。
EOF

echo "✓ README.txt"

# 完成
echo ""
echo "=== 安裝包已打包到 ==="
echo "$OUTPUT_DIR/"
echo ""
echo "內容："
ls -la "$OUTPUT_DIR/"
echo ""
echo "把這個資料夾複製到 USB 或雲端，新機器上跑 install.sh 就好。"
