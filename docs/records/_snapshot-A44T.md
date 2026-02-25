# 快照 | A44T | 2026-02-25 06:52

## 第一階段開發手冊（31 項）— 全部完成

### [x] D 系統基礎 + A 情報 + B 一鍵建案 + C 知識庫（31/31）

- 123/123 測試全過（intelligence helpers 49 + case-setup helpers 29 + win-assessment 45）
- npm run build 成功
- TypeScript 零新增錯誤
- commit 7bdea67 推送至 main

### [x] 規範更新

- CLAUDE.md 新增模型切換規則（0225 Jin 指示）
  - 預設 Sonnet，Opus 深度推理，Haiku 簡單任務
  - **新增**：無法切換時 /clear 重啟是有效做法

---

## 待完成（可自主）

### [x] Perplexity 第四輪提示詞 — 底價推估與報價策略

- 4 輪提示詞全部完成，31 個測試全過，commit 8142f49 推送

---

## 待 Jin 操作（不阻塞開發）

| # | 項目 | Jin 要做什麼 |
|---|------|------------|
| J1 | GOOGLE_SCAFFOLD_FOLDER_ID | Drive 找「BZ. 製標鷹架」folder ID |
| J2 | GOOGLE_KB_FOLDER_IDS | 指定要索引哪些 Drive 資料夾 |
| J3 | Cloudflare Tunnel | 電腦安裝 cloudflared + 域名 |
| J4 | Supabase migration | Dashboard 執行 002-intelligence-mvp.sql |

---

_Updated: 2026-02-25 06:52 by A44T_
**狀態**：第一階段完成，下一步 Perplexity 第三輪提示詞
