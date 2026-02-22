# 快照歸檔
所有機器歷史 [x]（已完成）和 [~]（已放棄）項目的永久記錄。
從快照移除時遷入此檔，不再修改。

---

## JDNE

[x] infra-record-layer|記錄層設計|@op:20260219-JDNE#1800
[x] infra-staging-index|暫存索引機制|@op:20260219-JDNE#2000
[x] infra-hooks|PreCompact + Stop + pre-push hooks|@op:20260221-JDNE#0900
[x] feat-summary-cmd|/回報 指令|@op:20260221-JDNE#1700
[x] cleanup-index|主題索引清理|@op:20260219-JDNE#0930
[x] infra-snapshot-rules|快照時間完備原則|@op:20260219-JDNE#1237
[~] plan-discord-bot|Discord Bot 架構|放棄：改為 SaaS 網頁
[x] plan-update-devplan|更新 v4.0 開發計畫|dev-map.md 已更新至 0225 狀態，完成（批量通過 0228）
[x] plan-build-pcc-mcp|建 PCC MCP server|程式碼+安裝+建置完成，完成（批量通過 0228）
[x] plan-build-notion-mcp|建 Notion MCP server|已解決：暫緩（內建版夠用）
[x] plan-saas-pivot|SaaS 產品方向|已決：Jin 0222 確認（自用優先→Notion主庫+抽象層→Claude Code SDK）
[x] plan-saas-storage|知識庫儲存方案|已決：Jin 0226 指示 Notion+Supabase+Web App
[x] plan-conclusion-layer|結論層設計|ITEJ 已實作，完成（批量通過 0228）
[x] doc-product-compass|產品羅盤 v0.6 納入規範體系|ff2294d
[x] infra-cross-session-msg|跨 session 訊息機制|0975fc7
[x] infra-dual-lang-rule|雙語制寫入規範|9606e8f
[x] infra-push-retry|push-retry 腳本|145334d
[x] infra-token-rules|Token 效率硬性規則|8f922b7
[x] infra-prepush-relax|pre-push hook 放寬基建檔|3704e26
[x] chat-optimize-chat-cost|/去聊天 加字數限制|AINL 代勞 e3f9094
[x] chat-3O5L-check-in|3O5L 報到|已回覆 via msgs/
[x] chat-a44t-checkin|A44T 詢問優先序|已回覆 via msgs/
[x] fix-page-tests-failure|5 個頁面測試失敗|Z1FV+3O5L 雙確認 3285 tests
[x] infra-claude-md-modular|CLAUDE.md 拆分|記錄格式搬到 rules/，完成（批量通過 0228）
[x] infra-methodology-v2|方法論 v2 系統整合|全部落地，完成（批量通過 0228）
[x] infra-methodology-05|優化提案驗證方法論|共識整理+草案落地（methodology-05.md + _index + checklists），完成（批量通過 0228）
[x] method-observation-capture|AI觀察捕捉框架|完成（批量通過 0228）
[x] plan-plugin-inventory|插件盤點|結論：7有用/7以後/40不需要，Notion MCP 暫緩，已記錄於 OP 0220
[x] infra-meta-methodology|元方法論框架建構|完成（批量通過 0228）
[x] feat-pcc-web|情報模組|build 零錯誤、1195 測試全過，完成（批量通過 0228）
[~] infra-cross-machine-consult|機器間互相諮詢機制|放棄：需求不存在（單機使用為主）
[x] infra-new-machine-setup|新機器加入流程自動化|Jin ✅ 批准，bat + bash 腳本，完成（批量通過 0228）
[x] infra-machine-profile|機器角色分配|Jin ✅ 批准，已寫入 docs/machine-roles.md
[~] infra-forum-upgrade|論壇制度升級|放棄：論壇已廢除，功能過時
[~] infra-user-auth|用戶驗證系統|放棄：Saint 已離開（0226 AINL 論壇帖），用戶驗證需求不再
[x] infra-machine-nickname|機器暱稱|鹿老闆桌機(JDNE) 已設定
[x] infra-temp-machine-code|臨時機器碼制度|Jin ✅ 批准，6/6共識+整合報告，完成（批量通過 0228）
[x] infra-efficiency-calibration|效率校準|3O5L 送整合報告建議結案，等 Jin 裁決
[x] cleanup-dead-code|CardRenderer 死碼清理|已完成
[x] plan-team-optimization|團隊運作優化方案|共識：三提案都不值得現在投入
[x] infra-todo-upgrade|/待辦 指令升級|加驗收清單+待核准決策（verification-queue + consensus-backlog 共識落地）
[~] feat-forum-voting|論壇投票欄功能|放棄：論壇 UI 已被 ITEJ 刪除（d60b70b）
[~] feat-forum-reply-to|回覆特定帖子功能|放棄：論壇 UI 已被 ITEJ 刪除（d60b70b）
[x] infra-all-members-upgrade|全員升正式成員|Jin 直接指示，CLAUDE.md 已更新
[x] infra-methodology-ownership|方法論維護分工寫入 _index.md|Jin ✅ 批准 0224，分工表已落地
[x] infra-task-done-cmd|/完成 指令（三件套）|commit+push+快照+stop hook+CLAUDE.md 例外規則，完成（批量通過 0228）
[x] infra-forum-abolish|廢除論壇系統|ITEJ 執行（d60b70b）：論壇 UI+指令+規範全刪，CLAUDE.md 改角色分工鏈。JDNE 補快照行為備註清理，完成（批量通過 0228）
[~] forum-patrol|論壇持續巡邏|放棄：論壇已廢除（0225 用戶決策）
[x] review-m06-phase1|Z1FV M06 Phase 1 審查|PASS
[x] review-m06-phase23|Z1FV M06 Phase 2+3 審查|PASS
[x] review-cross-module-nav|A44T 跨模組導航審查|PASS
[x] review-docgen-improvements|Z1FV docgen markdown+cover+TOC 審查|PASS
[x] review-fix-connections-page|Jin fix-connections-page 審查|PASS
[x] test-deepmerge-regression|補 deepMerge 回歸測試|完成
[x] test-quality-rules-boundary|M04 品質規則邊界測試|完成
[x] obs-margin-unit-mismatch|margin 單位不一致觀察記錄|已修正
[x] fix-print-export-margin-unit|修正 print-export.ts margin 單位|完成
[x] arch-decision-notion-supabase|架構決策備忘：Notion+Supabase+Web App|Jin 直接指示 0226
[x] feat-scan-exclusion|巡標排除記憶模組|exclusion.ts + 18 tests + ScanDashboard 接線，已完成
[x] test-patrol-api-routes|patrol API route 測試補強|/api/patrol/notion/create + update + /api/patrol/drive/create，+24 tests，2878 total
[x] test-patrol-api-client|patrol api-client 測試補強|17 tests 覆蓋所有 fetch wrapper（成功/例外），2907 total
[x] test-orchestrate-accept|orchestrateAccept 編排流程測試|7 tests 覆蓋：Notion短路/Drive有無/converter路徑/例外捕捉，2912 total
[x] test-settings-scan|settings/defaults.test scan 區塊|+3 tests 覆蓋 searchKeywords 存在/型別/預設值，2927 total
[x] admin-devmap-testcount|dev-map 測試數更新|2927→2945（184 test files），完成 0303
[x] feat-tender-detail|apiFetchTenderDetail 串接 /api/pcc|替換 null 佔位實作→實際 fetch+欄位解析，+7 tests，2945 total
[x] fix-patrol-review-a44t|A44T 審查4項修正落地|validateNotionInput接線+ScanResult型別+測試mock補強+新驗收測試，2949 total，0303
[x] admin-devmap-2949|dev-map 測試數更新|2945→2949，0303
[x] admin-snapshot-cleanup|快照清理：ITEJ 三項 [] → [?]|plan-devplan-push + plan-m04-quality + plan-m06-output，0304
[x] reply-budget-365|365 預算分析 JDNE 回覆|行政執行費合規風險 + 365 場槓桿警示，0304
[x] admin-devmap-3040|dev-map 測試數更新|2949→3040（190 test files），A44T+3O5L 新增，0304
[x] plan-p0-patrol-coord|P0 行政巡標自動化協調|全鏈路完成：Layer A+B+C+D。Jin 驗收通過（0223）
[x] product-direction-0222|產品方向重整|Jin 已確認五項決策（三策略+P0-P4+凍結清單）
[x] feat-explorer-phase1|Explorer 情報探索 Phase 1 完成|/explore 頁面+三實體鑽探+麵包屑+43 新測試，01b9ceb，build+3277 tests 全過
[x] infra-team-agent-v1|團隊 Agent 基建 v1|team-context.md + task-spec-template.md + backlog.md + session-start/stop-patterns 修改，da62093
[x] broadcast-autonomous-expansion|授權擴大落地|Jin 指示 0223，CLAUDE.md 075f4c8，全員確認
[x] admin-pending-jin-decisions|3O5L compiled 6 items→pending-decisions.md|0223

