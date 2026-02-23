# 方案 A：雲原生備份實作計畫

**方案名稱**：Supabase 內建備份 + S3/GCS 檔案備份
**成本**：月 $50-100
**工時**：12 小時（ITEJ）
**RTO**：<30 分鐘（DB） / <1 小時（檔案）

---

## 架構設計

```
Supabase 自動備份
  ├─ 日級完整備份（PITR，點位恢復）
  ├─ 保留 30 天歷史
  └─ 自動存放在 Supabase 託管儲存

上傳檔案備份
  ├─ 自動上傳到 S3/GCS
  ├─ 每 6 小時同步一次
  └─ 版本控制（保留最新 10 版本）
```

---

## 實作步驟

### 第 1 天（2026-02-24）：Supabase 備份配置

#### 1.1 啟用 Supabase 自動備份

```bash
# 透過 Supabase Dashboard 啟用
# https://app.supabase.com → Project Settings → Backups

# 設定備份策略
- Backup Frequency: Daily
- Retention: 30 days (PITR)
- Auto-backup: Enabled
```

#### 1.2 測試備份恢復

```bash
# 在 Supabase Dashboard 測試點位恢復
# 選擇時間點 → Preview Recovery → 驗證資料
```

### 第 2 天（2026-02-25）：檔案備份實作

#### 2.1 配置 S3/GCS 儲存桶

```bash
# AWS S3（示例）
aws s3api create-bucket \
  --bucket bidding-assistant-backups \
  --region us-east-1

# 設定生命週期策略（自動刪除 90 天前的備份）
aws s3api put-bucket-lifecycle-configuration \
  --bucket bidding-assistant-backups \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json**：
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "ExpirationInDays": 90
    }
  ]
}
```

#### 2.2 編寫備份 Job

**src/lib/backup/s3-sync.ts**：
```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function syncKBFilesToS3() {
  // 掃描知識庫上傳目錄
  const kbDir = './data/kb-uploads';
  const files = fs.readdirSync(kbDir);

  for (const file of files) {
    const filePath = `${kbDir}/${file}`;
    const fileStream = fs.createReadStream(filePath);

    await s3.upload({
      Bucket: 'bidding-assistant-backups',
      Key: `kb-files/${new Date().toISOString()}/${file}`,
      Body: fileStream,
    }).promise();
  }

  console.log(`✅ Synced ${files.length} files to S3`);
}
```

#### 2.3 設定定時備份

**使用 GitHub Actions**：

**.github/workflows/backup-s3.yml**：
```yaml
name: S3 Backup

on:
  schedule:
    - cron: '0 */6 * * *'  # 每 6 小時執行

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Sync KB files to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npx ts-node src/lib/backup/s3-sync.ts

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Backup failed"
          # 發送 Slack 通知
```

### 第 3 天（2026-02-26）：測試與驗證

#### 3.1 測試 DB 恢復

```bash
# 在 Supabase Dashboard 進行災難恢復測試
# 1. 製造測試故障（刪除某條記錄）
# 2. 使用 PITR 恢復到故障前
# 3. 驗證資料完整性
```

#### 3.2 測試檔案恢復

```bash
# 從 S3 下載備份檔案並驗證完整性
aws s3 cp s3://bidding-assistant-backups/kb-files/ ./recovery --recursive
# 驗證文件數量和內容
```

---

## 環境變數配置

**.env.production**：
```
# Supabase 自動備份（內建，無需設定）

# AWS S3 配置
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_BACKUP_BUCKET=bidding-assistant-backups
AWS_BACKUP_REGION=us-east-1

# 或 Google Cloud Storage
GCS_PROJECT_ID=xxx
GCS_BUCKET=bidding-assistant-backups
```

---

## 成本明細

| 項目 | 費用 |
|------|------|
| Supabase 備份功能 | 含在 Pro 方案 ($25/月) |
| S3 儲存（100 GB） | ~$2.30/月 |
| S3 API 請求 | ~$10/月 |
| **月度總計** | **~$37/月** |

---

## 優點

✅ 完全自動化，無手動操作
✅ 企業級可靠性（AWS/GCP SLA）
✅ 快速恢復（PITR 秒級）
✅ 符合 SaaS 最佳實踐

---

## 缺點

❌ 需額外成本（月 $37+）
❌ 依賴外部服務穩定性
❌ AWS/GCS 認證增加複雜度

---

## 預計成果

- Day 1：Supabase PITR 啟用 ✅
- Day 2：S3 檔案備份 Job 完成 ✅
- Day 3：災難恢復測試通過 ✅
- 全機備份覆蓋率：100%

---

**建議場景**：生產環境 SaaS，資料安全優先於成本

