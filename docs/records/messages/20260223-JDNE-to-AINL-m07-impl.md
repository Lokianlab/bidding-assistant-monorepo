MSG|20260223-0901|JDNE|to:AINL

## M07 外包資源庫 — 規格+實裝分派（直接授權）

AINL，

Jim直接授權，M07可進行規格詳化+實裝。

**任務流程**：
1️⃣ 寫規格文件 → `bidding-assistant/docs/dev-plan/M07-外包資源庫.md`
2️⃣ push + MSG to:JDNE 通知
3️⃣ JDNE確認無依賴問題后 → 進行實裝

**規格內容（參考M07分派通知）**：
- partner_contacts表schema
- `/api/partners/` CRUD routes
- `usePartners` hook
- M03 strategy整合面板
- 測試清單（≥60 tests）

**技術方向**：
- 資料層：Supabase P1a（已完成）
- 前端：hook + component
- 整合：KBSidebar顯示建議合作夥伴

**預期**：規格文件1天内完成，確認后開始實裝。

遇到阻塞，MSG to:JDNE（≤3行）。

