# 操作日誌

> 所有對話決策和操作的完整記錄，按時間順序。
> **所有機器上的 Claude Code session 都必須維護本檔。**

---

## 2026-02-18 Session 1（延續前一 session）

### 一、g0v PCC API 實測

**背景**：前一 session 研究了 PCC API 端點，用戶要求實際測試 API 能做到什麼。

#### 操作紀錄

| 時間 | 操作 | 結果 |
|------|------|------|
| 1 | 呼叫 `/api` 列出所有端點 | 10 個端點，確認可用 |
| 2 | 呼叫 `/api/getinfo` | 1,422 萬筆，1999~2026/02/13 |
| 3 | `searchbycompanyname?query=大員洛川` | 139 筆，含所有投標廠商 + 得標/未得標 |
| 4 | `searchbytitle?query=食農教育` | 847 筆 |
| 5 | `listbyunit?unit_id=3.82.58`（三峽區公所） | 3,879 筆 |
| 6 | `tender` 詳情（五股幼兒園案） | 有預算/底價/決標金額/每家投標金額/未得標原因 |
| 7 | `tender` 詳情（食農教育傑出貢獻獎） | 有預算 630 萬，**無評委** |
| 8 | `tender` 詳情（新北閱讀節 NTCLS114-002） | **有完整評委名單！** 5 位，含姓名/身份/經歷/出席 |
| 9 | `tender` 詳情（新北閱讀節 NTCLS115-004） | 招標中（未決標），無評委 |
| 10 | 大員洛川 page 2（139 筆全部） | 得標極少，大多未得標 |
| 11 | `searchbycompanyname?query=樂晨創意` | 4 筆，確認競爭對手分析可行 |

#### 關鍵發現

1. **評委資料在 API 裡** — 但僅限「公開評選/最有利標」的決標公告
2. **每家投標廠商的金額都有** — 可做價格競爭力分析
3. **未得標原因有記錄** — 可分析失敗模式
4. **評委交叉比對技術上可行** — 需逐筆爬 tender detail，受 rate limit 限制

#### 決策

- [x] 確認 PCC API 能力遠超預期
- [x] 評委交叉比對可做（之前以為不行）

---

### 二、影響分析 & 開發計畫調整建議

**操作**：分析 PCC API 對收入公式和開發計畫的衝擊

#### 決策

- [x] **建議 PCC MCP 併入 Layer 0**（原在 Phase 3 Batch H）
  - 理由：成本低（1-2 天）、價值高（推動投標決策通過率 + 得標率）、戰略官基礎
- [x] **Batch H 可提前且簡化** — API 直接可用，不需爬蟲
- [x] 戰略官能力從「看後照鏡」升級為「GPS 導航」

---

### 三、API 能否取代人工貼表

**用戶問題**：g0v API 能否完整取代行政的貼表工作？

#### 決策

- [x] **步驟 1234（刷標案→初篩→貼基本資料→貼招標方式）可 100% 取代**
- [x] 步驟 2 初篩保留人工一鍵確認（看 Discord 通知按確認/跳過）
- [x] 用戶澄清：「貼表工作只有 1234」→ 確認完全可以取代

---

### 四、建立 Notion 測試資料庫

**用戶要求**：在 Notion 建一個「測試用備標評估資料庫」，欄位比照原庫。

#### 操作

1. 讀取 `field-mapping.ts` 確認 22 個欄位名稱
2. 讀取 `bid-status.ts` 確認 13 個進程選項 + 7 個決策選項
3. 用 Explore agent 分析每個欄位的 Notion 類型（title/select/number/date/checkbox/...）
4. 呼叫 `mcp__claude_ai_Notion__notion-create-database` 建庫
5. 第一次失敗：unique_id prefix "BID" 已被原庫佔用 → 改用 "TEST"
6. 第二次成功

#### 建好的欄位

