create table public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.memberships(user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  due_on date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.personal_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.memberships(user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  event_date date not null,
  starts_at time(0) not null,
  ends_at time(0) not null,
  check (starts_at < ends_at)
);

create index personal_tasks_student_idx on public.personal_tasks(student_id, due_on, id);
create index personal_events_student_week_idx on public.personal_events(student_id, event_date, starts_at);

alter table public.personal_tasks enable row level security;
alter table public.personal_events enable row level security;

revoke all on public.personal_tasks, public.personal_events from public, anon, authenticated;
grant select, delete on public.personal_tasks, public.personal_events to authenticated;
grant insert (title, due_on, completed), update (title, due_on, completed)
  on public.personal_tasks to authenticated;
grant insert (title, event_date, starts_at, ends_at), update (title, event_date, starts_at, ends_at)
  on public.personal_events to authenticated;

-- Membership RLS filters the subquery to the caller's current active membership.
create policy own_student_tasks on public.personal_tasks for all to authenticated
using (student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active'))
with check (student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active'));

create policy own_student_events on public.personal_events for all to authenticated
using (student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active'))
with check (student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active'));
