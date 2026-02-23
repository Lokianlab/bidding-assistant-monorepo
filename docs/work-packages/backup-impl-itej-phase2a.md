# 備份系統實裝 — ITEJ 工作包

**決策確認時間**：2026-02-23 21:10
**方案**：B（應用層 pg_dump + GitHub Release）
**預計工時**：4-6 小時
**優先序**：Phase 2a 入選（Checkpoint 前推進）

---

## 目標

在 CI/CD 中自動化執行：每 6 小時備份一次 PostgreSQL（pg_dump）+ 知識庫檔案（tar.gz），上傳到 GitHub Release，自動版本管理（保留最新 10 版本）。

**成功標準**：
- [ ] 本地測試通過：`npm run backup:test` 備份 & 恢復成功
- [ ] GitHub Actions 排程執行成功（模擬 cron 觸發）
- [ ] 備份檔案可從 Release 下載並完整恢復
- [ ] 全量測試 PASS

---

## 快速開始

### 第 1 步：基礎檔案建立（1 小時）

**src/lib/backup/postgres-backup.ts**

直接複製下面代碼：

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
    console.log(`🔄 Starting PostgreSQL backup...`);

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

export async function backupKBFiles() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const kbDir = './data/kb-uploads';
  const archivePath = `./backups/kb-files-${timestamp}.tar.gz`;

  try {
    console.log(`🔄 Starting KB files backup...`);

    // 確保目錄存在
    if (!fs.existsSync(kbDir)) {
      console.log(`⚠️  KB directory not found, skipping: ${kbDir}`);
      return null;
    }

    await execAsync(`tar -czf "${archivePath}" -C "./data" kb-uploads`);

    const stats = fs.statSync(archivePath);
    console.log(`✅ KB backup created: ${archivePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return archivePath;
  } catch (error) {
    console.error('❌ KB backup failed:', error);
    throw error;
  }
}
```

**src/lib/backup/github-release.ts**

```typescript
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function uploadToGitHubRelease(
  backupFilePath: string,
  tagName: string
) {
  const owner = 'Lokianlab';
  const repo = 'bidding-assistant-monorepo';
  const fileName = path.basename(backupFilePath);

  try {
    console.log(`📤 Uploading to GitHub Release: ${tagName}/${fileName}`);

    // 建立或獲取 Release
    let release;
    try {
      const existingRelease = await octokit.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });
      release = existingRelease.data;
    } catch {
      // Release 不存在，建立新的
      release = (
        await octokit.repos.createRelease({
          owner,
          repo,
          tag_name: tagName,
          name: `Backup ${tagName}`,
          body: `Automated backup - ${new Date().toISOString()}`,
          draft: false,
        })
      ).data;
    }

    // 上傳檔案到 Release
    const fileContent = fs.readFileSync(backupFilePath);

    await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.id,
      name: fileName,
      data: fileContent as any,
    });

    console.log(`✅ Uploaded to GitHub Release: ${tagName}/${fileName}`);

    // 清理舊備份（保留最新 10 個）
    await cleanOldReleases(10);

    return release.upload_url;
  } catch (error) {
    console.error('❌ GitHub upload failed:', error);
    throw error;
  }
}

async function cleanOldReleases(keepCount: number) {
  try {
    const releases = await octokit.repos.listReleases({
      owner: 'Lokianlab',
      repo: 'bidding-assistant-monorepo',
    });

    const backupReleases = releases.data
      .filter((r) => r.name?.includes('Backup'))
      .sort(
        (a, b) =>
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      );

    for (let i = keepCount; i < backupReleases.length; i++) {
      await octokit.repos.deleteRelease({
        owner: 'Lokianlab',
        repo: 'bidding-assistant-monorepo',
        release_id: backupReleases[i].id,
      });
      console.log(`🗑️  Deleted old release: ${backupReleases[i].tag_name}`);
    }
  } catch (error) {
    console.error('⚠️  Cleanup failed (non-critical):', error);
  }
}
```

### 第 2 步：本地測試（1.5 小時）

**src/lib/backup/backup.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPostgresBackup, backupKBFiles } from './postgres-backup';
import fs from 'fs';
import path from 'path';

describe('Backup System', () => {
  const backupDir = './backups';

  beforeAll(() => {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理測試檔案
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(backupDir, file));
      });
    }
  });

  it('should create PostgreSQL backup', async () => {
    if (!process.env.DATABASE_URL) {
      console.log('⏭️  Skipping: DATABASE_URL not set');
      return;
    }

    const backupPath = await createPostgresBackup();
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(backupPath).toMatch(/\.sql\.gz$/);

    const stats = fs.statSync(backupPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should handle missing KB directory gracefully', async () => {
    const result = await backupKBFiles();
    // 若不存在應回傳 null，不拋錯
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should create KB backup if directory exists', async () => {
    const kbDir = './data/kb-uploads';
    if (fs.existsSync(kbDir)) {
      const backupPath = await backupKBFiles();
      expect(backupPath).toBeTruthy();
      expect(fs.existsSync(backupPath!)).toBe(true);
    }
  });
});
```

執行本地測試：
```bash
npm test -- backup.test.ts
```

### 第 3 步：GitHub Actions 排程（1.5 小時）

**.github/workflows/backup-postgres.yml**

```yaml
name: PostgreSQL Backup

