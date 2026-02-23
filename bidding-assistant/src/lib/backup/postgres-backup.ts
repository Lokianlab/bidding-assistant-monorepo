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
