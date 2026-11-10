alter table public.course_resources add column index_status text not null default 'pending'
  check (index_status in ('pending', 'indexed', 'unsearchable'));

create table public.course_pdf_pages (
  resource_id uuid not null references public.course_resources(id) on delete cascade,
  page smallint not null check (page between 1 and 60),
  body text not null check (length(body) between 1 and 8000),
  search_terms tsvector generated always as (to_tsvector('pg_catalog.english',body)) stored,
  primary key(resource_id,page)
);
create index course_pdf_pages_search_idx on public.course_pdf_pages using gin(search_terms);

alter table public.course_pdf_pages enable row level security;
revoke all on public.course_pdf_pages from public, anon, authenticated;
grant select on public.course_pdf_pages to authenticated;
create policy visible_course_pdf_pages on public.course_pdf_pages for select to authenticated
using (resource_id in (select id from public.course_resources));

create function jarvis_private.save_course_pdf_index(p_id uuid, p_pages jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.course_resources;
begin
  perform 1 from public.memberships where user_id=caller and role='lecturer' and status='active' for share;
  if not found then raise insufficient_privilege; end if;
  select * into target from public.course_resources where id=p_id for update;
  if not found then raise no_data_found; end if;
  perform 1 from public.lecturer_assignments
    where lecturer_id=caller and course_offering_id=target.offering_id for share;
  if not found then raise insufficient_privilege; end if;

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

revoke execute on function jarvis_private.save_course_pdf_index(uuid,jsonb) from public,anon,authenticated;
grant execute on function jarvis_private.save_course_pdf_index(uuid,jsonb) to authenticated;
create function public.save_course_pdf_index(p_id uuid,p_pages jsonb)
returns text language sql security invoker set search_path = ''
as $$ select jarvis_private.save_course_pdf_index(p_id,p_pages); $$;
revoke execute on function public.save_course_pdf_index(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_course_pdf_index(uuid,jsonb) to authenticated;

create function public.search_course_pdf_pages(p_terms text[])
returns jsonb language sql stable security invoker set search_path = ''
as $$
  with query as (
    select string_agg(q::text,' | ')::tsquery as terms
    from (select distinct plainto_tsquery('pg_catalog.english',left(term,64)) as q
          from unnest(p_terms[1:20]) term) words
    where numnode(q)>0
  ), matches as (
    select r.id,r.title,p.page,p.body,q.terms,ts_rank_cd(p.search_terms,q.terms) as rank
    from query q
    join public.course_pdf_pages p on p.search_terms @@ q.terms
    join public.course_resources r on r.id=p.resource_id
    where r.index_status='indexed'
    order by rank desc,r.id,p.page limit 3
  )
  select jsonb_build_object(
    'matches',coalesce((select jsonb_agg(jsonb_build_object(
      'title',title,'page',page,'excerpt',ts_headline('pg_catalog.english',body,terms,
        'MaxWords=32, MinWords=8, MaxFragments=1, StartSel=[[[, StopSel=]]]')
      ) order by rank desc,id,page) from matches),'[]'::jsonb),
    'unavailable',(select count(*) from public.course_resources where index_status<>'indexed')
  );
$$;
revoke execute on function public.search_course_pdf_pages(text[]) from public,anon,authenticated;
grant execute on function public.search_course_pdf_pages(text[]) to authenticated;