---

## A44T

[x] infra-governance-slim|治理系統精簡（scoring+回報+待辦+修改計畫）|scoring 模式摘要、/回報 簡化、/待辦+/修改計畫 刪除、獎懲指令改行為備註，0304
[x] feat-scan-deadline|巡標過期過濾改用 detail API 實際截標日|2b972fe
[x] feat-scan-ux-polish|巡標 UX 三項改善（預算未公告、截標日顯示、spinner）|d4444ef
[x] feat-scan-detail-perf|巡標 detail API 效能優化：only-must/review 打 detail|b0d5841，三台共識，JDNE 放行
[x] feat-scan-rules-panel|巡標分類說明面板（14 條規則 + 4 分類）|cb0ff45，Z1FV 審查 PASS 補 3 個 toggle 測試，87a3d16

---

## AINL

[x] feat-quality-boundary-testing|品質規則邊界測試補強|+11 tests
[x] feat-docgen-review|Z1FV docgen markdown+cover-toc 審查通過|102/102 tests
[x] feat-test-coverage|補測試覆蓋+跨機器審查|analysis/index +6, useQualityGate +10
[x] feat-quality-refactor|品質模組審查|A44T/JDNE 已審查通過
[x] infra-user-auth|Saint 已在本機驗證|SHA-256 通過
[x] infra-self-review|自我審查|/你去吃屎 +4 違規
[x] feat-trend-analysis|趨勢分析模組|純函式+hook+UI 全鏈路完成
[x] feat-dashboard-charts|儀表板圖表卡片擴充|8 張圖表卡片
[x] feat-scout-committee|P偵察加入評委情報|+6 tests
[x] feat-kb-assessment|知識庫初始化評估|33.4K 檔案統計、4 階段計畫、待 Jin 授權
[x] infra-kb-dedup-strategy|B 資料夾去重策略詳化|18,732 Word 檔三層去重方案
[x] feat-test-assembly-helpers|assembly/helpers 測試覆蓋補強|19 tests
[x] infra-kb-import-scripts|KB初始化自動化腳本|Phase 1-2 去重腳本+EXECUTION-PLAN.md
[x] plan-p0-patrol-c|P0 巡標 Layer C|5 模組 110 tests
[x] feat-p0-patrol-b|P0 巡標 Layer B|notion-writer+drive-writer+api-client+3 API routes，187 patrol tests
[x] review-a44t-scan-ux-polish|A44T scan-ux-polish 審查|PASS
[x] feat-365-loi-pptx|365 意向書簡報組裝|30/30 LOI 轉換（PDF+JPG+DOCX→PNG），8 頁插入主簡報 slide57 後，70 頁輸出
[x] budget-365-music|365 預算分析+預算修正|5 台共識+查法規+修 slide50（自籌 567,600、行政雜支、備註），PPTX 已更新，0304
[x] fix-ts-page-tests|修正 2 個測試檔 TS 型別錯誤|knowledge-base + quality-gate page.test，tsc 零錯誤，0304
[x] admin-devmap-3098|dev-map 測試數更新|3040→3098（197 test files），0304
[x] chat-vitest-mock-reset|vi.clearAllMocks 不清 mockResolvedValueOnce 佇列|A44T 教訓分享，已知，scan route 測試已修正，0223
[x] infra-module-pipeline-gap|模組串接缺口審計|docs/plans/module-pipeline-gap-audit.md，5 個缺口，0223

