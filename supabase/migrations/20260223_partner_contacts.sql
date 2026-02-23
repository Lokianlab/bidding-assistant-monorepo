-- M07 外包資源庫 - partner_contacts 表
-- 建立日期：2026-02-23
-- 目的：多租戶合作夥伴管理（M03 Strategy 集成）

-- 1. 建立 partner_contacts 表
CREATE TABLE IF NOT EXISTS partner_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本資訊
  name TEXT NOT NULL,
  category TEXT[] DEFAULT '{}',
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  url TEXT,

  -- 評分與合作歷史
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) DEFAULT 3,
  notes TEXT,
  cooperation_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- 標籤與狀態
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- 時間戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 複合索引用於多租戶隔離
  UNIQUE(tenant_id, id)
);

-- 2. 索引優化查詢效能
CREATE INDEX IF NOT EXISTS idx_partner_contacts_tenant_id
  ON partner_contacts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_partner_contacts_tenant_status
  ON partner_contacts(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_partner_contacts_tenant_category
  ON partner_contacts USING GIN(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_partner_contacts_tenant_rating
  ON partner_contacts(tenant_id, rating DESC);

-- 3. RLS（Row-Level Security）策略
ALTER TABLE partner_contacts ENABLE ROW LEVEL SECURITY;

-- 政策：每個租戶只能讀寫自己的夥伴記錄
CREATE POLICY "tenant_isolation_select" ON partner_contacts
  FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "tenant_isolation_insert" ON partner_contacts
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "tenant_isolation_update" ON partner_contacts
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "tenant_isolation_delete" ON partner_contacts
  FOR DELETE
  USING (tenant_id = auth.uid());

-- 4. 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_partner_contacts_timestamp()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partner_contacts_timestamp
  BEFORE UPDATE ON partner_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_contacts_timestamp();

-- 5. 驗證欄位的檢查約束
ALTER TABLE partner_contacts
  ADD CONSTRAINT check_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

ALTER TABLE partner_contacts
  ADD CONSTRAINT check_phone_format
    CHECK (phone IS NULL OR phone ~* '^[0-9\+\-\s\(\)]{7,}$');

ALTER TABLE partner_contacts
  ADD CONSTRAINT check_url_format
    CHECK (url IS NULL OR url ~* '^https?://');

-- 6. 評論：實裝檢查表
-- TODO:
-- - [ ] 驗證表結構已建立
-- - [ ] RLS 測試：租戶隔離正常
-- - [ ] 觸發器測試：updated_at 自動更新
-- - [ ] 索引效能測試：查詢 < 100ms

