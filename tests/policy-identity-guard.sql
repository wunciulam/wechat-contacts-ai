begin;
insert into public.app_data(app_id,data_type,data)values('test_policy_identity','renewal_v1','{"policies":[{"id":"p1","company":"示例公司","policyNumber":"00123","effectiveDate":"2026-01-01","applicant":"甲","insured":"乙","payments":[]}]}'),('test_policy_identity','contacts','[{"id":"c1","remarkName":"甲","policies":[{"id":"p1","company":"示例公司","policyNumber":"00123","effectiveDate":"2026-01-01","applicant":"甲","insured":"乙"}]}]');
set local role anon;
do $$begin
 begin update public.app_data set data=jsonb_set(data,'{policies}',data->'policies'||'[{"id":"p2","company":"示例公司","policyNumber":"123","effectiveDate":"2026-01-01","applicant":"甲","insured":"乙","mingya":{"key":"index:2"}}]')where app_id='test_policy_identity'and data_type='renewal_v1';raise exception 'duplicate accepted';exception when sqlstate 'PT409' then null;end;
 if public.policies_have_duplicates_v1('[{"id":"a","company":"C","policyNumber":"1","effectiveDate":"2025-01-01"},{"id":"b","company":"C","policyNumber":"001","effectiveDate":"2026-01-01"}]')then raise exception 'annual policies collapsed';end if;
 if public.policies_have_duplicates_v1('[{"id":"a","company":"C","policyNumber":"1","effectiveDate":"2026-01-01","mingya":{"key":"a"}},{"id":"b","company":"C","policyNumber":"001","effectiveDate":"2026-01-01","mingya":{"key":"b"}}]')then raise exception 'distinct source identities collapsed';end if;
 if not public.policies_have_duplicates_v1('[{"id":"a","company":"C","policyNumber":"1","effectiveDate":"2026-01-01","insured":"乙,甲"},{"id":"b","company":"C","policyNumber":"001","effectiveDate":"2026-01-01","insured":"甲、乙","mingya":{"key":"b"}}]')then raise exception 'insured order duplicate missed';end if;
 begin update public.app_data set data='[{"id":"c1","remarkName":"甲","policies":[{"id":"p1","company":"C","policyNumber":"1","effectiveDate":"2026-01-01"},{"id":"p2","company":"C","policyNumber":"001","effectiveDate":"2026-01-01"}]}]'::jsonb where app_id='test_policy_identity' and data_type='contacts';raise exception 'contact duplicate accepted';exception when sqlstate 'PT409' then null;end;
end $$;
reset role;rollback;
