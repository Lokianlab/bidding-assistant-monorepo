# 方案 C：混合備份實作計畫（推薦）

**方案名稱**：Supabase PITR + GitHub 應用層備份
**成本**：月 $30（僅 Supabase Pro）
**工時**：16 小時（ITEJ + JDNE）
**RTO**：<30 分鐘（DB PITR） / <2 小時（檔案恢復）

---

## 架構設計

```
雙層備份系統
├─ 第一層：Supabase 自動備份
│  ├─ 日級 PITR（點位恢復）
│  ├─ 秒級恢復能力
│  └─ 保留 30 天歷史
│
└─ 第二層：應用層週級全量備份
   ├─ 每週一次完整備份（pg_dump + 檔案）
   ├─ 存放到 GitHub Release
   ├─ 長期歸檔（無時間限制）
   └─ 保留 52 周歷史
```

---

## 實作步驟

### 第 1 天（2026-02-24）：Supabase PITR 啟用

#### 1.1 配置 Supabase 自動備份

```bash
# 透過 Supabase Dashboard
# https://app.supabase.com → Project Settings → Backups

# 設定項目
- Backup Frequency: Daily
- Retention: 30 days (覆蓋近期 1 個月)
- Auto-backup: Enabled
- Backup time: 02:00 UTC
```

#### 1.2 驗證 PITR 功能

```sql
-- 在 Supabase SQL Editor 中查看備份狀態
SELECT
  backup_id,
  backup_time,
  database_size,
  status
FROM pg_backup_info
ORDER BY backup_time DESC
LIMIT 10;
```

### 第 2 天（2026-02-25）：應用層週級備份實作

#### 2.1 編寫備份系統

**src/lib/backup/hybrid-backup.ts**：
```typescript
import { createPostgresBackup, backupKBFiles } from './postgres-backup';
import { uploadToGitHubRelease, cleanOldReleases } from './github-release';

interface BackupConfig {
  backupType: 'daily' | 'weekly';
  retention: number; // 天數
  uploadToGithub: boolean;
}

export async function executeBackup(config: BackupConfig) {
  try {
    console.log(`🔄 Starting ${config.backupType} backup...`);

    // 建立備份
    const dbBackup = await createPostgresBackup();
    const kbBackup = await backupKBFiles();

    // 對於週級備份，上傳到 GitHub
    if (config.uploadToGithub && config.backupType === 'weekly') {
      const weekNumber = Math.floor(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const tagName = `backup-week-${new Date().getFullYear()}-${weekNumber}`;

      await uploadToGitHubRelease(dbBackup, tagName);
      await uploadToGitHubRelease(kbBackup, tagName);

      // 清理超過 52 週的備份
      await cleanOldReleases(52);
    }

    // 本地清理（保留最近 7 天的備份）
    const backupDir = './backups';
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = `${backupDir}/${file}`;
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > sevenDaysMs) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted old local backup: ${file}`);
      }
    }

    console.log(`✅ ${config.backupType} backup completed`);
    return { dbBackup, kbBackup };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}
```

#### 2.2 設定備份排程

**.github/workflows/backup-hybrid.yml**：
```yaml
name: Hybrid Backup System

on:
  schedule:
    # 每週一凌晨 3:00 UTC 執行完整備份
    - cron: '0 3 * * 1'

