# M02 Phase 2 API 驗收指南

**日期**：2026-02-24
**對象**：Jin（產品負責人）
**目標**：確認 KB API 6 個端點在功能性上符合要求
**先決**：Phase 2 實裝已完成（41 新增測試 + 3979 總通過）

---

## 快速驗收流程（10-15 分鐘）

### 前置條件

- 開發環境已啟動（`npm run dev` on port 3000）
- Supabase 環境變數已設定（`.env.local` 有 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）
- 登入系統（有 auth session）

### 檢查清單

#### 1. API 端點清單驗證（2 分鐘）

開啟瀏覽器開發者工具 → Network 標籤，確認以下端點存在且可呼叫：

| 端點 | 方法 | 目的 | 狀態碼期望 |
|------|------|------|-----------|
| `/api/kb/items` | GET | 列表查詢 | 200 |
| `/api/kb/items` | POST | 建立新項 | 201 |
| `/api/kb/items/:id` | GET | 取單一項 | 200 |
| `/api/kb/items/:id` | PUT | 更新項 | 200 |
| `/api/kb/items/:id` | DELETE | 刪除項 | 204 |
| `/api/kb/search` | GET | 全文搜尋 | 200 |
| `/api/kb/stats` | GET | 統計資訊 | 200 |
| `/api/kb/import` | POST | 批次匯入 | 201 |
| `/api/kb/export` | GET | 匯出資料 | 200 |

#### 2. 基礎功能測試（5 分鐘）

**測試方式**：使用 curl 或 Postman

```bash
# 1. 建立知識庫項目
curl -X POST http://localhost:3000/api/kb/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-1" \
  -d '{
    "category": "00A",
    "data": {
      "id": "M-001",
      "name": "測試隊員",
      "title": "工程師",
      "status": "在職",
      "authorizedRoles": ["PM"],
      "education": [],
      "certifications": [],
      "experiences": [],
      "projects": [],
      "additionalCapabilities": "無"
    }
  }'

# 預期回應：
# {
#   "id": "<uuid>",
#   "entryId": "M-001",
#   "category": "00A"
# }
```

```bash
# 2. 查詢統計
curl http://localhost:3000/api/kb/stats \
  -H "x-user-id: test-user-1"

# 預期回應（範例）：
# {
#   "00A": 1,
#   "00B": 0,
#   ...
# }
```

```bash
# 3. 搜尋
curl "http://localhost:3000/api/kb/search?category=00A" \
  -H "x-user-id: test-user-1"

# 預期回應：
# {
#   "items": [...],
#   "total": 1
# }
```

#### 3. 多租戶隔離驗證（3 分鐘）

```bash
# 用不同 user ID 測試，確保資料隔離
curl "http://localhost:3000/api/kb/search" \
  -H "x-user-id: test-user-2"

# 預期：test-user-2 無法看到 test-user-1 的資料（total = 0）
```

#### 4. 錯誤處理驗證（2 分鐘）

| 測試 | 預期結果 |
|------|----------|
| 無 x-user-id header | 401 Unauthorized |
| 無效 category | 400 Bad Request |
| 缺少必填欄位 | 400 Bad Request |
| 不存在的 ID | 404 Not Found（若已實裝） |

```bash
# 測試無認證
curl -X POST http://localhost:3000/api/kb/items \
  -H "Content-Type: application/json" \
  -d '{"category":"00A","data":{}}'

# 預期：401
```

---

## 詳細驗收清單

### A. 功能正確性

#### A1. 資料寫入（POST /api/kb/items）

**需求**：
- ✓ 接受合法輸入，回傳 201 + UUID
- ✓ 自動設定 tenant_id = user_id（RLS 隔離）
- ✓ 自動設定 status = "active"
- ✓ 自動記錄 created_at/updated_at
- ✓ 驗證 category 在 ['00A', '00B', '00C', '00D', '00E']

**測試**：
```bash
# 有效輸入
curl -X POST http://localhost:3000/api/kb/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "category": "00B",
    "data": {
      "id": "P-2025-001",
      "projectName": "展覽策展專案",
      "client": "文化部",
      "contractAmount": "200萬",
      "period": "2025-03-01 to 2025-08-31",
      "entity": "大員洛川股份有限公司",
      "role": "得標廠商",
      "completionStatus": "履約中",
      "teamMembers": "PM: 黃偉誠",
      "workItems": [],
      "outcomes": "完成策展方案評審",
      "documentLinks": ""
    }
  }'

# 驗證：id 生成 ✓, category 記錄 ✓, status="active" ✓
```

#### A2. 資料查詢（GET /api/kb/items, /search）

**需求**：
- ✓ 列表返回同租戶的所有項目
- ✓ 支援分頁（?page=1&limit=10）
- ✓ 支援過濾（?category=00A, ?status=active）
- ✓ 搜尋支援全文（?q=關鍵字）

**測試**：
```bash
# 列表查詢
curl "http://localhost:3000/api/kb/search?category=00B&status=active&page=1&limit=20" \
  -H "x-user-id: user-123"

# 驗證：返回正確過濾結果 ✓
```

#### A3. 資料更新（PUT /api/kb/items/:id）

