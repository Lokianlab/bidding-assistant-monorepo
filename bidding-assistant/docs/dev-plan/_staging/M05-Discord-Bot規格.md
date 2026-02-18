# 暫存：Discord Bot 完整規格

- **目標文件**：M05-Discord-Bot.md
- **操作**：新增（完整內容）
- **來源對話**：Discord Bot 架構討論（2026-02-18）

## 內容

### 定位

- Discord = 日常操作介面（駕駛座），Web app = 管理後台
- 團隊已在使用 Discord，bot 嵌入既有環境

### 頻道結構

```
📂 標案系統
├── #標案公告        bot 單向推播（新案通知、截標提醒）
├── #標案指令台      通用指令
└── 📋 標案工作區    Forum 頻道｜每案一帖
         標籤：🔵新案 🟡分析中 🟠寫作中 🔴審查中 ✅已投標 ⚫結案
```

### 指令清單（7 大類）

1. 案件管理：`/case new`, `/case list`, `/case info`, `/case claim`, `/case status`, `/case deadline`
2. 戰略分析：`/p-report`, `/l1`, `/l1 summary`, `/bid-decision`
3. 寫作流程：`/l2`, `/l3 <章節>`, `/l3 status`, `/l4`
4. 品質閘門：`/check facts`, `/check requirements`, `/check feasibility`, `/check all`
5. 知識庫：`/kb search`, `/kb team`, `/kb portfolio`, `/kb sop`, `/kb add`
6. 文件輸出：`/export proposal`, `/export slides`, `/export l1`, `/export checklist`
7. 自動推播：新標案匹配、截標倒數 7/3 天、品質閘門未過、階段變更

### Discord vs Web app 分工

| 功能 | Discord | Web app |
|------|---------|---------|
| 上傳/輸入文件 | **主要入口** | 備用 |
| 下指令（L1-L8） | **主要** | 不做 |
| 知識庫查詢 | 快速查 | 完整編輯 |
| 統計/分析報表 | ❌ | **主要** |
| 系統設定 | ❌ | **主要** |

### 開發優先序

- P0：案件管理基礎
- P1：戰略分析 + 知識庫
- P2：寫作 + 品質閘門
- P3：自動推播
- P4：完整 L5-L8
