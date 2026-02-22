SNAPSHOT|20260228-2020|ITEJ|opus-4.6
[x] infra-memory-rules|MEMORY.md 維護規則（含分流表升級）|@op:20260219-ITEJ#0829
[x] method-self-qa|自問自答法|@op:20260219-ITEJ#2130
[x] cleanup-gas-monitor|GAS 監控 + 刪 GitHub Actions|@op:20260219-ITEJ#2100
[x] infra-collision-handling|碰撞處理策略|@op:20260219-ITEJ#2200
[x] infra-startup-flows|重啟/壓縮/更新三套流程|@op:20260219-ITEJ#2330
[x] infra-staging-upgrade|/暫存改版+stop hook+issue type|@op:20260219-ITEJ#1324
[x] feat-backlog-cmd|/待辦指令（解決查詢不確定性）|@op:20260219-ITEJ#2231
[x] plan-modify-cmd-redesign|/修改計畫 重寫（搬運→任務線推進器）|@op:20260220-ITEJ#0945
[x] infra-dev-map|全專案開發地圖 + /地圖指令 + CLAUDE.md 更新|@op:20260220-ITEJ#1100
[x] infra-hooks|簡化 pre-compact hook（砍快照提醒）|回報 ITEJ-0003
[x] feat-kb-skill-fix|/kb 精靈 00C/00D 錨點+最後更新欄位修正|回報 ITEJ-0004
[x] cleanup-console-log|客戶端 console→logger 清理（4 檔）|@op:20260222-ITEJ#2245
[~] feat-m03-strategy|M03 戰略分析引擎 Phase 1 實作|放棄：ITEJ 實作與 A44T Phase 1+2 碰撞，保留 A44T 版本（@op:20260223-ITEJ#0000）
[x] infra-methodology-owned|方法論優化落地：閉環驗證+改動前驗證|Jin批准methodology-ownership後執行：closed-loop.md加快速入口捷徑，methodology-03.md加掃描順序建議（0224）
[x] infra-decision-making|decision-making 規則落地|Jin 批准 5 行版（0222-1322），CLAUDE.md 共識機制段+forum-format.md 共識達成條件 同步更新（0224）
[x] infra-all-members-upgrade|all-members-upgrade 落地|Jin 指示全員升正式成員（0223），CLAUDE.md 機器身份段加現役正式成員清單（0224，接手 JDNE 指派）
[x] fix-settings-json|settings.json matcher 格式修正|兩個專案目錄都修正（cc程式 + cc程式-可刪除），Unicode 編碼差異導致後者 bash 不可見（0224）
[x] infra-itej-role-upgrade|ITEJ 角色升級：前置標準定義+主動找缺口+論壇轉換條件|Jin 批准，machine-roles.md + 去論壇看看.md 同步更新（0224）
[v] infra-claude-md-modular|CLAUDE.md 拆分|JDNE 已完成（記錄格式搬到 rules/，主檔精簡到 208 行），待用戶驗收
[v] feat-pcc-web|PCC 情報搜尋接進 Web App|API route + 搜尋面板 + 標案詳情 + 評委 + 得標率 + 競爭分析 + 機關情報 + P偵察 + 市場趨勢+邊界測試+hook/context/FeatureGuard測試（55檔1132tests），驗收說明已發（0224論壇0200帖），待用戶驗收
[~] infra-forum|機器論壇|廢除：Jin 決定改為角色分工鏈（0224），41檔 -4212行，CLAUDE.md 治理段全面改寫
[v] feat-quality-refactor|品質檢查模組重構|邏輯抽到 lib/quality/，鐵律 5 flag 全實作+公司名稱一致性+負數防禦+SSOT 修正（13 規則名稱統一到 constants.ts），55+13 SSOT 修正，待用戶驗收
[v] feat-pricing-refactor|報價計算模組重構|邏輯抽到 lib/pricing/，types + helpers + 28 個測試（含負數防禦），頁面瘦身，待用戶驗收
[v] feat-assembly-refactor|提案組裝引擎重構|邏輯抽到 lib/assembly/（estimateTokens+formatKB+buildFilename+computeFileList+computeActiveFiles+assembleContent），31 個測試，頁面瘦身，待用戶驗收
[x] plan-saas-storage|知識庫儲存方案|已決（0226 Jin 直接指示）：Notion（標案追蹤）+ Supabase（KB + SaaS 認證）+ Web App
[x] plan-notion-mcp-status|Notion MCP 定位|已解決：暫緩（內建版夠用），dev-map 已一致
[ ] plan-devplan-push|消化暫存區推進開發計畫|6 條任務線完成，剩 6 個待決碎片
[v] feat-test-coverage|持續補測試|100檔1950tests（本輪+530 tests：API route 全覆蓋+output+document-templates+pricing+card-layout+TS 修正+unused import 清理），src/lib 全模組已有測試，已飽和
[v] plan-m02-kb|M02 知識庫模組規格|v0.1 草案完成（0227 ITEJ），Supabase schema+API routes+6 phase 實作分期+匯入管線+離線策略+跨模組整合，待用戶審閱
[v] plan-w01-scan|W01 巡標自動化規格|v0.1 草案完成（0227 ITEJ），P0 最高優先，PCC→關鍵字篩選→Notion 建案，5 phase 分期，待用戶審閱
[v] feat-w01-scan-p1|W01 巡標 Phase 1 完成|關鍵字引擎+掃描API+巡標UI頁面（types+constants+engine+route+useScanResults+TenderCard+ScanDashboard+page，62 tests），Phase 2 需 Notion token/DB ID
[x] review-a44t-case-work|A44T feat-case-work-page 審查|PASS，752行，SSOT+型別+hydration+跨模組整合全合規
[v] feat-w01-scan-notion-mapper|W01 Phase 2 準備：notion-mapper|PCC→Notion 欄位映射，11 tests，待 Notion token/DB ID 才能接 Phase 2
[x] review-z1fv-test-viz|Z1FV test-viz-components 審查|PASS，79 tests，8 個視覺化元件，mock 策略+斷言品質合格
[x] review-z1fv-test-dash-perf|Z1FV test-dashboard-perf-components 審查|PASS，109 tests，9 個元件，斷言品質+邊界覆蓋合格
[x] fix-entry-editors-timeout|EntryEditors 首個 test timeout 修復|動態 import 冷啟動加大 timeout 至 15s
[ ] plan-m04-quality|M04 品質閘門模組規格|v0.1 草案完成，待用戶審閱後開發機器可接手 Phase 1
[ ] plan-m06-output|M06 排版輸出模組規格|v0.1 草案完成，待用戶審閱後開發機器可接手 Phase 1
