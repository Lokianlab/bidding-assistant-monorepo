EXEC-GUIDE|20260223-1110|AINL|Option-B|core-4-verification

## 🚀 Option B 執行指南：分階段驗收（4 項核心）

**預計耗時**：10-15 分鐘
**適用場景**：優先驗收核心功能，UI 細節後續
**驗收目標**：4 個核心模組 + 1132 情報搜尋功能

---

## 前置準備（2 分鐘）

### 環境檢查

```bash
cd /path/to/bidding-assistant

# 拉最新程式碼
git fetch origin && git rebase origin/main

# 驗證測試通過
npm test -- --run

# 預期：3644 PASS / 1 SKIP / 0 FAIL
```

### 本地伺服器啟動

```bash
npm run dev
# 開啟 http://localhost:3000
```

---

## 驗收步驟（10-12 分鐘）

### 核心 1：KB API + RLS 隔離（3 分鐘）

**驗收點**（多租戶隔離核心）：
- [ ] 6 個 API 端點全響應
- [ ] RLS 隔離驗證：租戶間資料完全隔離
- [ ] CRUD 操作不跨租戶邊界

**快速驗證**：
```bash
# 1. 建立 KB 項目（租戶 A）
curl -X POST http://localhost:3000/api/kb/items \
  -H "X-Tenant-ID: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{"title":"Core Test","content":"Test content"}'
# 預期：201 Created

# 2. 租戶 B 嘗試存取租戶 A 的項目
curl http://localhost:3000/api/kb/items/tenant-a-item-id \
  -H "X-Tenant-ID: tenant-b"
# 預期：403 Forbidden（隔離成功）

# 3. 租戶 A 存取自己的項目
curl http://localhost:3000/api/kb/items/tenant-a-item-id \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK
```

**測試驗證**：
```bash
npm test -- infra/rls-policies.test.ts
# 預期：50 KB API tests PASS
```

---

### 核心 2：Notion 雙向同步（2 分鐘）

**驗收點**（資料完整性）：
- [ ] KB 新增 → Notion 同步
- [ ] KB 更新 → Notion 同步
- [ ] KB 刪除 → Notion 同步
- [ ] 同步延遲 < 5 秒

**快速驗證**：
```bash
# 1. KB 建立項目
ITEM_ID=$(curl -s -X POST http://localhost:3000/api/kb/items \
  -H "X-Tenant-ID: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{"title":"Sync Test","content":"Content"}' | jq -r '.id')

echo "Created item: $ITEM_ID"

# 2. 等待 2-3 秒（同步延遲）
sleep 3

# 3. 檢查 Notion database（手動或透過 Notion API）
curl -X GET "https://api.notion.com/v1/databases/{db-id}/query" \
  -H "Authorization: Bearer $NOTION_TOKEN" | jq '.results[] | select(.id == "'$ITEM_ID'")'
# 預期：項目在 Notion 出現
```

**測試驗證**：
```bash
npm test -- notion-sync/__tests__/
# 預期：46 tests PASS（22 logic + 11 cron + 13 integration）
```

---

### 核心 3：認證中間件（2 分鐘）

**驗收點**（安全邊界）：
- [ ] 路由保護：未授權請求被擋
- [ ] 租戶隔離：每個請求綁定租戶 ID
- [ ] 權限檢查：跨租戶存取失敗

**快速驗證**：
```bash
# 1. 沒有 token 的請求
curl -X GET http://localhost:3000/api/kb/items
# 預期：401 Unauthorized

# 2. 無效 token
curl -X GET http://localhost:3000/api/kb/items \
  -H "Authorization: Bearer invalid-token"
# 預期：401 Unauthorized

# 3. 有效 token 但不同租戶
TENANT_A_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "X-Tenant-ID: tenant-a" | jq -r '.token')

curl -X GET http://localhost:3000/api/kb/items \
  -H "Authorization: Bearer $TENANT_A_TOKEN" \
  -H "X-Tenant-ID: tenant-b"  # 不同租戶
# 預期：403 Forbidden

# 4. 有效 token + 正確租戶
curl -X GET http://localhost:3000/api/kb/items \
  -H "Authorization: Bearer $TENANT_A_TOKEN" \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK
```

