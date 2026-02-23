EXEC-GUIDE|20260223-1105|AINL|Option-A|full-verification-6-layers

## 🚀 Option A 執行指南：完全驗收（6 層全驗）

**預計耗時**：20-30 分鐘
**適用場景**：確保所有功能完整就位
**驗收目標**：6 層核心 + 3644 整體測試通過

---

## 前置準備（2 分鐘）

### 環境檢查

```bash
# 確保在專案根目錄
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

## 驗收步驟（15-25 分鐘）

### Phase 1a：Supabase 多租戶配置（2 分鐘）

**驗收點**：
- [ ] 登入頁面出現（預設租戶 ID = localhost）
- [ ] Supabase 客戶端成功初化
- [ ] 能存取本機開發資料庫

**手動檢查**：
```bash
# 檢查 Supabase client 狀態
curl -X GET http://localhost:3000/api/health
# 預期：200 OK + 租戶信息
```

---

### Phase 1b：OAuth 認證流程（3 分鐘）

**驗收點**：
- [ ] 登入頁面有 OAuth 按鈕
- [ ] 點擊 → 轉向 OAuth 提供商
- [ ] 回調成功 → 寫入 session
- [ ] Cookies 中有 `session_token`

**手動測試**：
1. 瀏覽器開啟 http://localhost:3000/login
2. 檢查頁面是否有 OAuth 選項
3. 點擊 → 應該轉向授權頁面
4. 授權完成 → 回到主頁 + session 寫入成功

**測試驗證**：
```bash
npm test kb/__tests__/page.test.tsx
# 預期：13 integration tests PASS
```

---

### Phase 1c：KB API + RLS 隔離（4 分鐘）

**驗收點**：
- [ ] 6 個 API 端點全響應：GET list / GET single / POST create / PATCH update / DELETE delete / search
- [ ] RLS 隔離：租戶 A 無法讀租戶 B 的資料
- [ ] 多租戶 CRUD 全部成功

**API 測試序列**：
```bash
# 1. 建立 KB 項目（multipart/form-data）
curl -X POST http://localhost:3000/api/kb/items \
  -H "X-Tenant-ID: tenant-a" \
  -F "title=Test KB" \
  -F "content=Content here" \
  -F "file=@sample.pdf"
# 預期：201 Created + item ID

# 2. 讀取列表
curl http://localhost:3000/api/kb/items \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK + 項目列表

# 3. 搜尋
curl "http://localhost:3000/api/kb/items?q=test" \
  -H "X-Tenant-ID: tenant-a"
# 預期：200 OK + 搜尋結果

# 4. 更新項目
curl -X PATCH http://localhost:3000/api/kb/items/{id} \
  -H "X-Tenant-ID: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated"}'
# 預期：200 OK

# 5. 刪除項目
curl -X DELETE http://localhost:3000/api/kb/items/{id} \
  -H "X-Tenant-ID: tenant-a"
# 預期：204 No Content

# 6. RLS 隔離驗證
curl http://localhost:3000/api/kb/items/{tenant-b-item-id} \
  -H "X-Tenant-ID: tenant-a"
