-- Both application records must still have the revisions shown in the preview.
create or replace function public.commit_mingya_import_v2(
  p_app_id text, p_contact_id uuid, p_contact_revision timestamptz,
  p_renewal_revision timestamptz, p_contacts jsonb, p_renewal jsonb
) returns timestamptz
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare c public.app_data%rowtype; r public.app_data%rowtype; stamp timestamptz := clock_timestamp();
begin
  if jsonb_typeof(p_contacts) <> 'array' or jsonb_typeof(p_renewal) <> 'object'
     or jsonb_typeof(p_renewal->'policies') <> 'array' then
    raise exception using errcode='22023',message='导入数据格式不正确';
  end if;
  perform id from public.app_data where app_id=p_app_id and data_type in ('contacts','renewal_v1') order by data_type for update;
  select * into c from public.app_data where app_id=p_app_id and data_type='contacts';
  select * into r from public.app_data where app_id=p_app_id and data_type='renewal_v1';
  if c.id is null or c.id <> p_contact_id or c.updated_at is distinct from p_contact_revision
    or r.updated_at is distinct from p_renewal_revision then
    raise exception using errcode='PT409',message='客户或续期记录已变化，请重新预览';
  end if;
  update public.app_data set data=p_contacts,updated_at=stamp where id=c.id;
  insert into public.app_data(app_id,data_type,data,updated_at) values(p_app_id,'renewal_v1',p_renewal,stamp)
    on conflict(app_id,data_type) do update set data=excluded.data,updated_at=excluded.updated_at;
  return stamp;
end;
$$;
revoke all on function public.commit_mingya_import_v2(text,uuid,timestamptz,timestamptz,jsonb,jsonb) from public;
grant execute on function public.commit_mingya_import_v2(text,uuid,timestamptz,timestamptz,jsonb,jsonb) to anon,authenticated;
