# 知識庫初始化工作流程

> **文件層級**：L2 方法論（執行工作手冊）
> **狀態**：v0.1 草稿，待 Jin 授權啟動
> **出處**：基於 AINL 初始化評估報告 + Product Compass 五大知識庫架構

---

## 一、前置條件

### 授權確認清單

根據 CLAUDE.md 資料庫安全規則，需 Jin 確認三項：

- [ ] **授權範圍**：D → E → C → B 全部導入？還是分階段？
- [ ] **去重政策**：Word 檔案 18,710 個，版本複製估計 30-50%，如何處理？
- [ ] **回滾計畫**：導入出錯時的恢復策略

### 開前檢查

| 項目 | 要求 | 狀態 |
|------|------|------|
| Supabase 多租戶認證 | KB 表結構已建 | ✅ ITEJ P1c 完成 |
| 環境變數配置 | .env.example/.staging/.uat 完備 | ✅ ITEJ P1c 完成 |
| RLS 隔離規則 | 多租戶 row-level security 驗證 | ✅ ITEJ P1c 完成 |
| 備份沙盒 | Supabase staging 環境 | ✅ 可用 |

---

## 二、四階段導入計劃

### Phase 1：驗收期間（🔴 立即）

**執行負責人**：待指派
**資料量**：1 個檔案
**風險等級**：極低

#### 步驟

1. 讀取 `D. 驗收請款期間` 中的驗收紀錄
2. 抽取結構化資料：
   - 案件 ID
   - 完成日期
   - 驗收金額
   - 簽章狀態
3. 寫入 Supabase `00A_pm_records` 表
4. 驗證寫入成功（1 筆記錄）

#### SQL 範本

```sql
INSERT INTO kb.pm_records (
  case_id, case_name, completion_date,
  verified_amount, verification_status, source_path
) VALUES (
  'CASE-001', '案件名稱', '2026-02-23',
  150000, 'verified', 'D/驗收紀錄.docx'
);
```

---

### Phase 2：案件歸檔（🟠 隨後）

**執行負責人**：待指派
**資料量**：2,560 個檔案（PDF 1,521 + Excel 268 + Word 771）
**風險等級**：低
**預估工作量**：2-3 天

#### 檔案分類策略

| 檔案類型 | 處理方式 | 目標表 | 優先序 |
|---------|---------|--------|--------|
| PDF | 直接掃描 OCR 索引 | `00A_pm_records`（原文儲存） | 1️⃣ 優先 |
| Excel | 解析結構化欄位 | `00B_case_costs`, `00C_timeline` | 1️⃣ 優先 |
| Word | 去重 + 內容抽取 | `00A_pm_records`（摘要） | 2️⃣ 次之 |

#### 去重邏輯（Word 檔案）

```python
def deduplicate_word_files(folder_path):
    """
    移除版本複製，估計削減 30-50% 檔案
    """
    files = os.listdir(folder_path)

    # 1. 識別版本複製
    duplicates = []
    for f in files:
        if "- 複製" in f or "-複製" in f:
            duplicates.append(f)

    # 2. 比對 MD5 hash，保留最新修改時間的版本
    unique_files = {}
    for f in files:
        if f not in duplicates:
            content_hash = hashlib.md5(open(f, 'rb').read()).hexdigest()
            if content_hash not in unique_files:
                unique_files[content_hash] = f
            else:
                # 比較修改時間，保留更新的
                if os.path.getmtime(f) > os.path.getmtime(unique_files[content_hash]):
                    unique_files[content_hash] = f

    # 3. 統計結果
    original_count = len(files)
    unique_count = len(unique_files)
    reduction = (1 - unique_count / original_count) * 100

    print(f"原始檔案數：{original_count}")
    print(f"去重後：{unique_count}")
    print(f"削減率：{reduction:.1f}%")

    return unique_files

# 執行
phase2_dedup = deduplicate_word_files("E. 案件歸檔")
```

#### 批次導入腳本

