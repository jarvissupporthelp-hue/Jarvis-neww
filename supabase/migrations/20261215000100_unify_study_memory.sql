alter table public.student_ai_preferences
  add column preferred_color text not null default '' check (length(preferred_color) <= 1000),
  add column interest text not null default '' check (length(interest) <= 1000);
grant insert (preferred_color, interest), update (preferred_color, interest)
  on public.student_ai_preferences to authenticated;

-- Keep explicit settings when importing the most recent fact from older conversations.
with latest as (
  select distinct on (c.student_id,t.profile_field) c.student_id,t.profile_field,t.profile_value
  from public.study_turns t join public.study_conversations c on c.id=t.conversation_id
  where t.profile_field is not null
  order by c.student_id,t.profile_field,t.created_at desc,t.id desc
)
insert into public.student_ai_preferences (student_id,learning_preferences,current_goal,preferred_color,interest)
select student_id,coalesce(max(profile_value) filter(where profile_field='learningPreference'),''),
  coalesce(max(profile_value) filter(where profile_field='currentGoal'),''),
  coalesce(max(profile_value) filter(where profile_field='preferredColor'),''),
  coalesce(max(profile_value) filter(where profile_field='interest'),'')
from latest group by student_id
on conflict (student_id) do update set
  learning_preferences=coalesce(nullif(student_ai_preferences.learning_preferences,''),excluded.learning_preferences),
  current_goal=coalesce(nullif(student_ai_preferences.current_goal,''),excluded.current_goal),
  preferred_color=excluded.preferred_color,interest=excluded.interest;

create function public.sync_study_turn_preference() returns trigger
language plpgsql security invoker set search_path='' as $$
declare field_name text;
begin
  field_name := case new.profile_field when 'preferredColor' then 'preferred_color'
    when 'learningPreference' then 'learning_preferences' when 'currentGoal' then 'current_goal'
    when 'interest' then 'interest' end;
  execute format('insert into public.student_ai_preferences (%1$I) values ($1)
    on conflict (student_id) do update set %1$I=excluded.%1$I, updated_at=now()',field_name)
    using new.profile_value;
  return new;
end;
$$;
create trigger sync_study_turn_preference after insert on public.study_turns
for each row when (new.profile_field is not null) execute function public.sync_study_turn_preference();
