-- Supabase 初始化 schema（多租戶知識庫系統）
-- 執行順序：1. 執行此腳本；2. 設定 RLS policies；3. 配置備份

-- ════════════════════════════════════════════════════════════════
-- 1. 租戶表
-- ════════════════════════════════════════════════════════════════

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_workspace_domain TEXT UNIQUE,
  -- 例：example.com → 員工 email 須符合 *@example.com
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_domain ON tenants(google_workspace_domain);

-- ════════════════════════════════════════════════════════════════
-- 2. 員工表（多租戶）
-- ════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member',  -- admin / member
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, google_email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(google_email);

-- ════════════════════════════════════════════════════════════════
-- 3. 知識庫項目（00A-00E）
-- ════════════════════════════════════════════════════════════════

CREATE TABLE kb_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,  -- 00A / 00B / 00C / 00D / 00E

  -- 基本信息
  title TEXT NOT NULL,
  content TEXT,

  -- 階層結構（例如 00C 有子模板，00D 有步驟）
  parent_id UUID REFERENCES kb_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,

  -- 元數據
  tags TEXT[],  -- array of tags
  metadata JSONB DEFAULT '{}',

  -- 審計字段
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 搜尋優化（未來 pgvector）
  search_text TSVECTOR GENERATED ALWAYS AS (to_tsvector('zhcn', title || ' ' || COALESCE(content, ''))) STORED
);

CREATE INDEX idx_kb_items_tenant_category ON kb_items(tenant_id, category);
CREATE INDEX idx_kb_items_parent ON kb_items(parent_id);
CREATE INDEX idx_kb_items_search ON kb_items USING GIN(search_text);
CREATE INDEX idx_kb_items_created_by ON kb_items(created_by);

-- ════════════════════════════════════════════════════════════════
-- 4. 標案資料（來自 Notion 同步）
-- ════════════════════════════════════════════════════════════════

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Notion 連結
  notion_page_id TEXT NOT NULL,
  notion_database_id TEXT,  -- 所屬 database

  -- 基本信息（來自 Notion）
  title TEXT NOT NULL,
  status TEXT,  -- 來自 Notion status 欄位

  -- 同步狀態
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notion_updated_at TIMESTAMP WITH TIME ZONE,

  -- 本地擴展
  internal_notes TEXT,
  local_metadata JSONB DEFAULT '{}',

  UNIQUE(tenant_id, notion_page_id)
);

CREATE INDEX idx_bids_tenant ON bids(tenant_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_synced_at ON bids(synced_at);

-- ════════════════════════════════════════════════════════════════
-- 5. 設定表（使用者偏好、欄位對照等）
-- ════════════════════════════════════════════════════════════════

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,  -- NULL = 租戶級設定；有值 = 個人級設定

  key TEXT NOT NULL,  -- 例：field_mapping, preferences
  value JSONB NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, user_id, key)
);

CREATE INDEX idx_settings_tenant_key ON settings(tenant_id, key);

-- ════════════════════════════════════════════════════════════════
-- 6. 同步日誌（追蹤 Notion 同步狀態）
-- ════════════════════════════════════════════════════════════════

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  source TEXT NOT NULL,  -- 'notion' / 'google_drive' etc.
  status TEXT NOT NULL,  -- 'success' / 'failed' / 'partial'

  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  error_message TEXT,

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_logs_tenant_source ON sync_logs(tenant_id, source);
CREATE INDEX idx_sync_logs_completed_at ON sync_logs(completed_at);

-- ════════════════════════════════════════════════════════════════
-- 7. 資料庫自動維護
-- ════════════════════════════════════════════════════════════════

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_items_updated_at BEFORE UPDATE ON kb_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- 8. RLS（行級安全）策略 — 待設定
-- ════════════════════════════════════════════════════════════════

-- 啟用 RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy 稍後定義（需要確認認證策略）
-- 原則：使用者只能查看/修改自己租戶的資料
