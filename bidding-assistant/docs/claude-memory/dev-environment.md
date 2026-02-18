# 開發環境與配置（舊版快照，保留供參考）

> ⚠️ 本檔為舊版完整記錄，正式版請看 `docs/dev-environment.md`。
> 保留原因：含 vitest coverage 門檻、shadcn components.json、完整配置檔等正式版精簡掉的細節。

---

## 1. 系統環境

| 項目 | 版本/值 |
|------|--------|
| OS | Windows 11 Home 10.0.26200 |
| Node.js | v22.14.0 |
| npm | 10.9.2 |
| Git | 2.53.0.windows.1 |
| Shell | bash（Claude Code 預設使用 Unix 語法） |

### 全域 npm 套件

```bash
npm install -g @anthropic-ai/claude-code@latest
# Codex CLI 已安裝但不使用（架構決策：不裝額外 CLI）
# npm install -g @openai/codex  ← 可選，目前未使用
```

---

## 2. 專案結構

```
C:\dev\cc程式\          ← 根目錄（非 git repo）
├── bidding-assistant\                         ← 主應用（git repo）
│   ├── .env.local                             ← 機密（不入 git）
│   ├── .env.example                           ← 環境變數範本
│   ├── package.json
│   ├── CLAUDE.md                              ← 開發規範
│   └── docs\
│       └── 開發計畫書_v4.0_提案寫作駕駛艙版.docx
├── smugmug-mcp\                               ← SmugMug MCP Server
│   ├── package.json
│   ├── dist\index.js                          ← 編譯後的 MCP 入口
│   └── src\                                   ← TypeScript 原始碼
└── .mcp.json                                  ← MCP Server 配置（根目錄級）
```

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
| googleapis | ^171.4.0 | Google API（預留） |
| next-auth | ^4.24.13 | 認證（預留） |
| shadcn | ^3.8.4 (dev) | UI 元件產生器 |

### next.config.ts

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["radix-ui"],
};
export default nextConfig;
```

### tsconfig.json 重點

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### vitest.config.ts

```ts
{
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      thresholds: { statements: 70, branches: 55, functions: 70, lines: 70 }
    }
  },
  resolve: { alias: { "@": "./src" } }
}
```

### postcss.config.mjs

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### eslint.config.mjs

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig = defineConfig([
  ...nextVitals, ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
export default eslintConfig;
```

### components.json（shadcn）

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### .env.local（機密，需手動建立）

```bash
# 複製 .env.example 為 .env.local，填入以下值：
NOTION_TOKEN=ntn_xxxxx          # Notion API token
NOTION_DATABASE_ID=14cc71c7xxx  # Notion 案件資料庫 ID
# SmugMug 和 Google Drive 的 credentials 如需要另外填
```

### .gitignore 特殊項目

```
nul              # Windows 產生的 nul 檔案
Thumbs.db        # Windows 縮圖快取
/uploads/*       # 用戶上傳檔案（保留 .gitkeep）
```

---

## 4. smugmug-mcp 配置

### package.json

```json
{
  "name": "smugmug-mcp",
  "type": "module",
  "main": "dist/index.js",
  "scripts": { "build": "tsc", "start": "node dist/index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "oauth-1.0a": "^2.2.6"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

### 建構指令

```bash
cd smugmug-mcp && npm install && npm run build
```

---

## 5. MCP Server 配置

檔案位置：`C:\dev\cc程式\.mcp.json`（根目錄級）

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "notebooklm-mcp@latest"]
    },
    "smugmug": {
      "command": "node",
      "args": ["C:\\Users\\gary2\\OneDrive\\桌面\\cc程式\\smugmug-mcp\\dist\\index.js"],
      "env": {
        "SMUGMUG_API_KEY": "（見 .mcp.json 原檔）",
        "SMUGMUG_API_SECRET": "（見 .mcp.json 原檔）",
        "SMUGMUG_ACCESS_TOKEN": "（見 .mcp.json 原檔）",
        "SMUGMUG_TOKEN_SECRET": "（見 .mcp.json 原檔）"
      }
    }
  }
}
```

⚠️ SmugMug 的 OAuth credentials 在 `.mcp.json` 裡明文存放，換機器時需要帶過去。
⚠️ `smugmug` 的 `args` 路徑是絕對路徑，換機器時需要改。

---

## 6. Claude Code 配置

### ~/.claude/settings.json

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Claude Code 連線的 MCP Server

| Server | 來源 | 說明 |
|--------|------|------|
| smugmug | .mcp.json（專案級） | 自建，OAuth 1.0a |
| notebooklm | .mcp.json（專案級） | 社群套件，npx 自動安裝 |
| Canva | Claude.ai 雲端 | 透過 Claude.ai 帳號連結 |
| Gamma | Claude.ai 雲端 | 透過 Claude.ai 帳號連結 |
| Notion | Claude.ai 雲端 | 透過 Claude.ai 帳號連結 |

### Claude Code 記憶體

```
~/.claude/projects/C--dev-cc--/memory/
├── MEMORY.md                  ← 主記憶體（載入 system prompt）
├── pain-points-analysis.md    ← 痛點分析 + 全部設計決策
├── debugging.md               ← 開發除錯經驗
└── dev-environment.md         ← 本文件
```

---

## 7. 換機器還原步驟

### 快速還原清單

```bash
# 1. 安裝基礎工具
#    - Node.js v22.x（LTS）
#    - Git
#    - Claude Code: npm install -g @anthropic-ai/claude-code

# 2. Clone / 同步專案
#    OneDrive 同步 or git clone bidding-assistant repo
#    smugmug-mcp 需要手動帶（不在 git 裡，或另建 repo）

# 3. 安裝依賴
cd bidding-assistant && npm install
cd smugmug-mcp && npm install && npm run build

# 4. 建立環境變數
#    複製 .env.example → .env.local，填入 NOTION_TOKEN 和 NOTION_DATABASE_ID

# 5. 建立 MCP 配置
#    在專案根目錄建 .mcp.json（帶 SmugMug credentials）
#    ⚠️ 修改 smugmug args 中的絕對路徑

# 6. Claude Code 設定
#    ~/.claude/settings.json 加入 Agent Team 環境變數
#    ~/.claude/projects/ 下的 memory 資料夾會透過 Claude Code 自動建立

# 7. 驗證
npm run build    # 應該 0 errors
npm test         # 應該 26 files, 560 tests passing
npm run dev   # 開發伺服器啟動
```

### 需要手動帶的機密檔案

| 檔案 | 內容 | 位置 |
|------|------|------|
| `.env.local` | Notion token + DB ID | bidding-assistant/ |
| `.mcp.json` | SmugMug OAuth credentials | 專案根目錄 |

### 路徑注意事項

- 專案路徑含中文字元（桌面/程式），某些工具可能有問題
- `.mcp.json` 中的 SmugMug 路徑是絕對路徑，換機器必須修改
- Windows 上 Claude Code 使用 bash 語法（Unix 風格），不是 cmd/PowerShell
- 避免 `> nul` 重定向（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`

---

## 8. 驗證檢查清單

換機器後跑一遍確認：

- [ ] `node --version` → v22.x
- [ ] `npm --version` → 10.x
- [ ] `git --version` → 2.x
- [ ] `claude --version` → 最新版
- [ ] `cd bidding-assistant && npm run build` → 0 errors
- [ ] `npm test` → 26 files, 560 tests all passing
- [ ] `npm run dev` → localhost:3000 可開啟
- [ ] Claude Code 裡 SmugMug MCP 可連（`/mcp` 查看）
- [ ] Claude Code Agent Team 可用（settings.json 有 env var）
