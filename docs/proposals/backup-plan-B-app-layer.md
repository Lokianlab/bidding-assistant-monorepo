# 方案 B：應用層定時備份實作計畫

**方案名稱**：PostgreSQL pg_dump + GitHub Release 備份
**成本**：$0（利用免費服務）
**工時**：8 小時（ITEJ）
**RTO**：<2 小時（手動恢復）

---

## 架構設計

```
應用層備份系統
  ├─ 每 6 小時執行 pg_dump
  ├─ 壓縮為 .sql.gz 檔案
  ├─ 上傳到 GitHub Release
  ├─ 自動標籤管理（保留最新 10 版本）
  └─ 知識庫檔案定時壓縮上傳
```

---

## 實作步驟

### 第 1 天（2026-02-24）：編寫備份工具

#### 1.1 建立備份指令碼

**src/lib/backup/postgres-backup.ts**：
```typescript
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function createPostgresBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./backups/db-${timestamp}.sql`;

  const dbUrl = process.env.DATABASE_URL;

  try {
    // 執行 pg_dump
    await execAsync(
      `pg_dump "${dbUrl}" > "${backupPath}"`
    );

    // 壓縮
    const gzPath = `${backupPath}.gz`;
    await execAsync(`gzip "${backupPath}"`);

    // 驗證
    const stats = fs.statSync(gzPath);
    console.log(`✅ Backup created: ${gzPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return gzPath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// 備份知識庫上傳檔案
export async function backupKBFiles() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const kbDir = './data/kb-uploads';
  const archivePath = `./backups/kb-files-${timestamp}.tar.gz`;

  try {
    await execAsync(`tar -czf "${archivePath}" "${kbDir}"`);

    const stats = fs.statSync(archivePath);
    console.log(`✅ KB backup created: ${archivePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return archivePath;
  } catch (error) {
    console.error('❌ KB backup failed:', error);
    throw error;
  }
}
```

#### 1.2 建立備份管理指令碼

**src/lib/backup/github-release.ts**：
```typescript
import { Octokit } from '@octokit/rest';
import fs from 'fs';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function uploadToGitHubRelease(
  backupFilePath: string,
  tagName: string
) {
  const owner = 'Lokianlab';
  const repo = 'bidding-assistant-monorepo';
  const fileName = backupFilePath.split('/').pop()!;

  try {
    // 建立 Release
    const release = await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: `Backup ${tagName}`,
      body: `Automated backup - ${new Date().toISOString()}`,
      draft: false,
    });

    // 上傳檔案到 Release
    const fileContent = fs.readFileSync(backupFilePath);

    await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.data.id,
      name: fileName,
      data: fileContent as any,
    });

    console.log(`✅ Uploaded to GitHub Release: ${tagName}`);

    // 清理舊備份（保留最新 10 個）
    await cleanOldReleases(10);

    return release.data.upload_url;
  } catch (error) {
    console.error('❌ GitHub upload failed:', error);
    throw error;
  }
}

async function cleanOldReleases(keepCount: number) {
  const releases = await octokit.repos.listReleases({
    owner: 'Lokianlab',
    repo: 'bidding-assistant-monorepo',
  });

  const backupReleases = releases.data
    .filter(r => r.name?.includes('Backup'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (let i = keepCount; i < backupReleases.length; i++) {
    await octokit.repos.deleteRelease({
      owner: 'Lokianlab',
      repo: 'bidding-assistant-monorepo',
      release_id: backupReleases[i].id,
    });
    console.log(`🗑️  Deleted old release: ${backupReleases[i].tag_name}`);
  }
}
```

### 第 2 天（2026-02-25）：設定自動化

#### 2.1 GitHub Actions Workflow

**.github/workflows/backup-postgres.yml**：
```yaml
name: PostgreSQL Backup

on:
  schedule:
    - cron: '0 */6 * * *'  # 每 6 小時

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Install dependencies
        run: npm ci

      - name: Create backups
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npx ts-node -e "
            import { createPostgresBackup, backupKBFiles } from './src/lib/backup/postgres-backup';
            Promise.all([
              createPostgresBackup(),
              backupKBFiles()
            ]).catch(e => { console.error(e); process.exit(1); });
          "

      - name: Upload to GitHub Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx ts-node -e "
            import { uploadToGitHubRelease } from './src/lib/backup/github-release';
            const timestamp = new Date().toISOString().split('T')[0];
            uploadToGitHubRelease(
              './backups/db-*.sql.gz',
              'backup-' + timestamp
            ).catch(e => { console.error(e); process.exit(1); });
          "

      - name: Cleanup local backups
        run: rm -f ./backups/*

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'PostgreSQL backup failed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 第 3 天（2026-02-26）：測試與文檔

#### 3.1 測試恢復程序

```bash
# 從 GitHub Release 下載備份
curl -L https://github.com/Lokianlab/bidding-assistant-monorepo/releases/download/backup-2026-02-26/db-2026-02-26T*.sql.gz \
  -o backup.sql.gz

# 解壓
gunzip backup.sql.gz

# 恢復到測試資料庫
psql postgresql://localhost/test_db < backup.sql
```

#### 3.2 編寫恢復文檔

**docs/backup/recovery-guide.md**：
```markdown
# 備份恢復指南

## 快速恢復步驟

1. 從 GitHub Release 下載備份檔案
2. 解壓：`gunzip db-*.sql.gz`
3. 恢復：`psql $DATABASE_URL < db-*.sql`
4. 驗證：`SELECT COUNT(*) FROM supabase_migrations;`

## 知識庫檔案恢復

1. 下載 kb-files-*.tar.gz
2. 解壓：`tar -xzf kb-files-*.tar.gz`
3. 覆蓋：`cp -r data/kb-uploads/* $TARGET_DIR/`
```

---

## 優點

✅ 零成本（GitHub 免費儲存）
✅ 簡單易懂（標準 SQL dump）
✅ 易於版本控制（GitHub Release 自帶版本管理）
✅ 完全可見（備份檔案在公開 Release）

---

## 缺點

❌ 手動恢復步驟複雜
❌ 恢復時間較長（數十分鐘）
❌ 備份檔案儲存在 GitHub（公開可見）
❌ 需要手動清理舊備份

---

## 預計成果

- Day 1：backup.ts + github-release.ts 完成 ✅
- Day 2：GitHub Actions workflow 設定完成 ✅
- Day 3：恢復測試通過 ✅
- 全機備份覆蓋率：100%

---

**建議場景**：小型團隊、預算有限、不需頻繁恢復