jobs:
  weekly-backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Create weekly backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx ts-node -e "
            import { executeBackup } from './src/lib/backup/hybrid-backup';
            executeBackup({
              backupType: 'weekly',
              retention: 52 * 7,
              uploadToGithub: true
            }).catch(e => {
              console.error(e);
              process.exit(1);
            });
          "

      - name: Notify Slack on success
        uses: 8398a7/action-slack@v3
        if: success()
        with:
          status: custom
          custom_payload: |
            {
              text: '✅ Weekly backup completed successfully'
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify Slack on failure
        uses: 8398a7/action-slack@v3
        if: failure()
        with:
          status: custom
          custom_payload: |
            {
              text: '❌ Weekly backup failed'
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 第 3 天（2026-02-26）：整合測試與文檔

#### 3.1 PITR 恢復測試

```bash
# 在 Supabase Dashboard 測試
# 1. 刪除測試記錄
DELETE FROM test_table WHERE id = 123;

# 2. 進入 Dashboard → Backups → PITR
# 3. 選擇故障發生前的時間點
# 4. 啟動恢復（建立新資料庫實例）

# 5. 驗證資料
SELECT * FROM test_table WHERE id = 123;  -- 應該存在
```

#### 3.2 GitHub 備份恢復測試

```bash
# 下載週級備份
curl -L https://github.com/Lokianlab/bidding-assistant-monorepo/releases/download/backup-week-2026-9/db-*.sql.gz \
  -o weekly-backup.sql.gz

# 恢復步驟
gunzip weekly-backup.sql.gz
psql postgresql://test-instance/backup_test < weekly-backup.sql

# 驗證
psql postgresql://test-instance/backup_test -c "SELECT COUNT(*) FROM supabase_migrations;"
```

#### 3.3 編寫恢復文檔

**docs/backup/hybrid-recovery-guide.md**：
```markdown
# 混合備份恢復指南

## 場景 1：資料誤刪（< 30 天內）

使用 Supabase PITR 快速恢復

1. 進入 Supabase Dashboard → Project Settings → Backups
2. 點擊 "Point-in-time Recovery"
3. 選擇故障前的時間點
4. 預覽資料確認
5. 點擊 "Recover" 建立新實例
6. 切換應用連線新實例

RTO: <30 分鐘 | RPO: <1 小時

## 場景 2：區域故障（Supabase 不可用）

使用 GitHub 備份恢復

1. 從 GitHub Release 下載最新備份
2. 部署到替代資料庫（如本機 PostgreSQL）
3. 恢復：`psql $NEW_DB < backup.sql`
4. 更新應用連線字串
5. 驗證資料

RTO: <2 小時 | RPO: 1 週

## 場景 3：完整災難恢復

組合使用兩層備份

1. 若 Supabase 完全不可用
   → 使用 GitHub 週級備份在 AWS RDS/自建 DB 恢復
   → 相對資料損失：最多 1 週

2. 後續恢復到 Supabase
   → 同步遺漏的 1 週資料
   → 切換連線回 Supabase
```

---

## 雙層備份優勢對比

| 指標 | PITR（層 1） | GitHub 備份（層 2） | 組合 |
|------|-------------|------------------|------|
| RTO | <30 分鐘 | <2 小時 | 最快 |
| RPO | <1 小時 | 1 週 | <1 小時 |
| 恢復複雜度 | 簡單（UI） | 中等（手動） | 簡單 + 備選 |
| 成本 | 含在 Pro | 免費 | 月 $30 |
| 保留期 | 30 天 | 52 週 | 長期 |
| 依賴 | Supabase | GitHub | 低耦合 |

---

## 成本明細

| 項目 | 費用 | 說明 |
|------|------|------|
| Supabase Pro 方案 | $25/月 | 含 PITR 備份 |
| GitHub Release 存儲 | $0 | 免費，每週 50-500 MB |
| **月度總計** | **$25/月** | 無額外成本 |

---

## 實施時程表

| 日期 | 工作 | 負責人 | 檢查點 |
|------|------|--------|--------|
| 2026-02-24 | Supabase PITR 啟用 | ITEJ | ✅ 日級備份自動執行 |
| 2026-02-25 | 應用層備份代碼完成 | ITEJ | ✅ GitHub Actions 就緒 |
| 2026-02-26 | 雙層恢復測試通過 | ITEJ + JDNE | ✅ 兩個場景恢復成功 |

---

## 監控與告警

**Slack 通知設定**：

```yaml
- 備份成功 → 綠色提醒
- 備份失敗 → 紅色告警 + @channel
- 備份超過 3 小時 → 黃色警告
```

**每週檢查清單**：
- [ ] Supabase PITR 有新備份？
- [ ] GitHub Release 上傳成功？
- [ ] 本地舊備份已清理？
- [ ] 備份大小合理（不異常膨脹）？

---

## 優點

✅ 雙保險：不依賴單一系統
✅ 低成本：僅需 Supabase Pro（已購買）
✅ 快速恢復：PITR 秒級，GitHub 備選
✅ 長期備份：52 週歷史保留
✅ 易於實施：標準工具組合
✅ 易於驗證：定期可測試恢復流程

---

## 缺點

⚠️ 複雜度中等（維護兩套系統）
⚠️ PITR 僅保留 30 天（GitHub 補充長期）

---

## 預計成果

- Day 1：Supabase PITR 啟用 ✅
- Day 2：應用層備份系統完成 ✅
- Day 3：雙層恢復測試通過 ✅
- **全機備份覆蓋率**：100%
- **DR 準備度**：Enterprise Grade

---

**建議場景**：生產環境 SaaS，平衡成本與可靠性 🎯

