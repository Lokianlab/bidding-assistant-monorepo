# Development Plan Summary

> Source: `docs/DEVELOPMENT_PLAN.md` v3.0 (2025-02-17)

## System Positioning

**L1-L8 提示詞系統的指揮中心** — 管理「人 + AI + 工具」的協作流程。

三層分工：
- AI 層: Claude Code / Claude.ai → 依 L1-L8 提示詞產出分析/企劃/報價/策略/講稿
- 美學層: Canva (MCP) → 建議書/簡報排版設計
- 管理層: **本系統 (Web App)** → 案件追蹤、團隊協作、知識累積、績效分析

系統不做: 不調用 AI API、不做排版、不取代人的決策、不取代 Notion（是 Notion 的「專業視圖」）

## Revenue Formula (First Principles)

```
收入 = 得標案件數 × 平均案件金額 × 毛利率
  得標案件數 = 投標案件數 × 得標率
  投標案件數 = 發現的機會數 × 投標決策通過率
```

**每個功能都必須能回答：推動了公式中的哪一項？**

## Five Roles & Pain Points

| 角色 | 核心痛點 | 涉及批次 |
|------|---------|---------|
| 管理者（黃偉誠）| 無得標率/趨勢數據、無法量化企劃效益、利潤未追蹤 | D,F,J |
| 行政（庭瑜）| 手動刷 pcc、手動建案、截標日腦記、溝通進度耗時 | D,E,H |
| 企劃 | AI 啟動慢（15-30 min）、Claude Code 掛無備案、多案混淆、前序文件散落 | D,G,I |
| 設計師 | 找不到【美編製作】標記、不知優先序/截標日 | G |
| 執行組(PM) | 履約格式不統一、成本超支晚發現、現場查 SOP 不便、結案檢討拖延 | J |

## Development Batches (Priority Order)

### Phase 1: 基礎建設
- **A** 開發規範 + 測試框架 → ✅ 已完成 (CLAUDE.md, vitest)
- **B** Logger 基礎建設 → ✅ 已完成 (src/lib/logger/)
- **C** Changelog + Debug Log UI → ✅ 已完成 (changelog.ts, /changelog, /debug-log)

### Phase 2: 核心業務
- **D** 案件進度看板 + prompt 模板庫 → ✅ 已實作 (/case-board, /prompt-library)
- **E** Notion 雙向同步 → ⬜ 未開始 (目前只有唯讀查詢)
- **F** 業績儀表板 → ⚠️ 部分完成 (現有 / 儀表板是早期版本，需對齊 plan 規格)

### Phase 3: 協作支援
- **G** 交付物管理 (docx/pptx 歸檔/版本/設計任務) → ⬜ 未開始
- **H** pcc-api 標案監控 → ⬜ 未開始

### Phase 4: 知識累積
- **I** 知識庫管理介面 (00A-00E) → ⬜ 未開始
- **J** 履約追蹤 + 結案回饋閉環 → ⬜ 未開始

## Batch D Details (Current Focus)

案件進度看板 核心功能:
1. 案件列表/看板 — 卡片含案名/機關/預算/截標倒數/L1-L8 階段/斷點狀態
2. 案件詳情頁 — 階段進度條 + 斷點追蹤(A/B/C/D/E) + 交付物列表 + 啟動按鈕
3. prompt 模板庫 — 按階段瀏覽 + 一鍵複製 + KB 矩陣視覺化
4. 截標日看板/行事曆 — 7天黃/3天紅

## Key Config Data Sources

- `src/data/config/stages.ts`: STAGES, STAGE_MAP (L1-L8 + T1/T3)
- `src/data/config/prompt-assembly.ts`: PROMPT_FILES, FILE_MAP, RULE_MAP, STAGE_KB_RULES
- `src/data/config/kb-matrix.ts`: KB_MATRIX, KB_LABELS, WRITING_RULES_STAGES
- `public/prompts/`: 21 prompt files (system core + 8 stages + 5 KBs + tools + refs)

## Design Principles

1. 人機協作，不是無人自動化 — 所有斷點仍由人類確認
2. 需求三層: 需求 → 痛點 → 因果鏈 (連結收入公式)
3. 從收入公式逆推優先序
4. SSOT + Feature Registry + 閉環開發 + Hydration-safe + 中文優先
