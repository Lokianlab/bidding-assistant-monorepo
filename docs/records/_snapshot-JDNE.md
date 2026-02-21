SNAPSHOT|20260222-1800|JDNE
[x] infra-record-layer|記錄層設計|@op:20260219-JDNE#1800
[x] plan-migration|operation-log.md 遷移|@op:20260219-JDNE#1830
[x] infra-staging-index|暫存索引機制|@op:20260219-JDNE#2000
[x] infra-hooks|PreCompact + Stop + pre-push hooks|@op:20260221-JDNE#0900
[x] feat-summary-cmd|/回報 指令（原/小結，改為工作報告）|@op:20260221-JDNE#1700
[x] cleanup-index|主題索引清理|@op:20260219-JDNE#0930
[x] infra-snapshot-rules|快照時間完備原則|@op:20260219-JDNE#1237
[~] plan-discord-bot|Discord Bot 架構|放棄：改為 SaaS 網頁，見 plan-saas-pivot
[ ] plan-update-devplan|更新 v4.0 開發計畫|ITEJ 已推 6 條任務線，暫存區剩 6 份待決（含側寫）
[v] plan-build-pcc-mcp|建 PCC MCP server|程式碼+安裝+建置完成，待用戶驗收
[ ] plan-build-notion-mcp|建 Notion MCP server|內建 Notion MCP 夠用，暫緩到多 AI 協作階段
[?] plan-saas-pivot|SaaS 產品方向|改為自適應網頁 SaaS。知識庫精靈已有 prompt（v2.0），需聊天介面+認證+多租戶
[?] plan-saas-storage|知識庫儲存方案|Notion vs Supabase 未決，Layer 3 討論中斷
[v] plan-conclusion-layer|結論層設計|ITEJ 已實作（infra-staging-upgrade），待用戶驗收
[v] infra-claude-md-modular|CLAUDE.md 拆分|記錄格式搬到 .claude/rules/，CLAUDE.md 479→376 行，待用戶驗收
[v] infra-methodology-v2|方法論 v2 系統整合|全部落地：CLAUDE.md 精簡 + rules + Skill + 獎懲回饋 + 正負向強化指令 + /順便說一下 溝通通道，待用戶驗收
[v] method-observation-capture|AI觀察捕捉框架|v2 系統已定義 obs- 前綴約定，待用戶驗收
[ ] plan-plugin-inventory|插件盤點|暫存檔已建，待推入技術選型文件
[v] infra-meta-methodology|元方法論框架建構|機器可做的評估全部完成（P1-P5逐檔+系統交叉比對+效度自證），待用戶驗收
[v] feat-pcc-web|評委交叉分析 hook + UI + 頁面整合|純函式+hook+UI+跨tab導航，M01 Phase 4 完成，待用戶驗收
[?] infra-backup-mechanism|備份/回復安全節點|用戶提出，範圍待釐清（git tag？資料庫 snapshot？設定匯出？）
[?] infra-cross-machine-consult|機器間互相諮詢機制|ITEJ 已建論壇機制（forum/），可能已解決。待用戶驗收論壇後確認
[v] infra-new-machine-setup|新機器加入流程自動化|安裝腳本+互動 prompt+.mcp.json.example+論壇協調完成，A44T/ITEJ 已回覆，待用戶驗收
[?] infra-machine-profile|三台機器側寫與協作策略|暫存檔已建（issue 待決），待跨機器討論
