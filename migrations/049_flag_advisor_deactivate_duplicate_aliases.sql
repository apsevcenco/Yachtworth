-- Yachtworth Flag Advisor: hide obsolete duplicate alias rows.
--
-- This is intentionally a soft cleanup: old imported aliases stay in the database
-- for audit/history, but active=false removes them from the Flag Advisor UI and
-- comparison engine. The canonical rows below are the comprehensive 2026 profiles.

with duplicate_groups(group_key, canonical_code, alias_codes) as (
  values
    ('cayman-islands', 'cayman', array['cayman','cayman-islands']),
    ('marshall-islands', 'marshall', array['marshall','marshall-islands']),
    ('isle-of-man', 'iom', array['iom','isle-of-man']),
    ('madeira', 'portugal_madeira', array['portugal_madeira','madeira','madeira-mar']),
    ('united-kingdom', 'united-kingdom', array['united-kingdom','uk','great-britain'])
),
ranked as (
  select
    dg.group_key,
    dg.canonical_code,
    fr.id,
    fr.code,
    row_number() over (
      partition by dg.group_key
      order by
        case when fr.code = dg.canonical_code then 0 else 1 end,
        case when coalesce(fr.source_version, '') like '%guide-2026%' then 0 else 1 end,
        coalesce(fr.data_quality_score, 0) desc,
        fr.updated_at desc nulls last,
        fr.created_at desc nulls last
    ) as keep_rank
  from duplicate_groups dg
  join public.flag_registries fr
    on fr.code = any(dg.alias_codes)
),
keepers as (
  select group_key, canonical_code, id as keeper_id, code as keeper_code
  from ranked
  where keep_rank = 1
)
update public.flag_registries fr
   set active = false,
       updated_at = now(),
       original_row = coalesce(fr.original_row, '{}'::jsonb)
         || jsonb_build_object(
              'deactivated_reason', 'duplicate flag alias hidden by migration 049',
              'canonical_code', k.keeper_code,
              'deactivated_at', now()
            )
  from ranked r
  join keepers k on k.group_key = r.group_key
 where fr.id = r.id
   and r.id <> k.keeper_id;

-- Make sure the comprehensive canonical rows remain visible even if an older
-- import accidentally marked them inactive.
update public.flag_registries
   set active = true,
       updated_at = now()
 where code in ('cayman','marshall','iom','portugal_madeira','united-kingdom');
