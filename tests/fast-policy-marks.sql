-- Run as a single transaction. All fixtures and mutations are rolled back.
begin;
insert into public.app_data(app_id,data_type,data) values
 ('test_fast_policy_marks','renewal_v1','{"policies":[{"id":"p1","premium":"12000","payments":[{"date":"2026-11-18","amount":"12000","status":"未缴费"}]},{"id":"p2","payments":[]}],"settings":{"enabled":false},"imports":[]}'),
 ('test_fast_policy_marks','contacts','[{"id":"c1","remarkInfo":"keep customer notes","policies":[{"id":"p1","premium":"12000","payments":[{"date":"2026-11-18","amount":"12000","status":"未缴费"}]}]}]');
set local role anon;
do $$
declare old_payment jsonb:='{"date":"2026-11-18","amount":"12000","status":"未缴费"}'; result jsonb; contacted jsonb; paid jsonb; before_data jsonb; after_data jsonb;
begin
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p1','contact','2026-11-18',old_payment,null,'"已缴费"');
 contacted:=result->'payments'->0;
 if contacted->>'contactedAt' is null or contacted->>'status'<>'未缴费' then raise exception 'contact mark failed'; end if;
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p1','payment','2026-11-18',contacted,null,'"已缴费"');
 paid:=result->'payments'->0;
 if paid->>'confirmedAt' is null or paid->>'paidAt' is null or paid->>'status'<>'已缴费' or paid->>'contactedAt' is null then raise exception 'payment mark failed'; end if;
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p1','payment','2026-11-18',contacted,null,'"已缴费"');
 if jsonb_array_length(result->'payments'->0->'history')<>1 then raise exception 'retry duplicated history'; end if;
 begin
  perform public.mark_policy_installment_v1('test_fast_policy_marks','p1','payment','2026-11-18',old_payment,null,'"未缴费"');
  raise exception 'stale update accepted';
 exception when sqlstate 'PT409' then null; end;
 select data into before_data from public.app_data where app_id='test_fast_policy_marks' and data_type='contacts';
 if before_data->0->>'remarkInfo'<>'keep customer notes' or before_data->0->'policies'->0->'payments'->0 is distinct from paid then raise exception 'projection mismatch'; end if;
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p1','payment','2026-11-18',paid,null,'"未缴费"');
 if result->'payments'->0->>'paidAt' is not null or jsonb_array_length(result->'payments'->0->'history')<>2 then raise exception 'undo failed'; end if;
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p2','contact','2027-01-01',null,'{"date":"2027-01-01","amount":"100","status":"未缴费","estimated":true}','"已缴费"');
 if result->'payments'->0->>'amount'<>'100' then raise exception 'estimated installment failed'; end if;
 result:=public.mark_policy_installment_v1('test_fast_policy_marks','p1','renewal',null,'false',null,'true');
 if result->>'renewed'<>'true' then raise exception 'renewal failed'; end if;
 select data into after_data from public.app_data where app_id='test_fast_policy_marks' and data_type='contacts';
 if ((before_data->0->'policies'->0) -'payments') is distinct from ((after_data->0->'policies'->0) -'payments'-'renewed') then raise exception 'unrelated policy fields changed'; end if;
end $$;
reset role;
rollback;
