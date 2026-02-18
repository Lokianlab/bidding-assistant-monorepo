# PCC API 更新延遲監控

監控 g0v PCC API (`pcc-api.openfun.app`) 的資料更新頻率，
測量公告日期和 API 可查詢時間之間的延遲。

## 使用方式

### 持續監控（每 4 小時檢查）
```
雙擊 start-monitor.bat
```
或
```
node pcc-monitor/monitor.mjs
```

### 只跑一次
```
node pcc-monitor/monitor.mjs --once
```

### 自訂檢查間隔（小時）
```
node pcc-monitor/monitor.mjs --interval 2
```

### 查看分析報告
```
node pcc-monitor/analyze.mjs
```

## 產出檔案

| 檔案 | 說明 |
|------|------|
| `state.json` | 上次檢查的狀態（最新資料時間 + 總數） |
| `update-log.jsonl` | 所有檢查記錄（每行一筆 JSON） |

## 記錄類型

- `init` — 首次執行，建立基準
- `no_change` — 檢查時資料未更新
- `update_detected` — 偵測到新資料，含延遲計算
- `error` — API 請求失敗

## 延遲計算邏輯

- **延遲上限** = 偵測時間 − 資料日期（實際延遲可能更短）
- **延遲窗口** = [上次檢查到現在, 資料日期到現在]（實際延遲在此區間內）
- 需要持續監控 1-2 週才能得出可靠結論
