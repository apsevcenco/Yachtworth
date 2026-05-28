-- 019_survey_items_section_replace.sql
-- Atomic per-section replace for survey items.
-- Eliminates cross-section overwrite when two devices edit different sections
-- concurrently, and makes DELETE+INSERT atomic via a single PL/pgSQL function
-- (function bodies run inside an implicit transaction).
--
-- Idempotent: safe to re-run.

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

  -- Atomic: both run inside this function's transaction.
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
      sort_order
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
      coalesce((r->>'sort_order')::int, ord)
    );
    ord := ord + 1;
  end loop;

  -- Recompute recommendation counters from current full item set.
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
