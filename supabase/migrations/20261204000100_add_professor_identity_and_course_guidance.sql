alter table public.professor_ai_profiles
  add column professor_name text not null default '' check (length(professor_name) <= 160),
  add column course_plan text not null default '' check (length(course_plan) <= 5000);
