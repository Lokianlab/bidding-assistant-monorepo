# 本地 Notion MCP Server 規格（2026-02-18）

## 為什麼要建

- 雲端 Notion MCP（Claude.ai 連結）只有 Claude 能用
- Agent Team 的品管官（GPT）、知識官（Gemini）也需要存取 Notion
- 本地 MCP 走標準協議，三家 CLI 都能用
- 封裝標案業務邏輯，agent 不需要懂 Notion schema

## 技術規格

```
notion-mcp/
  src/index.ts     ← MCP server（@modelcontextprotocol/sdk + @notionhq/client）
  dist/index.js    ← 編譯後
  package.json
  tsconfig.json
```

- 結構同 smugmug-mcp
- 認證：NOTION_TOKEN + 各 database ID（env vars）
- 註冊到 .mcp.json（專案根目錄）

## Notion 資料結構

```
Notion
├── 案件資料庫（主庫）
│   ├── 案號、案名、機關、預算、截標日
│   ├── 狀態（追蹤中/分析中/寫作中/已投標/結案）
│   ├── 企劃認領人
│   ├── L1-L8 進度
│   └── 備標評估文件（PDF 嵌入）
│
├── 知識庫
│   ├── 00A 團隊資料庫
│   ├── 00B 實績資料庫
│   ├── 00C 時程範本庫
│   ├── 00D 應變 SOP 庫
│   ├── 00E 案後檢討庫
│   └── 00F 創意庫
│
└── 執行企劃作業流程工作手冊（30 節點）
```

## 工具清單（15 個）

### 一、案件管理（5 個）— 給 Orchestrator / Bot

| 工具 | 說明 | 參數 | 對應 Discord 指令 |
|------|------|------|------------------|
| `list_cases` | 列出案件 | `status?`, `assignee?`, `deadline_before?` | `/case list` |
| `get_case` | 取得單一案件完整資料 | `case_id` | `/case info` |
| `create_case` | 建立新案件 | `title`, `agency`, `budget`, `deadline` | `/case new` |
| `update_case` | 更新案件欄位 | `case_id`, `fields{}` | `/case status`, `/case claim` |
| `list_deadlines` | 列出所有截標日（排序） | `days_ahead?` | `/case deadline` |

### 二、知識庫讀取（5 個）— 給知識官

| 工具 | 說明 | 參數 | 對應 Discord 指令 |
|------|------|------|------------------|
| `kb_search` | 全文搜尋 00A-00F | `query`, `category?`（00A-00F） | `/kb search` |
| `kb_get_team` | 查團隊成員（00A） | `keyword?` | `/kb team` |
| `kb_get_portfolio` | 查相關實績（00B） | `keyword` | `/kb portfolio` |
| `kb_get_sop` | 查 SOP（00D） | `keyword` | `/kb sop` |
| `kb_get_review` | 查案後檢討（00E） | `keyword?` | 知識官內部用 |

### 三、知識庫寫入（2 個）— 給知識官結案回流

| 工具 | 說明 | 參數 | 對應場景 |
|------|------|------|---------|
| `kb_add_entry` | 新增條目 | `category`, `title`, `content` | `/kb add`、結案回流 |
| `kb_update_entry` | 更新條目 | `entry_id`, `content` | 結案回流（T1 精靈更新） |

### 四、案件上下文存取（3 個）— 給所有 agent

| 工具 | 說明 | 參數 | 對應場景 |
|------|------|------|---------|
| `save_artifact` | 存入案件產物 | `case_id`, `type`（l1/l2/chapter/review/...）, `content` | 每個 agent 完成工作後 |
| `get_artifact` | 取得案件產物 | `case_id`, `type`, `chapter?` | agent 開工前載入上下文 |
| `list_artifacts` | 列出某案所有產物 | `case_id` | `/l3 status` |

## 使用場景對照

### 知識官找資料
```
Discord: /l3 第二章（團隊規劃）
  → Orchestrator 派知識官
  → 知識官呼叫 kb_get_team() + kb_get_portfolio("食農")
  → 拿到團隊資料 + 相關實績
  → 交給企劃官寫第二章
```

### 品管官查事實
```
Discord: /check facts
  → 品管官讀到「陳老師 10 年經驗」
  → 呼叫 kb_get_team("陳") → 00A 記錄是 8 年
  → 報告：事實錯誤
```

### 結案回流
```
案件結案 → Orchestrator 派知識官
  → 知識官呼叫 kb_add_entry(category="00E", title="113年食農案檢討", content="...")
  → 再呼叫 kb_update_entry() 更新 00A（團隊新增食農經驗）、00B（新增實績）
```

### Orchestrator 管案件
```
Discord: /case new（上傳招標文件）
  → Orchestrator 呼叫 create_case(title="食農教育推廣", agency="台南市教育局", ...)
  → 建好 Notion 頁面 + 回傳案號
  → 自動建 Discord Forum 帖
```

## 跟雲端 Notion MCP 的關係

| | 雲端 Notion MCP | 本地 Notion MCP |
|---|---|---|
| 定位 | 通用 Notion 操作 | 標案系統專用 |
| 能用的 provider | 只有 Claude | Claude / GPT / Gemini |
| 業務邏輯 | 無（通用 CRUD） | 有（案件管理、KB 分類、產物存取） |
| 何時用 | 開發/除錯時直接操作 Notion | 產品層 agent 日常使用 |

兩者並存，不衝突。雲端版用於臨時操作，本地版用於系統自動化。

## 需要的環境變數

```
NOTION_TOKEN=ntn_xxxxx
NOTION_CASE_DB_ID=xxx          # 案件資料庫
NOTION_KB_TEAM_DB_ID=xxx       # 00A 團隊
NOTION_KB_PORTFOLIO_DB_ID=xxx  # 00B 實績
NOTION_KB_SCHEDULE_DB_ID=xxx   # 00C 時程
NOTION_KB_SOP_DB_ID=xxx        # 00D 應變
NOTION_KB_REVIEW_DB_ID=xxx     # 00E 檢討
NOTION_KB_CREATIVE_DB_ID=xxx   # 00F 創意
```

## 開發優先序

1. 案件管理 5 個工具（P0 需要）
2. 知識庫讀取 5 個工具（P1 需要）
3. 案件上下文 3 個工具（P1 需要）
4. 知識庫寫入 2 個工具（P4 落標學習需要）

## 待確認

- [ ] 各 Notion database 的實際 ID
- [ ] 案件資料庫的 property schema（欄位名稱、類型）
- [ ] 知識庫各庫的 property schema
- [ ] 案件產物要存在 Notion page blocks 裡還是另開 database
- [ ] 是否需要快取機制（KB 不常變，可減少 API 呼叫）