| 欄位 | 類型 | 選項數 |
|------|------|--------|
| 標案名稱 | title | — |
| 標案進程 | select | 13（等標期間～得標） |
| 備標決策 | select | 7（第一順位～尚未安排） |
| 截標時間 | date | — |
| 預算金額 | number | 千分位 |
| 備標進度 | select | 8（L1～L8） |
| 企劃人員 | people | — |
| 投遞序位 | rich_text | — |
| 評審方式 | select | 5 |
| 招標機關 | rich_text | — |
| 案號 | rich_text | — |
| 標案類型 | multi_select | 5 |
| 決標公告 | url | — |
| 評選日期 | date | — |
| 歸檔號 | rich_text | — |
| 押標金 | number | 千分位 |
| 領標費 | number | 千分位 |
| 檔案型態 | select | 3 |
| 電子投標 | checkbox | — |
| 確定協作 | checkbox | — |
| 案件唯一碼 | unique_id | 前綴 TEST |
| 備標期限 | date | — |

#### 注意

- 原庫「標案進程」是 Notion `status` 類型（有分組），測試庫用 `select` 代替（API 無法建 status 自訂分組）
- data_source_id: `2181121c-79ef-4581-8b4e-9bb7fbb3984e`

---

### 五、API 更新頻率調查

**用戶問題**：API 是即時更新還是固定時間？

#### 操作

逐日查 `listbydate` 記錄數：

| 日期 | 筆數 | 備註 |
|------|------|------|
| 1/30（五） | 101 | |
| 2/01（日） | 0 | 週末 |
| 2/02（一） | 101 | |
| 2/03（二） | 100 | |
| 2/04（三） | 1 | |
| 2/05（四） | 220 | |
| 2/06（五） | 100 | |
| 2/07（六） | 0 | 週末 |
| 2/13（五） | 100 | API 最新 |
| 2/14-2/18 | 0 | 春節連假 |

#### 決策

- [x] 確認**不是即時同步**，是批次抓取
- [x] 用戶指出我無法從資料推斷延遲時間 → **承認錯誤**
- [x] 決定建立自動監控來實測

---

### 六、建立 PCC API 監控系統

#### 操作

1. 建立 `pcc-monitor/` 目錄
2. 建立 `monitor.mjs` — Node.js 監控腳本（支持持續/單次/自訂間隔）
3. 建立 `analyze.mjs` — 延遲分析報告腳本
4. 建立 `start-monitor.bat` — Windows 雙擊啟動
5. 執行一次建立基準：最新 2/13，14,223,872 筆
6. 建立 GitHub Actions workflow `pcc-monitor.yml`
7. 用戶沒有 GitHub 帳號 → 改用 Google Apps Script
8. 建立 `google-apps-script.js` — 完整 GAS 版本
   - 每 4 小時自動檢查
   - 結果寫入 Google Sheet「PCC API Monitor」
   - 偵測到更新時自動寄 email 通知
   - 含 `analyzeDelays()` 分析函式

#### 產出檔案

```
pcc-monitor/
  monitor.mjs              ← Node.js 版（本地用）
  analyze.mjs              ← 分析報告
  start-monitor.bat        ← Windows 啟動捷徑
  google-apps-script.js    ← Google Apps Script 版（雲端用）
  state.json               ← 基準狀態
  update-log.jsonl         ← 檢查記錄
  README.md                ← 使用說明
  .github/workflows/pcc-monitor.yml  ← GitHub Actions（備用）
```

#### 用戶待辦

- [ ] 到 https://script.google.com 建專案，貼上 GAS 程式碼
- [ ] 設定觸發條件：每 4 小時
- [ ] 春節後觀察 Google Sheet 記錄

---

### 七、記憶檔案更新

本 session 建立/更新的記憶檔案：

| 檔案 | 操作 | 內容 |
|------|------|------|
| `pcc-api-test-results.md` | 新建 | API 實測完整結果（端點、欄位、評委資料、能力矩陣） |
| `pcc-api-impact-analysis.md` | 新建 | 對開發計畫的影響分析 |
| `notion-mcp-spec.md` | 前 session 建 | Notion MCP 15 個工具規格 |
| `MEMORY.md` | 更新 | PCC MCP 段落加入實測結論 + 併入 Layer 0 建議 |
| `operation-log.md` | 新建 | 本檔（完整操作日誌） |

---

## 2026-02-18 Session 2（上下文壓縮後延續）

**背景**：前一段對話因上下文限制被壓縮，本段為延續。

### 八、操作日誌制度確認 & 跨機器共享

**用戶指示**：
1. 重申「所有對話決策和操作（包括你的操作）都要留下記錄」
2. **其他機器在這個專案裡的操作也一樣要記錄**

