# 暫存索引

> 格式：{filename}|{type}|{target}|{status}|{summary}
> type: plan（開發計畫）/ rule（規範變更）/ issue（問題觀察）
> status: 待推（結論明確，等 /修改計畫 寫入）/ 待決（有討論但結論未定）/ 擱置（永久凍結，有空再處理）
> /暫存 建檔時自動更新此索引。/修改計畫 推完後刪除對應行和檔案。

08-風險清單深度審查.md|plan|08-風險與待決.md|擱置|模型委員會審查：既有項深化（#1/#2/#8-#10）+ 遺漏風險（M01 阻塞、認證、儲存、時程）
M01-核心設計審查.md|plan|M01-情報模組.md|擱置|模型委員會審查：核心設計需重新思考（MVP 重定義 + 4 項開工前驗證）
saas-architecture-discussion.md|plan|03-技術選型.md|擱置|知識庫儲存方案未定（Notion vs Supabase），Layer 3 討論中斷
知識庫精靈現況與下一步.md|plan|06-開發進程.md|擱置|T1 prompt v2.0 已就緒，缺執行環境。近期可做 Skill 版，中期待儲存方案定案
元方法論框架.md|rule|docs/methodology/meta-methodology.md（新建）|擱置|元方法論四層架構+目的體系（效率為終極標準）+設計原則+Thomann對照+V2操作化（12獨立指標），待用戶審定。高元方法論部分已分離→docs/高元方法論.md
db-sandbox-方案.md|plan|08-風險與待決.md|擱置|資料庫沙盒方案：推薦混合（JSON mock + UI 複製沙盒 DB），純 API 複製 ROI 太低
機器側寫與協作策略.md|issue|（觀察性文件）|擱置|三機側寫+三方共識（方向1輕量自評+方向4回報時刷新），側寫是觀察不是規定
團隊運作優化方案.md|rule|CLAUDE.md + docs/records/inbox/ 多檔|擱置|提案效益審查後縮小範圍：執行 inbox 目錄 + CLAUDE.md 加兩行（inbox 路徑 + commit format）。SOP-01 已建立。
