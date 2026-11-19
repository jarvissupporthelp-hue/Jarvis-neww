create table public.arena_ranked_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  game_slug text not null check (game_slug in (
    'logic-circuit-lab', 'matrix-transform-arena', 'algorithm-sort-duel', 'binary-hex-bridge',
    'orbital-ballistics-sim', 'stoichiometry-balancer', 'equilibrium-market-sim',
    'cipher-breaker-lab', 'calculus-integral-estimator', 'periodic-element-forge'
  )),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  award_day date,
  xp integer not null default 0 check (xp between 0 and 150),
  check ((finished_at is null and award_day is null and xp = 0)
    or (finished_at is not null and award_day is not null and finished_at >= started_at))
);

create unique index arena_active_run on public.arena_ranked_runs(student_id, game_slug, difficulty)
where finished_at is null;
create unique index arena_daily_award on public.arena_ranked_runs(student_id, award_day, game_slug, difficulty)
where xp > 0;
create index arena_awards_by_date on public.arena_ranked_runs(award_day, game_slug, student_id)
include (xp) where xp > 0;

alter table public.arena_ranked_runs enable row level security;
revoke all on public.arena_ranked_runs from public, anon, authenticated, service_role;
grant select on public.arena_ranked_runs to service_role;

create function public.arena_start_ranked_run(p_user uuid, p_game text, p_difficulty text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  run_id uuid;
  now_at timestamptz;
begin
  perform 1 from public.memberships
    where user_id=p_user and role='student' and status='active' for update;
  if not found then raise insufficient_privilege; end if;

  now_at := clock_timestamp();
  delete from public.arena_ranked_runs
    where student_id=p_user and finished_at is null and started_at < now_at - interval '2 hours';

  select id into run_id from public.arena_ranked_runs
    where student_id=p_user and game_slug=p_game and difficulty=p_difficulty and finished_at is null;

  if run_id is null then
    insert into public.arena_ranked_runs(student_id, game_slug, difficulty, started_at)
    values (p_user, p_game, p_difficulty, now_at) returning id into run_id;
  end if;
  return run_id;
end;
$$;

-- This RPC is called only after the API has checked the submitted answers.
create function public.arena_finish_ranked_run(p_user uuid, p_run uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  run public.arena_ranked_runs;
  now_at timestamptz;
  today date;
  earned integer := 0;
  spent integer;
begin
  perform 1 from public.memberships
    where user_id=p_user and role='student' and status='active' for update;
  if not found then raise insufficient_privilege; end if;

  select * into run from public.arena_ranked_runs where student_id=p_user and id=p_run;
  if not found then return null; end if;

  if run.finished_at is not null then
    return jsonb_build_object('score', 1000, 'xp', run.xp);
  end if;

  now_at := clock_timestamp();
  if now_at - run.started_at > interval '2 hours' then return null; end if;
  today := (now_at at time zone 'Asia/Yerevan')::date;

  if not exists (select 1 from public.arena_ranked_runs
      where student_id=p_user and award_day=today and game_slug=run.game_slug and difficulty=run.difficulty and xp > 0) then
    select coalesce(sum(xp), 0) into spent from public.arena_ranked_runs
      where student_id=p_user and award_day=today and xp > 0;
    earned := least(700 - spent, case run.difficulty
      when 'Beginner' then 80 when 'Intermediate' then 100 when 'Advanced' then 125 else 150 end);
  end if;

  update public.arena_ranked_runs set finished_at=now_at, award_day=today, xp=earned where id=run.id;
  return jsonb_build_object('score', 1000, 'xp', earned);
end;
$$;

create function public.arena_rankings(p_user uuid, p_weekly boolean, p_game text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  mine bigint;
  week_start date := date_trunc('week', clock_timestamp() at time zone 'Asia/Yerevan')::date;
begin
  perform 1 from public.memberships where user_id=p_user and status='active';
  if not found then raise insufficient_privilege; end if;

  select coalesce(sum(xp), 0) into mine from public.arena_ranked_runs
    where student_id=p_user and xp > 0;

  return jsonb_build_object('totalXp', mine, 'leaders', coalesce((
    with totals as (
      select r.student_id, sum(r.xp) as xp
      from public.arena_ranked_runs r
      join public.memberships m on m.user_id=r.student_id and m.role='student' and m.status='active'
      where r.xp > 0 and (p_game is null or r.game_slug=p_game)
        and (not p_weekly or r.award_day >= week_start)
      group by r.student_id
    ), leaders as (
      select rank() over (order by xp desc) as rank,
        'Scholar ' || upper(substr(md5(student_id::text), 1, 10)) as alias,
        student_id=p_user as mine, xp
      from totals order by xp desc, student_id limit 50
    )
    select jsonb_agg(to_jsonb(leaders) order by rank, alias) from leaders
  ), '[]'::jsonb));
end;
$$;

revoke execute on function public.arena_start_ranked_run(uuid, text, text),
  public.arena_finish_ranked_run(uuid, uuid), public.arena_rankings(uuid, boolean, text)
from public, anon, authenticated;

grant execute on function public.arena_start_ranked_run(uuid, text, text),
  public.arena_finish_ranked_run(uuid, uuid), public.arena_rankings(uuid, boolean, text)
to service_role;