#### 操作

1. 確認原 `operation-log.md` 在 `.claude/projects/` 記憶目錄（機器專屬，不跨機器同步）
2. 在專案根目錄建立 `CLAUDE.md`，寫入操作日誌規範 → 所有機器的 Claude Code 都會讀到
3. 建立 `docs/operation-log.md`（本檔）— 放在 OneDrive 同步區，跨機器共享
4. 把原日誌內容遷移到此處

#### 決策

- [x] 操作日誌從機器專屬記憶目錄 → 搬到 `docs/operation-log.md`（OneDrive 同步）
- [x] 在根 `CLAUDE.md` 寫入強制規範，確保所有機器都遵守
- [x] 記憶目錄的舊檔改為指向此處的參考

---

### 九、Git Monorepo 建立 & 多機器協作

**用戶問題**：3 台以上機器同時開發，如何避免打架？

#### 操作

1. 檢查所有子專案 git 狀態：
   - `bidding-assistant/` → 有 .git，1 commit，無 remote
   - `pcc-monitor/` → 有 .git，0 commits
   - `smugmug-mcp/` → 無 .git
   - `pcc-api-mcp/` → 無 .git
   - 根目錄 → 無 .git
2. 建立根目錄 `.gitignore`（排除 node_modules、.env、.mcp.json、.claude/ 等）
3. 移除子專案 `.git`（`bidding-assistant/.git`、`pcc-monitor/.git`）
4. 在根目錄 `git init` + `git checkout -b main`
5. 設定 git user：Jin / gasklath20312@gmail.com
6. Stage 263 個檔案，確認無敏感檔案洩漏
7. Initial commit：`46152e7`
8. 安裝 GitHub CLI（`winget install GitHub.cli`）
9. 在 `CLAUDE.md` 加入 Git 協作規範（分支策略、操作守則、衝突預防）

#### 產出

| 項目 | 內容 |
|------|------|
| `.gitignore` | 根目錄全域 gitignore |
| `CLAUDE.md` | 加入 Git 協作規範 + 分支策略 |
| Git repo | 根目錄 monorepo，main 分支，1 commit |
| GitHub CLI | v2.86.0 已安裝 |

#### 分支策略

- `main`：穩定主幹
- `{machine}/{topic}`：每台機器用自己的分支
- 完成後 merge 回 main

#### 決策

- [x] 選擇 Monorepo（而非多個獨立 repo）
- [x] 選擇 GitHub 作為遠端（用戶有帳號）
- [x] 分支命名：`{machine}/{topic}`
- [x] 用戶完成 `gh auth login`（帳號：Lokianlab）
- [x] 建立 GitHub private repo：`Lokianlab/bidding-assistant-monorepo`
- [x] Push main branch 成功

---

### 十、PCC 監控改用 GitHub Actions 嘗試

**用戶提議**：既然有 GitHub 了，PCC 監控也用 GitHub Actions。

#### 操作

1. 移動 workflow 到 `.github/workflows/pcc-monitor.yml`（根目錄）
2. 更新路徑為 monorepo 結構（`node pcc-monitor/monitor.mjs --once`）
3. 取消 .gitignore 排除 state.json/update-log.jsonl
4. Commit + push → 手動觸發 → 成功但 API 回 **403**
5. 加 User-Agent header → push → 再觸發 → **仍然 403**
6. 結論：PCC API 封鎖 GitHub Actions 雲端 IP

#### 決策

- [x] **PCC 監控仍用 Google Apps Script**（GitHub Actions IP 被 API 封鎖）
- [x] GitHub Actions workflow 保留備用（未來可跑 CI 測試/build）
- [x] OneDrive + Git 共存有衝突風險（git index lock），需注意

---

## 2026-02-18 Session 3（從 OneDrive 機器接續，新工作目錄 C:\dev\cc程式）

### 十一、專案遷移到 C:\dev + 環境驗證

1. 確認 `C:\dev\cc程式` git 狀態正常（main 分支、無損壞）
2. npm registry 從 npmmirror 改回官方 `registry.npmjs.org`
3. `npm install` → 成功（924 packages）
4. 測試 26 files / 560 tests 全過，build 0 errors

### 十二、建立 4 個 Slash Command

