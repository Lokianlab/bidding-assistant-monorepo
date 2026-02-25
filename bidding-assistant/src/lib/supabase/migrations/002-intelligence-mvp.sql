-- =============================================
-- 第一階段：情報部門 MVP 資料表
-- 對應開發手冊 D1
-- =============================================

-- 表一：intelligence_cache（情報快取）
-- 存放 PCC 拉取的情報數據，避免重複呼叫 API
CREATE TABLE IF NOT EXISTS intelligence_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT NOT NULL,
  intel_type TEXT NOT NULL,  -- 'agency_history' | 'competitor' | 'rfp_summary' | 'perplexity' | 'win_assessment'
  data JSONB NOT NULL,
  source TEXT,               -- 'pcc' | 'perplexity' | 'rfp_upload' | 'manual'
  pcc_unit_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_case ON intelligence_cache(case_id);
CREATE INDEX IF NOT EXISTS idx_intel_type ON intelligence_cache(case_id, intel_type);
CREATE INDEX IF NOT EXISTS idx_intel_unit ON intelligence_cache(pcc_unit_id);
CREATE INDEX IF NOT EXISTS idx_intel_expires ON intelligence_cache(expires_at);

-- 表二：knowledge_cards（知識庫卡片）
-- 存放 Drive 檔案解析後的卡片索引
CREATE TABLE IF NOT EXISTS knowledge_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_folder_path TEXT,
  page_number INT,
  card_type TEXT NOT NULL,   -- 'slide' | 'document_section' | 'image' | 'table'
  title TEXT,
  summary TEXT NOT NULL,
  content_text TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,             -- '展覽' | '活動' | '教育' | '文化' | '設計' | ...
  subcategory TEXT,
  file_type TEXT,            -- 'pptx' | 'pdf' | 'docx' | 'xlsx'
  mime_type TEXT,
  is_scannable BOOLEAN DEFAULT true,
  scan_error TEXT,
  drive_url TEXT,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_source ON knowledge_cards(source_file_id);
CREATE INDEX IF NOT EXISTS idx_cards_category ON knowledge_cards(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_cards_tags ON knowledge_cards USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_cards_type ON knowledge_cards(card_type);
-- 全文搜尋索引（中文）
CREATE INDEX IF NOT EXISTS idx_cards_search ON knowledge_cards
  USING gin(to_tsvector('simple', COALESCE(title, '') || ' ' || summary || ' ' || COALESCE(content_text, '')));

-- 唯一約束：同檔案同頁只有一張卡片
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_unique ON knowledge_cards(source_file_id, page_number);

-- 表三：decisions（投/不投決策記錄）
CREATE TABLE IF NOT EXISTS decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT NOT NULL,
  notion_page_id TEXT,
  decision TEXT NOT NULL,    -- 'bid' | 'no_bid' | 'conditional'
  reason TEXT,
  win_assessment_id UUID REFERENCES intelligence_cache(id),
  decided_by TEXT DEFAULT 'Jin',
  decided_at TIMESTAMPTZ DEFAULT now(),
  notion_created BOOLEAN DEFAULT false,
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_case ON decisions(case_id);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(decided_at);

-- RLS（第一階段簡化：允許 authenticated 用戶完全存取）
ALTER TABLE intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- 使用 service role key 時 RLS 自動跳過，但仍需 policy 給 authenticated 用戶
CREATE POLICY "intelligence_cache_all" ON intelligence_cache FOR ALL USING (true);
CREATE POLICY "knowledge_cards_all" ON knowledge_cards FOR ALL USING (true);
CREATE POLICY "decisions_all" ON decisions FOR ALL USING (true);
