-- M10 履約管理資料表定義
-- Created: 2026-02-25

-- 合約表
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  budget numeric(12, 2) not null check (budget >= 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint end_date_after_start check (end_date >= start_date)
);

-- 里程碑表
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(3, 2) not null check (weight > 0 and weight <= 1),
  due_date date not null,
  completed_date date,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  status text default 'pending' check (status in ('pending', 'in-progress', 'completed', 'overdue', 'at-risk')),
  payment_amount numeric(12, 2) not null check (payment_amount >= 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 進度報告表
create table public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint period_end_after_start check (period_end >= period_start)
);

-- 報告章節表
create table public.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.progress_reports(id) on delete cascade,
  title text not null,
  content text not null,
  section_order integer default 0,
  created_at timestamp with time zone default now()
);

-- 報告附件表
create table public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.progress_reports(id) on delete cascade,
  file_url text not null,
  file_name text,
  created_at timestamp with time zone default now()
);

-- 建立索引以提高查詢效能
create index idx_contracts_case_id on public.contracts(case_id);
create index idx_contracts_tenant_id on public.contracts(tenant_id);
create index idx_contracts_status on public.contracts(status);
create index idx_milestones_contract_id on public.milestones(contract_id);
create index idx_milestones_status on public.milestones(status);
create index idx_milestones_due_date on public.milestones(due_date);
create index idx_progress_reports_contract_id on public.progress_reports(contract_id);
create index idx_report_sections_report_id on public.report_sections(report_id);
create index idx_report_attachments_report_id on public.report_attachments(report_id);

-- 啟用 RLS（Row Level Security）
alter table public.contracts enable row level security;
alter table public.milestones enable row level security;
alter table public.progress_reports enable row level security;
alter table public.report_sections enable row level security;
alter table public.report_attachments enable row level security;

-- RLS 政策（待實裝，暫時允許所有認證使用者）
create policy "contracts_select_authenticated" on public.contracts for select using (auth.role() = 'authenticated');
create policy "contracts_insert_authenticated" on public.contracts for insert with check (auth.role() = 'authenticated');
create policy "contracts_update_authenticated" on public.contracts for update using (auth.role() = 'authenticated');
create policy "contracts_delete_authenticated" on public.contracts for delete using (auth.role() = 'authenticated');

create policy "milestones_select_authenticated" on public.milestones for select using (auth.role() = 'authenticated');
create policy "milestones_insert_authenticated" on public.milestones for insert with check (auth.role() = 'authenticated');
create policy "milestones_update_authenticated" on public.milestones for update using (auth.role() = 'authenticated');
create policy "milestones_delete_authenticated" on public.milestones for delete using (auth.role() = 'authenticated');

create policy "progress_reports_select_authenticated" on public.progress_reports for select using (auth.role() = 'authenticated');
create policy "progress_reports_insert_authenticated" on public.progress_reports for insert with check (auth.role() = 'authenticated');
create policy "progress_reports_update_authenticated" on public.progress_reports for update using (auth.role() = 'authenticated');
create policy "progress_reports_delete_authenticated" on public.progress_reports for delete using (auth.role() = 'authenticated');
