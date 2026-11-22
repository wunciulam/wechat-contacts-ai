-- Guard legacy whole-contact saves and keep a per-record recovery trail.
create or replace function public.guard_contact_followups_v1() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare oc jsonb; nc jsonb; oldr jsonb; newr jsonb; hist jsonb; tomb jsonb; n integer; restored boolean; change_row record;
begin
 if new.data_type<>'contacts' or jsonb_typeof(old.data)<>'array' or jsonb_typeof(new.data)<>'array' then return new; end if;
 for oc in select value from jsonb_array_elements(old.data) loop
  select value,(ordinality-1)::integer into nc,n from jsonb_array_elements(new.data) with ordinality where value->>'id'=oc->>'id';
  if nc is null then continue; end if;
  if nc->'progressHistory' is not distinct from oc->'progressHistory' and nc->'progressDeletedIds' is not distinct from oc->'progressDeletedIds' then continue; end if;
  tomb:=coalesce(oc->'progressDeletedIds','[]'::jsonb)||coalesce(nc->'progressDeletedIds','[]'::jsonb);
  select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into tomb from jsonb_array_elements(tomb);
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into hist from jsonb_array_elements(coalesce(nc->'progressHistory','[]'::jsonb)) with ordinality where not (tomb ? (value->>'id'));
  restored:=false;
  for oldr in select value from jsonb_array_elements(coalesce(oc->'progressHistory','[]'::jsonb)) loop
   if tomb ? (oldr->>'id') then continue; end if;
   select value into newr from jsonb_array_elements(hist) where value->>'id'=oldr->>'id';
   if newr is null then hist:=hist||jsonb_build_array(oldr);restored:=true;
   elsif oldr->>'updatedAt' is not null and coalesce(newr->>'updatedAt','') < oldr->>'updatedAt' then
    select jsonb_agg(case when value->>'id'=oldr->>'id' then oldr else value end order by ordinality) into hist from jsonb_array_elements(hist) with ordinality;
   end if;
  end loop;
  nc:=jsonb_set(nc,'{progressHistory}',hist);
  if jsonb_array_length(tomb)>0 then nc:=jsonb_set(nc,'{progressDeletedIds}',tomb); end if;
  if restored then
   if oc ? 'lastDate' then nc:=jsonb_set(nc,'{lastDate}',oc->'lastDate'); end if;
   if oc ? 'followUpStatus' then nc:=jsonb_set(nc,'{followUpStatus}',oc->'followUpStatus'); end if;
  end if;
  new.data:=jsonb_set(new.data,array[n::text],nc);
 end loop;
 -- Only records whose final stored value changed are archived.
 for change_row in
  with before_records as(select c->>'id' cid,r->>'id' rid,r from jsonb_array_elements(old.data)c cross join lateral jsonb_array_elements(coalesce(c->'progressHistory','[]'::jsonb))r),
       after_records as(select c->>'id' cid,r->>'id' rid,r from jsonb_array_elements(new.data)c cross join lateral jsonb_array_elements(coalesce(c->'progressHistory','[]'::jsonb))r)
  select coalesce(b.cid,a.cid) cid,coalesce(b.rid,a.rid) rid,b.r before_value,a.r after_value from before_records b full join after_records a on b.cid=a.cid and b.rid=a.rid where b.r is distinct from a.r
 loop
  insert into public.app_data(app_id,data_type,data,updated_at) values(new.app_id,'followup_event:'||gen_random_uuid()::text,jsonb_build_object('contactId',change_row.cid,'recordId',change_row.rid,'before',change_row.before_value,'after',change_row.after_value,'at',clock_timestamp()),clock_timestamp());
 end loop;
 new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function public.guard_contact_followups_v1() from public;
