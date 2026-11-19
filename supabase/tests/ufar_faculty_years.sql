begin;

do $$
declare expected_codes text[] := array['LAW', 'MGMT', 'FIN', 'MKT', 'IMA'];
begin
  if (select count(*) from public.faculties where code = any(expected_codes)) <> 5 then
    raise exception 'Expected five UFAR faculties';
  end if;
  if exists (
    select f.code
    from public.faculties f
    left join public.programs p on p.faculty_id = f.id and p.code = f.code
    left join public.student_groups g on g.program_id = p.id
      and g.code = f.code || '-Y' || g.academic_year
    where f.code = any(expected_codes)
    group by f.code
    having array_agg(g.academic_year order by g.academic_year) is distinct from array[1,2,3,4]::smallint[]
  ) then
    raise exception 'Expected one canonical group in each faculty for Years 1–4';
  end if;
end;
$$;

rollback;
