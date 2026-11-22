create or replace function public.save_customer_profile_v1(p_app_id text,p_contact jsonb,p_expected jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare row_data public.app_data%rowtype;c jsonb;idx integer;f record;stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if p_contact->>'id' is null or coalesce(nullif(trim(p_contact->>'remarkName'),''),nullif(trim(p_contact->>'nickname'),''),'')='' then raise exception using errcode='22023',message='请填写客户姓名';end if;
 select * into row_data from public.app_data where app_id=p_app_id and data_type='contacts' for update;
 if row_data.id is null then raise exception using errcode='PT409',message='请先完成客户数据同步';end if;
 select value,(ordinality-1)::integer into c,idx from jsonb_array_elements(row_data.data) with ordinality where value->>'id'=p_contact->>'id';
 if p_expected is null or p_expected='null'::jsonb then
  if c is not null then return c;end if;
  c:=p_contact;idx:=jsonb_array_length(row_data.data);
  if c ? 'progressHistory' then c:=jsonb_set(c,'{progressHistory}',(select coalesce(jsonb_agg(value||jsonb_build_object('updatedAt',stamp)),'[]'::jsonb) from jsonb_array_elements(c->'progressHistory')));end if;
 else
  if c is null then raise exception using errcode='PT409',message='客户已删除，请刷新后重试';end if;
  for f in select * from jsonb_each(p_contact) where key not in('id','progressHistory','progressDeletedIds') loop
   if f.value is not distinct from p_expected->f.key then continue;end if;
   if c->f.key is distinct from p_expected->f.key and c->f.key is distinct from f.value then
    raise exception using errcode='PT409',message='客户资料已在另一页面修改，请刷新后重试';
   end if;
   c:=jsonb_set(c,array[f.key],f.value);
  end loop;
 end if;
 update public.app_data set data=jsonb_set(row_data.data,array[idx::text],c),updated_at=stamp::timestamptz where id=row_data.id;
 return c;
end $$;
revoke all on function public.save_customer_profile_v1(text,jsonb,jsonb) from public;
grant execute on function public.save_customer_profile_v1(text,jsonb,jsonb) to anon,authenticated;