```javascript
// Phase 2 導入主流程
async function importPhase2() {
  const phase2Config = {
    source: "E. 案件歸檔",
    batches: [
      { year: 2025, filePattern: "*2025*", target: "00A_pm_records" },
      { year: 2024, filePattern: "*2024*", target: "00A_pm_records" },
      { year: 2023, filePattern: "*2023*", target: "00A_pm_records" },
    ]
  };

  for (const batch of phase2Config.batches) {
    console.log(`[Phase 2] 導入 ${batch.year} 年案件...`);

    // 1. 掃描年度資料夾
    const files = glob.sync(`${phase2Config.source}/${batch.filePattern}`);

    // 2. 分類處理
    const pdfs = files.filter(f => f.endsWith('.pdf'));
    const excels = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    const words = files.filter(f => f.endsWith('.docx') || f.endsWith('.doc'));

    // 3. PDF：OCR + 存檔
    for (const pdf of pdfs) {
      const text = await ocrPDF(pdf);
      await db.pm_records.insert({
        case_name: extractCaseNameFromPDF(text),
        content_type: 'pdf',
        text_content: text,
        source_path: pdf,
        imported_at: new Date()
      });
    }

    // 4. Excel：結構化導入
    for (const excel of excels) {
      const data = parseExcel(excel);
      // 根據欄位名智能決定目標表
      if (hasColumn(data, ['成本', '預算', '金額'])) {
        await db.case_costs.insert(data);
      } else if (hasColumn(data, ['期程', '里程碑', '時程'])) {
        await db.timeline.insert(data);
      }
    }

    // 5. 驗證本批次
    const importCount = files.length;
    console.log(`✅ ${batch.year} 年導入完成：${importCount} 個檔案`);
  }
}
```

---

### Phase 3：執行期間（🟡 平行）

**執行負責人**：待指派
**資料量**：119 個檔案（PDF 101 + Excel 6 + Word 12）
**風險等級**：低
**可並行**：與 Phase 2 同時進行
**預估工作量**：1 天

#### 處理流程

1. PDF 優先：會議紀錄、進度文件 → `00A_pm_records` （里程碑欄位）
2. Excel：進度表 → `00C_timeline`
3. Word：程序文件 → `00A_pm_records` （內容摘要）

---

### Phase 4：備標集中區（🟡 分批）

**執行負責人**：待指派
**資料量**：30,389 個檔案（超大，需分批）
**去重後預計**：18,000-24,000 個檔案（30-40% 削減）
**風險等級**：中等（資料量大，版本複製多）
**分批策略**：按年度優先導入

#### 分批計劃

| 批次 | 年度 | 預計檔案數 | 導入順序 | 驗證通過後進行下批 |
|------|------|-----------|--------|----------------|
| 1️⃣ | 2024 | ~5,000 | 優先 | 2️⃣ |
| 2️⃣ | 2025 | ~3,000 | 隨後 | 3️⃣ |
| 3️⃣ | 2023 | ~4,000 | 隨後 | 4️⃣ |
| 4️⃣ | 2022+ | ~6,000-10,000 | 完成度優先 | — |

#### 流程控制

```yaml
Phase 4 控制點：
  - 批次 1（2024）導入完成
    ↓
  - 驗證：檔案寫入、去重檢查、RLS 隔離
    ↓
  - Jin 簽核通過？
    ├─ 是 → 啟動批次 2（2025）
    └─ 否 → 修復問題，重新驗證

  - 每批次完成後產生報告：
    - 導入檔案數
    - 去重削減率
    - 查詢效能測試
    - 儲存空間使用量
```

---

## 三、技術架構

### Supabase 表結構（快速參考）

```sql
-- 00A: PM 知識庫（案件紀錄）
CREATE TABLE kb.pm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(50) UNIQUE NOT NULL,
  case_name VARCHAR(500) NOT NULL,
  completion_date DATE,
  verified_amount DECIMAL(15,2),
  verification_status VARCHAR(50),
  source_path VARCHAR(500),
  text_content TEXT,
  imported_at TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

-- RLS 隔離
ALTER TABLE kb.pm_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_records_tenant_isolation ON kb.pm_records
  USING (auth.uid() = get_tenant_user(tenant_id));
```

