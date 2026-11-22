create or replace function public.delete_selected_policies_v1(p_app_id text,p_contact_id text,p_policy_ids text[],p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.app_data%rowtype;r public.app_data%rowtype;prior jsonb;ids text[];valid_ids text[];contact_row record;kept jsonb;removed_contacts jsonb;stamp timestamptz:=clock_timestamp();
begin
 select array_agg(distinct id order by id) into ids from unnest(p_policy_ids)id where id is not null and id<>'';
 if coalesce(cardinality(ids),0)=0 or cardinality(ids)>1000 or p_request_id is null then raise exception using errcode='22023',message='请选择要删除的保单';end if;
 perform id from public.app_data where app_id=p_app_id and data_type in('contacts','renewal_v1') order by data_type for update;
 select data into prior from public.app_data where app_id=p_app_id and data_type='policy_delete_backup:'||p_request_id::text;
 if prior is not null then
  if prior->>'contactId' is distinct from p_contact_id or prior->'deletedIds' is distinct from to_jsonb(ids) then raise exception using errcode='PT409',message='删除请求已变化，请重新选择';end if;
  return jsonb_build_object('deletedIds',prior->'deletedIds');
 end if;
 select * into c from public.app_data where app_id=p_app_id and data_type='contacts';
 select * into r from public.app_data where app_id=p_app_id and data_type='renewal_v1';
 if c.id is null or not exists(select 1 from jsonb_array_elements(coalesce(c.data,'[]'::jsonb))ct where ct->>'id'=p_contact_id) then raise exception using errcode='PT409',message='客户资料已变化，请刷新后重试';end if;
 select array_agg(distinct id order by id) into valid_ids from (
  select p->>'id' id from jsonb_array_elements(coalesce(r.data->'policies','[]'::jsonb))p where p->>'id'=any(ids) and (p->>'applicantId'=p_contact_id or p->>'insuredId'=p_contact_id)
  union select p->>'id' from jsonb_array_elements(c.data)ct cross join lateral jsonb_array_elements(coalesce(ct->'policies','[]'::jsonb))p where ct->>'id'=p_contact_id and p->>'id'=any(ids)
 ) matched;
 if valid_ids is distinct from ids then raise exception using errcode='PT409',message='所选保单已变化，请刷新后重新选择';end if;
 select coalesce(jsonb_agg(jsonb_build_object('contactId',ct->>'id','policies',(select coalesce(jsonb_agg(p),'[]'::jsonb)from jsonb_array_elements(coalesce(ct->'policies','[]'::jsonb))p where p->>'id'=any(ids)))),'[]'::jsonb) into removed_contacts from jsonb_array_elements(c.data)ct where exists(select 1 from jsonb_array_elements(coalesce(ct->'policies','[]'::jsonb))p where p->>'id'=any(ids));
 insert into public.app_data(app_id,data_type,data,updated_at)values(p_app_id,'policy_delete_backup:'||p_request_id::text,jsonb_build_object('contactId',p_contact_id,'deletedIds',to_jsonb(ids),'at',stamp,'renewalPolicies',(select coalesce(jsonb_agg(p),'[]'::jsonb)from jsonb_array_elements(coalesce(r.data->'policies','[]'::jsonb))p where p->>'id'=any(ids)),'contactPolicies',removed_contacts),stamp);
 for contact_row in select value,ordinality-1 n from jsonb_array_elements(c.data)with ordinality loop
  if not exists(select 1 from jsonb_array_elements(coalesce(contact_row.value->'policies','[]'::jsonb))p where p->>'id'=any(ids)) then continue;end if;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb)into kept from jsonb_array_elements(contact_row.value->'policies')with ordinality where value->>'id' is null or not(value->>'id'=any(ids));
  c.data:=jsonb_set(c.data,array[contact_row.n::text,'policies'],kept);
 end loop;
 update public.app_data set data=c.data,updated_at=stamp where id=c.id;
 if r.id is not null then
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb)into kept from jsonb_array_elements(r.data->'policies')with ordinality where value->>'id' is null or not(value->>'id'=any(ids));
  update public.app_data set data=jsonb_set(r.data,'{policies}',kept),updated_at=stamp where id=r.id;
 end if;
 return jsonb_build_object('deletedIds',to_jsonb(ids));
end $$;
revoke all on function public.delete_selected_policies_v1(text,text,text[],uuid) from public;
grant execute on function public.delete_selected_policies_v1(text,text,text[],uuid) to anon,authenticated;
