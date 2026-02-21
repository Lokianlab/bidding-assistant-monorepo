# 暫存索引

> 格式：{filename}|{type}|{target}|{status}|{summary}
> type: plan（開發計畫）/ rule（規範變更）/ issue（問題觀察）
> status: 待推（結論明確，等 /修改計畫 寫入）/ 待決（有討論但結論未定）
> /暫存 建檔時自動更新此索引。/修改計畫 推完後刪除對應行和檔案。

06-開發進程與優先序.md|plan|06-開發進程.md|待推|四層路線 + PCC MCP 併入 Layer 0
08-風險清單深度審查.md|plan|08-風險與待決.md|待決|模型委員會審查：既有項深化（#1/#2/#8-#10）+ 遺漏風險（M01 阻塞、認證、儲存、時程）
A01-PCC-API影響分析.md|plan|06-開發路線.md|待推|收入公式衝擊 + 戰略官自動產出情報
A02-分析流程深度審查.md|plan|A02-投標廠商分析流程.md|待推|模型委員會審查：教訓根因分類 + 流程檢查點 + 報告使用指引 + 降級策略
M01-核心設計審查.md|plan|M01-情報模組.md|待決|模型委員會審查：核心設計需重新思考（MVP 重定義 + 4 項開工前驗證）
M07-SmugMug-MCP規格.md|plan|新增 M07|待推|SmugMug MCP 規格 + 7 個工具
saas-architecture-discussion.md|plan|03-技術選型.md|待決|知識庫儲存方案未定（Notion vs Supabase），Layer 3 討論中斷
知識庫精靈現況與下一步.md|plan|06-開發進程.md|待決|T1 prompt v2.0 已就緒，缺執行環境。近期可做 Skill 版，中期待儲存方案定案
方法論完備性盤點.md|issue|docs/methodology/（多份檔案）|已關閉|已被方法論 v2 系統取代（4 套方法論覆蓋 25/26 情境）
元方法論框架.md|rule|docs/methodology/meta-methodology.md（新建）|待決|元方法論四層架構+目的體系（效率為終極標準）+設計原則+Thomann對照+V2操作化（12獨立指標），待用戶審定
skill-system-v2.md|rule|CLAUDE.md, .claude/commands/*, .claude/rules/scoring.md, .claude/rules/methodology-checklists.md|待推|Skill 重構 + 計分板 + 獎懲回饋機制（自動/手動混合信號、Constitutional AI 自我批評、迭代上限）
claude-md-simplify-v2.md|rule|CLAUDE.md|待推|CLAUDE.md 第二輪精簡 377→~250 行：合併同步段落、壓縮流程、方法論改寫、MEMORY 規則壓縮
