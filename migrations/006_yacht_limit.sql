-- Atomic enforcement of "max 5 yacht profiles per Clerk user".
-- Uses an advisory transaction lock keyed by clerk_user_id so two
-- concurrent INSERTs can't both observe count=4 and both succeed.
--
-- Pairs with the soft 403 check in routes/yachts.ts (fast path, no DB
-- round trip when count is already known to be at the limit). This
-- trigger is the source of truth.

create or replace function enforce_yacht_limit() returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  -- Serialize concurrent inserts for the same user within this txn.
  perform pg_advisory_xact_lock(hashtext(NEW.clerk_user_id));
  select count(*) into cnt from yachts where clerk_user_id = NEW.clerk_user_id;
  if cnt >= 5 then
    raise exception 'yacht_limit_reached'
      using errcode = 'P0001', hint = 'max 5 yacht profiles per user';
  end if;
  return NEW;
end;
$$;

drop trigger if exists yachts_limit_trigger on yachts;
create trigger yachts_limit_trigger
  before insert on yachts
  for each row execute function enforce_yacht_limit();
