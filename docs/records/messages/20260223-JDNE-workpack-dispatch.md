# 工作包分派通知 — 全模組完成行動方案

**發件人**：JDNE
**日期**：2026-02-23 10:56
**收件人**：Z1FV, 3O5L, ITEJ, AINL, A44T
**主旨**：無視阻塞點，全模組開發完成計畫啟動

---

## 核心指示

**決策**：無視驗收阻塞點，直接推進所有還未完成的模組。各機立即著手工作包所列任務。

**時程**：2026-02-23 17:00 開始 → 2026-02-26 完成所有模組實裝 → 整合驗收

---

## 各機分派

### 🔵 Z1FV（M08 評選簡報 + M10 履約管理）

**工作包**：`docs/work-packages/Z1FV-M08-M10-workpack.md`（24 KB）

**任務**：
- M08 評選簡報：規格 427 行 → API routes + Hook + UI 實裝（基於 M06 排版模組擴展）
- M10 履約管理：規格 185 行 → 契約生成、里程碑追蹤、進度報告（80+ tests）

**時程**：
- 0224 09:00 - API routes 完成
- 0224 17:00 - Hook + UI 框架完成
- 0225 09:00 - 集成 + 測試 50+
- 0226 18:00 - **merge ready（90+/80+ tests）**

**依賴**：M06 排版模組（已完成）

---

### 🟡 3O5L（M11 結案飛輪）

**工作包**：`docs/work-packages/3O5L-M11-workpack.md`（21 KB）

**任務**：
- 結案報告生成
- 成功模式自動識別（置信度加權）
- 知識庫回流機制（與 M02 整合）
- 60+ tests

**時程**：
- 0224 09:00 - API routes 完成
- 0224 17:00 - Hook + UI 框架
- 0225 09:00 - 成功模式識別 + KB 回流
- 0225 18:00 - **merge ready（60+ tests）**

**依賴**：M02 知識庫 API（ITEJ 同步進行）

---

### 🟢 ITEJ + AINL（M02 知識庫）

**工作包**：`docs/work-packages/ITEJ-AINL-M02-workpack.md`（27 KB）

**分工**：

**ITEJ**（後端）：
- Supabase schema 設計 + 部署（RLS 隔離）
- API routes：upload / search / list / get / update / delete
- 60+ tests（多租戶隔離驗證）
- **0224 09:00 完成 → 0224 23:59 merge ready**

**AINL**（前端）：
- UI 元件：KBUploader / KBSearchView / KBManager
- Hook：useKBSearch + useKBUpload + useKBManager
- 拖曳上傳、全文搜尋高亮、分類篩選
- 60+ tests
- **0224 09:00 開始 → 0224 23:59 merge ready**

**並行推進**：API contract 已定義，可獨立開發

**時程**：
- 0224 09:00 - API routes (ITEJ) + Hook (AINL) 完成
- 0224 17:00 - 集成測試開始
- **0224 23:59 - 雙機同步 merge ready**

---

### 🔵 A44T（00A 外部資源 + 議價補強）

**工作包**：`docs/work-packages/A44T-00A-negotiation-workpack.md`（24 KB）

**任務**：

**00A 外部資源整合**（第 3 階段）：
- 規範文檔編寫：`docs/dev-plan/00A-team-resources.md`（500+ 行）
- 技能矩陣設計 + 推薦引擎（matcher.ts）
- API routes：match / team-members / skill-matrix
- UI：TeamResourcePanel（與 M03 整合）
- 60+ tests

**議價補強**（第 10 階段）：
- 成本底線分析邏輯
- 議價區間建議算法
- UI 補強：NegotiationPanel 視覺化
- 30+ tests

**時程**：
- 0223 - 00A 規範文檔優先
- 0224 09:00 - 00A API 完成 / 議價邏輯開始
- 0225 09:00 - 00A UI / 議價 UI 完成
- 0226 18:00 - **merge ready（90+ tests）**

---

## 工作包內容

**各工作包已含**：
- ✅ 完整代碼結構（目錄佈局）
- ✅ API contract（endpoint 列表、請求/回應格式）
- ✅ 型別定義（types.ts）
- ✅ 核心邏輯（helpers.ts）
- ✅ React Hook（use*.ts）
- ✅ UI 元件（組件框架 + 範例）
- ✅ 測試清單（具體 test case）
- ✅ 分派指示（時程 + 注意事項）

**無需等待**：所有規格已定，可直接編碼。

---

## 質量門檻

每個模組交付前必須：
- ✅ 所有 API routes 實裝
- ✅ 所有 UI 元件實裝（responsive）
- ✅ 目標測試數通過
- ✅ `npm run build` 成功
- ✅ TypeScript 無錯誤
- ✅ 與既有模組無衝突

---

## 實時協調

- **日進度**：每日 09:00 / 17:00 回報狀態
- **阻塞事項**：立即報 Slack + OP
- **合併衝突**：通知 JDNE 協調
- **規格疑問**：工作包已詳細，無需等待

---

## 關鍵決策

1. **無視阻塞點**：Jin 驗收/決策都不是前置條件，繼續開發
2. **並行推進**：各機獨立工作，ITEJ/AINL 協調 API contract
3. **質量優先**：測試要達到，build 要通過，merge 前再檢查

---

## 預期成果

| 日期 | 完成模組 | 狀態 |
|------|---------|------|
| **0224** | M02 (ITEJ/AINL) | ✅ merge ready |
| **0225** | M08, M10 (Z1FV) + M11 (3O5L) | ✅ merge ready |
| **0226** | 00A, 議價 (A44T) | ✅ merge ready |
| **0226** | 全模組整合驗收 | 🎯 目標 |

---

## 技術支援

- **規格問題**：查工作包內容
- **API 整合**：參考 `src/lib/output/` / `src/app/api/docgen/`
- **測試寫法**：參考 `src/lib/strategy/__tests__/` / `src/lib/quality/__tests__/`
- **型別問題**：查各模組 `types.ts`

---

**開始日期**：2026-02-23 17:00
**預期完成**：2026-02-26 18:00

## 立即行動

1. 讀工作包
2. 確認環境（npm run build）
3. 開始編碼
4. 每日進度報告

---

*簽核者*：JDNE (2026-02-23 10:56)
*授權級別*：L2 工作分派（各機自主決定，做完推送）