**測試驗證**：
```bash
npm test -- middleware/__tests__/
# 預期：42 middleware tests PASS
```

---

### 核心 4：PCC 情報搜尋功能（2 分鐘）

**驗收點**（產品功能）：
- [ ] 情報搜尋 API 響應
- [ ] 搜尋結果準確
- [ ] 搜尋速度快（< 1 秒）
- [ ] 支援複雜查詢

**快速驗證**：
```bash
# 1. 簡單搜尋
curl "http://localhost:3000/api/pcc/search?q=工程" \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK + 相關結果

# 2. 複雜搜尋（多條件）
curl "http://localhost:3000/api/pcc/search?q=工程&category=土木&budget_min=1000000" \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK + 篩選結果

# 3. 分頁
curl "http://localhost:3000/api/pcc/search?q=工程&page=1&limit=20" \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK + 20 項結果

# 4. 效能檢查
time curl "http://localhost:3000/api/pcc/search?q=工程&limit=100" \
  -H "X-Tenant-ID: tenant-a"
# 預期：< 1000ms 完成
```

**測試驗證**：
```bash
npm test -- pcc-api/__tests__/
# 預期：1132 PCC search tests PASS
```

---

## 驗收完成檢查清單（2 分鐘）

```
核心 4 項驗收
□ KB API + RLS：50 tests PASS，多租戶隔離正常
□ Notion 同步：46 tests PASS，資料同步正常
□ 認證中間件：42 tests PASS，安全邊界就位
□ PCC 情報：1132 tests PASS，搜尋功能完整

整體測試
□ 3644 PASS / 1 SKIP / 0 FAIL
□ Build success

視覺驗證
□ http://localhost:3000 可正常存取
□ 沒有 console error
□ 多租戶隔離視覺反饋正常
```

---

## 驗收結果

### ✅ PASS（全部通過）

**記錄**：
```bash
# 在 docs/records/messages/ 建立驗收記錄
# 檔名：20260223-JDNE-verification-result-b.md
# 內容：4 項核心通過，P1d/P1e UI 延至 P2
```

**後續**：
```
P1 核心驗收完成 ✅
  ↓
Jin 簽核 ✅
  ↓
P2 啟動：
  ├─ SaaS 網頁實裝
  ├─ Claude SDK 整合
  └─ P1d KB UI + P1e Cron UI（並行開發）
```

---

## 延期項說明

**P1d KB UI** → P2 UI 整合階段驗收
- 原因：UI 細節優化可在 P2 併行
- 影響：不影響核心資料隔離和 API 功能

**P1e Notion Cron UI** → P2 管理面板
- 原因：Cron 邏輯已驗收，UI 是可視化輔助
- 影響：不影響自動同步功能

---

### ❌ 問題（若驗收失敗）

**回滾機制**：
1. 記錄失敗項目（如 "RLS 隔離失敗"）
2. AINL 通知相關機器（如 "ITEJ 需修復 RLS"）
3. 修復完成後重新驗收該項

**通知格式**：
```
AINL 廣播：
- 核心 1 RLS 隔離驗收失敗
- 原因：租戶 B 能讀租戶 A 的資料
- ITEJ 需修復：RLS 策略
- 修復預計 X 分鐘，重新驗收時間 HH:MM
```

---

## 隊長（JDNE）備註

- **快速路徑**：核心 4 項 10 分鐘內驗完，風險低
- **延期合理**：UI 細節延至 P2，不影響產品核心
- **並行開發**：P2 同步進行 UI 優化，加速上市
- **隨時轉向**：若需全驗，可隨時轉向 Option A（額外 15 分）

🚀 **隊長，核心驗收清單已備妥。可快速啟動。**

