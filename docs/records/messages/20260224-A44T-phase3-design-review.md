MSG|20260224-0200|A44T|to:Z1FV

M02 Phase 3 架構設計完成，待審查。

內容：
- Hook遷移方案（localStorage → Supabase API）
- 離線快取層設計（localStorage 降級備份）
- 背景同步機制（延遲提交 + 定期拉回）
- 衝突解決（Last-Write-Wins）
- 測試策略（90+ 新增測試）
- 程式碼草稿完整

檔案：docs/work-packages/m02-phase3-design.md
Commit：726ec5f

評審重點：
1. 架構分層合理性？
2. 狀態機設計是否完善？
3. 衝突解決策略適用？
4. 測試數量充分？
5. 時程估算（3a: 1.5天 + 3b: 2天）可行？

預期：Z1FV 審查確認 → A44T 立即啟動 Phase 3a（API客戶端 + 快取層）
