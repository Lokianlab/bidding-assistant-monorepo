-- M11 結案飛輪 - case_learnings 表與相關修改
-- 建立日期：2026-02-24
-- 目的：記錄案件結案學習點，支援知識庫回流與成功模式識別

-- ============================================================================
-- 1. 建立 case_learnings 表（結案學習點）
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯欄位
  case_id UUID NOT NULL,  -- 將引用 cases(id)，待 M10 cases 表建立後補上外鍵
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 結案摘要內容（三段落）
  title TEXT NOT NULL,
  what_we_did TEXT,
  what_we_learned TEXT,
  next_time_notes TEXT,

  -- 評分（各 1-10）
  strategy_score INTEGER CHECK (strategy_score >= 1 AND strategy_score <= 10),
  execution_score INTEGER CHECK (execution_score >= 1 AND execution_score <= 10),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),

  -- 標籤與後續追蹤
  tags TEXT[] DEFAULT '{}',
  kb_item_id UUID REFERENCES kb_items(id) ON DELETE SET NULL,  -- 寫入 KB 後的引用

  -- 時間戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 多租戶隔離與查詢優化
  CONSTRAINT case_learnings_valid_scores CHECK (
    strategy_score IS NULL OR strategy_score BETWEEN 1 AND 10
  )
);

-- 索引優化查詢效能
CREATE INDEX IF NOT EXISTS idx_case_learnings_tenant_id
  ON case_learnings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_case_learnings_case_id
  ON case_learnings(case_id);

CREATE INDEX IF NOT EXISTS idx_case_learnings_kb_item_id
  ON case_learnings(kb_item_id);

CREATE INDEX IF NOT EXISTS idx_case_learnings_tenant_case
  ON case_learnings(tenant_id, case_id);

CREATE INDEX IF NOT EXISTS idx_case_learnings_tags
  ON case_learnings USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_case_learnings_created_at
  ON case_learnings(created_at DESC);

-- ============================================================================
-- 2. 修改 kb_items 表：新增欄位標記結案來源
-- ============================================================================

-- 檢查欄位是否存在，若不存在則新增
DO $$
BEGIN
  -- 檢查並新增 source_type 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_items' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE kb_items
    ADD COLUMN source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'case_closing', 'import'));
    CREATE INDEX idx_kb_items_source_type ON kb_items(source_type);
  END IF;

  -- 檢查並新增 related_case_id 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_items' AND column_name = 'related_case_id'
  ) THEN
    ALTER TABLE kb_items
    ADD COLUMN related_case_id UUID;
    CREATE INDEX idx_kb_items_related_case_id ON kb_items(related_case_id);
  END IF;
END $$;

-- ============================================================================
-- 3. 行級別安全性（RLS）- 多租戶隔離
-- ============================================================================

-- 啟用 RLS
ALTER TABLE case_learnings ENABLE ROW LEVEL SECURITY;

-- 政策：每個租戶只能讀寫自己的結案記錄
CREATE POLICY "case_learnings_select" ON case_learnings
  FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "case_learnings_insert" ON case_learnings
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "case_learnings_update" ON case_learnings
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "case_learnings_delete" ON case_learnings
  FOR DELETE
  USING (tenant_id = auth.uid());

-- ============================================================================
-- 4. 更新 updated_at 的觸發器
-- ============================================================================

CREATE OR REPLACE FUNCTION update_case_learnings_timestamp()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_case_learnings_timestamp
  BEFORE UPDATE ON case_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_case_learnings_timestamp();

-- ============================================================================
-- 5. 註解與後續計畫
-- ============================================================================

-- TODO:
-- - [ ] 驗證表結構已建立
-- - [ ] RLS 測試：租戶隔離正常
-- - [ ] 觸發器測試：updated_at 自動更新
-- - [ ] 當 M10 cases 表建立後，補上外鍵約束：
--       ALTER TABLE case_learnings
--       ADD CONSTRAINT fk_case_learnings_case_id
--       FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;
-- - [ ] 索引效能測試：查詢 < 100ms

-- 留言：case_learnings 表記錄案件結案學習點，支援：
-- 1. 結案文件自動生成（三段落：做了什麼 / 學到什麼 / 下次注意）
-- 2. 結案評分（策略 / 執行 / 滿意度）
-- 3. 知識庫回流（自動寫入 KB，標籤標記來源為 'case_closing'）
-- 4. 成功模式識別（統計高頻標籤，v1 簡易版）
-- 5. 多租戶隔離（每個租戶只能看自己的結案記錄）
