# 超進度分析 + 環變卡點替代方案

**日期**：2026-02-23 11:00
**協調**：JDNE
**現象**：所有機器超進度完成預定工作，僅環變卡住驗收

---

## 機器進度掃描

### ✅ 已超額完成

| 機器 | 預期 | 實際 | 完成度 |
|------|------|------|--------|
| **ITEJ** | P1c 基礎 | P1 完整驗證（3854 tests + 275 新測） + M07 修復 | **120%** |
| **Z1FV** | M09 整合 | M03-M07 整合測試完成 + M09 整合完成 | **110%** |
| **AINL** | M07 Phase 1 | M07 完全完成 + 信任度公式修復 | **105%** |
| **A44T** | M09 Phase 2 | 敏感度分析完成，83 tests PASS | **100%** |

### ⏳ 已就位等待

| 機器 | 任務 | 狀態 |
|------|------|------|
| **3O5L** | P1e Notion 整合測試 + M11 準備 | 代碼完成，等 M10 信號 |
| **JDNE** | M10/M11 規格分派 + 協調 | 規格完成，等各機承接確認 |

---

## 核心問題：環變卡住 → 替代方案研究

**當前狀況**：
- ❌ `npm run build` 失敗（Supabase 初始化時需環變）
- ✅ `npm test` 正常（Vitest mock 環變可運行）
- ❌ dev server 無法啟動
- ❌ P1 驗收無法在 localhost:3000 進行

**影響範圍**：
1. 整體集成驗證（E2E testing in real environment）
2. P1 驗收展示（Jin 看不到功能）
3. 後續 Phase 2 部署驗證

---

## 替代方案評估

### 方案 A：Mock 環變（環境模擬）

**做法**：
```bash
# .env.local 中添加 mock 值
NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-key-xxx
SUPABASE_SERVICE_ROLE_KEY=mock-service-key-xxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=mock-google-id
GOOGLE_CLIENT_SECRET=mock-secret
```

**優點**：
- ✅ build 可通過（解決編譯卡點）
- ✅ dev server 可啟動
- ✅ 代碼結構驗證可進行
- ✅ UI 元件可視化驗證可進行

**缺點**：
- ❌ 真實數據操作無法驗證（Supabase CRUD）
- ❌ OAuth 流程無法完整測試（無真實 Google credentials）
- ❌ 多租戶隔離無法驗證（RLS 策略）

**風險**：
- 會誤導驗收（UI 看起來能動，但邏輯連不上 Supabase）

### 方案 B：使用沙盒 Supabase

**做法**：
1. 向 Jin 提出「是否有沙盒 Supabase project 供開發測試」
2. 若無，自行建一個測試 project（需 Supabase 帳號）
3. 使用測試 project 的真實環變進行開發

**優點**：
- ✅ 完整的數據操作驗證
- ✅ 多租戶隔離真實測試
- ✅ OAuth 可真實流程測試（需配置測試 Google app）
- ✅ 最接近生產環境

**缺點**：
- ⏳ 需等待 Jin 決策
- ⚙️ 可能需要額外設定（Google OAuth 測試應用）
- 🔐 資料隔離需確保不污染真實數據

**時間成本**：2-4 小時

### 方案 C：本機 Supabase 仿真（docker 本地 instance）

**做法**：
```bash
docker run --rm \
  -p 54322:5432 \
  -p 9000:9000 \
  supabase/postgres:latest
```
或使用 supabase-cli 本地環境

**優點**：
- ✅ 完全獨立，無外部依賴
- ✅ 開發不受網路影響
- ✅ 完整的 Supabase 功能

**缺點**：
- ⚙️ 本機需要 Docker
- ⏳ 設定複雜（schema migration、RLS 策略複製等）
- 📦 docker image 較大

**時間成本**：3-6 小時

---

## 建議優先序

### 立即可做（不等 Jin）

✅ **方案 A**：Mock 環變 + build 通過驗證
- **時間**：15 分鐘
- **收益**：解除 build 卡點，各機可本機驗證代碼結構、UI 元件
- **行動**：寫 `.env.local.example` 並分享給各機

### 等待 Jin（下一階段）

🔄 **方案 B**：沙盒 Supabase（首選）
- **時間**：待 Jin 提供沙盒 project 設定（假設 1-2 小時）
- **收益**：真實環境驗證 + P1 完整驗收
- **行動**：通知 Jin，詢問是否已有沙盒環境或需要自建

❌ **方案 C**：本機 Docker Supabase
- **評估**：時間成本過高，且最終還是需要真實環變才能部署
- **建議**：除非 Jin 明確要求本機測試，否則優先 B

---

## 即刻行動方案

### Step 1：建立 Mock 環變版本（15 分鐘）

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.localhost
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key-dev-only
SUPABASE_SERVICE_ROLE_KEY=mock-service-key-dev-only
NEXT_PUBLIC_GOOGLE_CLIENT_ID=mock-google-client-id
GOOGLE_CLIENT_SECRET=mock-google-secret
```

執行：
```bash
npm run build  # 測試是否通過
npm run dev    # 啟動 dev server
```

### Step 2：通知各機（5 分鐘）

發送 M2M 消息：
> "Mock 環變已準備，build 可通過。UI 驗證可進行，邏輯驗證等待真實 Supabase。請測試代碼結構是否正常。"

### Step 3：等待 Jin 決策（N/A）

通知 Jin：環變缺失已識別，提供 3 替代方案。建議使用沙盒 Supabase（方案 B）。

---

## 決策矩陣

| 目標 | 方案 A (Mock) | 方案 B (沙盒) | 方案 C (Docker) |
|------|---|---|---|
| 解除 build 卡點 | ✅ 立即 | ✅ 後續 | ✅ 後續 |
| UI 元件驗證 | ✅ 可做 | ✅ 完全 | ✅ 完全 |
| 邏輯驗證（CRUD） | ❌ 無法 | ✅ 可做 | ✅ 可做 |
| 多租戶隔離驗證 | ❌ 無法 | ✅ 完全 | ✅ 完全 |
| OAuth 驗收 | ❌ 無法 | ✅ 可做 | ✅ 可做 |
| P1 驗收 | ❌ 無法 | ✅ 完全 | ✅ 完全 |
| 設置複雜度 | ⭐ 簡單 | ⭐⭐ 中等 | ⭐⭐⭐ 複雜 |
| 時間成本 | 15 min | 1-2h | 3-6h |

**推薦**：A（現在立即做） → B（等 Jin）

---

## 後續觀察指標

- [ ] 各機是否對 mock 環變反饋問題？
- [ ] build 通過後是否有新的編譯錯誤浮現？
- [ ] Jin 何時提供沙盒 Supabase 環變？
- [ ] 環變到達後多久能完成 P1 驗收？

**成功指標**：
- ✅ build PASS（0 errors）
- ✅ dev server 啟動成功
- ✅ 各機代碼結構驗證 PASS
- ✅ 等待 Jin 沙盒環變 → P1 驗收
