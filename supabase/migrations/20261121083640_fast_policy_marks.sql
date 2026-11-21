-- Preserve existing RLS; lock both records in the same order as imports.
create or replace function public.mark_policy_installment_v1(
 p_app_id text,p_policy_id text,p_kind text,p_date text,p_expected jsonb,p_seed jsonb,p_target jsonb
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 r public.app_data%rowtype; c public.app_data%rowtype; policy jsonb; payment jsonb;
 result_payments jsonb; changed jsonb; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 idx integer; payment_idx integer; contact_row record; policy_row record; result jsonb;
begin
 if p_kind is null or p_kind not in ('contact','payment','renewal') then raise exception using errcode='22023',message='未知操作'; end if;
 if p_kind <> 'renewal' and (p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$') then raise exception using errcode='22023',message='缴费日期不正确'; end if;
 if (p_kind='renewal' and jsonb_typeof(p_target) is distinct from 'boolean') or
    (p_kind='payment' and (p_target is null or p_target not in ('"已缴费"'::jsonb,'"未缴费"'::jsonb))) then
  raise exception using errcode='22023',message='目标状态不正确';
 end if;
 perform id from public.app_data where app_id=p_app_id and data_type in('contacts','renewal_v1') order by data_type for update;
 select * into r from public.app_data where app_id=p_app_id and data_type='renewal_v1';
 select * into c from public.app_data where app_id=p_app_id and data_type='contacts';
 if r.id is null or c.id is null then raise exception using errcode='PT409',message='请刷新后重新同步保单'; end if;
 select value,(ordinality-1)::integer into policy,idx from jsonb_array_elements(r.data->'policies') with ordinality where value->>'id'=p_policy_id;
 if policy is null then raise exception using errcode='PT409',message='保单已变化，请刷新后重试'; end if;
 result_payments:=coalesce(policy->'payments','[]'::jsonb);
 if p_kind='renewal' then
  if coalesce(policy->'renewed','false'::jsonb) is distinct from p_expected and coalesce(policy->'renewed','false'::jsonb) is distinct from p_target then
   raise exception using errcode='PT409',message='续保状态已变化，请刷新后重试';
  end if;
  changed:=jsonb_build_object('renewed',p_target);
 else
  select value,(ordinality-1)::integer into payment,payment_idx from jsonb_array_elements(result_payments) with ordinality where value->>'date'=p_date;
  if payment is distinct from nullif(p_expected,'null'::jsonb) then
   -- A retry of the same completed request is safe and creates no duplicate history.
   if p_kind='payment' and payment->'status'=p_target and (payment->>'confirmedAt') is not null then
    return jsonb_build_object('payments',result_payments,'renewed',coalesce(policy->'renewed','false'::jsonb));
   end if;
   if p_kind='contact' and (payment->>'contactedAt') is not null and
      (payment-'contactedAt') is not distinct from (coalesce(nullif(p_expected,'null'::jsonb),p_seed)-'contactedAt') then
    return jsonb_build_object('payments',result_payments,'renewed',coalesce(policy->'renewed','false'::jsonb));
   end if;
   raise exception using errcode='PT409',message='这期缴费记录已变化，请刷新后重试';
  end if;
  if payment is null then
   if p_seed is null or jsonb_typeof(p_seed) <> 'object' or p_seed->>'date' is distinct from p_date or p_seed->>'amount' is null then
    raise exception using errcode='22023',message='缺少该期缴费金额';
   end if;
   payment:=jsonb_build_object('date',p_date,'amount',p_seed->>'amount','status',coalesce(p_seed->>'status','未缴费')) ||
     case when p_seed ? 'estimated' then jsonb_build_object('estimated',p_seed->'estimated') else '{}'::jsonb end ||
     case when p_seed ? 'amountReference' then jsonb_build_object('amountReference',p_seed->'amountReference') else '{}'::jsonb end;
  end if;
  if p_kind='contact' then payment:=payment||jsonb_build_object('contactedAt',stamp);
  else
   payment:=payment||jsonb_build_object('status',p_target,'confirmedAt',stamp,'paidAt',case when p_target='"已缴费"'::jsonb then to_char(clock_timestamp() at time zone 'Asia/Shanghai','YYYY-MM-DD') else null end,
    'history',coalesce(payment->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',stamp,'from',payment->>'status','to',p_target,'source','人工标记')));
  end if;
  if payment_idx is null then result_payments:=result_payments||jsonb_build_array(payment);
  else result_payments:=jsonb_set(result_payments,array[payment_idx::text],payment); end if;
  changed:=jsonb_build_object('payments',result_payments);
 end if;
 update public.app_data set data=jsonb_set(r.data,array['policies',idx::text],policy||changed),updated_at=stamp::timestamptz where id=r.id;
 -- Change only status fields in matching contact policies; preserve all customer edits.
 for contact_row in select value,ordinality-1 as n from jsonb_array_elements(c.data) with ordinality loop
  for policy_row in select value,ordinality-1 as n from jsonb_array_elements(coalesce(contact_row.value->'policies','[]'::jsonb)) with ordinality where value->>'id'=p_policy_id loop
   c.data:=jsonb_set(c.data,array[contact_row.n::text,'policies',policy_row.n::text],policy_row.value||changed);
  end loop;
 end loop;
 update public.app_data set data=c.data,updated_at=stamp::timestamptz where id=c.id;
 return jsonb_build_object('payments',result_payments,'renewed',coalesce(changed->'renewed',policy->'renewed','false'::jsonb));
end; $$;
revoke all on function public.mark_policy_installment_v1(text,text,text,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.mark_policy_installment_v1(text,text,text,text,jsonb,jsonb,jsonb) to anon,authenticated;
