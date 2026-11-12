create table public.student_ai_preferences (
  student_id uuid primary key default auth.uid() references public.memberships(user_id) on delete cascade,
  learning_preferences text not null default '' check (length(learning_preferences) <= 1000),
  current_goal text not null default '' check (length(current_goal) <= 1000),
  topics_to_practice text not null default '' check (length(topics_to_practice) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.student_ai_preferences enable row level security;
revoke all on public.student_ai_preferences from public, anon, authenticated;
grant select, insert (learning_preferences, current_goal, topics_to_practice),
  update (learning_preferences, current_goal, topics_to_practice, updated_at), delete
  on public.student_ai_preferences to authenticated;
create policy own_active_student_ai_preferences on public.student_ai_preferences for all to authenticated
using (
  student_id = (select auth.uid()) and exists (
    select 1 from public.memberships where user_id = (select auth.uid())
      and role = 'student' and status = 'active'
  )
)
with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.memberships where user_id = (select auth.uid())
      and role = 'student' and status = 'active'
  )
);
