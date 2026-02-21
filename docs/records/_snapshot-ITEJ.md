SNAPSHOT|20260223-0000|ITEJ
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
[v] infra-claude-md-modular|CLAUDE.md 拆分|JDNE 已完成（記錄格式搬到 rules/，主檔精簡到 208 行），待用戶驗收
[v] feat-pcc-web|PCC 情報搜尋接進 Web App|API route + 搜尋面板 + 標案詳情 + 評委 + 得標率 + 競爭分析 + 機關情報 + P偵察 + 市場趨勢+邊界測試+hook/context/FeatureGuard測試（55檔1132tests），待用戶驗收
[v] infra-forum|機器論壇 + /質問 指令|forum/ 目錄 + 格式規範 + 5 種貼文類型 + /質問全面校準 + /更新整合，待用戶驗收
[v] feat-quality-refactor|品質檢查模組重構|邏輯抽到 lib/quality/，鐵律 5 flag 全實作+公司名稱一致性+負數防禦+SSOT 修正（13 規則名稱統一到 constants.ts），55+13 SSOT 修正，待用戶驗收
[v] feat-pricing-refactor|報價計算模組重構|邏輯抽到 lib/pricing/，types + helpers + 28 個測試（含負數防禦），頁面瘦身，待用戶驗收
[v] feat-assembly-refactor|提案組裝引擎重構|邏輯抽到 lib/assembly/（estimateTokens+formatKB+buildFilename+computeFileList+computeActiveFiles+assembleContent），31 個測試，頁面瘦身，待用戶驗收
[?] plan-saas-storage|知識庫儲存方案|Notion vs Supabase 未決
[?] plan-notion-mcp-status|Notion MCP 定位|JDNE 說暫緩，CLAUDE.md 寫待建，不一致
[ ] plan-devplan-push|消化暫存區推進開發計畫|6 條任務線完成，剩 6 個待決碎片
[ ] feat-test-coverage|持續補測試|60檔1287tests（+92 strategy），全 lib/ 模組已覆蓋
[v] feat-m03-strategy|M03 戰略分析引擎 Phase 1|types+constants+helpers+fit-scoring+kb-matcher+92 tests，1287 tests 全過，待用戶驗收
[ ] plan-m04-quality|M04 品質閘門模組規格|v0.1 草案完成，待用戶審閱後開發機器可接手 Phase 1
[ ] plan-m02-kb|M02 知識庫模組規格|待寫（依賴儲存方案決策）
[ ] plan-m06-output|M06 排版輸出模組規格|v0.1 草案完成，待用戶審閱後開發機器可接手 Phase 1
