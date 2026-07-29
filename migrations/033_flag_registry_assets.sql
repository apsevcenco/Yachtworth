-- Yachtworth Flag Advisor local flag assets.
-- Uses flag-icons@7.5.0 4x3 SVG files copied into the app bundle.

alter table public.flag_registries
  add column if not exists flag_code text,
  add column if not exists flag_asset_key text,
  add column if not exists flag_asset_path text,
  add column if not exists flag_alt_text text,
  add column if not exists registry_badge text,
  add column if not exists flag_note text,
  add column if not exists flag_asset_source text,
  add column if not exists flag_asset_license text,
  add column if not exists flag_asset_updated_at date;

alter table public.flag_registries
  drop constraint if exists flag_registries_flag_code_check,
  add constraint flag_registries_flag_code_check
    check (
      flag_code is null
      or flag_code in ('ky','mt','mh','im','je','gg','gi','gb','fr','it','es','nl','pt','cy','pa','bz','jm','ck','sm','lu','vg','bs','pl','bm')
    );

with mapping(slug, flag_name, flag_code, display_label, registry_badge, flag_note) as (
  values
    ('cayman-islands','Cayman Islands','ky','Cayman Islands',null,null),
    ('cayman','Cayman Islands','ky','Cayman Islands',null,null),
    ('malta','Malta','mt','Malta',null,null),
    ('marshall-islands','Marshall Islands','mh','Marshall Islands',null,null),
    ('marshall','Marshall Islands','mh','Marshall Islands',null,null),
    ('isle-of-man','Isle of Man','im','Isle of Man',null,null),
    ('jersey','Jersey','je','Jersey',null,null),
    ('guernsey','Guernsey','gg','Guernsey',null,null),
    ('gibraltar','Gibraltar','gi','Gibraltar',null,null),
    ('united-kingdom','United Kingdom','gb','United Kingdom',null,null),
    ('france','France','fr','France',null,null),
    ('italy','Italy','it','Italy',null,null),
    ('spain','Spain','es','Spain',null,null),
    ('netherlands','Netherlands','nl','Netherlands',null,null),
    ('portugal','Portugal','pt','Portugal',null,null),
    ('madeira','Madeira (MAR)','pt','Madeira International Shipping Register','MAR','Yachts registered in MAR fly the Portuguese flag.'),
    ('madeira-mar','Madeira (MAR)','pt','Madeira International Shipping Register','MAR','Yachts registered in MAR fly the Portuguese flag.'),
    ('cyprus','Cyprus','cy','Cyprus',null,null),
    ('panama','Panama','pa','Panama',null,null),
    ('belize','Belize','bz','Belize',null,null),
    ('jamaica','Jamaica','jm','Jamaica',null,null),
    ('cook-islands','Cook Islands','ck','Cook Islands',null,null),
    ('cook','Cook Islands','ck','Cook Islands',null,null),
    ('san-marino','San Marino','sm','San Marino',null,null),
    ('luxembourg','Luxembourg','lu','Luxembourg',null,null),
    ('british-virgin-islands','British Virgin Islands','vg','British Virgin Islands',null,null),
    ('bvi','British Virgin Islands','vg','British Virgin Islands',null,null),
    ('bahamas','The Bahamas','bs','The Bahamas',null,null),
    ('the-bahamas','The Bahamas','bs','The Bahamas',null,null),
    ('poland','Poland','pl','Poland',null,null),
    ('bermuda','Bermuda','bm','Bermuda',null,null)
)
update public.flag_registries fr
   set flag_code = m.flag_code,
       flag_asset_key = m.flag_code,
       flag_asset_path = '/assets/flags/4x3/' || m.flag_code || '.svg',
       flag_alt_text = case
         when m.registry_badge = 'MAR' then 'Portuguese flag - Madeira International Shipping Register'
         else 'Flag of ' || m.display_label
       end,
       registry_badge = m.registry_badge,
       flag_note = m.flag_note,
       flag_asset_source = 'flag-icons@7.5.0',
       flag_asset_license = 'MIT',
       flag_asset_updated_at = date '2026-07-27',
       updated_at = now()
  from mapping m
 where lower(coalesce(fr.slug, fr.code, regexp_replace(fr.flag_name, '[^A-Za-z0-9]+', '-', 'g'))) = m.slug
    or lower(fr.flag_name) = lower(m.flag_name);

comment on column public.flag_registries.flag_code is
  'Explicit local flag-icons 4x3 asset code. Do not infer dynamically at request time.';
comment on column public.flag_registries.registry_badge is
  'Optional registry-specific badge. Madeira International Shipping Register uses MAR while flying the Portuguese flag.';
comment on column public.flag_registries.flag_note is
  'Factual legal-flag clarification, for example MAR yachts fly the Portuguese flag.';
