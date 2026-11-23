-- Names identify a single contact; category membership is independent of identity.
create or replace function public.contact_name_key_v1(c jsonb) returns text language sql immutable set search_path=public,pg_temp as $$
 select lower(regexp_replace(coalesce(nullif(btrim(c->>'remarkName'),''),c->>'nickname',''),'[[:space:]　]+','','g'));
$$;
create or replace function public.contact_categories_v1(c jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(c->'categoryIds')='array' then c->'categoryIds' when nullif(c->>'categoryId','') is not null then jsonb_build_array(c->>'categoryId') else '[]'::jsonb end) where value<> 'null'::jsonb and value<> '""'::jsonb;
$$;
create or replace function public.enforce_contact_names_v1() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.data_type='contacts' and jsonb_typeof(new.data)='array' and exists(select 1 from jsonb_array_elements(new.data)c where public.contact_name_key_v1(c)<>'' group by public.contact_name_key_v1(c) having count(*)>1) then
  raise exception using errcode='PT409',message='同名联系人已存在，请使用已有联系人；可将其添加到多个跟进分类。';
 end if;return new;
end $$;
revoke all on function public.enforce_contact_names_v1() from public;
create trigger zz_contact_unique_name before insert or update of data on public.app_data for each row execute function public.enforce_contact_names_v1();

