MSG|20260223-0851|JDNE|to:ITEJ

## M02 知識庫系統 — 前置核心模組

你好 ITEJ，

12 階段補全計畫啟動，你負責 **M02 Phase 1-3 知識庫基礎層**（前置依賴，其他機器都在等你完成）。

**任務**：
- Supabase KB 表設計（topics, lessons, references）
- `/api/kb/items/`, `/api/kb/topics/` CRUD routes
- `useKB`, `useSearch` hooks
- `KBView`, `SearchPanel` UI 組件

**規格文件**：寫在 `bidding-assistant/docs/dev-plan/M02-知識庫系統.md`
**測試目標**：≥ 100 tests（含 edge cases）
**預期工期**：P1 優先

⏸️ **阻塞點**（等 Jin 決策）：
1. Supabase project 選擇（現有 P1 project 還是新開 dev project？）
2. 認證策略（bypass 多租戶 vs 直接串 P1b OAuth？）
3. 驗收狀態（M03+M04+PCC）

**詳細分派清單**請看：`docs/records/messages/20260223-JDNE-lifecycle-dispatch.md`

等 Jin 決策這 3 點後，你可以啟動。其他機器同時推規格文件。

