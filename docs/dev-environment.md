# 開發環境與配置（2026-02-18 快照）

在不同機器上接續開發時，照此文件還原環境。

---

## 1. 系統環境

| 項目 | 版本/值 |
|------|--------|
| OS | Windows 11 Home 10.0.26200 |
| Node.js | v22.14.0 |
| npm | 10.9.2 |
| Git | 2.53.0.windows.1 |
| GitHub CLI | v2.86.0 |
| Shell | bash（Claude Code 預設使用 Unix 語法） |

### 全域 npm 套件

```bash
npm install -g @anthropic-ai/claude-code@latest
```

---

## 2. 專案結構

```
C:\dev\cc程式\                              ← 根目錄（git monorepo）
├── CLAUDE.md                               ← 根目錄共用規範
├── .gitignore                              ← 全域 gitignore
├── .claude/commands/                       ← slash commands（上 GitHub）
├── .mcp.json                               ← MCP Server 配置（不入 git）
├── docs/                                   ← 跨子專案共用文件
│   ├── operation-log.md                    ← 操作日誌
│   ├── 機器設定指南.md                     ← 新機器設定步驟
│   ├── debugging.md                        ← 開發除錯經驗
│   └── dev-environment.md                  ← 本文件
├── bidding-assistant/                      ← 主 Web App（Next.js 16 + React 19）
│   ├── CLAUDE.md                           ← bidding-assistant 開發規範
│   ├── .env.local                          ← 機密（不入 git）
│   ├── docs/dev-plan/                      ← 開發計畫文件（17 份）
│   └── docs/dev-plan/_staging/             ← 暫存區（討論結論）
├── smugmug-mcp/                            ← SmugMug MCP Server
├── pcc-api-mcp/                            ← PCC 標案 API MCP Server
└── pcc-monitor/                            ← PCC API 更新延遲監控
```

遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`（private）

---

## 3. bidding-assistant 配置

### package.json 重點

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Dev server port: 3000**（Next.js 預設）

### 核心依賴

| 套件 | 版本 | 用途 |
|------|------|------|
| next | 16.1.6 | App Router + Turbopack |
| react / react-dom | 19.2.3 | UI 框架 |
| typescript | ^5 | 語言 |
| tailwindcss | ^4 | 樣式（用 @tailwindcss/postcss） |
| radix-ui | ^1.4.3 | 基礎 UI 元件 |
| recharts | ^3.7.0 | 圖表 |
| @notionhq/client | ^5.9.0 | Notion API |
| docx | ^9.5.2 | .docx 文件生成 |
| vitest | ^4.0.18 | 測試框架 |
| @testing-library/react | ^16.3.2 | React 元件測試 |
| lucide-react | ^0.564.0 | 圖示 |
| date-fns | ^4.1.0 | 日期處理 |

### 重要配置檔

- `next.config.ts`：serverExternalPackages: ["radix-ui"]
- `tsconfig.json`：paths `@/*` → `./src/*`
- `vitest.config.ts`：jsdom 環境、覆蓋率 70%+
- `components.json`（shadcn）：new-york style、neutral base color

---

## 4. smugmug-mcp 配置

```bash
cd smugmug-mcp && npm install && npm run build
```

- TypeScript + @modelcontextprotocol/sdk + oauth-1.0a
- 編譯後入口：`dist/index.js`

---

## 5. MCP Server 配置

檔案位置：`C:\dev\cc程式\.mcp.json`（不入 git）

已配置的 MCP Server：

| Server | 來源 | 說明 |
|--------|------|------|
| smugmug | .mcp.json（專案級） | 自建，OAuth 1.0a |
| notebooklm | .mcp.json（專案級） | 社群套件，npx 自動安裝 |
| Canva | Claude.ai 雲端 | 透過 Claude.ai 帳號連結 |
| Notion | Claude.ai 雲端 | 透過 Claude.ai 帳號連結 |

⚠️ `.mcp.json` 中的 SmugMug 路徑是絕對路徑，換機器必須修改。

---

## 6. 需要手動帶的機密檔案

| 檔案 | 內容 | 位置 |
|------|------|------|
| `.env.local` | Notion token + DB ID | bidding-assistant/ |
| `.mcp.json` | SmugMug OAuth credentials | 專案根目錄 |

---

## 7. 路徑注意事項

- 專案在 `C:\dev\cc程式`，不在 OneDrive 裡
- Windows 上 Claude Code 使用 bash 語法（Unix 風格），不是 cmd/PowerShell
- 避免 `> nul` 重定向（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`
- npm registry 應為官方：`https://registry.npmjs.org/`（不要用 npmmirror）

---

## 8. 換機器還原步驟

### 快速還原清單

```bash
# 1. 安裝基礎工具
#    - Node.js v22.x（LTS）
#    - Git
#    - GitHub CLI
#    - Claude Code: npm install -g @anthropic-ai/claude-code

# 2. Clone 專案
cd C:\dev
git clone https://github.com/Lokianlab/bidding-assistant-monorepo.git cc程式

# 3. 安裝依賴
cd cc程式/bidding-assistant && npm install
cd ../smugmug-mcp && npm install && npm run build

# 4. 建立環境變數
#    複製 .env.example → .env.local，填入 NOTION_TOKEN 和 NOTION_DATABASE_ID

# 5. 建立 MCP 配置
#    在專案根目錄建 .mcp.json（帶 SmugMug credentials）
#    ⚠️ 修改 smugmug/pcc-api args 中的絕對路徑

# 6. Claude Code 設定
#    ~/.claude/settings.json 加入 Agent Team 環境變數
#    記憶目錄會透過 Claude Code 自動建立

# 7. 驗證
cd bidding-assistant
npm run build    # 應該 0 errors
npm test         # 應該全部通過
npm run dev      # 開發伺服器啟動
```

---

## 9. 驗證檢查清單

換機器後跑一遍確認：

- [ ] `node --version` → v22.x
- [ ] `npm --version` → 10.x
- [ ] `git --version` → 2.x
- [ ] `gh --version` → 最新版
- [ ] `claude --version` → 最新版
- [ ] `cd bidding-assistant && npm run build` → 0 errors
- [ ] `npm test` → 全部通過
- [ ] `npm run dev` → localhost 可開啟
- [ ] Claude Code 裡 SmugMug MCP 可連（`/mcp` 查看）
- [ ] Claude Code Agent Team 可用（settings.json 有 env var）
