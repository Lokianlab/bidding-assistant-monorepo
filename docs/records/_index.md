# 主題索引

> 每個主題一行。格式：`{topic}|{狀態}|{一句話結論}|{最新出處}|{最後更新}`
> AI 寫 OP 或小結時自動更新此檔。

feat-pcc-api|完成|g0v API 能力遠超預期，評委/投標金額/未得標原因都有|@op:20260218-JDNE#1200|2026-02-18
plan-pcc-impact|完成|PCC MCP 併入 Layer 0，步驟 1234 可 100% 自動化|@op:20260218-JDNE#1030|2026-02-18
feat-notion-test-db|完成|測試資料庫已建（22 欄位，prefix TEST）|@op:20260218-JDNE#1100|2026-02-18
infra-memory|完成|記憶檔案搬進 repo，9 份暫存檔|@op:20260218-JDNE#2000|2026-02-18
infra-operation-log|已被取代|改為記錄層 docs/records/|@op:20260219-JDNE#1800|2026-02-19
infra-git-monorepo|完成|Monorepo + GitHub private repo|@op:20260218-JDNE#1630|2026-02-18
infra-project-migration|完成|遷移到 C:\dev\cc程式|@op:20260218-JDNE#1900|2026-02-18
feat-slash-commands|完成|4 個指令（/暫存 /修改計畫 /安裝 /更新）|@op:20260218-JDNE#1930|2026-02-18
infra-sync-rules|完成|結論同步 + 30 分鐘定時 + 衝突處理規則|@op:20260218-JDNE#2030|2026-02-18
cleanup-0219|完成|NOTION_TOKEN 統一 + Gamma 移除 + acceptEdits|@op:20260219-JDNE#0900|2026-02-19
infra-closed-loop|待驗收|閉環原則四層：做對了→有效→做全了→沒矛盾（v2 升級）|@op:20260220-JDNE#0836|2026-02-20
infra-record-layer|完成|v1.1 三層檢索架構，兩輪壓力測試通過|@op:20260219-JDNE#1800|2026-02-19
plan-migration|完成|operation-log.md → records/ 遷移完成（含 17 筆歷史轉錄）|@op:20260219-JDNE#1830|2026-02-19
infra-staging-index|完成|暫存索引 + snapshot [?] 標記 + 啟動流程 Layer 0.5|@op:20260219-JDNE#2000|2026-02-19
method-self-qa|已被取代|自問自答法→模型委員會（結構性缺陷：同一實體共享盲區，遵守率0%）|@op:20260220-JDNE#0011|2026-02-20
method-model-committee|待驗收|模型委員會降級為送審前自檢的可選步驟（v2：委員不能取代用戶審閱）|@op:20260220-JDNE#0836|2026-02-20
plan-backlog|待驗收|待辦盤點（A44T）+ /待辦指令（ITEJ）已建，待用戶驗收|@op:20260219-A44T#0810|2026-02-19
infra-memory-rules|完成|MEMORY.md 分流表：只收首次觀察/本機偏好/本機環境，其餘直接寫共享位置|@op:20260219-ITEJ#0829|2026-02-19
feat-pcc-monitor|完成|PCC API 更新延遲監控（GAS 每小時上線，GitHub Actions IP 被封鎖）|@op:20260218-JDNE#1300|2026-02-18
cleanup-gas-monitor|完成|刪除 GitHub Actions 監控，GAS 每小時上線|@op:20260219-ITEJ#2100|2026-02-19
infra-collision-handling|完成|碰撞是常態，系統靠容錯：per-file 處理策略 + /更新偵測|@op:20260219-ITEJ#2200|2026-02-19
doc-methodology-review|完成|砍掉回應前分流（重複），確立機器對等關係 + 規模不限|@op:20260219-A44T#0643|2026-02-19
infra-trigger-rules|完成|觸發規則綁 push 事件（砍時間驅動），Stop hook 擴大到所有 tracked 改動|@op:20260219-A44T#0718|2026-02-19
infra-hooks|完成|PreCompact（自動存檔）+ Stop（擋未提交改動）+ pre-push（擋沒帶記錄的 push）|@op:20260221-JDNE#0900|2026-02-21
infra-startup-flows|完成|重啟/壓縮/更新三套流程：重啟=完整驗證，壓縮=輕量恢復，更新=手動同步無npm|@op:20260219-ITEJ#2330|2026-02-19
feat-summary-cmd|完成|/回報指令（原/小結）：工作報告（前次計畫→執行→後續計畫），機器碼+base36編碼，修訂模式|@op:20260219-JDNE#1512|2026-02-19
infra-snapshot-rules|完成|快照時間完備原則：4標記+讀舊逐項加新流程+退出條件綁/小結|@op:20260219-JDNE#1237|2026-02-19
plan-discord-bot|已放棄|Discord Bot 架構放棄，改為 SaaS 網頁|@op:20260219-JDNE#1237|2026-02-19
infra-staging-upgrade|完成|/暫存改版（記錄層驅動+plan/rule/issue三類）+stop hook同步提醒+issue首例驗證|@op:20260219-ITEJ#1324|2026-02-19
feat-backlog-cmd|完成|/待辦指令：5個固定來源+去重+分類，解決查詢不確定性|@op:20260219-ITEJ#2231|2026-02-19
feat-kb-skill|待驗收|/kb 指令：薄調度層+引用T1 prompt+寫入規範（插入錨點、佔位符處理、ID遞增）|@op:20260220-A44T#0030|2026-02-20
plan-modify-cmd-redesign|完成|/修改計畫 重寫：搬運工具→任務線推進器（按目標分組+評估+合成）|@op:20260220-ITEJ#0945|2026-02-20
infra-dev-map|完成|全專案開發地圖（6章162行）+ /地圖指令 + CLAUDE.md 5處修正（Discord Bot/MCP/路線/重啟）|@op:20260220-ITEJ#1100|2026-02-20
method-observation-capture|待驗收|v2 定義 obs- 前綴約定：觀察寫入 OP 教訓欄，≥3 條觸發小結合併|@op:20260220-JDNE#0836|2026-02-20
plan-plugin-inventory|進行中|54 個插件盤點完成（7有用+7以後+40不需要），自建 Notion MCP 暫緩|@op:20260220-JDNE#2230|2026-02-20
infra-methodology-v2|待驗收|方法論 v2 全部落地：CLAUDE.md 精簡（378→208行）+ rules 檔 2 個 + Skill 系統重構（14→13）+ 獎懲回饋機制|@op:20260221-JDNE#1300|2026-02-21
plan-methodology-skills|已被取代|原 4 個 Skill（對焦/拆解/驗證/回顧）降級為內部清單，改建 4 個獎懲 Skill（醜一/很棒/你說呢/有用嗎）|@op:20260221-JDNE#1300|2026-02-21
infra-meta-methodology|待驗收|元方法論框架：四層架構+效率為終極標準+Thomann七步+V2操作化（12獨立指標），暫存檔待用戶審定|@op:20260221-JDNE#0200|2026-02-21
infra-claude-md-modular|待驗收|CLAUDE.md 拆分：記錄格式搬到 .claude/rules/record-formats.md（paths 條件載入），主檔 479→376 行|@op:20260221-JDNE#1100|2026-02-21
plan-devplan-push|進行中|/修改計畫 批量推進 6 條任務線（04/06/07/09/A02/M07），暫存區 16→5 碎片|@op:20260221-ITEJ#1521|2026-02-21