**需求**：
- ✓ 接受部分欄位更新
- ✓ 自動更新 updated_at
- ✓ 版本控制（樂觀鎖或時間戳）

**測試**：
```bash
# 建立後更新
ITEM_ID="<從上面 POST 取得的 ID>"
curl -X PUT "http://localhost:3000/api/kb/items/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "completionStatus": "已驗收結案"
  }'

# 驗證：updated_at 更新 ✓, 資料合併正確 ✓
```

#### A4. 資料刪除（DELETE /api/kb/items/:id）

**需求**：
- ✓ 刪除指定項目（軟刪除還是硬刪除？）
- ✓ 回傳 204 No Content

**測試**：
```bash
curl -X DELETE "http://localhost:3000/api/kb/items/$ITEM_ID" \
  -H "x-user-id: user-123"

# 驗證：204 回應 ✓, 資料不再出現於 GET ✓
```

#### A5. 統計信息（GET /api/kb/stats）

**需求**：
- ✓ 返回各類別項目計數
- ✓ 格式：`{"00A": 5, "00B": 3, ...}`
- ✓ 只統計同租戶資料

**測試**：
```bash
curl "http://localhost:3000/api/kb/stats" \
  -H "x-user-id: user-123"

# 驗證：計數準確 ✓, 無其他租戶資料 ✓
```

#### A6. 批次匯入（POST /api/kb/import）

**需求**：
- ✓ 接受最多 500 項批次
- ✓ 模式：append（新增）vs replace（覆蓋）
- ✓ 原子性：全成功或全失敗

**測試**：
```bash
curl -X POST "http://localhost:3000/api/kb/import" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "mode": "append",
    "data": {
      "00A": [
        {
          "id": "M-002",
          "name": "測試隊員2",
          ...
        }
      ]
    }
  }'

# 驗證：批次全部寫入 ✓
```

#### A7. 匯出（GET /api/kb/export）

**需求**：
- ✓ 支援格式：JSON, Markdown（?format=json|markdown）
- ✓ 包含完整資料

**測試**：
```bash
curl "http://localhost:3000/api/kb/export?format=json" \
  -H "x-user-id: user-123" > export.json

# 驗證：JSON 格式正確 ✓
```

### B. 多租戶隔離

**需求**：
- ✓ 每個用戶只能查看自己的資料
- ✓ RLS policy 在 DB 層強制

**測試流程**：

```bash
# Step 1: user-123 建立資料
curl -X POST http://localhost:3000/api/kb/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{...}'

# Step 2: user-456 查詢
curl "http://localhost:3000/api/kb/stats" \
  -H "x-user-id: user-456"

# 預期：user-456 的 00A count = 0（看不到 user-123 的資料）✓
```

### C. 效能

**需求**：
- ✓ GET 端點響應時間 < 500ms（100 項資料）
- ✓ POST 端點 < 1s（含 DB 寫入）

**測試**：在瀏覽器 Network 標籤觀察回應時間

### D. 錯誤處理

| 錯誤類型 | HTTP 狀態 | 回應示例 |
|----------|-----------|---------|
| 無認證 | 401 | `{"error": "Unauthorized"}` |
| 無效輸入 | 400 | `{"error": "Invalid category"}` |
| 資源不存在 | 404 | `{"error": "Not Found"}` |
| 伺服器錯誤 | 500 | `{"error": "Database error"}` |

**測試**：
```bash
# 無 x-user-id
curl http://localhost:3000/api/kb/stats
# 預期：401

# 無效 category
curl -X POST http://localhost:3000/api/kb/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{"category":"INVALID","data":{}}'
# 預期：400
```

---

## 驗收簽核表

| 項目 | 狀態 | 備註 |
|------|------|------|
| **功能正確性** | | |
| POST /api/kb/items（寫入）| ☐ PASS | |
| GET /api/kb/items（列表）| ☐ PASS | |
| GET /api/kb/search（搜尋）| ☐ PASS | |
| PUT /api/kb/items/:id（更新）| ☐ PASS | |
| DELETE /api/kb/items/:id（刪除）| ☐ PASS | |
| GET /api/kb/stats（統計）| ☐ PASS | |
| POST /api/kb/import（匯入）| ☐ PASS | |
| GET /api/kb/export（匯出）| ☐ PASS | |
| **多租戶隔離** | | |
| RLS policy 生效 | ☐ PASS | |
| 跨用戶資料隔離 | ☐ PASS | |
| **效能** | | |
| GET 端點 < 500ms | ☐ PASS | |
| POST 端點 < 1000ms | ☐ PASS | |
| **錯誤處理** | | |
| 401/400/404/500 正常回應 | ☐ PASS | |
| **整體** | | |
| 推薦進行 Phase 3 | ☐ YES / ☐ NO | |

---

## 簽核人簽名

**驗收人**：________________________  **日期**：____________

**意見**：

```
[簽核人可在此填寫發現的問題、改進建議或驗收通過簽核]
```

---

## 後續行動

- [ ] 驗收通過 → 解鎖 Phase 3 啟動
- [ ] 有問題 → A44T 修復 → 重新驗收
- [ ] Phase 3 啟動後，繼續監控 Phase 2 在生產環境的表現

---

_驗收指南由 A44T 準備，待 Jin 執行_
