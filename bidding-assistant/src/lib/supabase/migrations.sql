-- M02 知識庫模組 Supabase Schema
-- 執行順序：1. 建表 2. 索引 3. RLS 4. 觸發器

-- ============================================================================
-- 1. KB 主表 (kb_entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('00A','00B','00C','00D','00E')),
  entry_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  data JSONB NOT NULL,
  search_text TEXT GENERATED ALWAYS AS (
    COALESCE(data->>'name','') || ' ' ||
    COALESCE(data->>'projectName','') || ' ' ||
    COALESCE(data->>'templateName','') || ' ' ||
    COALESCE(data->>'riskName','') || ' ' ||
    COALESCE(data->>'title','') || ' ' ||
    COALESCE(data->>'client','')
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, category, entry_id)
);

-- ============================================================================
-- 2. KB 元資料表 (kb_metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_metadata (
  tenant_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  last_synced TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. KB 附件表 (kb_attachments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES kb_entries(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. 索引
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kb_tenant_category ON kb_entries(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_kb_status ON kb_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_kb_entry_id ON kb_entries(tenant_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_search ON kb_entries USING gin(to_tsvector('simple', search_text));

CREATE INDEX IF NOT EXISTS idx_kb_attachments_tenant ON kb_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_attachments_entry ON kb_attachments(entry_id);

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own entries" ON kb_entries
  FOR ALL USING (tenant_id = auth.uid());

ALTER TABLE kb_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own metadata" ON kb_metadata
  FOR ALL USING (tenant_id = auth.uid());

ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own attachments" ON kb_attachments
  FOR ALL USING (tenant_id = auth.uid());

-- ============================================================================
-- 6. 自動更新 updated_at 觸發器
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kb_entries_updated_at BEFORE UPDATE ON kb_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_metadata_updated_at BEFORE UPDATE ON kb_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Supabase Storage 配置（需在 Supabase Dashboard 手動設定）
-- ============================================================================
-- Bucket 名稱：kb-files
-- 訪問等級：Private (RLS 透過 auth.uid() 檢查)
-- 路徑組織：{tenant_id}/{category}/{filename}
