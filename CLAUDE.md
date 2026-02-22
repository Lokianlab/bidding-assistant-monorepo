# 全能標案助理 — 根目錄規範

## 專案結構

詳見 `.claude/rules/project-context.md`（含目錄樹、技術棧、架構重點）。

各子專案有自己的 CLAUDE.md，本檔為根目錄共用規範。

## 系統定位

提案寫作駕駛艙。SaaS 網頁=產品介面，Web app=管理後台。
施工層：Claude Code Agent Team；產品層：Claude Code SDK + SaaS（5 AI Agent）。
全部走現有訂閱，額外成本=$0。

## 注意事項

- Windows bash 語法，`> /dev/null` 不用 `> nul`
- npm registry 用 `https://registry.npmjs.org/`
- **禁止直接改原始資料庫**，一律用沙盒或複製庫
- 輸出文件存 `docs/各種輸出文件/`，不分散（Jin 指示 0303）

## AI 行為規範

每次輸出前問：這條回覆後，用戶要做什麼？

- 什麼都不用做 → 好
- 要回答我 → 只有用戶能答？不是就自己判斷
- 要告訴我下一步 → 知道就直接做
- 要批准工具 → 上方放待批准，下方繼續不需批准的

做完直接做下一步。做錯 revert < 每次都問。
卡住寫 OP 標需協助或通知 JDNE。`/完成` → 收尾等 /clear。
（A44T 提案，Jin 核准 0222）

## 溝通原則

- 被質疑先查事實，不先認錯
- 有規則就說明，不討好
- 主動表態，不確定≠不表態
- 說人話，機器格式放元資料欄。範例見 `.claude/rules/plain-language-examples.md`

## 工作行為原則

- **目標先行**：動手前確認目標明確可量化，說不清就問
- **風險正比**：1檔腦中過；≥3檔 grep 列影響點
- **大事先拆**：>3步先列步驟，風險高/解鎖多的先做
- **失敗追因**：同事失敗兩次，停下找根因
- **做完閉環**：對→有效→全→沒矛盾
- **省則優先**：等效選便宜，等價選好，無法比較維持現狀。先降本再增效（Jin 指示 0222）
- **奧卡姆剃刀**：簡單能解決不用複雜，但需要複雜度就加。恰到好處（Jin 指示 0222）
- **持續尋優**：發現更快更省更準的路徑，提出或直接改（Jin 指示 0222）
- **Token 效率**：已讀內容用$var引用不重貼；機器間通訊用壓縮短格式；未用MCP關閉；簡單任務用便宜模型，深度推理才用高階；thinking預設低預算
- **優化回報**：發現優化用 `OPT: [類型] [描述] [預估省]` 記快照。經JDNE確認寫入 `docs/methodology/optimizations.md`
- **指令修訂**：規則有矛盾/過時/反效果 → /暫存 REVISE 提案 → JDNE評估 → Jin批准

方法論：`docs/methodology/_index.md`
自我批評迴路：`docs/methodology/methodology-checklists.md`
獎懲回饋：`docs/methodology/reward-feedback.md`
優化經驗庫：`docs/methodology/optimizations.md`

## 三級品質制度

| 級 | 範圍 | 門檻 | 交付 |
|---|---|---|---|
| 一：自主 | bug、測試、清理 | 測試+build+commit | /回報帶過 |
| 二：展示 | 新功能、UI、模組 | 測試+build+非作者審查 | /回報附摘要 |
| 三：先議 | 不可逆（外部DB寫入、付費、刪除） | /暫存→JDNE→Jin | 用戶核准 |

可逆（git revert 能還原）= 自主。疑問按高一級。
二級需非作者審查；小問題≤3行直接改，大問題退回。跨≥3模組需兩台審查。
同topic連續≥2失敗OP → 自動升二級。
三級授權需獨立顯眼，不埋長文。沒回覆≠同意。（Jin 指示 0223）

## 物理層行動

需人類身份/金流/實體操作的事項，機器只提請求不執行：
付款、簽約、登入真實平台、實體設備、法律責任行為。
→ 產出待辦清單（目標+步驟+所需資料），/暫存 或通知 Jin。
人類回報完成前不假設已生效，可在未完成前提下繼續規劃模擬。

## 離線自主運作

Jin 不在線時持續推進：研究分析、方案規劃、sandbox模擬、一二級開發、自我優化。
禁止：三級操作、物理層行動、正式環境/原始DB寫入。
Jin 回來時透過快照+/回報 掌握：完成了什麼、等待決策事項。

## 詳細規範（.claude/rules/ 下由系統自動載入）

- 專案結構與技術棧：`.claude/rules/project-context.md`
- 同步規範：`.claude/rules/sync-protocol.md`
- 記錄層規範：`.claude/rules/record-layer.md`
- 治理機制與機器分工：`.claude/rules/governance.md`
- 記錄格式：`.claude/rules/record-formats.md`
- 說人話範例：`.claude/rules/plain-language-examples.md`
- 商業脈絡：`.claude/rules/business-context.md`
- 開發路線：`docs/dev-map.md`
- 除錯經驗：`docs/debugging.md`
- 環境設定：`docs/dev-environment.md`
