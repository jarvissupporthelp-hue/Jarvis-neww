create table public.focus_sessions (
  id uuid primary key,
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  mode text not null check (mode in ('focus','break')),
  duration_minutes smallint not null check (duration_minutes between 1 and 90),
  label text not null default '' check (length(label) <= 120),
  state text not null check (state in ('running','paused','completed','cancelled')),
  started_at timestamptz not null,
  ends_at timestamptz,
  remaining_seconds integer,
  completed_at timestamptz,
  check (
    (state='running' and ends_at is not null and remaining_seconds is null and completed_at is null)
    or (state='paused' and ends_at is null and remaining_seconds between 1 and duration_minutes * 60
      and remaining_seconds is not null and completed_at is null)
    or (state='completed' and ends_at is null and remaining_seconds is null and completed_at is not null)
    or (state='cancelled' and ends_at is null and remaining_seconds is null and completed_at is null)
  )
);
create unique index focus_sessions_active_student_idx on public.focus_sessions(student_id)
where state in ('running','paused');
create index focus_sessions_history_idx on public.focus_sessions(student_id,completed_at desc,id)
where state='completed' and mode='focus';

alter table public.focus_sessions enable row level security;
revoke all on public.focus_sessions from public,anon,authenticated;
grant select on public.focus_sessions to authenticated;
create policy own_focus_sessions on public.focus_sessions for select to authenticated
using (student_id in (select user_id from public.memberships where role='student'));

create function jarvis_private.focus_timer(
  p_action text, p_id uuid, p_mode text, p_minutes integer, p_label text
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := auth.uid();
  current_time_at timestamptz;
  active public.focus_sessions;
  local_today date;
  today_start timestamptz;
  week_start timestamptz;
begin
  perform 1 from public.memberships where user_id=caller and role='student' and status='active' for share;
  if not found then raise insufficient_privilege; end if;
  if p_action is null or p_action not in ('read','start','pause','resume','reset')
    or (p_action <> 'read' and p_id is null) then raise invalid_parameter_value; end if;
  if p_action='start' and (p_mode is null or p_mode not in ('focus','break')
    or p_minutes is null or p_minutes not between 1 and 90 or length(coalesce(p_label,''))>120)
  then raise invalid_parameter_value; end if;

  perform pg_advisory_xact_lock(hashtextextended(caller::text,21));
  current_time_at := clock_timestamp();
  local_today := (current_time_at at time zone 'Asia/Yerevan')::date;
  today_start := local_today::timestamp at time zone 'Asia/Yerevan';
  week_start := date_trunc('week',local_today::timestamp) at time zone 'Asia/Yerevan';

  select * into active from public.focus_sessions where student_id=caller and state in ('running','paused');
  if active.state='running' and active.ends_at<=current_time_at then
    update public.focus_sessions set state='completed', completed_at=ends_at, ends_at=null where id=active.id;
    active := null;
  end if;

  if p_action='start' and active.id is null then
    insert into public.focus_sessions(id,student_id,mode,duration_minutes,label,state,started_at,ends_at)
    values (p_id,caller,p_mode,p_minutes,btrim(coalesce(p_label,'')),'running',current_time_at,
      current_time_at+make_interval(mins=>p_minutes))
    on conflict (id) do nothing returning * into active;
  elsif active.id=p_id then
    if p_action='pause' and active.state='running' then
      update public.focus_sessions set state='paused',remaining_seconds=ceil(extract(epoch from (ends_at-current_time_at))),
        ends_at=null where id=active.id returning * into active;
    elsif p_action='resume' and active.state='paused' then
      update public.focus_sessions set state='running',ends_at=current_time_at+make_interval(secs=>remaining_seconds),
        remaining_seconds=null where id=active.id returning * into active;
    elsif p_action='reset' then
      update public.focus_sessions set state='cancelled',ends_at=null,remaining_seconds=null where id=active.id;
      active := null;
    end if;
  end if;

  return jsonb_build_object(
    'server_now',current_time_at,
    'active',case when active.id is not null then to_jsonb(active)-'student_id' end,
    'history',coalesce((
      select jsonb_agg(to_jsonb(h) order by h.completed_at desc,h.id)
      from (select id,label,duration_minutes,completed_at from public.focus_sessions
        where student_id=caller and state='completed' and mode='focus'
        order by completed_at desc,id limit 10) h
    ),'[]'::jsonb),
    'today_minutes',(select coalesce(sum(duration_minutes),0) from public.focus_sessions
      where student_id=caller and state='completed' and mode='focus' and completed_at>=today_start),
    'week_minutes',(select coalesce(sum(duration_minutes),0) from public.focus_sessions
      where student_id=caller and state='completed' and mode='focus' and completed_at>=week_start)
  );
end;
$$;

revoke execute on function jarvis_private.focus_timer(text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function jarvis_private.focus_timer(text,uuid,text,integer,text) to authenticated;
create function public.focus_timer(p_action text,p_id uuid default null,p_mode text default null,
  p_minutes integer default null,p_label text default null)
returns jsonb language sql security invoker set search_path=''
as $$ select jarvis_private.focus_timer(p_action,p_id,p_mode,p_minutes,p_label); $$;
revoke execute on function public.focus_timer(text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.focus_timer(text,uuid,text,integer,text) to authenticated;
