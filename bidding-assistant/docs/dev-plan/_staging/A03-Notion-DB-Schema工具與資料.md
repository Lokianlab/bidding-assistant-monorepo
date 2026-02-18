# 暫存：Notion DB Schema 解析工具與 Views 結構

- **目標文件**：`M01-情報模組.md`（Notion MCP 開發參考）
- **操作**：新增（附錄資料）
- **來源對話**：舊 OneDrive 記憶檔清查（2026-02-19）
- **原始位置**：`~/.claude/projects/C--Users-gary2-OneDrive----cc--/243fd02b.../tool-results/`

## 背景

在開發 Notion MCP 前，需要了解 Notion 案件資料庫的完整結構。
以下資料從 Notion API 回應中解析取得，記錄了所有 views 的 filter、sort、display columns。

---

## 工具：parse_views.py

解析 Notion API 回傳的 views XML 結構，輸出人類可讀的 view 定義。

```python
import json, re, sys

def parse_views(filename, db_name):
    with open(filename, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8')
    data = json.loads(text)
    content = data[0]['text']

    BS = chr(92)  # backslash
    QT = chr(34)  # double quote
    NL = chr(10)  # newline

    unescaped = content.replace(BS + 'n', NL).replace(BS + QT, QT).replace(BS + BS, BS)

    views_start = unescaped.find('<views>')
    views_end = unescaped.find('</views>')
    if views_start == -1:
        print(f'{db_name}: No views')
        return

    views_section = unescaped[views_start:views_end]
    blocks = views_section.split('</view>')
    blocks = [b for b in blocks if 'view://' in b]

    print(f'{db_name}: {len(blocks)} views')
    print('=' * 60)

    for i, block in enumerate(blocks):
        vid_m = re.search(r'view://([a-f0-9-]+)', block)
        vid = vid_m.group(1) if vid_m else '?'

        json_start = block.find('{', block.rfind('>'))
        if json_start == -1:
            print(f'View {i+1}: no JSON')
            continue

        raw_json = block[json_start:]

        try:
            vdata = json.loads(raw_json)
        except json.JSONDecodeError as e:
            print(f'View {i+1} (ID: {vid}): JSON parse failed: {e}')
            continue

        vtype = vdata.get('type', '?')
        print(f'View {i+1} (ID: {vid}) Type: {vtype}')

        for key, label in [('dataSourceUrl','DataSource'), ('groupBy','GroupBy'),
                           ('boardGroupBy','BoardGroupBy'), ('calendarBy','CalendarBy'),
                           ('timelineBy','TimelineBy'), ('timelineEndBy','TimelineEndBy'),
                           ('boardCardSize','CardSize')]:
            val = vdata.get(key, '')
            if val:
                print(f'  {label}: {val}')

        for s in vdata.get('sort', []):
            print(f'  Sort: {s.get("property","?")} {s.get("direction","?")}')

        af = vdata.get('advancedFilter', {})
        if af:
            top_op = af.get('operator', '?')
            filters = af.get('filters', [])
            print(f'  Filter ({top_op}, {len(filters)} conditions):')

            def print_filter(flt, indent=4):
                if 'property' in flt:
                    val = flt.get('value', '')
                    if isinstance(val, list):
                        val_str = ', '.join([str(v.get('value', '')) for v in val])
                    elif isinstance(val, dict):
                        val_str = str(val.get('value', val))
                    else:
                        val_str = str(val)
                    line = f'{flt["property"]} [{flt.get("propertyType","")}] {flt.get("operator","")} = {val_str[:60]}'
                    print(' ' * indent + line)
                elif 'filters' in flt:
                    sub_op = flt.get('operator', '?')
                    print(' ' * indent + f'({sub_op}):')
                    for sf in flt['filters']:
                        print_filter(sf, indent + 2)

            for flt in filters:
                print_filter(flt)

        dp = vdata.get('displayProperties', [])
        print(f'  Display columns: {len(dp)}')
        for c in dp[:8]:
            print(f'    - {c}')
        if len(dp) > 8:
            print(f'    ... and {len(dp) - 8} more')

        print()

parse_views(sys.argv[1], sys.argv[2])
```

---

## Notion 案件資料庫 Views 結構

**Collection ID**: `14cc71c7-7278-81cf-8521-000b97d017d1`

