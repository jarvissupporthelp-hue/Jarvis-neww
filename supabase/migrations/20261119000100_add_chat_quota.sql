create table jarvis_private.chat_daily_usage (
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  usage_day date not null,
  attempts smallint not null check (attempts between 1 and 20),
  primary key (student_id, usage_day)
);

alter table jarvis_private.chat_daily_usage enable row level security;
revoke all on jarvis_private.chat_daily_usage from public, anon, authenticated;

create function jarvis_private.reserve_chat_attempt()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active'
  for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  insert into jarvis_private.chat_daily_usage as usage (student_id, usage_day, attempts)
  values (caller, today, 1)
  on conflict (student_id, usage_day) do update
    set attempts = usage.attempts + 1
    where usage.attempts < 20;
  return found;
end;
$$;

revoke execute on function jarvis_private.reserve_chat_attempt() from public, anon, authenticated;
grant execute on function jarvis_private.reserve_chat_attempt() to authenticated;

create function public.reserve_chat_attempt()
returns boolean language sql security invoker set search_path = ''
as $$ select jarvis_private.reserve_chat_attempt(); $$;
revoke execute on function public.reserve_chat_attempt() from public, anon, authenticated;
grant execute on function public.reserve_chat_attempt() to authenticated;
