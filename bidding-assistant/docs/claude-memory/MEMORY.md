# Project Memory — 全能標案助理

## Project Location
- Root: `C:\dev\cc程式`
- App: `C:\dev\cc程式\bidding-assistant`
- Git monorepo（根目錄就是 repo）

## Tech Stack (see [dev-environment.md](dev-environment.md) for full config)
- Node.js v22.14.0 + npm 10.9.2 + Git 2.53.0
- Next.js 16.1.6 + React 19 + TypeScript 5 + Tailwind CSS 4 + Turbopack
- UI: shadcn/radix-ui (new-york style), Charts: recharts
- Data: Notion API, Settings: localStorage
- Test: Vitest 4 + Testing Library (26 files, 560 tests)
- Docs: docx 9.5.2
- Dev port: 3003 (per CLAUDE.md)
- Global CLI: @anthropic-ai/claude-code (latest)

## Key Architecture
- Feature Registry Pattern: all features in `FEATURE_REGISTRY`
- SSOT: constants in `src/lib/constants/`, settings in `src/lib/settings/`
- Data/UI separation: `src/lib/` (logic) vs `src/components/` (rendering)
- CLAUDE.md in bidding-assistant/ has comprehensive dev guidelines

## Known Issues
- 專案已搬到 C:\dev\cc程式（不在 OneDrive 裡），中文路徑問題已大幅改善
- Large session files (>10MB) cause "Failed to load session" in desktop app
- Windows `nul` files get created as actual files when bash redirects to `/dev/null` — avoid `> nul` patterns

## SmugMug MCP Server
- Location: `smugmug-mcp/` (project root level)
- Built with: TypeScript + @modelcontextprotocol/sdk + oauth-1.0a
- Auth: OAuth 1.0a, credentials in `.mcp.json` env vars
- 7 tools: get_user, list_albums, get_album_images, get_album_info, get_image_urls, browse_folders, search_images
- SmugMug API v2 base: `https://api.smugmug.com/api/v2`

## Build/Test Status (2026-02-17)
- Build: PASS (0 errors)
- Tests: 26 files, 560 tests all passing
- No TODO/FIXME/BUG comments in codebase

## Development Plan v4.0（2026-02-18）
- **開發計畫書 v4.0**：`docs/開發計畫書_v4.0_提案寫作駕駛艙版.docx`（已生成）
- **痛點深度分析**：見 [pain-points-analysis.md](pain-points-analysis.md)（23 痛點 + 6 能力 + Discord Bot + Agent 架構）
- **新定位**：提案寫作駕駛艙（不是儀表板/看板/RAG 聊天機器人）
- **Discord Bot**：系統主要操作介面（駕駛座），Web app 退為管理後台
- **Agent 架構**：施工層（Claude Code Agent Team）+ 產品層（Agent SDK，5 個 AI Agent 編制）
- **開發路線**：Layer 0（知識庫）→ Layer 1（P0 Bot 基礎 → P1 戰略+知識庫 → P2 寫作+品管）→ Layer 2 → Layer 3

## Agent Team 設定
- Claude Code Agent Team 已啟用：`~/.claude/settings.json`
- Windows 使用 in-process 模式（Shift+Up/Down 切換）
- 產品層 5 個 Agent：戰略官/企劃官/品管官/知識官/簡報官
- 詳細架構見 pain-points-analysis.md「Agent 架構決策」章節

## Dev Lessons (see [debugging.md](debugging.md) for details)
- Test failure investigation: trace data flow to find WHY, not just change assertion to pass
- Never patch symptoms (swap search term / change expected value) — fix the layer where the defect lives
- Test data must isolate each code path — shared values mask real failures
- Follow closed-loop strictly: code → review → test → build (not code → build → test)
