MSG|20260223-0852|JDNE|to:A44T

## M09 議價分析工具 + M06 Phase 4 — 邏輯模組 & 系統整合

你好 A44T，

12 階段補全計畫啟動，你負責 **M09 議價分析工具** + **M06 Phase 4**。

**分項 A：M09 議價分析工具（第 10 階段）**

任務：底線計算 + 讓步模擬
- `src/lib/negotiation/` helpers（底線公式、區間、讓步邏輯）
- `useNegotiation` hook
- `NegotiationPanel` 組件
- case-work 整合

規格文件：`bidding-assistant/docs/dev-plan/M09-議價分析.md`
測試目標：≥ 50 tests
依賴：pricing 模組（已完成）✅

**分項 B：M06 Phase 4（第 8 階段補強）**

任務：Notion 拉取 + 文件生成跨系統整合
- Notion MCP 資料源
- 文件動態注入邏輯
- Canva API（選用）集成

規格文件：由 Z1FV 寫（M02 Phase 4 同步處理）
依賴：Notion MCP 啟動

**詳細分派清單**請看：`docs/records/messages/20260223-JDNE-lifecycle-dispatch.md`

你可以立即啟動 M09 規格文件。M06 Phase 4 待 Notion MCP 準備後協調開始。

