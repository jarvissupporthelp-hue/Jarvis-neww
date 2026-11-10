create table public.study_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.memberships(user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.study_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.study_conversations(id) on delete cascade,
  prompt text not null check (length(btrim(prompt)) between 1 and 2000),
  answer text not null check (length(btrim(answer)) between 1 and 16000),
  created_at timestamptz not null default now()
);

create index study_conversations_student_idx on public.study_conversations(student_id, created_at desc, id);
create index study_turns_conversation_idx on public.study_turns(conversation_id, created_at, id);

alter table public.study_conversations enable row level security;
alter table public.study_turns enable row level security;
revoke all on public.study_conversations, public.study_turns from public, anon, authenticated;
grant select, delete on public.study_conversations to authenticated;
grant insert (title), update (title) on public.study_conversations to authenticated;
grant select on public.study_turns to authenticated;
grant insert (conversation_id, prompt, answer) on public.study_turns to authenticated;

create policy own_study_conversations on public.study_conversations for all to authenticated
using (
  student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active')
)
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active')
);

create policy read_own_study_turns on public.study_turns for select to authenticated
using (exists (
  select 1 from public.study_conversations c
  join public.memberships m on m.user_id = c.student_id
  where c.id = conversation_id and c.student_id = (select auth.uid())
    and m.role = 'student' and m.status = 'active'
));

create policy add_own_study_turns on public.study_turns for insert to authenticated
with check (exists (
  select 1 from public.study_conversations c
  join public.memberships m on m.user_id = c.student_id
  where c.id = conversation_id and c.student_id = (select auth.uid())
    and m.role = 'student' and m.status = 'active'
));
