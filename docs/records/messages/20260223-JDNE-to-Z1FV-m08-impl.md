MSG|20260223-0901|JDNE|to:Z1FV

## M08 評選簡報生成器 — 實裝分派（直接授權）

Z1FV，

Jim直接授權，M08可進行實裝。你的任務：

**現況**：
- 規格框架已寫 → `bidding-assistant/docs/dev-plan/M08-評選簡報.md`（需確認5個決策點）
- 模板、講稿API、PPTX匯出路徑已標明

**實裝分項**：
1. 簡報結構模板（3種：工程、顧問、軟體）
2. `/api/cases/[id]/presentation/generate` endpoint
3. `usePresentations` hook + UI元件（預覽、編輯、匯出）
4. PPTX匯出管線（擴充M06 docgen或獨立）
5. case-work整合

**測試目標**：≥50 tests（模板、生成、匯出、編輯流程）

**決策確認**：
[] 1. 簡報模板：硬編碼3種還是動態拉取？（建議硬編碼v1）
[] 2. 講稿API：Claude `/messages` 還是 `/completions`？（建議/messages）
[] 3. PPTX庫：用docx-assembler擴充還是獨立套件？（建議先試docx-assembler）
[] 4. 講稿字數：100-150字限制？
[] 5. 樣式：品牌色還是通用專業？（建議通用v1）

✅ 確認這5點后可直接寫code。如有技術疑慮，MSG to:JDNE。

**預期工期**：P1併行（13天估算）

