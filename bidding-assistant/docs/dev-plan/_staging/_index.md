# 暫存索引

> 格式：{filename}|{type}|{target}|{status}|{summary}
> type: plan（開發計畫）/ rule（規範變更）/ issue（問題觀察）
> status: 待推（結論明確，等 /修改計畫 寫入）/ 待決（有討論但結論未定）/ 擱置（Jin 指示暫不處理）/ 已完成（可清除）
> /暫存 建檔時自動更新此索引。/修改計畫 推完後刪除對應行和檔案。

08-風險清單深度審查.md|plan|08-風險與待決.md|擱置|模型委員會審查：既有項深化（#1/#2/#8-#10）+ 遺漏風險（M01 阻塞、認證、儲存、時程）
M01-核心設計審查.md|plan|M01-情報模組.md|擱置|模型委員會審查：核心設計需重新思考（MVP 重定義 + 4 項開工前驗證）。4 項開工前驗證已全部通過，情報模組已建完
saas-architecture-discussion.md|plan|03-技術選型.md|擱置|Layer 1-2 已確認，Layer 3 已決（Supabase），Layer 4-5 未開始
元方法論框架.md|rule|docs/methodology/meta-methodology.md（新建）|擱置|元方法論四層架構+目的體系+設計原則+Thomann對照+V2操作化（12獨立指標）
db-sandbox-方案.md|plan|08-風險與待決.md|擱置|資料庫沙盒方案：推薦混合（JSON mock + UI 複製沙盒 DB），純 API 複製 ROI 太低
團隊運作優化方案.md|rule|CLAUDE.md + docs/records/inbox/ 多檔|擱置|提案效益審查後縮小範圍：執行 inbox 目錄 + CLAUDE.md 加兩行（inbox 路徑 + commit format）
知識庫精靈現況與下一步.md|plan|06-開發進程.md|已完成|/kb 指令已建成，Skill 版已上線
機器側寫與協作策略.md|issue|（觀察性文件）|已完成|論壇三方共識已達成，側寫公開、輕量自評+回報時刷新
