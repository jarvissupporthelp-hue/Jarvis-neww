alter table public.study_turns
  add column profile_field text check (profile_field in ('preferredColor', 'learningPreference', 'currentGoal', 'interest')),
  add column profile_value text check (length(profile_value) between 1 and 240),
  add constraint study_turn_profile_pair check ((profile_field is null) = (profile_value is null));
grant insert (profile_field, profile_value) on public.study_turns to authenticated;
create index study_turns_profile_idx on public.study_turns
  (conversation_id, profile_field, created_at desc, id desc) where profile_field is not null;

create view public.study_profile_facts with (security_invoker = true) as
  select distinct on (c.student_id, t.profile_field)
    c.student_id, t.profile_field, t.profile_value
  from public.study_turns t join public.study_conversations c on c.id = t.conversation_id
  where t.profile_field is not null and c.student_id = (select auth.uid())
  order by c.student_id, t.profile_field, t.created_at desc, t.id desc;
revoke all on public.study_profile_facts from public, anon, authenticated;
grant select on public.study_profile_facts to authenticated;
