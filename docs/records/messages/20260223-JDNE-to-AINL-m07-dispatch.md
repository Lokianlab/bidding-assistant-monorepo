MSG|20260223-0852|JDNE|to:AINL

## M07 外包資源庫 — 第 3 階段資源整合

你好 AINL，

12 階段補全計畫啟動，你負責 **M07 外包資源庫**（標案評估時推薦外部夥伴）。

**任務**：
- `partner_contacts` Supabase 表（聯絡人、專業類別、評分、合作歷史）
- `/api/partners/` CRUD routes
- `usePartners` hook
- M03 strategy 頁面集成「建議合作夥伴」側邊欄

**規格文件**：寫在 `bidding-assistant/docs/dev-plan/M07-外包資源庫.md`
**測試目標**：≥ 60 tests（資料有效性、邊界、查詢）
**預期工期**：P1 并行進行

**依賴**：Supabase P1a（已完成），無阻塞 ✅

**詳細分派清單**請看：`docs/records/messages/20260223-JDNE-lifecycle-dispatch.md`

你可以立即啟動規格文件。ITEJ 完成 M02 後，KB 生態建立，你可以擴展合作夥伴知識庫鏈接。