### 主資料庫（Main DB）— 2 views

#### View 1: 資料檢查表（table）
- GroupBy: 決標公告（manual sort）
- Filter: 檔案型態=紙本文件 AND (標案名稱/招標機關/截標時間/預算金額/案號/標案類型 任一為空 OR 資料有問題=True OR 決標公告!=決標歸檔)
- 用途：找出資料不完整的案件

#### View 2: 全欄位表（table）
- 無 filter，顯示全部 89 個欄位
- 用途：瀏覽完整資料

### 子資料庫 DB1 — 5 views

#### View 1: 備標中案件（table）
- Filter: 截標>=今天 AND 備標決策=請行政人員領標填印/第一順位/請行政人員封標交寄 AND 未完成 AND (確定協作 OR 企劃註記非空) AND 備標進度不含建議書完稿
- 顯示 20 欄（逾期/不參與投標/第二順位/企劃完成/標單已交遞/標案進程/企劃主筆/備標期限...）

#### View 2: 第二順位案件（table）
- Filter: 截標>=今天 AND 備標決策=第二順位 AND 未完成
- 顯示 18 欄

#### View 3: 第三順位案件（table）
- Filter: 截標>=今天 AND 備標決策=第三順位 AND 未完成
- 顯示 19 欄

#### View 4: 時間軸（timeline）
- TimelineBy: 公告日
- Filter: 非保險 AND 截標>=今天 AND 第一順位/領標/封標 AND 未完成
- 顯示 3 欄（標案名稱/不參與投標/逾期）

#### View 5: 待確認協作（table）
- Filter: (截標>=今天 AND 入選+各順位+領標封標 AND 未完成 AND 確定協作=False) OR (進行中/待辦 AND 入選 AND 確定協作=True)
- 顯示 16 欄

### 子資料庫 DB2 — 4 views

#### View 1: 看板（board）
- GroupBy: 備標決策（manual sort）
- Filter: 截標>=今天 AND 備標決策=領標/第一/封標/第二/第三/入選 AND 未完成 AND 確定協作=True
- 顯示 5 欄（標案名稱/預算金額/備標期限/截標時間/投標地址）

#### View 2: 行事曆 — 應啟動日（calendar）
- CalendarBy: 應啟動日
- Filter: 截標>=昨天 AND 進程未完成 AND 確定協作=True

#### View 3: 行事曆 — 備標期限（calendar）
- CalendarBy: 備標期限
- Filter: 非保險 AND 截標>=今天 AND 第一順位+領標封標 AND 未完成 AND 確定協作=True

#### View 4: 行事曆 — 截標時間（calendar）
- CalendarBy: 截標時間
- Filter: 截標>=昨天 AND 進程未完成 AND 確定協作=True

---

## 已知欄位清單（從 views 提取）

### 核心欄位
- `標案名稱` (title)
- `招標機關` (text)
- `案號` (text)
- `案件唯一碼`
- `歸檔號`
- `預算金額` (number)

### 時間欄位
- `截標時間` (date)
- `備標期限`
- `公告日`
- `應啟動日`

### 狀態欄位
- `標案進程` (status): To-do / In progress / Complete / 競標階段 / 已出席簡報 / 已投標
- `備標決策` (select): 入選 / 第一順位案件 / 第二順位案件 / 第三順位案件 / 請行政人員領標填印 / 請行政人員封標交寄
- `決標公告` (select): 決標歸檔 / ...
- `備標進度` (multi_select): 建議書完稿 / ...

### 分類欄位
- `標案類型` (multi_select): D1. 保險採購 / ...
- `檔案型態` (select): 紙本文件 / ...
- `評審方式`
- `決標方式`
- `電子投標`

### 人員/協作欄位
- `企劃主筆`
- `企劃註記` (select)
- `確定協作` (checkbox)
- `檢新人員`
- `資料有問題` (checkbox)

### 標記欄位
- `逾期`
- `不參與投標`
- `第一順位` / `第二順位` / `第三順位`
- `企劃完成`
- `標單已交遞`
- `分析作業完成`
- `投標地址`

### 完整欄位
View 2 顯示共 89 個欄位，上方僅列出從 filter/display 中可見的部分。
完整欄位需從 Notion API 的 `retrieve database` 端點取得。
