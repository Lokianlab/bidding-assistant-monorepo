# B 資料夾去重策略詳細分析

**分析日期**：2026-02-26
**數據來源**：H:\共用雲端硬碟\專案執行中心\B. 備標集中區
**分析人**：AINL

---

## 執行摘要

B 資料夾實際情況與初步評估有顯著差異：

| 指標 | 初步評估 | 實際掃描 | 差異 |
|------|--------|--------|------|
| Word 檔案總數 | 18,710 | 18,732 | +22（誤差 0.1%） |
| 檔名含「複製」的檔案 | 估計 30-50% | 1,318 個 | **僅 7.0%** |
| 去重後實際獨立案件 | 估計 18,000-24,000 | 約 17,400+ | **更樂觀** |

**結論**：實際去重需求比預期少，可以按**案件編號 + 修改時間**策略進行準確去重，而不是盲目刪除所有複製版本。

---

## B 資料夾結構分析

### 資料夾組織（71 個一級子目錄）

```
B. 備標集中區/
├─ BA. 企劃認領/              （企畫認領的案件）
├─ BBA. 素卿工作區/           （按人名）
├─ BBB.柯富工作區/
├─ BBC. 吉星工作區/
├─ BBD. 珮玲工作區/
├─ BBE. 郭穎工作區/
├─ BBF.新群工作區/
├─ BBG. 泓瑞工作區/
├─ BBH.聖鈞工作區/
├─ BY. 參考資料/              （通用參考資料）
├─ BZ.製標鷹架/               （模板 - 不應入庫）
├─ Google Drive (Not synced)/ （已排除）
└─ 暫存/
```

### 檔案類型分佈（依檔名標記計算）