create or replace function public.save_contact_category_v1(p_app_id text,p_contact_id text,p_name text,p_target text,p_source text default null,p_remove boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.app_data%rowtype;c jsonb;idx integer;cats jsonb;target text:=nullif(p_target,'__uncategorized__');source text:=nullif(p_source,'__uncategorized__');k text;
begin
 select * into r from public.app_data where app_id=p_app_id and data_type='contacts' for update;
 if r.id is null then raise exception using errcode='PT409',message='请先完成客户数据同步';end if;
 if p_contact_id is not null then
  select value,(ordinality-1)::integer into c,idx from jsonb_array_elements(r.data)with ordinality where value->>'id'=p_contact_id;
  if c is null then raise exception using errcode='PT409',message='联系人已变化，请刷新后重试';end if;
 else
  k:=public.contact_name_key_v1(jsonb_build_object('remarkName',p_name));if k='' then raise exception using errcode='22023',message='请填写联系人姓名';end if;
  select value,(ordinality-1)::integer into c,idx from jsonb_array_elements(r.data)with ordinality where public.contact_name_key_v1(value)=k;
  if c is null then
   idx:=jsonb_array_length(r.data);c:=jsonb_build_object('id',gen_random_uuid()::text,'remarkName',btrim(p_name),'nickname',btrim(p_name),'wxid','','remarkInfo','','tags','[]'::jsonb,'dealProducts','[]'::jsonb,'intentProducts','[]'::jsonb,'policies','[]'::jsonb,'progressHistory','[]'::jsonb,'addedAt',floor(extract(epoch from clock_timestamp())*1000));
  end if;
 end if;
 if target is not null and not exists(select 1 from public.app_data a cross join lateral jsonb_array_elements(a.data)cat where a.app_id=p_app_id and a.data_type='categories' and cat->>'id'=target) then raise exception using errcode='PT409',message='跟进分类已删除，请刷新后重试';end if;
 cats:=public.contact_categories_v1(c);
 if source is not null then select coalesce(jsonb_agg(value),'[]'::jsonb)into cats from jsonb_array_elements(cats)where value<>to_jsonb(source);end if;
 if target is not null and not p_remove and not(cats?target) then cats:=cats||jsonb_build_array(target);end if;
 -- Explicit removal only affects the source column; final removal exits follow-up.
 c:=(c-'categoryId')||jsonb_build_object('categoryIds',cats,'followUpStatus',case when p_remove and jsonb_array_length(cats)=0 then 'idle' else 'following' end);
 update public.app_data set data=jsonb_set(r.data,array[idx::text],c),updated_at=clock_timestamp() where id=r.id returning data->idx into c;
 return c;
end $$;
revoke all on function public.save_contact_category_v1(text,text,text,text,text,boolean) from public;
grant execute on function public.save_contact_category_v1(text,text,text,text,text,boolean) to anon,authenticated;

-- Maintenance-only merge: backup first, preserve records/relationships and original snapshots.
create or replace function public.merge_duplicate_contact_names_v1(p_app_id text,p_apply boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.app_data%rowtype;renew public.app_data%rowtype;g record;c jsonb;other jsonb;result jsonb:='[]';members jsonb;values_to_merge jsonb;field text;f record;aliases jsonb:='{}';cat jsonb;hist jsonb;tomb jsonb;policies jsonb;duplicates integer:=0;stamp timestamptz:=clock_timestamp();
begin
 perform id from public.app_data where app_id=p_app_id and data_type in('contacts','renewal_v1')order by data_type for update;
 select * into r from public.app_data where app_id=p_app_id and data_type='contacts';select * into renew from public.app_data where app_id=p_app_id and data_type='renewal_v1';
 if r.id is null then raise exception 'Missing contacts';end if;
 for g in select public.contact_name_key_v1(value) k,jsonb_agg(value order by ordinality)group_contacts,min(ordinality) n from jsonb_array_elements(r.data)with ordinality group by public.contact_name_key_v1(value)order by min(ordinality)loop
  members:=g.group_contacts;c:=members->0;
  if jsonb_array_length(members)>1 and g.k<>'' then
   duplicates:=duplicates+jsonb_array_length(members)-1;
   c:=c||jsonb_build_object('mergedContactSnapshots',coalesce(c->'mergedContactSnapshots','[]'::jsonb)||members);
   for other in select value from jsonb_array_elements(members)loop
    aliases:=aliases||jsonb_build_object(other->>'id',c->>'id');
    for f in select * from jsonb_each(other)loop
     if (not(c?f.key)or c->f.key in('null'::jsonb,'""'::jsonb))and f.value not in('null'::jsonb,'""'::jsonb) then c:=jsonb_set(c,array[f.key],f.value);end if;
    end loop;
   end loop;
   foreach field in array array['tags','dealProducts','intentProducts','progressDeletedIds']loop
    select coalesce(jsonb_agg(distinct v),'[]'::jsonb)into values_to_merge from jsonb_array_elements(members)m cross join lateral jsonb_array_elements(coalesce(m->field,'[]'::jsonb))v;
    c:=jsonb_set(c,array[field],values_to_merge);
   end loop;
   select coalesce(jsonb_agg(distinct catid),'[]'::jsonb)into cat from jsonb_array_elements(members)m cross join lateral jsonb_array_elements(public.contact_categories_v1(m))catid;
   c:=(c-'categoryId')||jsonb_build_object('categoryIds',cat);
   tomb:=c->'progressDeletedIds';
   select coalesce(jsonb_agg(record order by record->>'date' desc),'[]'::jsonb)into hist from(select distinct on(coalesce(v->>'id',v::text))v record from jsonb_array_elements(members)m cross join lateral jsonb_array_elements(coalesce(m->'progressHistory','[]'::jsonb))v where not(tomb?coalesce(v->>'id',''))order by coalesce(v->>'id',v::text),v->>'updatedAt' desc nulls last)records;
   select coalesce(jsonb_agg(policy),'[]'::jsonb)into policies from(select distinct on(coalesce(v->>'id',v::text))v policy from jsonb_array_elements(members)m cross join lateral jsonb_array_elements(coalesce(m->'policies','[]'::jsonb))v)ps;
   c:=c||jsonb_build_object('progressHistory',hist,'policies',policies);
   if jsonb_array_length(hist)>0 then c:=c||jsonb_build_object('lastDate',hist->0->>'date');end if;
   if exists(select 1 from jsonb_array_elements(members)m where m->>'followUpStatus'='following')then c:=c||jsonb_build_object('followUpStatus','following');end if;
   select string_agg(distinct m->>'remarkInfo',E'\n')into field from jsonb_array_elements(members)m where nullif(m->>'remarkInfo','')is not null;
   if field is not null then c:=c||jsonb_build_object('remarkInfo',field);end if;
  elsif jsonb_array_length(members)>1 then result:=result||members;continue;
  end if;
  result:=result||jsonb_build_array(c);
 end loop;
 if not p_apply or duplicates=0 then return jsonb_build_object('duplicates',duplicates,'contacts',jsonb_array_length(result));end if;
 insert into public.app_data(app_id,data_type,data,updated_at)values(p_app_id,'contact_merge_backup:'||gen_random_uuid()::text,jsonb_build_object('contacts',r.data,'renewal',renew.data,'aliases',aliases,'at',stamp),stamp);
 -- Remap owner links everywhere without changing policy identity or payments.
 select jsonb_agg(case when doc? 'policies' then jsonb_set(doc,'{policies}',(select coalesce(jsonb_agg(p||case when aliases?(p->>'applicantId')then jsonb_build_object('applicantId',aliases->>(p->>'applicantId'))else '{}'::jsonb end||case when aliases?(p->>'insuredId')then jsonb_build_object('insuredId',aliases->>(p->>'insuredId'))else '{}'::jsonb end),'[]'::jsonb)from jsonb_array_elements(doc->'policies')p))else doc end order by n) into result from jsonb_array_elements(result)with ordinality x(doc,n);
 update public.app_data set data=result,updated_at=stamp where id=r.id;
 if renew.id is not null then
  select coalesce(jsonb_agg(p||case when aliases?(p->>'applicantId')then jsonb_build_object('applicantId',aliases->>(p->>'applicantId'))else '{}'::jsonb end||case when aliases?(p->>'insuredId')then jsonb_build_object('insuredId',aliases->>(p->>'insuredId'))else '{}'::jsonb end),'[]'::jsonb)into policies from jsonb_array_elements(coalesce(renew.data->'policies','[]'::jsonb))p;
  update public.app_data set data=jsonb_set(renew.data,'{policies}',policies),updated_at=stamp where id=renew.id;
 end if;
 return jsonb_build_object('duplicates',duplicates,'contacts',jsonb_array_length(result));
end $$;
revoke all on function public.merge_duplicate_contact_names_v1(text,boolean) from public,anon,authenticated;
