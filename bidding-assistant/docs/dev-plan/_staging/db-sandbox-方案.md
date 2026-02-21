---
type: plan
target: 08-風險與待決.md
status: 待決
created: 2026-02-22
author: A44T
---

# 資料庫沙盒方案

## 背景

CLAUDE.md 規定「可讀不可寫原始資料庫，實驗用沙盒」，但具體沙盒方案未定。

## 研究結果

### Notion API 能力

- **沒有一鍵複製資料庫的 API**
- 要用 API 做等效操作，需要自己組合：取得 schema → 建新 DB → query 所有 pages → 逐筆在新 DB 建 page
- 限制：rate limit（平均 3 req/s）、relation/rollup 無法完美複製、系統欄位（created_time 等）不可寫入
- 本專案 22 個欄位大部分是基本型別，schema 複製可行；200 筆資料約需 70 秒

### 四個方案比較

| 方案 | 開發成本 | 複製完整度 | 安全性 | 自動化 |
|------|---------|-----------|--------|--------|
| A: 純 API 複製 | 高（2-3天） | 中 | 高 | 可 |
| B: UI 手動複製 | 零 | 高 | 高 | 不可 |
| C: JSON Mock | 中（半天） | 低（靜態快照） | 最高 | 可 |
| D: 混合（B+C） | 中（半天） | 高 | 最高 | 部分 |

### 推薦：方案 D（混合）

- **日常開發和單元測試**：JSON mock（離線、快速、不受 rate limit 影響）
- **整合測試**：Notion UI 複製的沙盒 DB，切環境變數即可
- **正式環境**：原始 DB

切換方式：`.env.local` 加 `NOTION_MODE`（mock / sandbox / live）

### 要做的事

1. 寫匯出腳本（`scripts/export-notion-data.ts`）：讀所有 pages 存 JSON
2. API route 加 mock 模式：讀 `NOTION_MODE`，mock 時從 JSON 讀
3. Notion UI 複製一個沙盒 DB，ID 配在 `.env.sandbox`
4. `.env.example` 加說明

### 不做純 API 複製的理由

- ROI 太低：花 2-3 天，relation/rollup 還複製不完美
- 沒有現成 npm 套件做「Notion 資料庫複製」
- 資料庫 schema 穩定後不常改，手動複製頻率低