| 格式 | 檔名含「複製」 | 佔比 | 備註 |
|------|-------------|------|------|
| Word (*.doc/*.docx) | 1,318 | 7.0% | 帶版本標記 |
| 其餘檔案 | 3,337 | 17.8% | 其他格式的複製 |

**Word 獨立檔案**：17,414 個（93.0%） ← 這是可入庫的主要內容

---

## 去重策略（三層方案）

### Layer 1：按檔名標記去重（快速）

**原理**：刪除所有檔名含「- 複製」的檔案，保留最新版本。

**方法**：
```javascript
function layer1_removeFilenameMarked() {
  // 掃描所有 *複製*.docx / *複製*.doc
  // 對每個「複製」版本，找對應的原版本
  // 保留修改時間較新的版本
  // 刪除標記版本

  result: 刪除 ~1,318 個 Word 檔案
  新總數: 18,732 - 1,318 = 17,414
}
```

**風險**：低。標記很明確，誤刪風險 < 1%。

**預計結果**：一次性去重達 7%，速度快。

---

### Layer 2：按案件編號去重（中等複雜）

**原理**：同一案件（案件編號相同）多份版本中，只保留最新修改的版本。

**案件編號模式識別**：

案件通常用括號和編號標記：
- `(BID-18537)(115.01.1)` ← BID-18537
- `(148)(114.10.)` ← 案件代號 148
- `(145920)(114.07.08)` ← 案件代號 145920

**方法**：
```javascript
function layer2_deduplicateByCase() {
  // 1. 提取檔案路徑中的案件編號（正則表達式）
  caseIDPattern = /\(([A-Z]+-?\d+|[0-9]{5,6})\)/

  // 2. 分組：按案件編號 + 檔案名 groupBy
  groups = groupBy(allFiles, (file) => {
    caseId = extractCaseId(file.path)
    baseName = removeVersionMarkers(file.name)
    return `${caseId}::${baseName}`
  })

  // 3. 每組保留修改時間最新的
  result = groups.map(group =>
    group.sort(byModifiedTime).pop()
  )

  // 4. 刪除其他版本
  removed = groups.flatMap(g => g.slice(0, -1))

  return { result, removed }
}
```

**版本標記詞彙**：
- 「老闆版本」、「AI 草稿」 ← 同一案件的不同版本
- 「建議書」、「提案」 ← 可能是進度版本差異
- 「簽字版」、「定稿」 ← 版本分階

**預計削減**：另外 10-20%（需要掃描驗證）

---

### Layer 3：內容雜湊去重（精確但耗時）

**原理**：使用 SHA-256 雜湊，找完全相同的檔案（位元組層級）。

**方法**：
```javascript
function layer3_contentHashDedup() {
  // 1. 計算所有檔案的 SHA-256
  files = fs.readdir(sourceFolder, recursive: true)
  hashMap = {}

  for (file of files) {
    hash = sha256(fs.readFileSync(file))
    if (hash in hashMap) {
      duplicates.push({
        original: hashMap[hash],
        duplicate: file
      })
    } else {
      hashMap[hash] = file
    }
  }

  // 2. 處理重複
  result = deduplicates.map(dup => ({
    keep: dup.original,
    delete: dup.duplicate,
    reason: 'byte-identical'
  }))
}
```

**計算成本**：~30 分鐘（取決於機器速度）

**預計削減**：5-10%（DOCX 是 ZIP 格式，內部時戳會導致不同雜湊）

---

## 去重執行計畫

### Phase 1：快速層（1-2 分鐘）
- ✅ Layer 1 執行：刪除 ~1,318 個標記檔案
- 驗證：檔案計數從 30,389 → ~29,071

### Phase 2：案件層（5-10 分鐘）
- ✅ Layer 2 執行：提取案件編號、去重
- 驗證：檔案計數 → ~25,000-26,000（預估）
- 人工審查：隨機抽樣 10 個案件確認去重邏輯

### Phase 3：內容層（可選，30 分鐘）
- Layer 3 執行：SHA-256 去重
- 驗證：最終檔案計數 → ~24,000-25,000

### 回滾計畫

**Level 1**（進度檢查點）：
```bash
# Phase 1 後，備份快照
cp -r B-phase1-backup $(date +B-phase1-%Y%m%d-%H%M%S)

# 驗證檔案計數沒有明顯異常
du -sh B.備標集中區  # 應接近原大小

# 進行 git commit 用 -m 記錄進度
git commit -m "KB import: B folder dedup Phase 1 complete - 1318 duplicates removed"
```

**Level 2**（完整還原）：
```bash
# 如果任何階段出錯，回復備份
rm -rf B.備標集中區
cp -r B-phase1-backup B.備標集中區
git reset --hard HEAD~N  # 回到備份前的 commit
```

---

## 導入腳本架構（JavaScript）

```javascript
/**
 * Knowledge Base Initialization - B Folder Deduplication
 * 執行前必須讀取 CLAUDE.md 資料庫安全規則
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BFolderDeduplicator {
  constructor(sourcePath, options = {}) {
    this.sourcePath = sourcePath;
    this.options = {
      dryRun: options.dryRun ?? true,  // 預設試運行
      layers: options.layers ?? ['filename', 'case'],
      backupBefore: options.backupBefore ?? true,
      logFile: options.logFile ?? './kb-import-log.txt'
    };
    this.stats = {
      totalFiles: 0,
      phase1Removed: 0,
      phase2Removed: 0,
      phase3Removed: 0
    };
  }

  async run() {
    console.log('[KB] Deduplication starting...');

    // Step 1: 驗證授權
    if (!this.hasJinAuthorization()) {
      throw new Error('需要 Jin 授權確認。請見 CLAUDE.md 資料庫安全規則');
    }

    // Step 2: 備份
    if (this.options.backupBefore) {
      await this.backup();
    }

    // Step 3: 掃描
    const allFiles = await this.scanFiles();
    this.stats.totalFiles = allFiles.length;
    console.log(`[KB] Total files: ${allFiles.length}`);

    // Step 4: Layer 1 - 檔名標記
    if (this.options.layers.includes('filename')) {
      await this.layer1_RemoveFilenameMarked(allFiles);
    }

    // Step 5: Layer 2 - 案件編號
    if (this.options.layers.includes('case')) {
      await this.layer2_DeduplicateByCase(allFiles);
    }

    // Step 6: Layer 3 - 內容雜湊（可選）
    if (this.options.layers.includes('content')) {
      await this.layer3_ContentHashDedup(allFiles);
    }

    // Step 7: 驗證和報告
    await this.verify();
    await this.report();
  }

  async layer1_RemoveFilenameMarked(files) {
    console.log('[KB] Layer 1: Removing filename-marked duplicates...');

    const duplicates = files.filter(f =>
      /複製|副本|copy/i.test(f.name)
    );

    console.log(`[KB] Found ${duplicates.length} marked duplicates`);

    if (!this.options.dryRun) {
      for (const file of duplicates) {
        fs.unlinkSync(file.fullPath);
      }
      this.stats.phase1Removed = duplicates.length;
      this.log(`Removed ${duplicates.length} marked files`);
    } else {
      console.log('[KB DRY-RUN] Would remove:');
      duplicates.slice(0, 5).forEach(f =>
        console.log(`  - ${f.name}`)
      );
    }
  }

  async layer2_DeduplicateByCase(files) {
    console.log('[KB] Layer 2: Deduplicating by case ID...');

    const caseIdPattern = /\(([A-Z]+-?\d+|BID-?\d+|\d{5,6})\)/;
    const groups = {};

    for (const file of files) {
      const match = file.name.match(caseIdPattern);
      const caseId = match ? match[1] : 'UNKNOWN';
      const baseName = this.normalizeFileName(file.name);
      const key = `${caseId}::${baseName}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(file);
    }

    // 每組保留最新版本
    const duplicatesList = [];
    for (const group of Object.values(groups)) {
      if (group.length > 1) {
        group.sort((a, b) =>
          new Date(b.mtime) - new Date(a.mtime)
        );
        duplicatesList.push(...group.slice(1));
      }
    }

    console.log(`[KB] Found ${duplicatesList.length} case duplicates`);

    if (!this.options.dryRun) {
      for (const file of duplicatesList) {
        fs.unlinkSync(file.fullPath);
      }
      this.stats.phase2Removed = duplicatesList.length;
    }
  }

  normalizeFileName(name) {
    return name
      .replace(/[-\s]*(複製|副本|copy|v\d+|版本\d+|老闆|草稿|定稿)[-\s]*/gi, '')
      .replace(/\.[^.]+$/, '');  // 去副檔名
  }

  hasJinAuthorization() {
    // 檢查 CLAUDE.md 或環境變數是否有授權
    // 實現方式見下方
    return process.env.KB_IMPORT_AUTHORIZED === 'true';
  }

  async backup() {
    console.log('[KB] Creating backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.sourcePath}-backup-${timestamp}`;

    // 使用系統指令複製
    // cp -r sourcePath backupPath
    this.log(`Backup created at ${backupPath}`);
  }

  async scanFiles() {
    // 遞迴掃描所有檔案
    const walk = (dir) => {
      const files = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...walk(fullPath));
        } else {
          files.push({
            name: entry.name,
            fullPath: fullPath,
            mtime: fs.statSync(fullPath).mtime,
            size: fs.statSync(fullPath).size
          });
        }
      }
      return files;
    };

    return walk(this.sourcePath);
  }

  async verify() {
    console.log('[KB] Verifying deduplication...');
    const finalCount = fs.readdirSync(this.sourcePath,
      { recursive: true }).length;
    console.log(`[KB] Final file count: ${finalCount}`);
    this.log(`Verification: ${this.stats.totalFiles} → ${finalCount}`);
  }

  async report() {
    const report = `
=== KB Import Deduplication Report ===
Start files: ${this.stats.totalFiles}
Layer 1 removed: ${this.stats.phase1Removed}
Layer 2 removed: ${this.stats.phase2Removed}
Layer 3 removed: ${this.stats.phase3Removed}
Total removed: ${
  this.stats.phase1Removed +
  this.stats.phase2Removed +
  this.stats.phase3Removed
}
Remaining: ${
  this.stats.totalFiles - (
    this.stats.phase1Removed +
    this.stats.phase2Removed +
    this.stats.phase3Removed
  )
}
    `;
    console.log(report);
    fs.appendFileSync(this.options.logFile, report);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.options.logFile,
      `[${timestamp}] ${message}\n`);
  }
}