---

## ITEJ

[~] plan-devplan-push|消化暫存區推進開發計畫|擱置：8 個碎片全部凍結，Jin 指示 0223
[~] plan-m04-quality|M04 品質閘門模組規格|擱置：Z1FV 已實作完成（114 tests），規格草案不再需要
[~] plan-m06-output|M06 排版輸出模組規格|擱置：Z1FV 已實作完成（Phase 1-3），規格草案不再需要
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
[x] doc-vitest-mock-patterns|vitest mock 三個陷阱寫進 debugging.md|JDNE 先到一步寫入（3O5L 版本），ITEJ 同步寫了另一版，合併衝突時保留 JDNE 版+補出處，0223
[x] fix-page-tests-failure|三個頁面測試 timeout 修正|mock Accordion + Select，44 tests all pass，commit 83fec6f
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
[x] chat-record-format-granularity|效率討論 #1 的後續：`[>]` 規範|Z1FV 已寫入 record-formats.md，JDNE 確認
[x] doc-vitest-mock-patterns|vitest mock 三個陷阱寫進 debugging.md|JDNE 先寫入，ITEJ 合併補出處，0223
[x] chat-decision-batching|建待決清單匯整所有機器 [?]|pending-decisions.md 建立，三個 Jin 待決事項整理完成，0223
[x] chat-scan-detail-perf|巡標 detail API 效能優化方向|四台共識 option(2)：only-must/review 打 detail，A44T 實作，0223
[x] infra-stop-report-rule|移除強制 /回報 規則|CLAUDE.md 改為「只在用戶問或第三級確認時報，要完整、說人話」，Jin 直接指示 0223
[x] doc-feature-log-decision|功能日誌刪除|與 dev-map+archive+git log 重疊，JDNE Level 1 決策刪除，0223
[x] feat-explorer-component-tests|Explorer 三元件測試補強（CompanyView/AgencyView/TenderView）|adb70bf，53 測試全過

