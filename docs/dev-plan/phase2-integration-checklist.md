# Phase 2a 模組整合準備檢查清單

> 文件等級：L2 規劃｜狀態：Phase 1 完成後準備｜出處：ITEJ 主動準備｜日期：2026-02-23
>
> 目的：確保 16 個功能模組能在 SaaS 平台中無縫協作

---

## 一、模組整合狀態掃描

### 核心模組（Priority P0）

| 模組 | 測試覆蓋 | 跨模組導入 | 狀態 | 下步 |
|------|--------|----------|------|------|
| **knowledge-base** | ✅ P1c 47 tests | `n/a` | 完成 | 進階功能（版本控制、協作） |
| **dashboard** | ✅ 200+ tests | `strategy`, `intelligence` | 完成 | 多視圖客製化 |

### 工具箱模組（Priority P1）

| 模組 | 測試狀態 | 依賴 | 整合檢驗 | 優先修復 |
|------|---------|------|--------|---------|
| **strategy** (M03) | ✅ 100+ tests | KB, Intelligence | ✅ 有 case-work 測試 | 戰略分析流程 |
| **quality-gate** (M04) | ✅ 80+ tests | — | ⚠️ 部分整合 | 與 docgen 連接 |
| **intelligence** | ✅ 50+ tests | PCC API | ✅ 有整合測試 | 聯想搜尋增強 |
| **pricing** | ✅ 40+ tests | KB | ⚠️ 需驗證 | 報價驗算完整版 |

### 輸出層模組（Priority P1-P2）

| 模組 | 狀況 | 關鍵路徑 |
|------|------|--------|
| **docgen** | 基礎完成 | 需連接 quality-gate + strategy → 文件生成 |
| **assembly** | 基礎完成 | Prompt 版本控制、版本管理 UI |
| **explore** | 基礎完成 | 進階搜尋 + intelligence 聯動 |
| **scan** (W01) | 草案完成 | 巡標自動化 UI + Notion 同步 |

---

## 二、跨模組資料流驗證

### 關鍵資料流（需 E2E 測試）

```
1. 案件上傳
   RFQ → intelligence（解析需求） → strategy（分析競爭）
   → quality（檢查質量） → docgen（生成提案）

2. 知識庫協作
   KB CRUD → strategy（引用知識） → pricing（套用模板）

3. 情報整合
   PCC API → intelligence（搜尋） → explore（瀏覽）
   → case-board（標註） → dashboard（呈現）
```

### 已有整合測試

- ✅ `src/app/api/kb/__tests__/p1c-p1e-integration.test.ts`（KB + Notion 同步）
- ✅ `src/app/api/auth/__tests__/integration.test.ts`（OAuth + KB 存取控制）
- ✅ `src/lib/case-work/__tests__/integration.test.ts`（案件工作頁）
- ✅ `src/components/explore/__tests__/integration.test.tsx`（情報探索 UI）

### 待補充的整合測試

| 流程 | 優先序 | 測試檔案 | 涵蓋目標 |
|------|--------|---------|--------|
| strategy + quality + docgen | P0 | `quality-docgen-integration.test.ts` | 提案生成完整流 |
| intelligence + explore + case-board | P1 | `intelligence-caseflow.test.ts` | 情報到案件流 |
| KB + pricing + assembly | P1 | `kb-pricing-prompt-integration.test.ts` | 知識庫套用模板流 |
| dashboard + multiple sources | P2 | `dashboard-aggregation.test.ts` | 多源儀表板聚合 |

---

## 三、架構完整性檢驗

### 需驗證的項目

- [ ] **跨模組型別安全**：strategy 的輸出能否直接用於 quality 輸入？
- [ ] **API 路由完備性**：是否所有模組都有對應的 API 路由？
- [ ] **錯誤邊界**：模組間若干失敗是否能優雅降級？
- [ ] **效能邊界**：16 個模組並行時的資源消耗是否可控？（設定基準）
- [ ] **狀態同步**：多模組狀態更新是否會產生不一致？

### 已檢驗項目

✅ **多租戶隔離**（P1f middleware）
✅ **RLS 授權**（P1c policies）
✅ **Session 安全**（P1b OAuth）
✅ **資料庫連線池**（staging cron）

---

## 四、Phase 2a 衝刺準備

### 前置依賴（應在 Stage 2a 開始前完成）

- [ ] 確認 UI 元件庫版本相容性（shadcn/radix-ui v1.x）
- [ ] 確認 Notion API 限流策略（測試 1000+ 同步）
- [ ] 檢查 localStorage 容量限制（同步 100+ 案件）
- [ ] 驗證 Supabase 連線池設定（支持 20+ 並行）

### 開發團隊分工建議

| 團隊 | 模組組合 | 目標完成 |
|------|---------|--------|
| A44T | dashboard + assembly | 2026-03-19 |
| Z1FV | docgen + quality-gate | 2026-03-19 |
| 3O5L | explore + intelligence | 2026-03-26 |
| AINL | strategy + pricing + scan | 2026-03-26 |

### 測試目標

- **單元測試**：現有 3854 → 4200+（+350 新整合測試）
- **覆蓋率**：≥90%（當前已達 95%+ 在 P1 範圍）
- **E2E 覆蓋**：5 條關鍵用戶旅程 × 3 情景 = 15 E2E 測試

---

## 五、風險與緩解策略

| 風險 | 可能性 | 影響 | 緩解方案 |
|------|--------|------|--------|
| 模組間 API 破壞性變更 | 中 | 延遲整合 | 版本相容層 + 特性旗標 |
| Notion 同步延遲 > 30s | 中 | 用戶體驗差 | 非同步佇列 + 樂觀更新 |
| 多模組狀態不一致 | 低 | 邏輯缺陷 | Redux DevTools + 整合測試 |
| 記憶體溢出（100+ 案件） | 低 | 崩潰 | 虛擬化 + 分頁快取 |

---

## 六、驗收標準（Stage 2a 完成）

- [ ] 16 個模組在 Web App 中全部可訪問
- [ ] 無孤立頁面（所有模組都在導航樹中）
- [ ] 至少 3 條完整用戶旅程通過 E2E 測試
- [ ] 跨模組資料流完整性 ≥ 95%（無數據丟失）
- [ ] 性能基準：p95 延遲 < 500ms（含 API 呼叫）
- [ ] 測試覆蓋率 ≥ 90%

---

**下一步行動**：
1. JDNE 確認分工與時程
2. 各團隊在 2026-02-28 前完成其負責模組的集成測試框架
3. 2026-03-05 開始 Stage 2a 衝刺
