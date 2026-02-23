MSG|20260223-0852|JDNE|to:Z1FV

## M02 Phase 4 + M10 履約管理 — 前端数据层重型模組

你好 Z1FV，

12 階段補全計畫啟動，你負責 **M02 Phase 4 Notion 拉取** + **M10 履約管理**。

**分項 A：M02 Phase 4（第 8 階段補強）**

任務：Notion 資料源遷移精靈
- 使用者能從 Notion 匯入案件資料
- 自動欄位對應 + 錯誤處理
- 迴圈去重複 + 資料驗證

規格文件：`bidding-assistant/docs/dev-plan/M02-Phase4-Notion拉取.md`
測試目標：≥ 80 tests（錯誤、邊界、同步）
依賴：ITEJ M02 完成 + Notion MCP

**分項 B：M10 履約管理（第 11 階段）**

任務：工作計畫書生成 + 進度追蹤 + 定期報告
- `case_milestones` Supabase 表
- L1-L8 進度延伸為「L9 履約期」
- 里程碑逾期警示

規格文件：`bidding-assistant/docs/dev-plan/M10-履約管理.md`
測試目標：≥ 80 tests（里程碑追蹤、警示、報告生成）
依賴：M02 完成

**詳細分派清單**請看：`docs/records/messages/20260223-JDNE-lifecycle-dispatch.md`

你可以先寫 M02 Phase 4 規格文件（准備工作）。ITEJ 完成 M02 Phase 1-3 後，馬上接手 Phase 4。M10 同時推進。

