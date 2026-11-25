-- Applied 2026-11-25 after rollback-only anon/atomicity/conflict validation; uses existing app_data/RLS and recovery trigger.
create or replace function public.save_followup_bundle_v1(p_app_id text,p_contact_id text,p_bundle jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare row_data public.app_data%rowtype;c jsonb;hist jsonb;oldr jsonb;r jsonb;w jsonb;idx integer;stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');changed_comm boolean:=false;latest text;
begin
 if jsonb_typeof(p_bundle->'writes') is distinct from 'array' or jsonb_array_length(p_bundle->'writes')>366 then raise exception using errcode='22023',message='保存格式有误';end if;
 if (select count(*) from jsonb_array_elements(p_bundle->'writes')entry) <> (select count(distinct entry->'record'->>'id') from jsonb_array_elements(p_bundle->'writes')entry) then raise exception using errcode='22023',message='重复记录标识';end if;
 select * into row_data from public.app_data where app_id=p_app_id and data_type='contacts' for update;
 if row_data.id is null then raise exception using errcode='PT409',message='客户数据尚未就绪，请刷新';end if;
 select value,(ordinality-1)::integer into c,idx from jsonb_array_elements(row_data.data) with ordinality where value->>'id'=p_contact_id;
 if c is null then raise exception using errcode='PT409',message='客户已变化，请刷新';end if;
 hist:=case when jsonb_typeof(c->'progressHistory')='array' then c->'progressHistory' else '[]'::jsonb end;
 if p_bundle ? 'analysis' then
  if hist is distinct from p_bundle->'sourceHistory' then raise exception using errcode='PT409',message='分析期间跟进已变化，请更新分析';end if;
  if jsonb_typeof(p_bundle->'analysis') is distinct from 'object' then raise exception using errcode='22023',message='分析格式有误';end if;
 end if;
 for w in select value from jsonb_array_elements(p_bundle->'writes') loop
  r:=w->'record';
  if coalesce(r->>'id','')='' or coalesce(trim(r->>'content'),'')='' or length(r->>'content')>24000 then raise exception using errcode='22023',message='请检查跟进内容';end if;
  if not(coalesce(r->>'kind','')='task' and coalesce(r->>'date','')='') then
   if coalesce(r->>'date','')!~'^\d{4}-\d{2}-\d{2}$' or to_char((r->>'date')::date,'YYYY-MM-DD')<>r->>'date' then raise exception using errcode='22023',message='请检查跟进日期';end if;
  end if;
  select value into oldr from jsonb_array_elements(hist) where value->>'id'=r->>'id';
  if oldr is not null and (oldr-'updatedAt')=(r-'updatedAt') then continue;end if;
  if oldr is distinct from nullif(w->'expected','null'::jsonb) then raise exception using errcode='PT409',message='记录已在其他页面修改，请刷新核对后重试';end if;
  if coalesce(c->'progressDeletedIds','[]'::jsonb) ? (r->>'id') then raise exception using errcode='PT409',message='该记录已删除，不能重复提交';end if;
  if coalesce(r->>'kind','')='task' and not coalesce((r->>'completed')::boolean,false) and exists(select 1 from jsonb_array_elements(hist)x where x->>'id'<>r->>'id' and x->>'kind'='task' and not coalesce((x->>'completed')::boolean,false) and (trim(x->>'content')=trim(r->>'content') or (coalesce(r->>'sourceRecordId','')<>'' and x->>'sourceRecordId'=r->>'sourceRecordId'))) then raise exception using errcode='PT409',message='已有对应待办，请调整原任务';end if;
  r:=r||jsonb_build_object('updatedAt',stamp);
  if oldr is null then hist:=jsonb_build_array(r)||hist;
  else select jsonb_agg(case when value->>'id'=r->>'id' then r else value end order by ordinality) into hist from jsonb_array_elements(hist) with ordinality;end if;
  if coalesce(r->>'kind','')<>'task' and coalesce(r->>'channel','') not in('attempt','internal') then changed_comm:=true;end if;
 end loop;
 c:=jsonb_set(c,'{progressHistory}',hist);
 if p_bundle ? 'analysis' then c:=jsonb_set(c,'{followupAnalysis}',p_bundle->'analysis');end if;
 if p_bundle ? 'snoozedUntil' then
  if coalesce(p_bundle->>'snoozedUntil','')<>'' and ((p_bundle->>'snoozedUntil')!~'^\d{4}-\d{2}-\d{2}$' or to_char((p_bundle->>'snoozedUntil')::date,'YYYY-MM-DD')<>p_bundle->>'snoozedUntil') then raise exception using errcode='22023',message='提醒日期有误';end if;
  c:=jsonb_set(c,'{followupSnoozedUntil}',p_bundle->'snoozedUntil');
 end if;
 if changed_comm then select max(value->>'date') into latest from jsonb_array_elements(hist) where coalesce(value->>'kind','')<>'task' and coalesce(value->>'channel','') not in('attempt','internal');if latest is not null then c:=jsonb_set(c,'{lastDate}',to_jsonb(latest));end if;end if;
 update public.app_data set data=jsonb_set(row_data.data,array[idx::text],c),updated_at=stamp::timestamptz where id=row_data.id;
 return c;
end $$;
revoke all on function public.save_followup_bundle_v1(text,text,jsonb) from public;
grant execute on function public.save_followup_bundle_v1(text,text,jsonb) to anon,authenticated;
