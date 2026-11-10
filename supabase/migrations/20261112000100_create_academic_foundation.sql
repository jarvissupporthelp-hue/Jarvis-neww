create type public.membership_role as enum ('student', 'lecturer', 'admin');
create type public.membership_status as enum ('pending', 'active', 'disabled');

create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id),
  code text not null unique,
  name text not null
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  check (starts_on <= ends_on)
);

create table public.student_groups (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id),
  academic_year smallint not null check (academic_year > 0),
  code text not null unique,
  name text not null
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  timezone text not null default 'Asia/Yerevan',
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'pending',
  student_group_id uuid references public.student_groups(id),
  check ((role = 'student') = (student_group_id is not null))
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  semester_id uuid not null references public.semesters(id),
  student_group_id uuid not null references public.student_groups(id),
  unique (course_id, semester_id, student_group_id)
);

create table public.enrollments (
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  course_offering_id uuid not null references public.course_offerings(id) on delete cascade,
  primary key (student_id, course_offering_id)
);

create table public.lecturer_assignments (
  lecturer_id uuid not null references public.memberships(user_id) on delete cascade,
  course_offering_id uuid not null references public.course_offerings(id) on delete cascade,
  primary key (lecturer_id, course_offering_id)
);

create index programs_faculty_idx on public.programs(faculty_id);
create index student_groups_program_idx on public.student_groups(program_id);
create index memberships_student_group_idx on public.memberships(student_group_id);
create index course_offerings_semester_idx on public.course_offerings(semester_id);
create index course_offerings_student_group_idx on public.course_offerings(student_group_id);
create index enrollments_offering_idx on public.enrollments(course_offering_id);
create index lecturer_assignments_offering_idx on public.lecturer_assignments(course_offering_id);

-- Keep API access closed until Day 3 adds role and ownership policies.
alter table public.faculties enable row level security;
alter table public.programs enable row level security;
alter table public.semesters enable row level security;
alter table public.student_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.enrollments enable row level security;
alter table public.lecturer_assignments enable row level security;

revoke all on table public.faculties, public.programs, public.semesters,
  public.student_groups, public.profiles, public.memberships, public.courses,
  public.course_offerings, public.enrollments, public.lecturer_assignments
from public, anon, authenticated;
