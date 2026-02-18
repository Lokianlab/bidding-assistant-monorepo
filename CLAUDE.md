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

## 專案背景（所有機器必須知道）

### 技術棧
- Node.js v22 + npm 10 + Git 2.53 + GitHub CLI
- Next.js 16.1.6 + React 19 + TypeScript 5 + Tailwind CSS 4 + Turbopack
- UI: shadcn/radix-ui (new-york style)，圖表: recharts
- 資料: Notion API，設定: localStorage
- 測試: Vitest 4 + Testing Library（26 files, 560 tests）
- Dev port: 3000（Next.js 預設）

### 系統定位
- **提案寫作駕駛艙**（不是儀表板/看板/RAG 聊天機器人）
- Discord Bot = 主要操作介面（駕駛座），Web app = 管理後台

### 架構重點
- Feature Registry Pattern：所有功能在 `FEATURE_REGISTRY` 註冊
- SSOT：常數在 `src/lib/constants/`，設定在 `src/lib/settings/`
- 資料/UI 分離：`src/lib/`（邏輯）vs `src/components/`（渲染）
- bidding-assistant/CLAUDE.md 有完整開發規範

### Agent 架構（雙層策略）
- **施工層**：Claude Code Agent Team（開發時用）
- **產品層**：Claude Code SDK + Discord Bot（5 個 AI Agent：戰略官/企劃官/品管官/知識官/簡報官）
- 全部走現有訂閱，額外成本 = $0

### MCP Server
- SmugMug MCP：已建好（`smugmug-mcp/`）
- Notion MCP：待建（本地版，讓三家 AI 都能用）
- PCC 標案 API MCP：待建（g0v 免費 API，有評委名單、投標金額等）
- PCC MCP 建議併入 Layer 0 同步建設

### 開發路線
- Layer 0：知識庫（00A-00E）+ PCC MCP
- Layer 1：P0 Bot 基礎 → P1 戰略+知識庫 → P2 寫作+品管
- Layer 2：統一 AI 調度 + 排版輸出
- Layer 3：視覺生成整合

### 已知注意事項
- Windows 上 Claude Code 用 bash 語法（Unix 風格）
- 避免 `> nul`（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`
- npm registry 用官方 `https://registry.npmjs.org/`（不要用 npmmirror）
- 詳細開發環境見 `docs/dev-environment.md`
- 除錯經驗見 `docs/debugging.md`
- 討論結論暫存在 `bidding-assistant/docs/dev-plan/_staging/`

---

## 自動同步規範（必須遵守）

本專案透過 **GitHub** 同步，不使用 OneDrive。多台機器同時在線，必須頻繁同步。

### 何時拉（git pull）

- **對話開始時**：第一件事就是 `git pull origin main`
- **準備修改檔案前**：先 pull 確保拿到最新版

### 何時推（git commit + push）

- **每完成一個操作就推一次**，不要累積。例如：
  - 改完一個檔案 → 推
  - 更新操作日誌 → 推
  - 用戶下 `/暫存` 或 `/寫入` → 寫完檔案後立刻推
  - 建完 Notion 資料庫並更新記錄 → 推
- **commit message 用中文**，簡述做了什麼

### 結論同步規則（必須遵守）

**每次 git push 時**，順便檢查有沒有漏推的結論。

**長時間討論中**，如果已經產生重要決策但還沒改檔案，主動暫停討論，先把結論推上去：
1. **預設用 `/暫存`**（每份暫存檔是獨立檔案，多台機器同時推也不衝突）
2. 操作記錄追加到 `docs/operation-log.md`（衝突時保留兩邊）
3. `git add` → `git commit` → `git push`
4. 然後再繼續討論

**不要隨意更新 `CLAUDE.md`** — 只有改規範或架構等級的大事（例如：技術棧變更、新的開發規則）才動。日常討論結論一律用 `/暫存`。

**不能只寫進本機 MEMORY.md。** 其他機器看不到 MEMORY.md。

### 定時同步（每 30 分鐘）

長時間對話中，**每 30 分鐘必須執行一次 git pull + push**，即使沒有新的改動也要 pull 確認。

- 對話開始時啟動計時（第一次 pull 即為起點）
- 每次完成 pull 或 push 時重置計時
- 如果距離上次拉推已超過 30 分鐘，立即執行：
  1. `git pull origin main`
  2. 有未推的改動 → `git add` + `git commit` + `git push`
  3. 沒有改動 → pull 完即可，重置計時
- 這條規則與「每完成一個操作就推一次」並行，取較早觸發的那個

### 同步指令

```bash
# 每次推之前都先拉（避免三台機器越走越遠）
git pull origin main
git add <修改的檔案>
git commit -m "簡述做了什麼"
git push origin main
```

**重點：不是只有開工拉一次。每次推之前都要先拉，確保拿到其他機器的最新改動。**

### 如果 pull 有衝突

1. 讀取衝突檔案，理解兩邊的改動
2. 合併成正確版本（保留兩邊有意義的內容）
3. `git add` → `git commit` → `git push`
4. 操作日誌的衝突：**永遠保留兩邊的記錄**，不刪除任何一方的 log

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

### 多機器協作規則（最高 3 台同時在線）

#### 分工原則
- **不同機器改不同檔案**：A 改 bidding-assistant/src/，B 改 pcc-api-mcp/，C 改 docs/
- **同一個檔案不要兩台機器同時改** — 如果需要，先在一台完成並推上去，另一台再 pull 後接手
- **安裝套件（npm install）只在一台機器上做**，其他機器 pull 後跑 `npm install` 同步

#### 衝突預防
- **改任何共用檔案前先 `git pull`**
- **推之前先跑測試**（`npm test`），不要推壞掉的程式碼
- **開工時先檢查有沒有未推的改動**（`git status`），有的話先處理

#### 衝突處理
- **程式碼衝突**：讀懂兩邊改動，合併成正確版本
- **操作日誌衝突**：永遠保留兩邊記錄，不刪除對方的 log
- **package-lock.json 衝突**：刪掉 `package-lock.json`，重新 `npm install`
- **暫存檔矛盾**（兩台機器做出相反結論）：兩份都保留，跑 `/修改計畫` 時會列出讓用戶裁決

#### 重大決策只在一台機器上做
- 技術選型、架構變更、新規範 → 在一台機器上討論定案後推上去
- 其他機器 pull 後執行，不要平行討論同一個決策
