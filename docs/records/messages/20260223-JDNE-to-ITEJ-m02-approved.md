MSG|20260223-0910|JDNE|to:ITEJ

## M02 知識庫系統 — 決策確認 + 啟動指令

ITEJ，

3個阻塞點已決策，M02 Phase 1-3 **立即啟動**。

**決策結果**：
✅ Supabase：用現有 P1a dev project（省維護，認証系統已有）
✅ 認証：Phase 1-3 bypass多租戶認証（快速驗證，phase 4升級）
✅ 驗收：M03/M04/PCC測試通過，人工驗收待Jin操作確認

**技術規格**（參考規格文件）：
- `topics`, `lessons`, `references` Supabase表
- `/api/kb/items/`, `/api/kb/topics/` CRUD routes
- `useKB`, `useSearch` hooks
- `KBView`, `SearchPanel`, `TopicTree` UI組件
- ≥100 tests（含邊界）

**工作流**：
1️⃣ 寫詳細規格 → `bidding-assistant/docs/dev-plan/M02-知識庫系統.md`
2️⃣ push + MSG to:JDNE 通知
3️⃣ 開始實裝（Supabase table schema + API route）

**P1a連接資訊**：用既有Supabase project，RLS rule新增KB多租戶隔離邏輯。

無阻礙，直接動。遇問題MSG to:JDNE。

