-- M02 Phase 1: Knowledge Base Schema Migration
-- Purpose: Initialize kb_entries, kb_metadata, kb_attachments tables with multi-tenant isolation
-- Author: Z1FV (TDD implementation)
-- Date: 2026-02-23

-- ============================================================================
-- Main KB Entries Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Category constraint: 00A-00E
  category TEXT NOT NULL CHECK (category IN ('00A', '00B', '00C', '00D', '00E')),

  -- Unique entry identifier within category and tenant
  entry_id TEXT NOT NULL,

  -- Status tracking: active, archived, pending_review
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_review')),

  -- JSON data structure matching KBEntry00A-00E types
  data JSONB NOT NULL,

  -- Generated fulltext search index for search_text column
  search_text TEXT GENERATED ALWAYS AS (
    (data->>'name') || ' ' ||
    COALESCE(data->>'description', '') || ' ' ||
    COALESCE(data->>'tags', '')
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one entry per category per tenant
  UNIQUE (tenant_id, category, entry_id)
) PARTITION BY LIST (category);

-- ============================================================================
-- Partition Tables for Each Category
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_entries_00a PARTITION OF kb_entries
  FOR VALUES IN ('00A');

CREATE TABLE IF NOT EXISTS kb_entries_00b PARTITION OF kb_entries
  FOR VALUES IN ('00B');

CREATE TABLE IF NOT EXISTS kb_entries_00c PARTITION OF kb_entries
  FOR VALUES IN ('00C');

CREATE TABLE IF NOT EXISTS kb_entries_00d PARTITION OF kb_entries
  FOR VALUES IN ('00D');

CREATE TABLE IF NOT EXISTS kb_entries_00e PARTITION OF kb_entries
  FOR VALUES IN ('00E');

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- RLS performance index on tenant_id
CREATE INDEX IF NOT EXISTS idx_kb_entries_tenant_id ON kb_entries(tenant_id);

-- Category filtering (especially for imports)
CREATE INDEX IF NOT EXISTS idx_kb_entries_category ON kb_entries(category);

-- Full-text search support
CREATE INDEX IF NOT EXISTS idx_kb_entries_search_text ON kb_entries
  USING GIN (search_text gin_trgm_ops);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_kb_entries_status ON kb_entries(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_kb_entries_tenant_category ON kb_entries(tenant_id, category);

-- ============================================================================
-- KB Metadata Table (Category-level metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('00A', '00B', '00C', '00D', '00E')),

  -- Metadata stored as JSONB for flexibility
  -- Example: { "total_count": 42, "last_import": "2026-02-23", "source": "h_drive" }
  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One metadata record per category per tenant
  UNIQUE (tenant_id, category)
);

CREATE INDEX IF NOT EXISTS idx_kb_metadata_tenant ON kb_metadata(tenant_id);

-- ============================================================================
-- KB Attachments Table (File/SmugMug references)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_entry_id UUID NOT NULL REFERENCES kb_entries(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Attachment type: photo, document, video, etc.
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('photo', 'document', 'video', 'link')),

  -- For SmugMug: image_id; For others: file path or URL
  reference_url TEXT NOT NULL,

  -- Optional metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_attachments_kb_entry_id ON kb_attachments(kb_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_attachments_tenant_id ON kb_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_attachments_type ON kb_attachments(attachment_type);

-- ============================================================================
-- Row Level Security (RLS) - Multi-tenant Isolation
-- ============================================================================

-- Enable RLS on kb_entries
ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;

-- SELECT policy: users can only see their own tenant's data
CREATE POLICY IF NOT EXISTS kb_entries_select_policy
  ON kb_entries
  FOR SELECT
  USING (tenant_id = auth.uid());

-- INSERT policy: users can only insert into their own tenant
CREATE POLICY IF NOT EXISTS kb_entries_insert_policy
  ON kb_entries
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- UPDATE policy: users can only update their own tenant's data
CREATE POLICY IF NOT EXISTS kb_entries_update_policy
  ON kb_entries
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- DELETE policy: users can only delete their own tenant's data
CREATE POLICY IF NOT EXISTS kb_entries_delete_policy
  ON kb_entries
  FOR DELETE
  USING (tenant_id = auth.uid());

-- Enable RLS on kb_metadata
ALTER TABLE kb_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS kb_metadata_select_policy
  ON kb_metadata
  FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_metadata_insert_policy
  ON kb_metadata
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_metadata_update_policy
  ON kb_metadata
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_metadata_delete_policy
  ON kb_metadata
  FOR DELETE
  USING (tenant_id = auth.uid());

-- Enable RLS on kb_attachments
ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS kb_attachments_select_policy
  ON kb_attachments
  FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_attachments_insert_policy
  ON kb_attachments
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_attachments_update_policy
  ON kb_attachments
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY IF NOT EXISTS kb_attachments_delete_policy
  ON kb_attachments
  FOR DELETE
  USING (tenant_id = auth.uid());

-- ============================================================================
-- Grant Public Access (To be called by authenticated users via Supabase)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON kb_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kb_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kb_attachments TO authenticated;