| 指令 | 功能 |
|------|------|
| `/暫存` | 討論結論整理成暫存檔到 `_staging/` |
| `/修改計畫` | 暫存區寫入正式開發計畫（逐筆確認） |
| `/安裝` | 全新機器設定開發環境 |
| `/更新` | 舊機器同步到最新 |

- `.gitignore` 加入 `!.claude/commands/` 例外，讓指令跨機器同步

### 十三、本機記憶檔案搬進 repo

- 9 份討論結論整理成暫存檔放入 `_staging/`（系統定位、AI連接、Agent架構、行政流程、開發進程、PCC API、Discord Bot、Notion MCP、企劃端診斷）
- `debugging.md` 和 `dev-environment.md` 搬到 `docs/`
- `MEMORY.md` 關鍵內容整合進 `CLAUDE.md`（專案背景段落）

### 十四、多機器同步規則制定

- 結論同步規則：預設用 `/暫存`（獨立檔案不衝突），`CLAUDE.md` 大事才動
- 長討論中途有結論要主動推上 GitHub
- 完整多機器協作規則：分工、衝突預防、衝突處理、決策原則
- Claude Code 自動處理：git 衝突、測試、狀態檢查
- 用戶負責：分配哪台機器做什麼、重大決策只在一台討論

---

## 2026-02-19 Session 1

### 十五、最後清理：文件一致性修正 + 權限模式變更

**背景**：經兩輪全面檢視後的最終清理。

#### 操作

| # | 操作 | 結果 |
|---|------|------|
| 1 | `docs/機器設定指南.md` line 57：`NOTION_API_KEY` → `NOTION_TOKEN` | 與 `.env.example` 和程式碼一致 |
| 2 | `docs/dev-environment.md`：移除已退訂 Gamma MCP 行 | 表格僅保留 4 個 active server |
| 3 | `bidding-assistant/docs/claude-memory/dev-environment.md`：同步移除 Gamma 行 | 閉環補漏（自我審查發現遺漏） |
| 4 | `~/.claude/settings.json`：`defaultMode` 從 `dontAsk` → `acceptEdits` | 本機設定，不入 git |
| 5 | `git grep NOTION_API_KEY` 驗證 | 零殘留 ✅ |

#### 閉環自查紀錄

- 第一輪修改只改了 `docs/dev-environment.md` 的 Gamma，漏了 `bidding-assistant/docs/claude-memory/dev-environment.md` 的同一行
- 用戶提問「是否閉環」後自查發現，第二輪補修

### 十六、閉環原則精神補強

**背景**：用戶指出閉環不只是步驟清單，核心是「自證有效」——不是做完了，是確定做對了。

#### 操作

| # | 操作 | 結果 |
|---|------|------|
| 1 | `bidding-assistant/CLAUDE.md` §6：標題從「閉環開發流程」改為「閉環原則」，補入精神說明 + 驗證手段匹配表 | 涵蓋程式碼與非程式碼修改 |
| 2 | `docs/debugging.md` §3：同步更新標題和內容，加入非程式碼閉環說明 | 與 CLAUDE.md 一致 |
| 3 | `bidding-assistant/docs/dev-plan/02-核心架構.md`：同步更新摘要 | 與 CLAUDE.md 一致 |
| 4 | `changelog.ts`：保留舊名稱（歷史記錄不改） | 正確 |
| 5 | grep「閉環開發流程」驗證 | 僅剩 changelog 歷史記錄 ✅ |

---

## 待處理 / 下一步

- [ ] 用戶設定 Google Apps Script 監控（PCC API 封鎖 GitHub Actions IP）
- [ ] 春節後分析 API 實際延遲
- [x] ~~註冊 GitHub~~ → 完成（帳號 Lokianlab）
- [x] ~~專案遷移到 C:\dev\cc程式~~ → 完成
- [x] ~~建立 slash commands~~ → 完成（4 個）
- [x] ~~本機記憶搬進 repo~~ → 完成
- [x] ~~多機器同步規則~~ → 完成
- [ ] 其他機器 clone repo + 環境設定
- [ ] 建 PCC MCP server（待 Layer 0 階段）
- [ ] 建 Notion MCP server（待 Layer 0 階段）
- [ ] 更新 v4.0 開發計畫文件（用 `/修改計畫` 整合 `_staging/` 暫存檔）