# 預期：403 Forbidden（多租戶隔離成功）
```

**測試驗證**：
```bash
npm test kb/__tests__/
# 預期：50 KB API tests PASS + 28 KB UI tests PASS
```

---

### Phase 1d：KB UI 完整互動（4 分鐘）

**驗收點**：
- [ ] KB 頁面載入成功
- [ ] 表格全選、篩選、排序都能動作
- [ ] 新增、編輯、刪除 UI 反應正確
- [ ] 頁面轉換流暢

**手動操作**：
1. 瀏覽器開啟 http://localhost:3000/kb
2. 檢查表格是否顯示（若無資料先新增一筆）
3. **全選測試**：點擊表頭全選框 → 全部項目應被選中
4. **搜尋/篩選**：輸入關鍵字 → 表格即時篩選
5. **排序**：點擊欄位標題 → 表格應排序
6. **新增**：點擊 "New KB Item" → 彈窗出現
7. **編輯**：選中項目 → 點擊編輯 → 修改內容 → 儲存
8. **刪除**：選中項目 → 點擊刪除 → 確認 → 項目消失

**測試驗證**：
```bash
npm test saaS-1d-kb-ui/__tests__/
# 預期：28 KB UI tests PASS
```

---

### Phase 1e：Notion 雙向同步 + Cron（4 分鐘）

**驗收點**：
- [ ] 在 KB 建立項目 → 自動出現在 Notion database
- [ ] 在 KB 更新項目 → Notion 自動更新
- [ ] 在 KB 刪除項目 → Notion 自動刪除
- [ ] Cron 定時同步正常運作

**手動測試**：
1. 在 KB UI 建立新項目，記錄 title 和 content
2. 打開關聯的 Notion database
3. **驗證同步**：新項目應在 Notion 出現（可能 2-5 秒延遲）
4. **更新同步**：回到 KB，編輯同一項目 → Notion 更新應跟上
5. **刪除同步**：在 KB 刪除該項目 → Notion 記錄應標記為已刪除

**測試驗證**：
```bash
npm test notion-sync/__tests__/
# 預期：22 logic tests + 11 cron tests + 13 integration tests = 46 PASS
```

**Cron 檢查**：
```bash
# 觸發手動 Cron（確保定時同步機制就位）
curl -X GET http://localhost:3000/api/cron/sync-notion \
  -H "Authorization: Bearer {CRON_SECRET}"
# 預期：200 OK + 同步完成日誌
```

---

### Phase 1f：多租戶認證中間件（3 分鐘）

**驗收點**：
- [ ] 租戶 A 無法存取租戶 B 的資源
- [ ] 路由保護成功：未授權請求被擋
- [ ] 中間件日誌記錄所有租戶操作

**隔離測試**：
```bash
# 租戶 A 嘗試存取租戶 B 的 KB 項目
TENANT_A_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "X-Tenant-ID: tenant-a" | jq -r '.token')

curl -X GET http://localhost:3000/api/kb/items/tenant-b-item-id \
  -H "Authorization: Bearer $TENANT_A_TOKEN"
# 預期：403 Forbidden

# 租戶 A 存取自己的 KB
curl -X GET http://localhost:3000/api/kb/items/tenant-a-item-id \
  -H "Authorization: Bearer $TENANT_A_TOKEN"
# 預期：200 OK
```

**測試驗證**：
```bash
npm test middleware/__tests__/
# 預期：42 middleware tests PASS
```

---

## 驗收完成檢查清單（3 分鐘）

```
終端驗證（npm test --run 一次）
□ 3644 PASS / 1 SKIP / 0 FAIL
□ 231 test files passed
□ Build success: npm run build

視覺驗證（localhost:3000 瀏覽）
□ 登入流程順暢
□ KB 管理頁面完整
□ 表格互動正常
□ 沒有 console error

API 驗證（curl 測試）
□ 6 個 KB API 端點全響應
□ 多租戶隔離成功
□ Notion 同步正常
□ Cron 端點就位

隔離驗證（多租戶）
□ 租戶 A↔B 資料完全隔離
□ 未授權存取被擋
□ 日誌記錄完整
```

---

## 驗收結果

### ✅ PASS（全部通過）

**記錄**：
```bash
# 在 docs/records/messages/ 建立驗收記錄
# 檔名：20260223-JDNE-verification-result-a.md
# 內容：包含時間戳、每層驗證點、通過/失敗狀態
```

**後續**：
```
P1 驗收完成 ✅
  ↓
Jin 簽核 ✅
  ↓
P2 啟動：SaaS 網頁 + SDK 整合
```

---

### ❌ 問題（若驗收失敗）

**回滾機制**：
1. 記錄失敗項目 + 錯誤訊息
2. 通知相關機器準備修復
3. 修復完成後重新驗收該層

**通知格式**：
```
AINL 廣播：
- P1c KB API 驗收失敗 - RLS 隔離異常
- ITEJ 需修復：多租戶隔離邊界
- 修復預計 X 分鐘，驗收延遲至 HH:MM
```

---

## 隊長（JDNE）備註

- 驗收過程中有任何疑問，直接 ping AINL
- AINL 會實時監聽並轉發各機反饋
- 若遇到環境問題（如 DB 連線失敗），通知 JDNE，由 JDNE 協調 ITEJ 排查
- 所有驗收步驟可並行，不必嚴格按順序

🚀 **隊長，驗收清單已備妥。可開始驗收。**

