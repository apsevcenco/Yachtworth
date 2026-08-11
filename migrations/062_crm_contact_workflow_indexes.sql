-- Yachtworth CRM contact workflow indexes.
-- Safe to re-run. Supports fast client cards, contact tasks and activity timeline.

create index if not exists broker_tasks_contact_status_due_idx
  on public.broker_tasks (clerk_user_id, contact_id, status, due_date);

create index if not exists broker_activity_contact_time_idx
  on public.broker_activity (clerk_user_id, contact_id, happened_at desc);

create index if not exists broker_cases_contact_updated_idx
  on public.broker_cases (clerk_user_id, contact_id, updated_at desc);
