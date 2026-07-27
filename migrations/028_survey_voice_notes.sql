-- Yachtworth - Survey voice notes.
-- Stores source audio metadata and transcripts for Survey Builder dictation.
-- PDF generation does not read this table directly; final edited text is
-- inserted into survey item fields by the app and then rendered normally.

create table if not exists public.survey_voice_notes (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  report_id uuid not null references public.survey_reports(id) on delete cascade,
  item_id uuid references public.survey_items(id) on delete set null,
  section_number integer,
  field_key text not null,
  language text not null default 'en'
    check (language in ('en', 'fr', 'it', 'ru')),
  transcription_status text not null default 'completed'
    check (transcription_status in ('recording', 'uploading', 'processing', 'completed', 'failed')),
  audio_url text,
  raw_transcript text not null default '',
  edited_text text not null default '',
  confidence numeric,
  duration_seconds numeric,
  created_by text not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists survey_voice_notes_owner_report_idx
  on public.survey_voice_notes (clerk_user_id, report_id, created_at desc);

create index if not exists survey_voice_notes_item_idx
  on public.survey_voice_notes (item_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'survey-voice-notes',
  'survey-voice-notes',
  false,
  26214400,
  array['audio/aac', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/3gpp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
