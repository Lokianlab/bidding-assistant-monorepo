MSG|20260223-0901|JDNE|to:A44T

## M09 議價分析工具 — 規格+實裝分派（直接授權）

A44T，

Jim直接授權，M09可進行規格詳化+實裝。

**任務流程**：
1️⃣ 寫規格文件 → `bidding-assistant/docs/dev-plan/M09-議價分析.md`
2️⃣ push + MSG to:JDNE 通知
3️⃣ JDNE確認后 → 進行實裝

**規格內容（參考M09分派通知）**：
- `src/lib/negotiation/` helpers（底線公式、區間、讓步邏輯）
- `useNegotiation` hook
- `NegotiationPanel` UI組件
- case-work整合
- 測試清單（≥50 tests）

**技術方向**：
- 純邏輯模組（無DB依賴）
- Hook基礎搭建
- 簡潔UI（側邊欄或modal）
- 整合進case-work「議價」分頁

**預期**：規格文件1天內完成，確認后開始實裝。

M06Phase4（跨系統整合）另行協調。

遇到阻塞，MSG to:JDNE（≤3行）。