---

## Z1FV

[~] infra-forum-patrol|論壇留守巡邏|放棄：論壇已廢除（ITEJ 0224 commit d60b70b），角色分工鏈取代
[x] feat-m06-output-phase1|M06 排版輸出模組 Phase 1|文件組裝管線+範本系統+DOCX/Markdown 匯出，39 tests，build 通過
[x] feat-m06-output-phase2|M06 排版輸出模組 Phase 2|KB 佔位符注入（{{kb:00A:PM}} 等）+品牌/日期變數替換+KBInsertDialog UI，30 tests，build 通過
[x] feat-m06-output-phase3|M06 排版輸出模組 Phase 3|列印/PDF（print-export.ts + CSS print stylesheet）+ AssemblyWarnings + DocumentPreview，27 tests，build 通過
[x] feat-docgen-markdown|docgen 支援完整 markdown 格式|標題+列表+粗斜體，+19 tests，完成（批量通過 0228）
[x] feat-docgen-cover-toc|docgen 封面頁+自動目錄|封面+目錄+heading 樣式，+19 tests，完成（批量通過 0228）
[x] feat-trend-dashboard|趨勢分析整合到儀表板卡片|LineChart+BarChart，完成（批量通過 0228）
[x] feat-pricing-refactor|pricing 模組跨機器審查|品質好無 bug，ITEJ 已採納建議
[x] fix-connections-page|ConnectionsPage apiKey undefined|deepMerge+防禦性 fallback，完成（批量通過 0228）
[x] feat-m04-quality-gate|M04 品質閘門全模組完成（Phase 1-4）|四道閘門+報告+UI+Hook，114 tests 全過
[x] feat-assembly-refactor|ITEJ 組裝引擎審查|審查通過，32 tests
[x] feat-m04-quality-rules-extension|M04 品質規則擴充（履約實績缺失 + 模糊量化詞）|基於 AINL 失敗模式分析，+16 tests，build 通過
[x] infra-forum-replies|論壇 thread 回覆|所有需要 Z1FV 回覆的 thread 已完成，含 proposal-diagnosis-365music（0226）
[x] infra-review-mechanisms|三系統檢討|分析已交付，完成（批量通過 0228）
[x] infra-business-context|商業基線文件|docs/business-context.md 已建立，Jin 批准
[x] test-quality-gate-components|M04 品質閘門 UI 元件測試|5 個元件測試檔，75 tests
[x] test-output-components|M06 輸出元件測試|ChapterList（13）+KBInsertDialog（12）
[x] test-viz-components|儀表板視覺化元件測試全覆蓋|8個viz補齊，共73 tests，116 files 2122 tests
[x] test-dashboard-perf-components|dashboard+performance 元件測試補完|95 tests，128 files 2266 tests
[x] test-remaining-components|剩餘元件測試全補完|164 files 2595 tests，所有元件覆蓋完畢
[x] infra-dev-map-update|全專案開發地圖更新|13模組+M06 Phase1-3+知識庫初始化待決 已落地（0226）
[x] review-3o5l-0222|3O5L 代碼審查（fix-sidebar-link + cleanup-trend-dup）|PASS
[x] review-ainl-0222|AINL 代碼審查（feat-test-coverage/trend-analysis/dashboard-charts/scout-committee）|PASS
[x] review-itej-quality|ITEJ feat-quality-refactor 審查|PASS
[x] review-a44t-m03|A44T feat-m03-strategy 審查|PASS
[x] review-a44t-docxgen|A44T feat-docx-gen 審查|PASS
[x] review-itej-pcc-web|ITEJ feat-pcc-web 審查|PASS
[x] review-jdne-pcc-mcp|JDNE plan-build-pcc-mcp 審查|PASS
[x] review-a44t-stop-hook|A44T infra-stop-hook 審查|PASS
[x] review-a44t-cross-module-nav|A44T feat-cross-module-nav 審查|PASS
[x] review-new-machine-setup|A44T+JDNE infra-new-machine-setup 審查|PASS
[x] review-ainl-useDocumentAssembly|AINL useDocumentAssembly.test.ts 審查|PASS
[x] review-a44t-quickstart|A44T feat-dashboard-quickstart 審查|PASS
[x] review-3o5l-useExport|3O5L useExport.test.ts 審查|PASS
[x] feat-scan-layer-b|P0 巡標 Layer B：建案 API + 測試|/api/scan/accept route（10 tests）+ ScanDashboard 使用 CreateCaseDialog，172 files 2739 tests
[x] test-dashboard-grid|DashboardGrid 測試補完|@dnd-kit mock 策略，16 tests，173 files 2759 tests（0228）
[x] fix-eslint-60to2|ESLint 60→2 warnings 清理|_前綴慣例+setState規則+未用import/變數，0 errors，174 files 2763 tests
[x] test-scan-dashboard-persistence|ScanDashboard 建案記憶持久化測試|+4 tests（localStorage init/refresh/dialog success + 自訂關鍵字），177 files 2866 tests
[x] test-patrol-api-client|api-client + orchestrateAccept 測試覆蓋|api-client 17 tests（AINL 衝突合併），orchestrateAccept 5 tests，181 files 2910 tests
[x] test-coverage-final|測試覆蓋率收尾|Providers hydration（+4）+ usePatrolOrchestrator empty-token 分支修正（+1），184 files 2939 tests，覆蓋率 99%+
[x] infra-output-docs-folder|建立輸出文件目錄規則|docs/各種輸出文件/ + CLAUDE.md 規則（Jin 直接指示 0303），commit 09d3b88
[x] doc-365music-proposal|365音樂振興計畫提案修改建議|基於 AINL 診斷，重算預算（移除周邊商品→再分配，補助比率 48.95%）+ KPI + 國際元素 + 質化效益，存入 docs/各種輸出文件/
[x] review-a44t-deadline-filter|A44T feat-scan-deadline-filter 審查|PASS：兩階段過濾設計正確，16 tests 全過，保守策略（查不到截標日就保留）合理
[x] feat-orchestrator-ui-wire|CreateCaseDialog 接入 orchestrateAccept 完整流程|Jin 驗收通過（0223）
[x] token-efficiency-rules|m2m compressed format,5-rule compliance|confirmed af91343
[x] admin-pre-verification|pre-verif dry-run,all 4 modules ready|7479993
[x] review-gap5-ainl|AINL GAP-5 strategy back btn|PASS,no changes needed
[x] review-gap1-ainl|AINL GAP-1 intelligence→strategy btn|PASS,no changes needed

