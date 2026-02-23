import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Test-Driven Development: SQL Schema Migration Structure Validation
 *
 * 目的：驗證 001-kb-schema.sql migration 包含所需的表結構、欄位、
 * constraint、index 和 RLS policy（無需 Supabase 環境）
 *
 * RED 測試：驗證 migration 檔案的存在和結構完整性
 */

describe('M02 Phase 1: KB Schema Migration - 001-kb-schema.sql', () => {
  const migrationPath = path.join(
    __dirname,
    '../../supabase/migrations/001-kb-schema.sql'
  );

  let migrationContent: string;

  test('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  test('loads migration content', () => {
    migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    expect(migrationContent.length).toBeGreaterThan(0);
  });

  describe('kb_entries table structure', () => {
    test('creates kb_entries table', () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS kb_entries');
    });

    test('includes required columns', () => {
      const requiredColumns = [
        'id UUID PRIMARY KEY',
        'tenant_id UUID NOT NULL REFERENCES auth.users(id)',
        'category TEXT NOT NULL CHECK',
        'entry_id TEXT NOT NULL',
        'status TEXT NOT NULL DEFAULT',
        'data JSONB NOT NULL',
        'search_text TEXT GENERATED ALWAYS AS',
        'created_at TIMESTAMPTZ NOT NULL DEFAULT',
        'updated_at TIMESTAMPTZ NOT NULL DEFAULT',
      ];
      requiredColumns.forEach((col) => {
        expect(migrationContent).toContain(col);
      });
    });

    test('includes category CHECK constraint', () => {
      expect(migrationContent).toContain("CHECK (category IN ('00A', '00B', '00C', '00D', '00E'))");
    });

    test('includes UNIQUE constraint on (tenant_id, category, entry_id)', () => {
      expect(migrationContent).toContain('UNIQUE (tenant_id, category, entry_id)');
    });

    test('includes FOREIGN KEY to auth.users(id)', () => {
      expect(migrationContent).toContain('REFERENCES auth.users(id)');
    });

    test('status has DEFAULT value', () => {
      expect(migrationContent).toContain("status TEXT NOT NULL DEFAULT 'active'");
    });

    test('includes search_text GENERATED column', () => {
      expect(migrationContent).toContain('search_text TEXT GENERATED ALWAYS AS');
      expect(migrationContent).toContain('STORED');
    });

    test('includes timestamps with DEFAULT now()', () => {
      expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT now()');
      expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT now()');
    });
  });

  describe('indexes', () => {
    test('creates index on tenant_id for RLS performance', () => {
      expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS idx_kb_entries_tenant_id');
    });

    test('creates index on category for filtering', () => {
      expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS idx_kb_entries_category');
    });

    test('creates FULLTEXT search index on search_text', () => {
      expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS idx_kb_entries_search_text');
    });
  });

  describe('RLS (Row Level Security) policies', () => {
    test('enables RLS on kb_entries', () => {
      expect(migrationContent).toContain('ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY');
    });

    test('has SELECT policy for authenticated users', () => {
      expect(migrationContent).toContain('kb_entries_select_policy');
      expect(migrationContent).toContain('FOR SELECT');
      expect(migrationContent).toContain('auth.uid()');
    });

    test('has INSERT policy for authenticated users', () => {
      expect(migrationContent).toContain('kb_entries_insert_policy');
      expect(migrationContent).toContain('FOR INSERT');
    });

    test('has UPDATE policy for authenticated users', () => {
      expect(migrationContent).toContain('kb_entries_update_policy');
      expect(migrationContent).toContain('FOR UPDATE');
    });

    test('has DELETE policy for authenticated users', () => {
      expect(migrationContent).toContain('kb_entries_delete_policy');
      expect(migrationContent).toContain('FOR DELETE');
    });
  });

  describe('supporting tables (metadata & attachments)', () => {
    test('creates kb_metadata table for category-wide metadata', () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS kb_metadata');
    });

    test('creates kb_attachments table for file references', () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS kb_attachments');
    });

    test('kb_attachments has FOREIGN KEY to kb_entries', () => {
      expect(migrationContent).toContain('kb_entry_id UUID NOT NULL REFERENCES kb_entries(id)');
    });
  });

  describe('migration idempotency', () => {
    test('uses IF NOT EXISTS for safe re-runs', () => {
      expect(migrationContent).toContain('IF NOT EXISTS');
    });
  });

  describe('documentation', () => {
    test('includes comments explaining schema purpose', () => {
      // 至少應該有基本的表和欄位註解
      expect(migrationContent).toContain('--');
      expect(migrationContent).toContain('M02 Phase 1');
    });
  });
});
