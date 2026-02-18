# 全能標案助理 — 專案根目錄規範

## 專案結構

```
cc程式/                      ← 專案根目錄（OneDrive 同步）
  bidding-assistant/         ← 主 Web App（Next.js 16 + React 19）
  smugmug-mcp/               ← SmugMug MCP Server
  pcc-api-mcp/               ← PCC 標案 API MCP Server
  pcc-monitor/               ← PCC API 更新延遲監控
  docs/                      ← 跨子專案共用文件
    operation-log.md          ← 操作日誌（必須維護）
```

各子專案有自己的 CLAUDE.md（如 `bidding-assistant/CLAUDE.md`），本檔為根目錄共用規範。

---

## 操作日誌規範（必須遵守）

**所有 Claude Code session（不論哪台機器）都必須在 `docs/operation-log.md` 記錄操作。**

### 規則

1. **每段新對話開始時**，先讀取 `docs/operation-log.md`，確認最新狀態
2. **每個重要操作完成後**，立即更新日誌
3. **記錄範圍**：
   - 用戶的決策和指示
   - Claude Code 執行的操作（建檔、修改、API 呼叫、建資料庫等）
   - 操作結果（成功/失敗/修正）
   - 錯誤和修正過程
   - 待處理事項
4. **格式**：按日期分 session，每個 session 內按主題編號
5. **結尾**：維護「待處理 / 下一步」清單

### 不需要記錄的

- 純閒聊或問答（不涉及操作決策）
- 讀檔、搜尋等探索性操作（除非導致重要發現）
