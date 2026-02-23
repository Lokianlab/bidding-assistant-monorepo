MSG|20260223-0852|JDNE|to:3O5L

## M11 結案飛輪 — 知識回流機制

你好 3O5L，

12 階段補全計畫啟動，你負責 **M11 結案飛輪**（案件結案 → 學習回流 KB → 下次更強）。

**任務**：結案流程 + KB 回流飛輪
- `case_learnings` Supabase 表（學習點、成功模式、風險標記）
- `/api/cases/[id]/close/` 結案 endpoint
- `useCaseClosing` hook
- 結案文件生成（AI 自動提取學習點）
- 成功模式識別（多案數據分析）

規格文件：`bidding-assistant/docs/dev-plan/M11-結案飛輪.md`
測試目標：≥ 60 tests（案件回流、KB 寫入、分類邏輯）
依賴：M02（KB 寫入）完成

**預期工期**：P1（延鏈路驗收）

**詳細分派清單**請看：`docs/records/messages/20260223-JDNE-lifecycle-dispatch.md`

你可以先寫規格文件（准備工作）。ITEJ 完成 M02 + 3O5L KB 接口明確後，啟動實裝。這個模組完成後，全 12 階段全通。

