# 專案結構與技術背景

## 專案結構

```
cc程式/                      ← 專案根目錄（每台機器各自 clone，不放 OneDrive）
  bidding-assistant/         ← 主 Web App（Next.js 16 + React 19）
  smugmug-mcp/               ← SmugMug MCP Server
  pcc-api-mcp/               ← PCC 標案 API MCP Server
  pcc-monitor/               ← PCC API 更新延遲監控
  docs/                      ← 跨子專案共用文件
    records/                  ← 記錄層（AI 自動維護，詳見 record-layer.md）
    methodology/              ← 方法論（索引 + 各方法詳細文件）
    各種輸出文件/              ← 給用戶看的報告、提案、分析文件（非機器內部使用）
```

## 技術棧

- Node.js v22 + npm 10 + Git 2.53 + GitHub CLI
- Next.js 16.1.6 + React 19 + TypeScript 5 + Tailwind CSS 4 + Turbopack
- UI: shadcn/radix-ui (new-york style)，圖表: recharts
- 資料: Notion API（現有標案追蹤）+ Supabase（KB 知識庫 + SaaS 多租戶認證，M02 起用），設定: localStorage
- 測試: Vitest 4 + Testing Library
- Dev port: 3000（Next.js 預設）

## 架構重點

- Feature Registry Pattern：所有功能在 `FEATURE_REGISTRY` 註冊
- SSOT：常數在 `src/lib/constants/`，設定在 `src/lib/settings/`
- 資料/UI 分離：`src/lib/`（邏輯）vs `src/components/`（渲染）
- bidding-assistant/CLAUDE.md 有完整開發規範
- 開發路線詳見 `docs/dev-map.md`（由 /地圖 指令維護）
- MCP Server 狀態見 `docs/dev-map.md`

## 已知注意事項

- Windows 上 Claude Code 用 bash 語法（Unix 風格）
- 避免 `> nul`（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`
- npm registry 用官方 `https://registry.npmjs.org/`（不要用 npmmirror）
- **資料庫安全（硬性規定）**：可以讀取用戶的原始資料庫資料，但**禁止直接修改原始資料庫**。實驗、測試、開發一律使用沙盒或複製的資料庫。
- 除錯經驗見 `docs/debugging.md`，環境設定見 `docs/dev-environment.md`