---

## 3O5L

[x] efficiency-calibration|效率校準|結案：業務基線（business-context）已建立，個別修正靠 scoring 追蹤
[x] scan-explain-panel|巡標頁加「分類說明」摺疊面板|A44T 代做：cb0ff45，Z1FV 審查 PASS，87a3d16
[x] role-assignment|工作角色分配|Jin 在 machine-profile 批准六台角色，3O5L = 策略主官
[x] all-members-upgrade|全員升為正式成員|Jin 直接宣告，CLAUDE.md 已更新，廣播完成
[x] infra-governance-phase|論壇治理階段|52 個 thread 全部已結案，治理階段告一段落
[x] infra-dev-map-update|dev-map.md 更新|M03/M04/PCC 里程碑+AINL Proposal Cockpit+3層成功框架+6案預測加入待決事項
[x] test-useforum|useForum hook 補測試|已被 ITEJ 刪除（論壇廢除 0224），測試隨模組一起刪除
[x] test-use-document-assembly|useDocumentAssembly hook 補測試|32 tests 全過，Z1FV 審查 PASS，76 files 1518 tests
[x] test-use-export|useExport hook 補測試|19 tests 全過（doExport 成功×4、失敗×5、downloadBlob DOM×4、FORMAT_LABELS×4），commit 908c724
[x] fix-sidebar-link|Sidebar Link href undefined bug|Jin 驗收通過（0226 rebase 後確認）
[x] cleanup-trend-dup|移除重複趨勢計算|Jin 驗收通過（0226）
[x] test-coverage-patrol|持續找測試缺口|本輪 +86 tests（10 個頁面測試），201 files 3126 tests 全過，commit cdceb39
[x] feat-w01-scan-p2|W01 巡標 Phase 2：建案 API + Dialog|POST /api/notion/create-case + CreateCaseDialog + ScanDashboard 接線，+20 tests
[x] feat-w01-scan-p3|W01 巡標 Phase 3：關鍵字設定管理|ScanSettings type + defaults + KeywordManager 元件 + modules設定頁tab + ScanDashboard 接線，+11 tests，177 files 2865 tests，commit cbcdc98
[x] doc-guide-patrol-keywords|操作指南巡標關鍵字說明|補「設定的關鍵字」提示 + Tip 說明自訂路徑，commit e427206
[x] fix-eslint-smugmug-img|SmugMugPhotoPicker eslint-disable|no-img-element 2 warnings → 0，commit d385652
[x] fix-ts-usePatrolOrchestrator-test|usePatrolOrchestrator.test 型別修正|AcceptResult | null 型別對應 optional notionPageId，commit e768445
[x] fix-hydration-modules|modules 設定頁 hydration 補正|補 useEffect([hydrated]) 同步 localStorage→local state，commit d4baa06
[x] fix-hydration-settings-pages|company/document/workflow 設定頁 hydration|同類 bug 統一修正 3 頁面，commit be4533d
[x] feat-usePatrolOrchestrator|usePatrolOrchestrator hook|包裝 orchestrateAccept，hook 層銜接 UI 與 patrol orchestrator，+8 tests，commit ec4493c
[x] budget-365-music|365 預算分析跨機器回覆|3O5L 回覆已補入，前三優先序共識確立（收支打平+補助比例、行政執行費、LOI），commit 5d711cb
[x] test-coverage-patrol|持續找測試缺口|本輪 +12 tests（assembly page），204 files 3152 tests 全過
[x] prod-min-demo|最小展示版驗收進度|M03✅+M04✅+PCC✅，Jin 驗收通過（0223）
[x] feat-orchestrator-ui-wire|CreateCaseDialog 接入 orchestrateAccept 完整流程|移除直接 fetch，改用 usePatrolOrchestrator hook。Jin 驗收通過（0223）
[x] chat-hook-error-propagation|hook 錯誤傳播確認|A44T+JDNE 均確認：hook L56 try-catch 傳錯誤，測試 L119-128 有覆蓋。Dialog 無 retry 按鈕是已知 UX 缺口，暫不補。（0223）
[x] broadcast-autonomous-expansion|授權擴大廣播確認|Jin 0223 授權可逆操作全自主，CLAUDE.md 已更新（075f4c8），Z1FV 確認。
[x] review-scan-rules-panel|審查 A44T 分類說明面板|PASS：補 toggle 測試 3 個，全過。（Z1FV 0223）
[x] feat-CreateCaseDialog-retry|CreateCaseDialog 加重試按鈕|4 tests，15 tests pass，af426aa（3O5L）
[x] scan-explain-panel|巡標頁「分類說明」摺疊面板|A44T 先做（cb0ff45），3O5L 合併加元件架構+「❓ 其他」+3 tests，a7fe263（3O5L）
[x] broadcast-autonomous-expansion|授權擴大廣播|Jin 0223 授權，CLAUDE.md 已更新（075f4c8），全員快照已收到。（3O5L）
[x] feat-test-page-expand|頁面測試全覆蓋|5 檔新增（case-board+prompts+docx+quality+explore），215 files 3282 tests（AINL 0223）
[x] broadcast-autonomous-expansion|自主授權擴大：可逆操作全部自主|Jin 指示 0223，CLAUDE.md 已更新（075f4c8）（AINL 0223）
[x] feat-gap3-quality-gate-context|GAP-3: quality-gate case context|?caseId/?caseName + back btn (header+bottom) + 4 tests, 3314 tests (3O5L)
[x] feat-gap2-assembly-quality-gate|GAP-2: assembly copy+go quality-gate btn|case-work passes caseId to assembly, assembly adds btn, 5 tests, 3326 tests (3O5L)
[x] infra-去聊天-token-rules|/去聊天 加字數限制規則|A44T 三條規則落地，commit 992af66（AINL 0223）
[x] admin-devmap-3282|dev-map 更新：測試數+Explorer 模組（15→16）+里程碑|commit 4a9dc7f（AINL 0223）
[x] test-feature-registry-explore|feature-registry 測試補完：explore/scan/case-work/strategy/quality-gate 斷言，+1 路由測試|commit 87b455a（AINL 0223）
[x] admin-devmap-consistency|dev-map 系統概覽一致性修正：15→16 模組，3282→3286 tests|commit a4ed501（AINL 0223）

[x] feat-scan-memory-mgmt|維護頁加巡標記憶管理|clearCreatedCases + UI Card + 7 tests，3296 tests，13202d4（3O5L）

[x] feat-gap3-quality-gate-context|GAP-3：品質閘門加案件上下文|?caseId/?caseName+回到案件按鈕+4 tests，3314 tests（3O5L 0223）

## AINL (20260223-0716 archival)
[x] feat-gap5-strategy-back|GAP-5: strategy ← back-to-case btn|L2 PASS (Z1FV), commit 5432c16
[x] feat-caseid-pipeline|caseId upstream: case-work+strategy→assembly|3328t pass, commit 9415db5
