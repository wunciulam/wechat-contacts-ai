create or replace function public.policy_business_key_v1(p jsonb)returns text language sql immutable set search_path=public,pg_temp as $$
 select case when coalesce(p->>'policyNumber','')='' or coalesce(p->>'company','')='' then null else regexp_replace(upper(p->>'company'),'[[:space:]（）()]','','g')||'|'||regexp_replace(upper(regexp_replace(p->>'policyNumber','[^a-zA-Z0-9]','','g')),'^0+(?=.)','')||'|'||left(coalesce(p->>'effectiveDate',''),10)||'|'||lower(regexp_replace(coalesce(p->>'applicant',''),'[[:space:]　]+','','g')) end;
$$;
create or replace function public.policy_insured_names_v1(p jsonb)returns text[] language sql immutable set search_path=public,pg_temp as $$
 select coalesce(array_agg(distinct n order by n),'{}'::text[])from(select lower(regexp_replace(v,'[[:space:]　]+','','g'))n from regexp_split_to_table(coalesce(p->>'insured',''),'[,，、;；]')v)s where n<>'';
$$;
create or replace function public.policies_have_duplicates_v1(items jsonb)returns boolean language plpgsql immutable set search_path=public,pg_temp as $$
declare g record;a record;b record;an text[];bn text[];
begin
 if jsonb_typeof(items)is distinct from 'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(items)p where nullif(p->>'id','')is not null group by p->>'id' having count(*)>1)then return true;end if;
 if exists(select 1 from jsonb_array_elements(items)p where nullif(p->'mingya'->>'key','')is not null group by p->'mingya'->>'key' having count(*)>1)then return true;end if;
 for g in select jsonb_agg(p)members from jsonb_array_elements(items)p where public.policy_business_key_v1(p)is not null group by public.policy_business_key_v1(p)having count(*)>1 loop
  for a in select value,ordinality n from jsonb_array_elements(g.members)with ordinality loop
   for b in select value,ordinality n from jsonb_array_elements(g.members)with ordinality where ordinality>a.n loop
    if nullif(a.value->'mingya'->>'key','')is not null and nullif(b.value->'mingya'->>'key','')is not null and a.value->'mingya'->>'key'<>b.value->'mingya'->>'key' then continue;end if;
    an:=public.policy_insured_names_v1(a.value);bn:=public.policy_insured_names_v1(b.value);
    if cardinality(an)=0 or cardinality(bn)=0 or an=bn or (nullif(a.value->'mingya'->>'key','')is not null and bn<@an) or(nullif(b.value->'mingya'->>'key','')is not null and an<@bn)then return true;end if;
   end loop;
  end loop;
 end loop;
 return false;
end $$;
create or replace function public.guard_policy_identity_v1()returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare c jsonb;
begin
 if new.data_type='renewal_v1' then
  if public.policies_have_duplicates_v1(new.data->'policies')then raise exception using errcode='PT409',message='检测到同一保单的重复记录，请刷新后合并导入，未保存此次修改。';end if;
 elsif new.data_type='contacts' and jsonb_typeof(new.data)='array' then
  for c in select value from jsonb_array_elements(new.data)loop
   if public.policies_have_duplicates_v1(c->'policies')then raise exception using errcode='PT409',message='客户保单包含重复记录，请刷新后合并导入，未保存此次修改。';end if;
  end loop;
 end if;return new;
end $$;
revoke all on function public.guard_policy_identity_v1()from public;
create trigger zz_policy_identity before insert or update of data on public.app_data for each row execute function public.guard_policy_identity_v1();
