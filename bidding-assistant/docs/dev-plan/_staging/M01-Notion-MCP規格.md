# 暫存：本地 Notion MCP Server 規格

- **目標文件**：M01-情報模組.md（或新建獨立文件）
- **操作**：新增
- **來源對話**：Notion MCP 架構討論（2026-02-18）

## 內容

### 為什麼要建本地 Notion MCP

- 雲端 Notion MCP 只有 Claude 能用
- Agent Team 的品管官（GPT）、知識官（Gemini）也需要存取 Notion
- 本地 MCP 走標準協議，三家 CLI 都能用
- 封裝標案業務邏輯，agent 不需要懂 Notion schema

### 工具清單（15 個）

**案件管理（5 個）**：list_cases, get_case, create_case, update_case, list_deadlines

**知識庫讀取（5 個）**：kb_search, kb_get_team, kb_get_portfolio, kb_get_sop, kb_get_review

**知識庫寫入（2 個）**：kb_add_entry, kb_update_entry

**案件上下文（3 個）**：save_artifact, get_artifact, list_artifacts

### 開發優先序

1. 案件管理 5 工具（P0）
2. 知識庫讀取 5 工具（P1）
3. 案件上下文 3 工具（P1）
4. 知識庫寫入 2 工具（P4）

### 跟雲端 Notion MCP 的關係

兩者並存：雲端版用於臨時操作，本地版用於系統自動化。
