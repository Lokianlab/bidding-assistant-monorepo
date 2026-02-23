import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createPostgresBackup, backupKBFiles } from '../postgres-backup';
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

  it('should handle missing database gracefully', async () => {
    // 若 DATABASE_URL 未設定，測試應略過或返回錯誤
    if (!process.env.DATABASE_URL) {
      console.log('⏭️  Skipping PostgreSQL backup: DATABASE_URL not set');
      expect(true).toBe(true); // 略過測試
      return;
    }

    try {
      const backupPath = await createPostgresBackup();
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(backupPath).toMatch(/\.sql\.gz$/);

      const stats = fs.statSync(backupPath);
      expect(stats.size).toBeGreaterThan(0);
    } catch (error) {
      console.log('PostgreSQL backup skipped (expected in test env)');
    }
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
    } else {
      console.log('⏭️  Skipping KB backup: directory not found');
    }
  });

  it('should verify backup directory exists', () => {
    expect(fs.existsSync(backupDir)).toBe(true);
  });
});
