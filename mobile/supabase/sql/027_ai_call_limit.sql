-- 027_ai_call_limit.sql
-- Limits how often the AI Edge Functions can be called, so nobody can run up
-- the Claude bill. Must be in place BEFORE the AI key is set.
--
-- Two limits, checked on every call:
--   * per person per day:   explain-dish 30, scan-menu 10 (photos cost more)
--   * whole app per day:    explain-dish 1000, scan-menu 200
-- The whole-app limit matters because a guest login is free: someone could
-- make new guest accounts to get around the per-person limit, but not the
-- daily total. "Day" is a Korean calendar day.
-- Calls for the same function on the same day wait for each other (an advisory
-- lock), so two people calling at the same moment can't both slip past the
-- app-wide limit (found by Aqil in the review of #89).
-- Also set a monthly spend limit in the Claude console as a second net.
-- Safe to re-run.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  fn text not null check (fn in ('explain-dish', 'scan-menu')),
  calls int not null default 0,
  primary key (user_id, day, fn)
);
alter table public.ai_usage enable row level security;
-- Nobody reads or writes it directly; only use_ai_quota() below does.
revoke all on public.ai_usage from anon, authenticated;

-- Counts one call and says whether it is allowed:
--   'ok', 'user_limit', 'app_limit', 'login_required' or 'unknown_function'.
-- Called by the Edge Function with the user's own login, so auth.uid() is them.
create or replace function public.use_ai_quota(p_fn text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_user_limit int;
  v_app_limit int;
  v_calls int;
begin
  if v_uid is null then
    return 'login_required';
  end if;

  case p_fn
    when 'explain-dish' then v_user_limit := 30; v_app_limit := 1000;
    when 'scan-menu' then v_user_limit := 10; v_app_limit := 200;
    else return 'unknown_function';
  end case;

  -- One caller at a time per function per day, until this call's transaction
  -- ends. The check below and the update after it then can't interleave.
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_fn || ':' || v_day::text));

  if (select coalesce(sum(calls), 0) from public.ai_usage where day = v_day and fn = p_fn) >= v_app_limit then
    return 'app_limit';
  end if;

  insert into public.ai_usage as u (user_id, day, fn, calls)
  values (v_uid, v_day, p_fn, 1)
  on conflict (user_id, day, fn) do update
    set calls = u.calls + 1
    where u.calls < v_user_limit
  returning calls into v_calls;

  if v_calls is null then
    return 'user_limit'; -- the row exists and is already at the limit
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.use_ai_quota(text) from public, anon;
grant execute on function public.use_ai_quota(text) to authenticated;

-- Check: should show 'ai_usage' and 'use_ai_quota'
select to_regclass('public.ai_usage') as tbl, to_regprocedure('public.use_ai_quota(text)') as fn;
