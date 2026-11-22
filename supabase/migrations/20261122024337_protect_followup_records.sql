-- Guard legacy whole-contact saves and keep a per-record recovery trail.
create or replace function public.guard_contact_followups_v1() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare oc jsonb; nc jsonb; oldr jsonb; newr jsonb; hist jsonb; tomb jsonb; n integer; restored boolean; change_row record;
begin
 if new.data_type<>'contacts' or jsonb_typeof(old.data)<>'array' or jsonb_typeof(new.data)<>'array' then return new; end if;
 for oc in select value from jsonb_array_elements(old.data) loop
  select value,(ordinality-1)::integer into nc,n from jsonb_array_elements(new.data) with ordinality where value->>'id'=oc->>'id';
  if nc is null then continue; end if;
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
create trigger protect_contact_followups_v1 before update of data on public.app_data for each row when(new.data_type='contacts') execute function public.guard_contact_followups_v1();

create or replace function public.save_followup_v1(p_app_id text,p_contact_id text,p_kind text,p_record jsonb,p_expected jsonb default null,p_new_contact jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare row_data public.app_data%rowtype;c jsonb;hist jsonb;existing jsonb;record_value jsonb;idx integer;stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if p_kind is null or p_kind not in('add','edit','delete') or p_record->>'id' is null then raise exception using errcode='22023',message='跟进记录格式不正确'; end if;
 if p_kind<>'delete' and (coalesce(trim(p_record->>'content'),'')='' or coalesce(p_record->>'date','')!~'^\d{4}-\d{2}-\d{2}$') then raise exception using errcode='22023',message='请填写日期与跟进内容'; end if;
 select * into row_data from public.app_data where app_id=p_app_id and data_type='contacts' for update;
 if row_data.id is null then raise exception using errcode='PT409',message='客户数据尚未就绪，请刷新后重试'; end if;
 select value,(ordinality-1)::integer into c,idx from jsonb_array_elements(row_data.data) with ordinality where value->>'id'=p_contact_id;
 if c is null then
  if p_kind<>'add' or p_new_contact->>'id' is distinct from p_contact_id or coalesce(trim(p_new_contact->>'remarkName'),'')='' then raise exception using errcode='PT409',message='客户已变化，请刷新后重试'; end if;
  c:=p_new_contact||jsonb_build_object('progressHistory','[]'::jsonb);idx:=jsonb_array_length(row_data.data);
 end if;
 hist:=coalesce(c->'progressHistory','[]'::jsonb);
 select value into existing from jsonb_array_elements(hist) where value->>'id'=p_record->>'id';
 if p_kind='add' then
  if coalesce(c->'progressDeletedIds','[]'::jsonb) ? (p_record->>'id') then raise exception using errcode='PT409',message='这条记录已删除，不能重复提交'; end if;
  if existing is not null then
   if (existing-'updatedAt') is distinct from (p_record-'updatedAt') then raise exception using errcode='PT409',message='记录已变化，请刷新后重试'; end if;
   return c;
  end if;
 else
  if existing is distinct from nullif(p_expected,'null'::jsonb) or existing is null then raise exception using errcode='PT409',message='这条跟进已被修改，请刷新后重试'; end if;
 end if;
 if p_kind='delete' then
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into hist from jsonb_array_elements(hist) with ordinality where value->>'id'<>p_record->>'id';
  c:=jsonb_set(c,'{progressDeletedIds}',coalesce(c->'progressDeletedIds','[]'::jsonb)||jsonb_build_array(p_record->>'id'));
 else
  record_value:=p_record||jsonb_build_object('updatedAt',stamp);
  if p_kind='add' then hist:=jsonb_build_array(record_value)||hist;
  else select jsonb_agg(case when value->>'id'=p_record->>'id' then record_value else value end order by ordinality) into hist from jsonb_array_elements(hist) with ordinality;end if;
  c:=c||jsonb_build_object('lastDate',p_record->>'date');
  if p_kind='add' then c:=c||jsonb_build_object('followUpStatus','following');end if;
 end if;
 c:=jsonb_set(c,'{progressHistory}',hist);
 update public.app_data set data=jsonb_set(row_data.data,array[idx::text],c),updated_at=stamp::timestamptz where id=row_data.id;
 return c;
end $$;
revoke all on function public.save_followup_v1(text,text,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_followup_v1(text,text,text,jsonb,jsonb,jsonb) to anon,authenticated;
