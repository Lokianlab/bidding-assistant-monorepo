# 全能標案助理 — 專案根目錄規範

## 專案結構

```
cc程式/                      ← 專案根目錄（每台機器各自 clone，不放 OneDrive）
  bidding-assistant/         ← 主 Web App（Next.js 16 + React 19）
  smugmug-mcp/               ← SmugMug MCP Server
  pcc-api-mcp/               ← PCC 標案 API MCP Server
  pcc-monitor/               ← PCC API 更新延遲監控
  docs/                      ← 跨子專案共用文件
    operation-log.md          ← 操作日誌（必須維護）
    機器設定指南.md            ← 新機器設定步驟
```

各子專案有自己的 CLAUDE.md（如 `bidding-assistant/CLAUDE.md`），本檔為根目錄共用規範。

---

## 自動同步規範（必須遵守）

本專案透過 **GitHub** 同步，不使用 OneDrive。每段 Claude Code session 必須：

### 對話開始時

```bash
git pull origin main
```

拉取其他機器推上來的最新變更。如果有衝突，先解決衝突再繼續工作。

### 完成工作時

```bash
git add <修改的檔案>
git commit -m "描述做了什麼"
git push origin main
```

把這次的工作推上 GitHub，讓其他機器拉得到。

### 重要：每次對話的第一件事和最後一件事都是 git 同步。

---

## 操作日誌規範（必須遵守）

**所有 Claude Code session（不論哪台機器）都必須在 `docs/operation-log.md` 記錄操作。**

### 規則

1. **每段新對話開始時**，`git pull` 後讀取 `docs/operation-log.md`，確認最新狀態
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

---

## Git 協作規範（必須遵守）

本專案為 **monorepo**，所有子專案在同一個 git repo 裡。
遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`

### 基本流程（簡化版，適合日常開發）

1. **開工**：`git pull origin main`
2. **工作**：改程式碼
3. **收工**：`git add` → `git commit` → `git push origin main`

### 進階：分支策略（大改動時使用）

- `main`：穩定主幹
- **大功能用分支**：格式 `{machine}/{topic}`
  - 例：`laptop/pcc-mcp-setup`、`desktop/notion-integration`
- 完成後 merge 回 main

### 衝突預防

- **不同子專案盡量分開作業**：A 機器改 bidding-assistant，B 機器改 pcc-api-mcp
- **共用檔案**（如 `CLAUDE.md`、`docs/operation-log.md`）：改之前先 `git pull`
- **操作日誌衝突**：如果 merge 衝突，保留兩邊的記錄（不要刪除對方的 log）