on:
  schedule:
    - cron: '0 */6 * * *'  # 每 6 小時執行（UTC 0,6,12,18）

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
          mkdir -p ./backups
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
            import fs from 'fs';
            import path from 'path';

            const backupDir = './backups';
            const files = fs.readdirSync(backupDir);
            const timestamp = new Date().toISOString().split('T')[0];
            const tagName = 'backup-' + timestamp;

            Promise.all(
              files.map(file =>
                uploadToGitHubRelease(
                  path.join(backupDir, file),
                  tagName
                )
              )
            ).catch(e => { console.error(e); process.exit(1); });
          "

      - name: Cleanup local backups
        run: rm -rf ./backups

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": "❌ PostgreSQL backup failed - check workflow logs"
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 檢查清單

### 環變檢查
- [ ] `.env.local` 有 `DATABASE_URL`？（mock 方案已提，若無真實值可跳過測試）
- [ ] `GITHUB_TOKEN` 已在 GitHub Secrets 中？

### 代碼檢查
- [ ] `src/lib/backup/` 目錄創建？
- [ ] 三個檔案複製無誤？（postgres-backup.ts, github-release.ts, backup.test.ts）
- [ ] `.github/workflows/backup-postgres.yml` 建立？

### 測試執行
```bash
# 1. 單元測試
npm test -- backup.test.ts

# 2. 型別檢查
npm run type-check

# 3. Build 驗證
npm run build
```

### 工作流驗證
- [ ] 推送代碼後，GitHub Actions 自動觸發「PostgreSQL Backup」workflow？
- [ ] Workflow 成功執行（或因缺環變跳過）？
- [ ] Release 頁面可見備份檔案？

---

## 常見問題

**Q：DATABASE_URL 沒有，怎麼測試？**
A：跳過 `createPostgresBackup()` 測試，專注 `backupKBFiles()` 和 GitHub API 邏輯。BUILD 必須通過。

**Q：GitHub Token 怎麼設定？**
A：在 GitHub 倉庫 Settings → Secrets and variables → Actions 中新增 `GITHUB_TOKEN`（自動生成，無需手動）。

**Q：Workflow 什麼時候執行？**
A：每 6 小時執行一次（UTC 0,6,12,18）。手動測試：在 Actions 頁面按「Run workflow」。

---

## 交付標準

✅ 完成狀態：
- 代碼 PASS（npm run build）
- 單元測試 PASS（npm test -- backup.test.ts）
- GitHub Actions workflow 就緒（可手動觸發）
- 本地恢復測試通過（若有 mock DB）

📋 推送清單：
1. `src/lib/backup/postgres-backup.ts`
2. `src/lib/backup/github-release.ts`
3. `src/lib/backup/backup.test.ts`
4. `.github/workflows/backup-postgres.yml`
5. Commit message：`[infra] PostgreSQL 備份系統實裝 (ITEJ) @op:backup-impl-itej-phase2a`

---

**預計完成**：2026-02-24 下午
**卡住時**：通知 JDNE，查 `docs/records/checkpoints/emergency-diagnostic.md`
