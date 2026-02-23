# M02 Phase 3a 實裝檢查清單

**狀態**：預備清單（待 Z1FV 設計審查確認後啟動）
**預計時程**：2026-02-25 ~ 2026-02-26（1.5 天）
**目標**：完成 kbClient + kbCache + 基礎測試 + 整合勾點

---

## 工作分解（Work Breakdown）

### A. kbClient.ts 實裝

#### A1. 型別與介面

- [ ] `ApiError` 介面（status, message, retryable）
- [ ] `ClientConfig` 型別（timeout, maxRetries）
- [ ] API 回應型別（`CreateItemResponse`, `UpdateItemResponse`, `GetItemsResponse` 等）

#### A2. API 方法實裝

| 方法 | 端點 | 輸入 | 輸出 | 備註 |
|------|------|------|------|------|
| `getItems()` | GET /api/kb/search | kbId, filters | {items, total} | 含分頁 |
| `createItem()` | POST /api/kb/items | kbId, data | KBEntry | 自動生成 ID |
| `updateItem()` | PUT /api/kb/items/:id | kbId, id, updates | KBEntry | 時間戳自動更新 |
| `deleteItem()` | DELETE /api/kb/items/:id | kbId, id | void | 軟刪除或硬刪除？ |
| `getStats()` | GET /api/kb/stats | - | Record<string, number> | 各類別統計 |

#### A3. 內部邏輯

- [ ] `request()` 方法實裝（fetch + AbortController）
- [ ] 重試邏輯（exponential backoff，指數退避）
- [ ] Timeout 處理（abort signal）
- [ ] 錯誤分類（重試 vs 無法重試）
- [ ] 日誌記錄（logger.info / logger.error）

#### A4. 邊界條件

- [ ] 網路不可達時的錯誤訊息
- [ ] 401 Unauthorized 処理（需要重新登入？）
- [ ] 400 Bad Request 処理（輸入驗證由 hook 負責還是客戶端？）
- [ ] 429 Rate Limit 処理（退避多久？）
- [ ] 500+ Server Error 処理（重試 + 最後放棄）

#### A5. 認證

- [ ] 從 session 讀取 auth token？
- [ ] 還是由 middleware 自動注入？
- [ ] x-user-id header 來源

### B. kbCache.ts 實裝

#### B1. 資料結構

- [ ] `CacheMetadata` 介面（lastSyncTime, version）
- [ ] `SyncQueueItem` 介面（id, kbId, operation, data, timestamp, attempts）
- [ ] localStorage key 命名規則（CACHE_KEY, QUEUE_KEY）

#### B2. 快取操作

- [ ] `load()` — 從 localStorage 讀取快取 + 隊列
- [ ] `save()` — 寫入 localStorage（含元資料）
- [ ] 版本檢查 & 自動升級邏輯
- [ ] 損壞資料恢復（catch block）

#### B3. 隊列管理

- [ ] `queueOperation()` — 新增待上傳項目
- [ ] `getQueue()` — 取得所有待上傳
- [ ] `clearQueueItem()` — 成功後刪除
- [ ] `incrementRetries()` — 失敗後遞增重試次數
- [ ] `persistQueue()` — 隊列變更時自動儲存

#### B4. 邊界條件

- [ ] localStorage quota 超限時的處理（5MB 限制）
- [ ] 同時開多個瀏覽器分頁時的衝突（單一來源原則）
- [ ] 清理過期資料（lastSyncTime > 30 天？）

### C. useKnowledgeBase.ts 改寫（關鍵部分）

#### C1. 初始化階段

- [ ] `useEffect(() => { load cache + trigger initial sync })`
- [ ] Hydration 檢查（避免 SSR 讀 localStorage）
- [ ] 錯誤降級（API 失敗 → 用快取）
- [ ] 隊列恢復（重啟時重新掃描待上傳項）

#### C2. CRUD 方法改寫

| 方法 | 變更 | 備註 |
|------|------|------|
| `addEntry()` | 立即更新本地 + queue → 異步提交 | 新增 ID 生成邏輯 |
| `updateEntry()` | 立即更新 + queue | 時間戳處理 |
| `deleteEntry()` | 立即刪除 + queue | 軟刪除還是硬刪除？ |

#### C3. 背景同步

- [ ] `performBackgroundSync()` — 遍歷隊列逐項提交
- [ ] 重試邏輯（失敗 > 5 次後放棄 + 通知）
- [ ] 同步順序（FIFO？按優先級？）
- [ ] 批量操作最佳化（多項可以合併提交嗎？）

#### C4. 定期檢查遠端變更

- [ ] `checkRemoteChanges()` — 定時輪詢 GET /api/kb/stats
- [ ] 時間戳比較邏輯
- [ ] 變更拉回機制（pull → merge）

#### C5. 衝突解決

- [ ] `detectConflict()` — 識別本地 vs 遠端時間戳衝突
- [ ] `resolveConflict()` — Last-Write-Wins 邏輯
- [ ] 衝突通知（設定 `conflicts` 狀態 → UI 警告）

