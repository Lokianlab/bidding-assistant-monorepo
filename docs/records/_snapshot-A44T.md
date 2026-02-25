# 快照 | A44T | 2026-02-26 01:41

## [x] 系統整合重構 — 消除疊床架屋

### 完成項目

- [x] feature-registry 清理：dashboard/prompt-library/quality/docgen/pricing routes:[]，explore/knowledge-cards defaultEnabled:false
- [x] Sidebar 設定區 8→3 項（外部連線/功能與設定/系統維護），Logo 加首頁連結
- [x] 情報中心加第 5 tab 鑽探模式，/explore redirect → /intelligence?tab=explore
- [x] /tools/quality + /tools/docx + /tools/output → redirect 到 quality-gate 對應 tab
- [x] ProjectDetailSheet 底部升級 5 個快速行動按鈕（工作頁/情報/撰寫/品質/Notion）
- [x] settings/modules 加公司資訊 + 輸出格式 tab
- [x] settings/maintenance 新建頁面（操作指南 tab）
- [x] 測試全過（270 檔 4364 tests），build 零錯誤
- [x] commit 8dfe7bd 推送至 main

### 測試修復紀錄

- explore/page.test.tsx：改測 redirect 行為
- intelligence/page.test.tsx：加 ExplorerPage mock，四個 Tab → 五個 Tab
- feature-registry.test.ts：dashboard/prompt-library route 清空，getEnabledFeatures 計數邏輯更新
- FeatureGuard.test.tsx：pricing/quality → quality-gate 路由
- Sidebar.test.tsx：「操作指南」→「功能與設定」
- useFeatureEnabled.test.ts：計數邏輯適應 explore/knowledge-cards defaultEnabled:false
- docx/output/quality page tests：全改測 redirect
- strategy/page.test.tsx：完整重寫（頁面 UI 從表單模式→選擇器+URL 參數模式）

---

## 待 Jin 操作（不阻塞開發）

| # | 項目 | Jin 要做什麼 |
|---|------|------------|
| J1 | GOOGLE_SCAFFOLD_FOLDER_ID | Drive 找「BZ. 製標鷹架」folder ID |
| J2 | GOOGLE_KB_FOLDER_IDS | 指定要索引哪些 Drive 資料夾 |
| J3 | Cloudflare Tunnel | 電腦安裝 cloudflared + 域名 |
| J4 | Supabase migration | Dashboard 執行 002-intelligence-mvp.sql |

---

_Updated: 2026-02-26 01:41 by A44T_
**狀態**：系統整合重構完成。下一步待 Jin 指示（欄位說明需求待確認）。
