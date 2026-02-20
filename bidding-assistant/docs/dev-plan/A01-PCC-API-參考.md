---
version: "1.1"
updated: "2026-02-20"
status: "定案"
depends: []
changelog:
  - "1.1 (2026-02-20): 補完整端點、tender 詳情範例、評委資料、分析能力矩陣、API 分工定位、PCC MCP 已建工具、A02 技術備忘歸位"
  - "1.0 (2026-02-18): 初版建立，基於實際 API 測試"
---

# A01 PCC API 參考

## 基本資訊

- **API Base**: `https://pcc-api.openfun.app`
- **資料量**：1,422 萬筆公告（1999/01 ~ 2026/02/13）
- **來源**：g0v 社群，資料來自政府電子採購網 (web.pcc.gov.tw)
- **授權**：免費、無需認證、開放 CORS
- **後端**：PHP 7.4（Pix Framework）
- **維護者**：ronnywang (GitHub: ronnywang/pcc.g0v.ronny.tw)
- **前端 Viewer**：openfunltd/pcc-viewer

## 端點一覽

| 端點 | Method | 說明 | 參數 |
|------|--------|------|------|
| `/api/getinfo` | GET | 系統資訊（資料時間範圍、總數） | 無 |
| `/api/` | GET | API 端點列表 | 無 |
| `/api/searchbytitle?query=X&page=N` | GET | 按案名關鍵詞搜尋 | `query`, `page` |
| `/api/searchbycompanyname?query=X&page=N` | GET | 按廠商名搜尋所有投/得標紀錄 | `query`, `page` |
| `/api/listbydate?date=YYYYMMDD` | GET | 按日期列出 | `date` |
| `/api/listbyunit?unit_id=X` | GET | 按機關列出 | `unit_id` |
| `/api/unit` | GET | 列出機關列表 | 無 |
| `/api/tender?unit_id=X&job_number=Y` | GET | 單筆標案完整詳情 | `unit_id`, `job_number` |
| `/api/searchallspecialbudget` | GET | 列出所有特別預算 | 無 |
| `/api/searchbyspecialbudget?query=X` | GET | 搜尋特別預算標案 | `query` |

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

`/api/tender` 回傳結構為動態 key-value `detail` 物件，欄位名稱因案件類型不同而有差異。以下為實測範例：

```json
{
  "detail": {
    "採購資料:預算金額": "318,600元",
    "決標資料:底價金額": "308,100元",
    "決標資料:總決標金額": "308,100元",
    "投標廠商:投標廠商家數": "4",
    "投標廠商:投標廠商1": {
      "廠商代碼": "...",
      "廠商名稱": "...",
      "是否得標": "是/否",
      "決標金額": "308,100元",
      "廠商地址": "...",
      "是否為中小企業": "是"
    },
    "決標品項:第1品項": {
      "得標廠商原始投標金額": "316,000元",
      "決標金額": "308,100元",
      "底價金額": "308,100元",
      "未得標廠商1標價": "318,600元",
      "未得標廠商1未得標原因": "資格、規格合於招標文件但非最有利標或最優勝廠商"
    }
  }
}
```

主要資料區塊：
- **機關資料**：名稱、地址、聯絡人
- **招標資料**：案號、案名、預算、截止日、決標方式
- **決標資料**：得標者、得標金額、底價、投標家數
- **未得標者資料**：公司名、投標金額、評分排名、總分、落選原因
- **評委名單**（僅公開評選案件，詳見下節）

**欄位比對技巧**：因為欄位名稱不固定，預算金額應用 `:預算金額` 結尾匹配，而非完整 key 比對。其他金額欄位同理。

## 評委資料

**僅限「經公開評選/公開徵求之限制性招標」的決標公告**才有評委資料。最低標案件沒有（無評選委員會），招標中案件也沒有（尚未評選）。

### 實測範例（新北閱讀節 NTCLS114-002）

```json
{
  "evaluation_committee": [
    {
      "name": "陳雪菱",
      "status": "已退休",
      "sequence": "1",
      "attendance": "是",
      "experience": "國立台灣大學圖書資訊系教授"
    },
    {
      "name": "林昱美",
      "status": "已退休",
      "sequence": "2",
      "attendance": "是",
      "experience": "台大圖書館閱覽組主任兼副館長"
    }
  ]
}
```

### 欄位說明

| 欄位 | 說明 |
|------|------|
| name | 姓名 |
| status | 身份（已退休/公務人員/學者等） |
| sequence | 委員序號 |
| attendance | 是否出席 |
| experience | 經歷（服務機關、職稱、所任工作） |

## 分析能力矩陣