#### C6. 回傳值

```ts
return {
  data,              // 當前知識庫資料
  hydrated,          // 是否已初始化
  syncing,           // 是否正在同步
  conflicts,         // [{kbId, id, local, remote}]

  // 新增方法
  addEntry,
  updateEntry,
  deleteEntry,

  // 同步控制（暴露給 UI 或測試用）
  forceSync?: () => Promise<void>;
  clearQueue?: () => void;
};
```

### D. 測試框架骨架

#### D1. kbClient.test.ts（18 tests）

**分類**：
- API 呼叫正確性（6）— GET, POST, PUT, DELETE, timeout, 400 error
- 重試邏輯（4）— success on 2nd try, fail after max retries, exponential backoff
- 錯誤分類（4）— 401 vs 500 vs network error, retryable flag
- 邊界條件（4）— empty response, large payload, concurrent requests, rate limit

#### D2. kbCache.test.ts（16 tests）

**分類**：
- 快取 I/O（4）— load empty, load valid, save, load corrupted
- 隊列管理（6）— queue op, get queue, clear item, increment retries, persist
- 版本檢查（2）— upgrade, downgrade
- 邊界條件（4）— quota exceeded, duplicate keys, concurrent access

#### D3. useKnowledgeBase.test.ts（改寫現有 + 新增）

**現有**（保留驗證）：
- localStorage 讀寫（2）
- CRUD 基本流程（6）

**新增**（32 → 總計）：
- 初始化（4）— with API, without API, with queue, hydration
- API 同步（6）— background sync, queue processing, error handling
- 衝突（4）— LWW logic, conflict detection, notification
- 定期檢查（4）— remote change detection, merge logic
- 邊界（8）— timeout, retry exhausted, offline mode, network restore

#### D4. offline-sync.test.ts（新增整合測試，24 tests）

**場景**：
1. **離線轉線上**（6）
   - 創建新項目 → 離線 → 上線 → 驗證 API 有收到
   - 修改項目 → 離線 → 上線 → 衝突解決
   - 刪除項目 → 離線 → 上線

2. **批量操作**（6）
   - 5+ 項修改 → 離線 → 上線 → 驗證順序

3. **並行修改**（6）
   - 本地修改 + API 推送同時發生 → 衝突解決

4. **重試與恢復**（6）
   - 3 次失敗後重試成功
   - 最大重試次數後放棄
   - 網路恢復後繼續同步

### E. 型別與常數補充

- [ ] KB API 回應型別（src/lib/knowledge-base/types.ts 擴充）
- [ ] 錯誤代碼常數（src/lib/knowledge-base/constants.ts）
- [ ] 日誌標籤 logger.info("kb", ...)

### F. 整合勾點

- [ ] useKnowledgeBase 的 UI 元件迴圈（檢查現有元件是否相容 API 版本）
- [ ] 離線模式 UI 指示（syncing, conflicts 狀態）
- [ ] 錯誤通知（同步失敗時 toast）

---

## 細節決策表

| 議題 | 待決 | A44T 草案 | 備註 |
|------|------|----------|------|
| **deleteItem 方式** | ❓ | 軟刪除（status = "deleted"） | 便於恢復，但查詢需過濾 |
| **認證來源** | ❓ | 從 session 或 middleware | Phase 2 已實裝 withKBAuth |
| **衝突通知 UI** | ❓ | 設定 `conflicts[]` 狀態 | UI 決定是否顯示 toast/modal |
| **隊列 max size** | ❓ | 1000 項（防爆） | localStorage ~5MB 限制 |
| **重試 max** | ❓ | 5 次（~3min 退避） | 超過自動放棄 + 日誌警告 |
| **sync 頻率** | ❓ | 30s 定期 + 背景 | 操作後 500ms 觸發 |

---

## 驗收標準（Z1FV 確認點）

- [ ] 程式碼風格一致（與現有 Phase 2 相符）
- [ ] TS 型別完整無 `any`（除必要的 fetch response）
- [ ] 所有 API 呼叫有重試邏輯
- [ ] 所有 localStorage 操作有 try-catch
- [ ] 測試覆蓋率 > 85%（90+ 新增測試）
- [ ] build 成功，無 TS 錯誤
- [ ] 現有 3979 tests 仍然通過（無回歸）

---

## 後續流程

1. **Z1FV 設計審查** → 確認架構方向
2. **A44T Phase 3a 啟動**：
   - 根據本清單逐項實裝
   - 每完成 A/B/C 一個模組提交測試
   - 週期性測試驗證（npm test）
3. **Z1FV Phase 3b 前置審查**：
   - 檢視 A/B/C 的實裝代碼
   - 確認 D 的測試框架
4. **A44T Phase 3b 啟動**：
   - useKnowledgeBase 改寫
   - 離線整合測試
   - 最終驗收

---

_準備清單由 A44T 編制，待 Z1FV 確認起動時點_