### 環境變數（已由 ITEJ 提供）

```env
# .env.local (開發)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=...
KB_IMPORT_MODE=sandbox

# .env.staging
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
KB_IMPORT_MODE=staging

# .env.production
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
KB_IMPORT_MODE=production
```

---

## 四、風險與回滾

### 風險識別

| 風險 | 嚴重度 | 原因 | 因應 |
|------|--------|------|------|
| Word 檔案版本複製 | 中 | 18,710 個中 50%+ 可能重複 | 去重邏輯 + 抽樣驗證 |
| PDF 大檔案 OCR 效能 | 中 | 1,521 個 PDF 可能含掃描大檔 | 分批 OCR + 非同步佇列 |
| RLS 隔離洩漏 | 高 | 多租戶資料如果隔離失敗 = 資料洩漏 | Phase 1 後強制測試 RLS |
| 中斷恢復 | 低 | 導入中斷後如何接續 | 記錄匯入進度（phase + batch） |

### 回滾計畫

```
狀況 1：單批次失敗（如 2024 年導入出錯）
├─ 動作：DELETE FROM kb.* WHERE imported_at > @batch_start_time AND year = 2024
├─ 驗證：檢查影響行數與預期相符
└─ 重試：修復 source 資料後重新導入

狀況 2：整體隔離洩漏（RLS 失敗）
├─ 立即：停止所有新增導入
├─ 隔離：修改 RLS 規則 + 驗證
├─ 恢復：如果無法修復，從 Supabase backup 復原整個 KB schema
└─ 事後：重新測試 RLS 後才允許繼續

狀況 3：資料品質問題（去重失敗，重複資料太多）
├─ 分析：檢查去重比例是否符合預期
├─ 修正：調整去重閾值或手動清理
└─ 驗證：重新統計去重成果
```

---

## 五、成功驗收標準

Phase 1 通過後才進行後續批次。每批驗收檢查清單：

- [ ] **檔案數符合預期**：導入檔案數 ±5% 以內
- [ ] **去重成果達標**：Word 檔案削減 30-50%
- [ ] **RLS 隔離完全**：跨租戶查詢驗證，無資料洩漏
- [ ] **查詢效能合格**：基本搜尋 <200ms
- [ ] **儲存空間監控**：使用量符合預測
- [ ] **完整日誌記錄**：導入時間戳、來源路徑、狀態碼全記錄

---

## 六、人力分工

根據 governance.md：

| 階段 | 負責機器 | 任務 |
|------|---------|------|
| 授權前 | JDNE | 轉達 Jin 授權清單，獲取確認 |
| Phase 1 | 待指派 | 手動導入 1 個檔案 + RLS 隔離驗證 |
| Phase 2-3 | 待指派 | 執行批次導入 + 去重邏輯 |
| Phase 4（第一批） | 待指派 | 2024 年分批導入 + 流程驗證 |
| Phase 4（後續） | 待指派 | 按驗收結果逐批進行 |

---

## 七、現在可以做的（等待授權期間）

根據「離線自主運作」權限，JDNE 可推進：

- [ ] **深化去重方案**：實現 Word 版本檢測演算法
- [ ] **編寫導入程式碼**：Node.js + Supabase SDK 完整實作
- [ ] **建立測試沙盒**：在 Supabase staging 環境預演 Phase 1
- [ ] **效能測試計劃**：設計 OCR 批處理、查詢最佳化的測試框架
- [ ] **文件補充**：補充 Excel 欄位對應規則

---

## 八、後續里程碑

**授權確認** → Phase 1（即刻）→ 驗收 → Phase 2-3（平行）→ 驗收 → Phase 4 Batch 1（2024 年）→ 驗收 → Phase 4 後續（逐年推進）

**預計時程**：
- 授權 → 0 天
- Phase 1：0.5 天
- Phase 2-3：3-4 天
- Phase 4 Batch 1：5-7 天（含驗證）

**總計**：10-15 個工作天（授權後啟動）

---

> **版本**：v0.1 | **狀態**：待 Jin 授權啟動 | **最後更新**：2026-02-23
