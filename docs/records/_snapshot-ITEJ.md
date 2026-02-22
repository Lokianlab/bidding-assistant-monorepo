SNAPSHOT|20260302-0100|ITEJ|opus-4.6
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
[x] infra-methodology-owned|方法論優化落地：閉環驗證+改動前驗證|Jin批准methodology-ownership後執行（0224）
[x] infra-decision-making|decision-making 規則落地|Jin 批准 5 行版（0222-1322），CLAUDE.md 共識機制段+forum-format.md 共識達成條件 同步更新（0224）
[x] infra-all-members-upgrade|all-members-upgrade 落地|Jin 指示全員升正式成員（0223）
[x] fix-settings-json|settings.json matcher 格式修正|兩個專案目錄都修正（0224）
[x] infra-itej-role-upgrade|ITEJ 角色升級|Jin 批准，machine-roles.md 同步更新（0224）
[x] infra-claude-md-modular|CLAUDE.md 拆分|JDNE 完成，記錄格式搬到 rules/
[x] feat-pcc-web|PCC 情報搜尋接進 Web App|1132 tests，build clean
[~] infra-forum|機器論壇|廢除：Jin 決定改為角色分工鏈（0224），41檔 -4212行
[x] feat-quality-refactor|品質檢查模組重構|lib/quality/，55+13 tests
[x] feat-pricing-refactor|報價計算模組重構|lib/pricing/，28 tests
[x] feat-assembly-refactor|提案組裝引擎重構|lib/assembly/，31 tests
[x] plan-saas-storage|知識庫儲存方案|已決：Notion+Supabase+Web App（0226）
[x] plan-notion-mcp-status|Notion MCP 定位|暫緩（內建版夠用）
[?] plan-devplan-push|消化暫存區推進開發計畫|6 條任務線完成，剩 6 個待決碎片，等 Jin 裁決
[x] feat-test-coverage|持續補測試|182檔 2921 tests，CardPickerDialog+DashboardGrid+orchestrateAccept+lint cleanup
[x] plan-m02-kb|M02 知識庫模組規格|v0.1 草案完成（0227），待用戶審閱
[x] plan-w01-scan|W01 巡標自動化規格|v0.1 草案完成（0227）
[x] feat-w01-scan-p1|W01 巡標 Phase 1|關鍵字引擎+掃描API+巡標UI+notion-mapper，73 tests
[x] review-a44t-case-work|A44T feat-case-work-page 審查|PASS
[x] feat-w01-scan-notion-mapper|W01 Phase 2 準備：notion-mapper|11 tests
[x] review-z1fv-test-viz|Z1FV test-viz-components 審查|PASS，79 tests
[x] review-z1fv-test-dash-perf|Z1FV test-dashboard-perf-components 審查|PASS，109 tests
[x] fix-entry-editors-timeout|EntryEditors timeout 修復|動態 import 冷啟動 timeout 15s
[x] fix-ts-type-errors|修正 6 個測試檔 43 個 TS 型別錯誤|tsc --noEmit 零錯誤
[x] review-ainl-patrol-layerc|AINL Layer C patrol 模組審查|PASS（條件），94 tests，3 issues
[x] review-jdne-scan-exclusion|JDNE 排除記憶模組審查|PASS，18+8 tests
[x] fix-scan-collision-cleanup|scan 建案碰撞清理|3O5L/Z1FV 重複建案 API，revert 後穩定於 CreateCaseDialog 方案
[x] fix-ts-sidebar-dialog|修正 Sidebar children + CreateCaseDialog score 型別錯誤|3 TS errors
[x] review-a44t-scan-exclusion|A44T 建案記憶持久化審查|PASS，23 tests，hydration-safe
[x] review-ainl-patrol-bridge|AINL patrol 型別橋接審查|PASS，16 tests，雙向映射正確
[x] review-3o5l-keyword-manager|3O5L KeywordManager 審查|PASS，10 tests，Settings pattern 正確
[x] review-ainl-patrol-layerb|AINL Layer B Notion/Drive writers 審查|PASS（條件），71 tests，7 issues（1 medium）
[?] plan-m04-quality|M04 品質閘門模組規格|v0.1 草案完成，待 Jin 審閱
[?] plan-m06-output|M06 排版輸出模組規格|v0.1 草案完成，待 Jin 審閱
