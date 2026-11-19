create function public.search_course_pdf_pages(p_terms text[], p_offering uuid)
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
    where r.index_status='indexed' and (p_offering is null or r.offering_id=p_offering)
    order by rank desc,r.id,p.page limit 3
  )
  select jsonb_build_object(
    'matches',coalesce((select jsonb_agg(jsonb_build_object(
      'title',title,'page',page,'excerpt',ts_headline('pg_catalog.english',body,terms,
        'MaxWords=32, MinWords=8, MaxFragments=1, StartSel=[[[, StopSel=]]]')
      ) order by rank desc,id,page) from matches),'[]'::jsonb),
    'unavailable',(select count(*) from public.course_resources where index_status<>'indexed' and (p_offering is null or offering_id=p_offering))
  );
$$;

revoke execute on function public.search_course_pdf_pages(text[],uuid) from public,anon,authenticated;
grant execute on function public.search_course_pdf_pages(text[],uuid) to authenticated;

create or replace function public.search_course_pdf_pages(p_terms text[])
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.search_course_pdf_pages(p_terms, null::uuid); $$;
