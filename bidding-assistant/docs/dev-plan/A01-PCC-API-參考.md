---
version: "1.0"
updated: "2026-02-18"
status: "定案"
depends: []
changelog:
  - "1.0 (2026-02-18): 初版建立，基於實際 API 測試"
---

# A01 PCC API 參考

## 基本資訊

- **API Base**: `https://pcc-api.openfun.app`
- **來源**：g0v 社群，資料來自政府電子採購網 (web.pcc.gov.tw)
- **授權**：免費、無需認證、開放 CORS
- **後端**：PHP 7.4（Pix Framework）
- **維護者**：ronnywang (GitHub: ronnywang/pcc.g0v.ronny.tw)
- **前端 Viewer**：openfunltd/pcc-viewer

## 端點一覽

| 端點 | Method | 說明 |
|------|--------|------|
| `/api/searchbytitle?query=X&page=N` | GET | 按案名關鍵詞搜尋 |
| `/api/searchbycompanyname?query=X&page=N` | GET | 按廠商名搜尋所有投/得標紀錄 |
| `/api/listbydate?date=YYYYMMDD` | GET | 按日期列出 |
| `/api/listbyunit?unit_id=X` | GET | 按機關列出 |
| `/api/tender?unit_id=X&job_number=Y` | GET | 單筆標案完整詳情 |
| `/api/getinfo` | GET | API 資訊 |

**注意**：`searchbycompany` 不存在（會回 200 + HTML 錯誤頁），正確是 `searchbycompanyname`。

## 搜尋回應結構

```json
{
  "query": "大員洛川",
  "page": 1,
  "total_records": 139,
  "total_pages": 2,
  "took": 0.40,
  "records": [
    {
      "date": 20260211,
      "filename": "...",
      "brief": {
        "type": "決標公告",
        "title": "114學年度榕城舞會",
        "companies": {
          "ids": ["45135067", "89170941"],
          "names": ["杳桓有限公司", "大員洛川股份有限公司 (Tailok-Coop Co., Ltd.)"],
          "id_key": {
            "45135067": ["投標廠商:投標廠商1:廠商代碼"],
            "89170941": ["投標廠商:投標廠商2:廠商代碼"]
          },
          "name_key": {
            "杳桓有限公司": [
              "投標廠商:投標廠商1:廠商名稱",
              "決標品項:第1品項:得標廠商1:得標廠商"
            ],
            "大員洛川股份有限公司 (Tailok-Coop Co., Ltd.)": [
              "投標廠商:投標廠商2:廠商名稱",
              "決標品項:第1品項:未得標廠商1:未得標廠商"
            ]
          }
        }
      },
      "job_number": "11503",
      "unit_id": "3.76.62",
      "unit_name": "臺北市立大同高級中學",
      "unit_api_url": "https://pcc-api.openfun.app/api/listbyunit?unit_id=3.76.62",
      "tender_api_url": "https://pcc-api.openfun.app/api/tender?unit_id=3.76.62&job_number=11503",
      "unit_url": "https://web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?...",
      "url": "https://web.pcc.gov.tw/..."
    }
  ]
}
```

## 公司角色解析

`name_key` 的值陣列描述公司在該案的角色：

| 角色字串模式 | 意義 |
|---|---|
| `投標廠商:投標廠商N:廠商名稱` | 投標者（只知道投了標） |
| `決標品項:第N品項:得標廠商M:得標廠商` | **得標者** |
| `決標品項:第N品項:未得標廠商M:未得標廠商` | **未得標者** |

同一公司可能同時出現在多個角色（如既是投標廠商又是未得標廠商）。

## 標案詳情（tender）

`/api/tender` 回傳結構為動態 key-value，包含：

- 機關資料（名稱、地址、聯絡人）
- 招標資料（案號、案名、預算、截止日、決標方式）
- **決標資料**：得標者、得標金額、底價、投標家數
- **未得標者資料**：公司名、投標金額、評分排名、總分、落選原因
- **評委名單**（非每案都有）：姓名、職稱、機構、專長、出席紀錄

## 分頁

- 每頁 100 筆（`page` 從 0 或 1 開始，需測試）
- `total_records` / `total_pages` 提供分頁資訊
- 大員洛川：139 筆 = 2 頁

## 大員洛川相關

- **統一編號**：`89170941`
- **名稱變體**：
  - `大員洛川股份有限公司`
  - `大員洛川股份有限公司 (Tailok-Coop Co., Ltd.)`
- **搜尋方式**：`searchbycompanyname?query=大員洛川`
- **紀錄數**：139 筆（截至 2026-02-18）

## 已知限制

1. **無 rate limit 文件** — 建議每次請求間隔 300ms
2. **HTTP 200 回 HTML 錯誤頁 = 端點不存在**（伺服器不回 404 status code）
3. **資料有時間差** — 來自政府電子採購網，非即時同步
4. **標案詳情結構不固定** — 不同案件的欄位名稱可能不同，需用搜尋方式找 key
5. **Python urllib 預設 User-Agent 會被 403** — 用 curl 或加自訂 User-Agent
6. **搜尋只吃名稱不吃統編** — 無法用統編直接搜尋，但搜尋結果中包含統編