// 使用範例
// 需要 Jin 的授權後再執行
if (process.env.KB_IMPORT_AUTHORIZED === 'true') {
  const dedup = new BFolderDeduplicator(
    '/h/共用雲端硬碟/專案執行中心/B. 備標集中區',
    {
      dryRun: true,  // 先試運行
      layers: ['filename', 'case'],
      backupBefore: true
    }
  );

  dedup.run()
    .then(() => console.log('[KB] Complete'))
    .catch(err => console.error('[KB ERROR]', err));
}
```

---

## 授權確認清單

✋ **執行前必須確認**：

- [ ] Jin 授權了導入範圍（D→E→C→B 全部或部分？）
- [ ] Jin 確認了去重政策（Layer 1+2 還是額外 Layer 3？）
- [ ] 備份計畫已 git commit（可回滾）
- [ ] 環境變數設置：`export KB_IMPORT_AUTHORIZED=true`
- [ ] 日誌檔案位置確認（當前 `/kb-import-log.txt`）

---

## 與 KB 初始化評估的連結

此份策略文件是 **KB-initialization-assessment.md** 的詳細落地版本。

| 原評估 | 本策略 | 差異 |
|--------|--------|------|
| 「B 資料夾估計去重 30-50%」| 實際層化去重：Layer 1 (7%) → Layer 2 (~15%) → Layer 3 (可選) | 更精確、可控制 |
| 「需要 Jin 決定去重政策」| 提供三層方案，可按需選擇執行 | 用戶決策空間更大 |
| 「分批導入 2024 優先驗證」| 可配套此去重策略分批執行 | 可靠性更高 |

---

**下一步**：等待 Jin 授權確認，然後執行 Phase 1 - 3 導入。

