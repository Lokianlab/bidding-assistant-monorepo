-- P1e: Notion 同步日誌表
-- 作用：記錄所有 Notion ↔ Supabase 同步操作
-- 依賴：無（獨立表）

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES kb_items(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'import')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_msg TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sync_logs_tenant_id ON sync_logs(tenant_id);
CREATE INDEX idx_sync_logs_item_id ON sync_logs(item_id);
CREATE INDEX idx_sync_logs_operation ON sync_logs(operation);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_tenant_operation ON sync_logs(tenant_id, operation);

-- 行級別安全性（如啟用 RLS）
-- 注意：初期不啟用 RLS，因為 sync_logs 是系統表
-- 如需後續啟用，請取消下方註解

-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY sync_logs_view_own
--   ON sync_logs FOR SELECT
--   USING (auth.uid() = (SELECT user_id FROM kb_items WHERE id = sync_logs.item_id));

-- 留言：sync_logs 表記錄同步狀態，用於：
-- 1. 前端展示同步進度
-- 2. 除錯失敗的同步操作
-- 3. 異常恢復（重試失敗操作）
-- 4. 審計追蹤
