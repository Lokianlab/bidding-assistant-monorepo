OP|20260223-1630|AINL|環變配置快速切換指南

# 環變配置決策 — 快速執行指南

**狀態**: 兩個方案皆已準備，等待 Jin T+24h 決策

---

## 決策背景

**當前狀況**：
- Supabase URL 未配置於 `.env.production`
- Mock 環變已就位（`env.local`）
- 各機本機驗證已通過（3861 PASS）
- Build 已成功（4.4s clean）

**T+24h 需要決策**：
1. **方案 A**：現在配置真實 Supabase 環變
2. **方案 B**：暫用 mock 環變，P2 開始前統一配置

---

## 方案 A：現在配置真實環變

### 前置條件
- [ ] Jin 提供 Supabase Production URL
- [ ] Jin 提供 Supabase Service Role Key（僅限 backend）
- [ ] Jin 確認其他環變值（若有）

### 執行步驟（3 分鐘）

```bash
# 1. 進入專案根目錄
cd /c/dev/cc程式

# 2. 編輯 .env.production（或建立新檔）
cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
EOF

# 3. 驗證 build 成功
npm run build

# 4. 驗證無環變錯誤
npm run dev  # 本機測試 localhost:3000

# 5. 提交變更
git add .env.production
git commit -m "[infra] 環變配置：Supabase 真實環變（Jin 簽核）"
git push
```

### 預期結果
- ✅ Build 通過（<10s）
- ✅ Dev server 啟動成功
- ✅ Supabase 連線驗證通過
- ✅ 所有 3861 tests PASS（若有新測試）

### 風險評估
| 項目 | 風險 | 緩解 |
|------|------|------|
| 環變值錯誤 | 低 | Jin 直接提供，驗證後再提交 |
| Build 失敗 | 極低 | 本機已驗證通過 |
| 連線問題 | 低 | 使用 mock 做 fallback |

---

## 方案 B：暫用 Mock 環變

### 當前狀況
Mock 環變已在 `env.local` 中：
```
NEXT_PUBLIC_SUPABASE_URL=https://mock-supabase.localhost
SUPABASE_SERVICE_ROLE_KEY=mock-key-for-development
```

### 優點
- ✅ 0 分鐘配置（已就位）
- ✅ 各機可獨立驗證（本機通過）
- ✅ P2 開始前有 2 週準備時間
- ✅ 降低環變洩露風險（暫不在 repo 存真實 key）

### 缺點
- 外部使用者無法使用真實 Supabase
- P2 上線前必須切換（但時間充足）

### 轉換時間表
```
現在 → 2026-02-24：
  - P1 驗收用 mock（無外部驗證）
  - M02-M11 實裝用 mock（內部驗證）

2026-03-05 → P2a 啟動前：
  - 統一配置真實環變
  - 完整 E2E 測試
  - 上線準備
```

---

## 決策流程（T+24h 期間）

### Step 1: Jin 選擇
```
[ ] 方案 A：現在配置真實環變
    → Jin 提供環變值 → 5 分鐘內完成配置

[ ] 方案 B：暫用 mock，P2 前配置
    → 無需操作 → 繼續現有工作流
```

### Step 2: AINL 轉發各機
```
若選 A：
  MSG to ALL → 環變已配置，重新 pull + build

若選 B：
  無需轉發 → 各機繼續用 mock
```

### Step 3: 驗證
```
若選 A：
  - [ ] JDNE：git pull + npm run build
  - [ ] ITEJ：npm run build
  - [ ] Z1FV：npm run build
  - [ ] A44T：npm run build
  - [ ] 3O5L：npm run build

若選 B：
  - [ ] 無需驗證（已通過）
```

---

## 快速參考卡

### 方案 A（現在配置）
```
決策時間: <1 分鐘
執行時間: 3-5 分鐘
驗證時間: 2-3 分鐘
全機同步: <10 分鐘
預期收益: 上線更接近真實環境
```

### 方案 B（暫用 mock）
```
決策時間: <1 分鐘
執行時間: 0 分鐘（已就位）
驗證時間: 0 分鐘
全機同步: 無需
預期收益: 專注於功能實裝，降低環變管理複雜度
```

---

## 建議

**基於當前專案狀況**：
- P1 驗收目的是驗證功能邏輯（與環變無關）
- M02-M11 實裝用 mock 環變不影響進度
- P2 上線前有充足時間配置真實環變

**推薦**：方案 B（暫用 mock）
- 減少 T+24h 期間的變數
- P1 驗收聚焦在功能驗證
- 環變配置延至 P2 前（有充足準備時間）

---

## 附錄：環變檢查清單

### Mock 環變驗證（已通過）
```
[x] .env.local 檔案存在
[x] NEXT_PUBLIC_SUPABASE_URL 已設定
[x] SUPABASE_SERVICE_ROLE_KEY 已設定
[x] npm run build 成功
[x] npm run dev 成功
[x] 3861 tests PASS
```

### 真實環變準備清單（待 Jin 提供）
```
[ ] Supabase Production URL
[ ] Supabase Service Role Key
[ ] 其他必要環變值（如 API keys）
[ ] 環變值驗證（secure + non-empty）
```

---

**等待 Jin T+24h 決策。** 雙方案均已就位，決策後 <10 分鐘 內可完成配置。

