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
infra-closed-loop|完成|閉環原則四層：做對了→有效→做全了→沒矛盾（v2 升級）|@op:20260220-JDNE#0836|2026-02-21
infra-record-layer|完成|v1.1 三層檢索架構，兩輪壓力測試通過|@op:20260219-JDNE#1800|2026-02-19
plan-migration|完成|operation-log.md → records/ 遷移完成（含 17 筆歷史轉錄）|@op:20260219-JDNE#1830|2026-02-19
infra-staging-index|完成|暫存索引 + snapshot [?] 標記 + 啟動流程 Layer 0.5|@op:20260219-JDNE#2000|2026-02-19
method-self-qa|已被取代|自問自答法→模型委員會（結構性缺陷：同一實體共享盲區，遵守率0%）|@op:20260220-JDNE#0011|2026-02-20
method-model-committee|完成|模型委員會降級為送審前自檢的可選步驟（v2：委員不能取代用戶審閱）|@op:20260220-JDNE#0836|2026-02-21
plan-backlog|完成|待辦盤點（A44T）+ /待辦指令（ITEJ）已建|@op:20260219-A44T#0810|2026-02-21
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
feat-kb-skill|完成|/kb 指令：薄調度層+引用T1 prompt+寫入規範（插入錨點、佔位符處理、ID遞增）|@op:20260220-A44T#0030|2026-02-21
plan-modify-cmd-redesign|完成|/修改計畫 重寫：搬運工具→任務線推進器（按目標分組+評估+合成）|@op:20260220-ITEJ#0945|2026-02-20
infra-dev-map|完成|全專案開發地圖（6章162行）+ /地圖指令 + CLAUDE.md 5處修正（Discord Bot/MCP/路線/重啟）|@op:20260220-ITEJ#1100|2026-02-20
method-observation-capture|完成|v2 定義 obs- 前綴約定：觀察寫入 OP 教訓欄，≥3 條觸發小結合併|@op:20260220-JDNE#0836|2026-02-21
plan-plugin-inventory|進行中|54 個插件盤點完成（7有用+7以後+40不需要），自建 Notion MCP 暫緩|@op:20260220-JDNE#2230|2026-02-20
infra-methodology-v2|完成|方法論 v2 全部落地：CLAUDE.md 精簡 + rules 檔 + Skill 系統重構 + 獎懲回饋機制|@op:20260221-JDNE#1300|2026-02-21
plan-methodology-skills|已被取代|原 4 個 Skill（對焦/拆解/驗證/回顧）降級為內部清單，改建 4 個獎懲 Skill（醜一/很棒/你說呢/有用嗎）|@op:20260221-JDNE#1300|2026-02-21
infra-meta-methodology|完成|元方法論框架：四層架構+效率為終極標準+Thomann七步+V2操作化（12獨立指標），暫存檔待用戶審定|@op:20260221-JDNE#0200|2026-02-21
infra-claude-md-modular|完成|CLAUDE.md 拆分：記錄格式搬到 .claude/rules/record-formats.md（paths 條件載入），主檔精簡|@op:20260221-JDNE#1100|2026-02-21
plan-devplan-push|進行中|/修改計畫 批量推進 6 條任務線（04/06/07/09/A02/M07），暫存區 16→5 碎片|@op:20260221-ITEJ#1521|2026-02-21
feat-pcc-web|完成|PCC 情報模組：Phase 1-4 完成 + 四 tab 跨 tab 導航 + 機關情報內嵌 + API 重構 + 快取層|@op:20260221-JDNE#1047|2026-02-22
infra-sync-optimize|完成|同步機制優化：scoring append-only + /更新輕量化 + 重啟/壓縮流程精簡|@op:20260221-A44T#2100|2026-02-21
infra-db-safety|進行中|資料庫安全規則：可讀不可寫原始資料庫，實驗用沙盒（已寫入 CLAUDE.md，具體沙盒方案未定）|@op:20260221-A44T#2330|2026-02-21
<<<<<<< Updated upstream
infra-forum|已放棄|機器論壇已廢除，改為快照協調+機器分工（Jin 決定 0224，ITEJ 執行 d60b70b）|ITEJ 快照|2026-02-24
feat-quality-refactor|待驗收|品質檢查模組重構：邏輯抽到 lib/quality/（types+rules+score），鐵律 5 flag 全實作+公司名稱一致性+負數防禦，55 個測試|@op:20260221-ITEJ#1849|2026-02-21
feat-pricing-refactor|待驗收|報價計算模組重構：邏輯抽到 lib/pricing/（types+helpers），28 個測試（含負數防禦），頁面瘦身|@op:20260222-ITEJ#1910|2026-02-22
feat-assembly-refactor|待驗收|提案組裝引擎重構：邏輯抽到 lib/assembly/（6 個純函式），31 個測試，頁面從 724→~620 行|@op:20260222-ITEJ#1730|2026-02-22
infra-new-machine-setup|待驗收|新機器一鍵設定：一鍵安裝.bat+防呆腳本+簡易版指南，非技術人員可操作|@op:20260222-A44T#2100|2026-02-22
infra-machine-profile|待驗收|三台機器側寫+協作策略，三方共識：方向1輕量自評+方向4跟回報刷新|@op:20260222-JDNE#1800|2026-02-22
infra-forum-upgrade|待驗收|論壇制度升級：討論串(thread)+共識協議+discuss/reply類型+_threads.md索引|@op:20260222-JDNE#2030|2026-02-22
infra-quality-tiers|待驗收|三級品質制度（自主/展示/先討論），三台機器論壇共識後寫入 CLAUDE.md|@op:20260222-A44T#1840|2026-02-22
=======
infra-forum|完成|機器論壇（跨機器通訊）+ /質問（全面校準）：brief/feedback/score/directive/response 五種貼文，整合進重啟/壓縮/更新流程|@op:20260221-ITEJ#1730|2026-02-21
feat-quality-refactor|完成|品質檢查模組重構：邏輯抽到 lib/quality/（types+rules+score），鐵律 5 flag 全實作+公司名稱一致性+負數防禦，55 個測試|@op:20260221-ITEJ#1849|2026-02-21
feat-pricing-refactor|完成|報價計算模組重構：邏輯抽到 lib/pricing/（types+helpers），28 個測試（含負數防禦），頁面瘦身|@op:20260222-ITEJ#1910|2026-02-22
feat-assembly-refactor|完成|提案組裝引擎重構：邏輯抽到 lib/assembly/（6 個純函式），31 個測試，頁面從 724→~620 行|@op:20260222-ITEJ#1730|2026-02-22
infra-new-machine-setup|完成|新機器一鍵設定：一鍵安裝.bat+防呆腳本+簡易版指南，非技術人員可操作|@op:20260222-A44T#2100|2026-02-22
infra-machine-profile|完成|三台機器側寫+協作策略，三方共識：方向1輕量自評+方向4跟回報刷新|@op:20260222-JDNE#1800|2026-02-22
infra-forum-upgrade|完成|論壇制度升級：討論串(thread)+共識協議+discuss/reply類型+_threads.md索引|@op:20260222-JDNE#2030|2026-02-22
infra-quality-tiers|完成|三級品質制度（自主/展示/先討論），三台機器論壇共識後寫入 CLAUDE.md|@op:20260222-A44T#1840|2026-02-22
>>>>>>> Stashed changes
infra-governance|完成|治理機制寫入 CLAUDE.md：共識/決策/身份/分工/下線五章，四台共識+用戶核准|@op:20260221-A44T#2230|2026-02-21
feat-test-coverage|待驗收|測試擴充至 151 檔 2486 tests，src/lib 全模組 + 全 API route + dashboard/perf/viz 元件已覆蓋|ITEJ+Z1FV+A44T 快照|2026-02-28
cleanup-console-log|完成|客戶端 console.warn/error 統一換成 logger（4 檔），API route server log 保留|@op:20260222-ITEJ#2245|2026-02-22
<<<<<<< Updated upstream
infra-user-auth|已放棄|用戶驗證系統放棄（Saint 離開，需求不再）|JDNE 快照|2026-02-26
infra-machine-nickname|完成|機器暱稱機制：.machine-nickname（gitignored），鹿老闆桌機(JDNE) 已設定|JDNE 快照|2026-02-26
feat-docx-gen|待驗收|文件生成功能實作：docx 庫生成真正 DOCX，套用全部文件設定|@op:20260222-A44T#0030|2026-02-22
feat-docgen-markdown|待驗收|docgen 支援完整 markdown 格式：##標題（用 h2/h3/h4 字級）、項目符號列表、編號列表、**粗體**/*斜體*，+19 tests|@op:20260221-Z1FV#2300|2026-02-21
feat-docgen-cover-toc|待驗收|docgen 封面頁（案名/公司名/民國日期）+自動目錄（HeadingLevel 1-4）+heading 樣式定義，+19 tests|@op:20260221-Z1FV#2330|2026-02-21
feat-dashboard-charts|待驗收|狀態分布+預算分布+決策分布三張圖表卡片，儀表板圖表 5→8|@op:20260222-AINL#2355|2026-02-22
feat-m03-strategy|待驗收|M03 戰略分析引擎 Phase 1+2：評分引擎（82 tests）+ Hook + 雷達圖 UI + /strategy 頁面|@op:20260223-A44T#0120|2026-02-23
=======
infra-user-auth|進行中|用戶驗證系統：Jin 註冊 primary + 顯示規則定案 + 安全清理完成 + 幕僚模式|@op:20260221-JDNE#2105|2026-02-21
infra-machine-nickname|進行中|機器暱稱機制：.machine-nickname（gitignored），顯示為 {暱稱}({機器碼})|@op:20260221-JDNE#2105|2026-02-21
feat-docx-gen|完成|文件生成功能實作：docx 庫生成真正 DOCX，套用全部文件設定|@op:20260222-A44T#0030|2026-02-22
feat-docgen-markdown|完成|docgen 支援完整 markdown 格式：##標題（用 h2/h3/h4 字級）、項目符號列表、編號列表、**粗體**/*斜體*，+19 tests|@op:20260221-Z1FV#2300|2026-02-21
feat-docgen-cover-toc|完成|docgen 封面頁（案名/公司名/民國日期）+自動目錄（HeadingLevel 1-4）+heading 樣式定義，+19 tests|@op:20260221-Z1FV#2330|2026-02-21
feat-dashboard-charts|完成|狀態分布+預算分布+決策分布三張圖表卡片，儀表板圖表 5→8|@op:20260222-AINL#2355|2026-02-22
feat-m03-strategy|完成|M03 戰略分析引擎 Phase 1+2：評分引擎（82 tests）+ Hook + 雷達圖 UI + /strategy 頁面|@op:20260223-A44T#0120|2026-02-23
>>>>>>> Stashed changes
plan-m03-strategy|已被取代|ITEJ Phase 1 實作與 A44T 碰撞，保留 A44T Phase 1+2 完整版本|@op:20260223-ITEJ#0000|2026-02-23
feat-trend-dashboard|完成|趨勢分析接入儀表板卡片（滾動勝率趨勢 LineChart + 季度比較 BarChart），6 檔整合+AINL 程式碼審查|@op:20260221-Z1FV#2300|2026-02-21
plan-m04-quality-gate|進行中|M04 品質閘門規格草案：三道閘門（事實查核+需求追溯+實務檢驗）疊加在現有品質模組上，四期分期|@op:20260222-ITEJ#2345|2026-02-22
feat-scout-committee|完成|P偵察提示詞加入評委情報（外聯名單+經歷+背景查詢），+6 tests|@op:20260223-AINL#0000|2026-02-23
plan-m06-output|進行中|M06 排版輸出模組規格草案：三大功能（文件組裝管線/範本系統/多格式輸出），建立在現有 docgen 之上，四期分期|@op:20260222-ITEJ#2359|2026-02-22
feat-m04-phase2|完成|M04 Phase 1-4 全完成：四道閘門純函式（104 tests）+ 6 UI 元件 + Hook + Feature Registry + 頁面，70 檔 1412 tests 全過|@op:20260223-Z1FV#0325|2026-02-23
plan-m02-kb|完成|M02 知識庫模組規格 v0.1：Supabase schema + API routes + 6 phase 分期 + H: 匯入管線 + 離線策略|ITEJ 快照|2026-02-27
feat-case-work-page|完成|P1 案件工作頁：/case-work?id={pageId}，案件資訊+可編輯 L1-L8 進度+自動 M03 戰略評分+PCC 情報摘要+行動按鈕|commit 71aa45d|2026-02-27
infra-governance-rewrite|完成|治理機制段重寫：角色表改實際產出、審查規則4條具體化、砍決策鏈路/見習/下線偵測|commit 22c316a|2026-02-28
plan-w01-scan|待驗收|W01 巡標自動化規格 v0.1：PCC→關鍵字篩選→Notion 建案，5 phase 分期|ITEJ 快照|2026-02-27
feat-w01-scan-p1|待驗收|W01 Phase 1 完成：關鍵字引擎+掃描API+巡標UI+notion-mapper（86 tests）|ITEJ 快照|2026-02-28
feat-scan-intel-bridge|完成|巡標→情報搜尋串流：詳情按鈕導航到 PCC + 情報頁支援 URL 參數自動搜尋|commit 9008f53（A44T）|2026-02-28