| 分析類型 | 可行性 | 使用端點 | 備註 |
|---------|--------|----------|------|
| 競爭對手得標率 | 可做 | searchbycompanyname | 大員洛川 139 筆 |
| 機關-廠商偏好 | 可做 | listbyunit + tender | |
| 價格競爭力 | 可做 | tender detail | 含每家投標金額 |
| 類別市場分析 | 可做 | searchbytitle | 食農教育 847 筆 |
| 評委交叉比對 | 可做 | searchbytitle + tender | 需逐筆爬詳情 |
| 評委-廠商相關性 | 可做 | 同上 | 需建三維矩陣 |
| 評委個別評分 | 不可做 | — | API 只有最終結果 |
| 非公開評選的評委 | 不可做 | — | 最低標案件無評委 |

### 評委交叉比對實作流程

```
1. searchbytitle("食農教育") → 847 筆
2. 篩選「決標公告」→ ~300-400 筆
3. 逐筆 tender detail → 擷取評委名單（需節流，每秒 1-2 次）
4. 建立 評委-機關-得標廠商 三維矩陣
5. 分析維度：
   a. 某評委出現在哪些機關（機關偏好）
   b. 某評委在場時哪家公司得標率高（廠商相關性）
   c. 某機關是否固定用同一批評委（評委班底）
```

預估時間：300 筆 × 0.5 秒 ≈ 3 分鐘/類別

## PCC API 在系統中的定位

PCC API 負責硬數據（數字、名單、投標紀錄），Perplexity 負責軟情報（政策脈絡、新聞、產業分析）。兩者互補：

| 要查的東西 | Perplexity 盲搜 | PCC API 直接給 |
|---|---|---|
| 機關近 3 年同類標案 | 不完整、可能遺漏 | searchbytitle + 篩機關 |
| 得標者/金額/投標家數 | 只查得到部分 | tender 決標資料，精確到元 |
| 未得標者名單 | 幾乎查不到 | API 直接提供（含金額、排名、原因） |
| 評委名單 | 查不到 | API 有（如案件有公佈） |
| 競爭對手全部投標紀錄 | 只能一家一家搜 | searchbycompanyname 一次拉完 |
| 大員洛川自身紀錄 | 手動拼湊 | searchbycompanyname → 139 筆 |
| 機關政策脈絡/新聞 | 擅長 | 無此資料 |
| 競爭者公司背景 | 擅長 | 只有投標紀錄 |
| 地方政治/產業脈絡 | 擅長 | 無此資料 |

## PCC MCP Server（已建成）

位置：`pcc-api-mcp/`，6 個工具：

| 工具名 | 說明 |
|--------|------|
| search_tender | 按標題搜尋標案 |
| search_company | 搜尋公司投標紀錄 |
| list_agency_tenders | 列出機關標案 |
| get_tender_detail | 取得標案詳情（含評委） |
| list_agencies | 列出機關代碼 |
| get_api_info | 取得 API 系統資訊 |

原碎片建議的 `analyze_competitor` 和 `analyze_evaluators` 屬於高階分析工具，規劃在情報模組（M01）的 analysis 層實作，不放在 MCP。

## 分頁

- 每頁 100 筆（`page` 從 1 開始）
- `total_records` / `total_pages` 提供分頁資訊
- 大員洛川：139 筆 = 2 頁

## 大員洛川相關

- **統一編號**：`89170941`
- **名稱變體**：
  - `大員洛川股份有限公司`
  - `大員洛川股份有限公司 (Tailok-Coop Co., Ltd.)`
- **搜尋方式**：`searchbycompanyname?query=大員洛川`
- **紀錄數**：139 筆（截至 2026-02-18）
- **實測分布**：page 2 樣本中得標 1 筆（唯一投標者）、未得標 39 筆
- **常見機關**：屏東縣政府、苗栗縣政府、花蓮縣政府、桃園市政府文化局、國立故宮博物院
- **常見類別**：食農教育、文化展覽、教育推廣

## 已知限制

1. **Rate limit**：短時間密集呼叫會被 429，建議每次請求間隔 300ms
2. **雲端 IP 被封**：GitHub Actions 等雲端 IP 會被 403，只能從本地或自有 server 呼叫
3. **HTTP 200 回 HTML 錯誤頁 = 端點不存在**（伺服器不回 404 status code）
4. **部分端點不穩定**：`/searchbyaward` 和 `/searchbyunit` 偶爾回 HTML 而非 JSON，需做錯誤處理
5. **資料有時間差**：來自政府電子採購網，非即時同步（已建立 `pcc-monitor/` 用 GAS 每小時監控更新延遲）
6. **標案詳情結構不固定**：不同案件的欄位名稱可能不同，需用結尾匹配方式找 key
7. **Python urllib 預設 User-Agent 會被 403**：用 curl 或加自訂 User-Agent
8. **搜尋只吃名稱不吃統編**：無法用統編直接搜尋，但搜尋結果中包含統編
9. **不同資料源記錄數不一致**：openfun API 與 mlwmlw.org 的同一家公司記錄數可能不同。金額分析用 mlwmlw，行為分析用 openfun
