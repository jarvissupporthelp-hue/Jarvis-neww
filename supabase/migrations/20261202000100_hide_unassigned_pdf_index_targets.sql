create or replace function jarvis_private.save_course_pdf_index(p_id uuid, p_pages jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.course_resources;
begin
  perform 1 from public.memberships where user_id=caller and role='lecturer' and status='active' for share;
  if not found then raise insufficient_privilege; end if;
  select r.* into target from public.course_resources r
  join public.lecturer_assignments a on a.course_offering_id=r.offering_id
  where r.id=p_id and a.lecturer_id=caller
  for update of r for share of a;
  if not found then raise no_data_found; end if;

  if jsonb_typeof(p_pages) is distinct from 'array' then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_pages)>60 then raise invalid_parameter_value; end if;
  if target.index_status='indexed' then return target.index_status; end if;
  if jsonb_array_length(p_pages)=0 then
    target.index_status := 'unsearchable';
  else
    insert into public.course_pdf_pages(resource_id,page,body)
      select p_id,p.page,p.text from jsonb_to_recordset(p_pages) as p(page smallint,text text);
    target.index_status := 'indexed';
  end if;
  update public.course_resources set index_status=target.index_status where id=p_id;
  return target.index_status;
end;
$$;
