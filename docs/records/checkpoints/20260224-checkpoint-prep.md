# Checkpoint 準備清單 — 2026-02-24 09:00

**發出時間**：2026-02-23 18:00
**檢查點時間**：2026-02-24 09:00
**負責**：JDNE

---

## 各機進度掃描清單

### M02 知識庫（ITEJ + AINL）
**預期成果**：
- ITEJ：API routes 完成（POST upload, GET search/list/get, DELETE, UPDATE）
- AINL：Hook 框架完成（useKBSearch, useKBUpload, useKBManager）

**檢查項目**：
- [ ] `src/app/api/kb/` 目錄已創建，所有 route 文件存在
- [ ] `src/lib/hooks/use-kb-*.ts` 所有 hook 已實作
- [ ] Supabase schema 部署完成
- [ ] 單元測試數 ≥ 60（ITEJ + AINL 各 30+）
- [ ] `npm run build` 成功

**如無進度**：ITEJ/AINL 聯繫 JDNE，是否卡在環變/依賴

---

### M08 評選簡報（Z1FV）
**預期成果**：
- API routes 骨架完成（/api/m08/generate-presentation, /api/m08/templates, /api/m08/export）
- Hook 初始化（useM08Presentation）

**檢查項目**：
- [ ] `src/app/api/m08/` 目錄已創建，至少 2 個 route 完成
- [ ] `src/lib/hooks/use-m08-presentation.ts` 已建立
- [ ] TypeScript 編譯無誤
- [ ] 單元測試 ≥ 20

**如無進度**：Z1FV 確認規格清晰度，是否需澄清

---

### M10 履約管理（Z1FV）
**預期成果**：
- API routes 初步完成
- 里程碑追蹤邏輯框架

**檢查項目**：
- [ ] `src/app/api/m10/` 目錄已創建
- [ ] 至少 3 個 route 完成（create-contract, list-milestones, update-progress）
- [ ] `milestone-status.ts` helper 已實作
- [ ] 單元測試 ≥ 20

---

### M11 結案飛輪（3O5L）
**預期成果**：
- API routes 規劃完成（尚未實裝）
- 成功模式識別邏輯初稿

**檢查項目**：
- [ ] `src/lib/success-pattern-matcher.ts` 已初稿
- [ ] API endpoint 清單已確定（無修改）
- [ ] 知識庫回流流程圖已畫

**如無進度**：3O5L 確認 M02 依賴是否到位

---

### 00A 外部資源 + 議價補強（A44T）
**預期成果**：
- 規範文檔草稿（00A-team-resources.md）
- 技能矩陣邏輯框架

**檢查項目**：
- [ ] `docs/dev-plan/00A-team-resources.md` 已建立（≥100 行）
- [ ] `src/lib/matcher.ts` 已初稿（calculateFitScore 函式）
- [ ] 議價策略邏輯初稿已有

---

## 規格分派確認

| 機器 | 模組 | 工作包檔案 | 檢查 |
|-----|------|----------|------|
| Z1FV | M08 + M10 | `Z1FV-M08-M10-workpack.md` | ✅ 已確認收 |
| 3O5L | M11 | `3O5L-M11-workpack.md` | ✅ 已確認收 |
| ITEJ + AINL | M02 | `ITEJ-AINL-M02-workpack.md` | ✅ 已確認收 |
| A44T | 00A + 議價 | `A44T-00A-negotiation-workpack.md` | ✅ 已確認收 |

**確認方式**：各機讀工作包，無疑問則默認確認。若有疑問立即上報。

---

## 環變等待狀態

### 當前狀況
- **NEXT_PUBLIC_SUPABASE_URL**：mock 值已替代（開發可用）
- **SUPABASE_SERVICE_ROLE_KEY**：mock 值已替代（開發可用）
- **認證繞過**：M02 Phase 1a 已啟用（開發環境）

### 待 Jin 提供
- [ ] 真實 Supabase 認證環變（production 級別）
- [ ] OAuth 配置（登入流程）
- [ ] PCC API 認證令牌

### 現階段對策
- 各機繼續本地開發、單元測試
- 功能邏輯驗證無需真實環變
- 集成測試延到 02-25，待環變就位

---

## Checkpoint 決策點

### 若所有機器都有進度（≥20% 完成）
→ 繼續按時程推進，02-25 集成測試
→ JDNE 發送鼓勵公告

### 若某機無進度或卡住
→ JDNE 直接聯繫該機，診斷根因
→ 若是規格問題 → 釐清後直接改
→ 若是技術問題 → 尋求架構支援或調整時程

### 若環變仍未到位
→ 繼續 mock 環變開發
→ 02-26 前須由 Jin 提供真實值
→ 若 02-26 仍無 → 升級為阻塞點，暫停集成

---

## Checkpoint 後動作

**2026-02-24 09:30**：
- JDNE 掃描各機快照 + 最新 commit
- 統計進度百分比
- 識別卡點

**2026-02-24 10:00**：
- 發送 checkpoint 回報（MSG 格式）
- 列出：各機完成度 + 待解問題 + 下一階段預期

**2026-02-24 17:00**：
- 第二次進度確認（簡版）

---

**由 JDNE 於 2026-02-23 18:00 編寫**
