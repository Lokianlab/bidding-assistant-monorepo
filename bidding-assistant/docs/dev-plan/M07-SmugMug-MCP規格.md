---
version: "1.0"
updated: "2026-02-21"
status: "定案"
depends: []
changelog:
  - "1.0 (2026-02-21): 初版建立，已建成系統的規格記錄"
---

# M07 SmugMug MCP Server 規格

## 概述

SmugMug MCP Server 已建置完成，位於 `smugmug-mcp/`。
用途：讓 Claude Code 可直接存取 SmugMug 相簿（公司作品集/活動照片），供建議書圖片挑選使用。

## 技術規格

- **框架**：TypeScript + @modelcontextprotocol/sdk + oauth-1.0a
- **認證**：OAuth 1.0a（credentials 存在 `.mcp.json` 環境變數）
- **API**：SmugMug API v2（`https://api.smugmug.com/api/v2`）
- **編譯**：`npm run build` → `dist/index.js`

## 7 個工具

| 工具名稱 | 功能 |
|---------|------|
| `get_user` | 取得使用者資訊 |
| `list_albums` | 列出所有相簿 |
| `get_album_images` | 取得相簿內所有圖片 |
| `get_album_info` | 取得相簿詳細資訊 |
| `get_image_urls` | 取得圖片各尺寸 URL |
| `browse_folders` | 瀏覽資料夾結構 |
| `search_images` | 搜尋圖片（關鍵字） |

## 注意事項

- `.mcp.json` 中的 SmugMug 路徑是**絕對路徑**，換機器必須修改
- OAuth credentials 在 `.mcp.json` 明文存放，換機器需手動帶過去
- `.mcp.json` 不入 git（已在 .gitignore）
