-- JARVIS Arena pilot, server-authoritative progression, staging first.
-- Deny writes on all public tables; all mutations are through validated RPC.
create table if not exists public.arena_players (
 user_id uuid primary key references auth.users(id) on delete cascade,
 avatar text not null default 'compass' check (avatar in ('compass','atom','circuit','sigma','orbit','shield')),
 leaderboard_opt_in boolean not null default false,
 total_xp integer not null default 0 check(total_xp>=0),
 games_completed integer not null default 0 check(games_completed>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.arena_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null check (game_id in ('logic-circuit-lab','matrix-transform-arena','algorithm-sort-duel','binary-hex-bridge')),
 difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced','Expert')),
 challenge jsonb not null,
 status text not null default 'started' check (status in ('started','completed','rejected')),
 score integer not null default 0 check (score between 0 and 1000),
 awarded_xp integer not null default 0 check (awarded_xp between 0 and 150),
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 unique (id,user_id)
);
create index if not exists arena_sessions_user_date_idx on public.arena_sessions(user_id,started_at desc);
create index if not exists arena_sessions_week_idx on public.arena_sessions(completed_at,user_id) where status='completed';
create table if not exists public.arena_unlocked_achievements (
 user_id uuid not null references auth.users(id) on delete cascade,
 code text not null check (code in ('first-victory','perfect-game','century-club','bronze-league')),
 unlocked_at timestamptz not null default now(),
 primary key(user_id,code)
);
alter table public.arena_players enable row level security;
alter table public.arena_sessions enable row level security;
alter table public.arena_unlocked_achievements enable row level security;
revoke all on public.arena_players, public.arena_sessions, public.arena_unlocked_achievements from anon, authenticated;
grant select on public.arena_players, public.arena_sessions, public.arena_unlocked_achievements to authenticated;
create policy arena_players_self on public.arena_players for select to authenticated using (user_id=(select auth.uid()));
create policy arena_sessions_self on public.arena_sessions for select to authenticated using (user_id=(select auth.uid()));
create policy arena_achievements_self on public.arena_unlocked_achievements for select to authenticated using (user_id=(select auth.uid()));

-- Only active students can play ranked. This check must be repeated inside each privileged RPC.
create or replace function public.arena_begin(p_game text,p_difficulty text default 'Beginner')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_challenge jsonb; v_session uuid; v_a integer; v_b integer; v_c integer; v_count integer;
begin
 if v_user is null or not exists (select 1 from public.memberships where user_id=v_user and status='active' and role='student') then
  raise exception 'Active student access required' using errcode='42501';
 end if;
 if p_game not in ('logic-circuit-lab','matrix-transform-arena','algorithm-sort-duel','binary-hex-bridge')
   or p_difficulty not in ('Beginner','Intermediate','Advanced','Expert') then
  raise exception 'Unsupported verified challenge' using errcode='22023';
 end if;
 -- Cap starts as well as awards to prevent session-spamming.
 select count(*) into v_count from public.arena_sessions where user_id=v_user and started_at >= now()-interval '1 hour';
 if v_count >= 20 then raise exception 'Hourly challenge limit reached' using errcode='22023'; end if;
 v_a := floor(random()*9)::integer+1;
 v_b := floor(random()*9)::integer+1;
 v_c := floor(random()*9)::integer+1;
 if p_game='logic-circuit-lab' then
  v_challenge:=jsonb_build_object('gate','XOR','inputs',jsonb_build_array(v_a%2,v_b%2,v_c%2),'question','XOR the three input bits; enter 0 or 1');
 elsif p_game='matrix-transform-arena' then
  v_challenge:=jsonb_build_object('vector',jsonb_build_array(v_a,v_b),'question','Rotate (x,y) by 90 degrees counterclockwise; enter x and y separated by a comma');
 elsif p_game='algorithm-sort-duel' then
  v_challenge:=jsonb_build_object('array',jsonb_build_array(v_a,v_b,v_c),'question','Sort these three numbers in ascending order, separated by commas');
 else
  v_challenge:=jsonb_build_object('value',v_a*16+v_b,'question','Convert this decimal number to its two-digit uppercase hexadecimal representation');
 end if;
 insert into public.arena_players(user_id) values(v_user) on conflict(user_id) do nothing;
 insert into public.arena_sessions(user_id,game_id,difficulty,challenge) values(v_user,p_game,p_difficulty,v_challenge) returning id into v_session;
 return jsonb_build_object('sessionId',v_session,'gameId',p_game,'difficulty',p_difficulty,'challenge',v_challenge,'verifiedSupported',true);
end $$;

create or replace function public.arena_finish(p_session uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid(); v_s public.arena_sessions%rowtype; v_p public.arena_players%rowtype;
 v_expected text; v_correct boolean; v_score integer; v_xp integer; v_today_xp integer; v_multiplier numeric;
 v_level integer; v_league text; v_new_achievements jsonb:='[]'::jsonb; v_code text; v_elapsed numeric;
 v_week_start date; v_today date;
begin
 if v_user is null or not exists(select 1 from public.memberships where user_id=v_user and role='student' and status='active') then
   raise exception 'Active student access required' using errcode='42501';
 end if;
 -- Lock user progression then session, serializing concurrent completions.
 insert into public.arena_players(user_id) values(v_user) on conflict(user_id) do nothing;
 select * into v_p from public.arena_players where user_id=v_user for update;
 select * into v_s from public.arena_sessions where id=p_session and user_id=v_user for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002'; end if;
 if v_s.status<>'started' then
  return jsonb_build_object('sessionId',v_s.id,'alreadyCompleted',true,'score',v_s.score,'awardedXp',v_s.awarded_xp,'verificationStatus',case when v_s.status='completed' then 'verified' else 'rejected' end,'totalXp',v_p.total_xp);
 end if;
 v_elapsed:=extract(epoch from now()-v_s.started_at);
 if v_elapsed < 5 or v_elapsed > 1800 or length(coalesce(p_answer,''))>80 then
  update public.arena_sessions set status='rejected',completed_at=now() where id=v_s.id;
  return jsonb_build_object('sessionId',v_s.id,'alreadyCompleted',false,'score',0,'awardedXp',0,'verificationStatus','rejected','reason','Completion outside allowed time or answer limits');
 end if;
 if v_s.game_id='logic-circuit-lab' then
  v_expected:=((v_s.challenge->'inputs'->>0)::int # (v_s.challenge->'inputs'->>1)::int # (v_s.challenge->'inputs'->>2)::int)::text;
 elsif v_s.game_id='matrix-transform-arena' then
  v_expected:=(-((v_s.challenge->'vector'->>1)::int))::text||','||(v_s.challenge->'vector'->>0);
 elsif v_s.game_id='algorithm-sort-duel' then
  select string_agg(value::text,',' order by value) into v_expected from jsonb_array_elements_text(v_s.challenge->'array') as t(value_text)
  cross join lateral (select value_text::int as value) x;
 else
  v_expected:=upper(lpad(to_hex((v_s.challenge->>'value')::int),2,'0'));
 end if;
 v_correct := upper(regexp_replace(trim(coalesce(p_answer,'')),'\s+','','g'))=upper(v_expected);
 v_score := case when v_correct then 1000 else 0 end;
 v_today := (now() at time zone 'Asia/Yerevan')::date;
 select coalesce(sum(awarded_xp),0) into v_today_xp from public.arena_sessions
  where user_id=v_user and status='completed' and (completed_at at time zone 'Asia/Yerevan')::date=v_today;
 v_multiplier := case v_s.difficulty when 'Expert' then 1.75 when 'Advanced' then 1.5 when 'Intermediate' then 1.25 else 1.0 end;
 v_xp := case when v_correct then least(150,round(100*v_multiplier)::int,greatest(0,700-v_today_xp)) else 0 end;
 update public.arena_sessions set status='completed',score=v_score,awarded_xp=v_xp,completed_at=now() where id=v_s.id;
 update public.arena_players set total_xp=total_xp+v_xp,games_completed=games_completed+1,updated_at=now() where user_id=v_user returning * into v_p;
 v_level:=floor((1+sqrt(1+4*v_p.total_xp/50.0))/2)::int;
 v_league:=case when v_p.total_xp>=20000 then 'Legend' when v_p.total_xp>=10000 then 'Diamond'
    when v_p.total_xp>=6000 then 'Platinum' when v_p.total_xp>=3000 then 'Gold'
    when v_p.total_xp>=1500 then 'Silver' when v_p.total_xp>=500 then 'Bronze' else 'Iron' end;
 foreach v_code in array array['first-victory','perfect-game','century-club','bronze-league'] loop
  if (v_code='first-victory' and v_correct)
     or (v_code='perfect-game' and v_correct)
     or (v_code='century-club' and v_p.total_xp>=100)
     or (v_code='bronze-league' and v_p.total_xp>=500) then
    insert into public.arena_unlocked_achievements(user_id,code) values(v_user,v_code) on conflict do nothing;
    if found then v_new_achievements:=v_new_achievements||to_jsonb(v_code); end if;
  end if;
 end loop;
 return jsonb_build_object('sessionId',v_s.id,'alreadyCompleted',false,'score',v_score,'awardedXp',v_xp,'verificationStatus','verified','totalXp',v_p.total_xp,'level',v_level,'league',v_league,'unlockedAchievements',v_new_achievements,'dailyCapReached',v_today_xp+v_xp>=700);
end $$;

create or replace function public.arena_overview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_player public.arena_players%rowtype; v_today date; v_week date; v_profile jsonb; v_leaders jsonb; v_history jsonb; v_achievements jsonb; v_day int;
begin
 if v_user is null or not exists(select 1 from public.memberships where user_id=v_user and status='active' and role='student') then
  raise exception 'Active student access required' using errcode='42501';
 end if;
 insert into public.arena_players(user_id) values(v_user) on conflict do nothing;
 select * into v_player from public.arena_players where user_id=v_user;
 v_today:=(now() at time zone 'Asia/Yerevan')::date;
 v_week:=v_today-(extract(isodow from v_today)::int-1);
 select coalesce(sum(awarded_xp),0) into v_day from public.arena_sessions where user_id=v_user and status='completed' and (completed_at at time zone 'Asia/Yerevan')::date=v_today;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'gameId',game_id,'score',score,'xp',awarded_xp,'status',status,'completedAt',completed_at) order by started_at desc),'[]'::jsonb)
 into v_history from (select * from public.arena_sessions where user_id=v_user order by started_at desc limit 20) h;
 select coalesce(jsonb_agg(jsonb_build_object('code',code,'unlockedAt',unlocked_at)),'[]'::jsonb) into v_achievements from public.arena_unlocked_achievements where user_id=v_user;
 select coalesce(jsonb_agg(jsonb_build_object('displayName',display_name,'weeklyXp',weekly_xp,'totalXp',total_xp,'isYou',user_id=v_user) order by weekly_xp desc,total_xp desc),'[]'::jsonb)
 into v_leaders from (
   select p.user_id, pr.display_name, p.total_xp, coalesce(sum(s.awarded_xp),0)::int as weekly_xp
   from public.arena_players p
   join public.memberships m on m.user_id=p.user_id and m.role='student' and m.status='active'
   join public.profiles pr on pr.id=p.user_id
   left join public.arena_sessions s on s.user_id=p.user_id and s.status='completed'
     and (s.completed_at at time zone 'Asia/Yerevan')::date>=v_week
   where p.leaderboard_opt_in or p.user_id=v_user
   group by p.user_id,pr.display_name,p.total_xp
   order by weekly_xp desc,p.total_xp desc limit 25
 ) t;
 return jsonb_build_object('player',jsonb_build_object('totalXp',v_player.total_xp,'gamesCompleted',v_player.games_completed,'avatar',v_player.avatar,'optIn',v_player.leaderboard_opt_in,'dailyXp',v_day,'dailyCap',700),
   'achievements',v_achievements,'history',v_history,'leaderboard',v_leaders);
end $$;

create or replace function public.arena_preferences(p_avatar text,p_opt_in boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_p public.arena_players%rowtype;
begin
 if v_user is null or not exists(select 1 from public.memberships where user_id=v_user and role='student' and status='active') then
  raise exception 'Active student access required' using errcode='42501';
 end if;
 if p_avatar not in ('compass','atom','circuit','sigma','orbit','shield') or p_opt_in is null then raise exception 'Invalid preferences' using errcode='22023'; end if;
 insert into public.arena_players(user_id,avatar,leaderboard_opt_in) values(v_user,p_avatar,p_opt_in)
 on conflict(user_id) do update set avatar=excluded.avatar,leaderboard_opt_in=excluded.leaderboard_opt_in,updated_at=now()
 returning * into v_p;
 return jsonb_build_object('avatar',v_p.avatar,'optIn',v_p.leaderboard_opt_in);
end $$;

revoke all on function public.arena_begin(text,text),public.arena_finish(uuid,text),public.arena_overview(),public.arena_preferences(text,boolean) from public,anon;
grant execute on function public.arena_begin(text,text),public.arena_finish(uuid,text),public.arena_overview(),public.arena_preferences(text,boolean) to authenticated;
