-- 023_survey_professional_foundation.sql
-- Professional Survey Builder foundation.
--
-- Adds nullable report-level scope fields and item-level professional fields.
-- Safe to run on existing data: no columns are removed, renamed, or made
-- required. Existing survey reports continue to work.

alter table public.survey_reports
  add column if not exists report_type text not null default 'pre_purchase',
  add column if not exists intended_use text,
  add column if not exists survey_scope text,
  add column if not exists standards_referenced jsonb not null default '[]'::jsonb,
  add column if not exists limitations jsonb not null default '[]'::jsonb,
  add column if not exists offline_sync_version integer not null default 1;

alter table public.survey_items
  add column if not exists inspected_status text,
  add column if not exists defect_description text,
  add column if not exists test_method text,
  add column if not exists regulatory_reference text,
  add column if not exists safety_critical boolean not null default false,
  add column if not exists insurance_critical boolean not null default false,
  add column if not exists compliance_critical boolean not null default false,
  add column if not exists estimated_cost_eur numeric,
  add column if not exists due_date date,
  add column if not exists section_data jsonb not null default '{}'::jsonb,
  add column if not exists sync_status text not null default 'synced',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists survey_reports_type_idx
  on public.survey_reports (clerk_user_id, report_type, created_at desc);

create index if not exists survey_items_critical_idx
  on public.survey_items (report_id, safety_critical, compliance_critical)
  where safety_critical = true or compliance_critical = true;

-- Keep the existing section replace contract, but preserve the new professional
-- fields whenever clients send them. Older clients that do not send these
-- fields simply store null/default values.
create or replace function public.replace_survey_section_items(
  p_report_id      uuid,
  p_section_number integer,
  p_items          jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  ord int := 0;
begin
  if p_report_id is null then
    raise exception 'p_report_id required';
  end if;
  if p_section_number is null then
    raise exception 'p_section_number required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  delete from public.survey_items
   where report_id      = p_report_id
     and section_number = p_section_number;

  for r in select * from jsonb_array_elements(p_items)
  loop
    insert into public.survey_items (
      report_id,
      section_number,
      section_name,
      item_number,
      description,
      condition,
      notes,
      recommendation_level,
      recommendation_text,
      photo_urls,
      moisture_reading,
      moisture_level,
      sort_order,
      inspected_status,
      defect_description,
      test_method,
      regulatory_reference,
      safety_critical,
      insurance_critical,
      compliance_critical,
      estimated_cost_eur,
      due_date,
      section_data,
      sync_status,
      updated_at
    ) values (
      p_report_id,
      p_section_number,
      coalesce(r->>'section_name', ''),
      coalesce(r->>'item_number', ''),
      nullif(r->>'description', ''),
      nullif(r->>'condition', ''),
      nullif(r->>'notes', ''),
      nullif(r->>'recommendation_level', ''),
      nullif(r->>'recommendation_text', ''),
      coalesce(r->'photo_urls', '[]'::jsonb),
      case
        when r->>'moisture_reading' is null or r->>'moisture_reading' = ''
          then null
        else (r->>'moisture_reading')::numeric
      end,
      nullif(r->>'moisture_level', ''),
      coalesce((r->>'sort_order')::int, ord),
      nullif(r->>'inspected_status', ''),
      nullif(r->>'defect_description', ''),
      nullif(r->>'test_method', ''),
      nullif(r->>'regulatory_reference', ''),
      coalesce((r->>'safety_critical')::boolean, false),
      coalesce((r->>'insurance_critical')::boolean, false),
      coalesce((r->>'compliance_critical')::boolean, false),
      case
        when r->>'estimated_cost_eur' is null or r->>'estimated_cost_eur' = ''
          then null
        else (r->>'estimated_cost_eur')::numeric
      end,
      case
        when r->>'due_date' is null or r->>'due_date' = ''
          then null
        else (r->>'due_date')::date
      end,
      coalesce(r->'section_data', '{}'::jsonb),
      coalesce(nullif(r->>'sync_status', ''), 'synced'),
      now()
    );
    ord := ord + 1;
  end loop;

  update public.survey_reports sr
     set total_recommendations_a = c.cnt_a,
         total_recommendations_b = c.cnt_b,
         total_recommendations_c = c.cnt_c,
         total_recommendations_d = c.cnt_d,
         updated_at = now()
    from (
      select
        count(*) filter (where recommendation_level = 'A') as cnt_a,
        count(*) filter (where recommendation_level = 'B') as cnt_b,
        count(*) filter (where recommendation_level = 'C') as cnt_c,
        count(*) filter (where recommendation_level = 'D') as cnt_d
      from public.survey_items
      where report_id = p_report_id
    ) c
   where sr.id = p_report_id;
end;
$$;

grant execute on function public.replace_survey_section_items(uuid, integer, jsonb)
  to service_role;
