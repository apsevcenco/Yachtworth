-- Yachtworth Broker OS case workflow indexes.
-- Safe to re-run. Supports the pipeline board, case detail tasks and activity timeline.

create index if not exists broker_cases_user_status_stage_updated_idx
  on public.broker_cases (clerk_user_id, status, stage, updated_at desc);

create index if not exists broker_tasks_case_status_due_idx
  on public.broker_tasks (clerk_user_id, case_id, status, due_date);

create index if not exists broker_activity_case_time_idx
  on public.broker_activity (clerk_user_id, case_id, happened_at desc);
