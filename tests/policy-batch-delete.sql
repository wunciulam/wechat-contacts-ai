begin;
insert into app_data(app_id,data_type,data)values
('test_policy_batch_delete','contacts','[{"id":"c1","remarkName":"投保人","remarkInfo":"保留备注","tags":["客户"],"progressHistory":[{"id":"r1","date":"2026-11-21","content":"必须保留"}],"policies":[{"id":"p1","premium":"100"},{"id":"p2","premium":"200"},{"id":"manual","premium":"300"},{"productName":"无ID历史资料"}]},{"id":"c2","remarkName":"被保人","policies":[{"id":"p1","premium":"100"},{"id":"p3","premium":"500"}]}]'),
('test_policy_batch_delete','renewal_v1','{"policies":[{"id":"p1","applicantId":"c1","insuredId":"c2","payments":[{"date":"2026-11-21","amount":"100","status":"已缴费"}]},{"id":"p2","applicantId":"c1","payments":[]},{"id":"p3","applicantId":"c2","payments":[]}],"settings":{"enabled":true},"imports":[{"count":3}]}');
set local role anon;
do $$declare result jsonb;c jsonb;r jsonb;backup jsonb;req uuid:=gen_random_uuid();begin
 begin perform delete_selected_policies_v1('test_policy_batch_delete','c1',array['p2','p3'],gen_random_uuid());raise exception 'mixed owner selection accepted';exception when sqlstate 'PT409' then null;end;
 select data into r from app_data where app_id='test_policy_batch_delete'and data_type='renewal_v1';if jsonb_array_length(r->'policies')<>3 then raise exception 'partial delete';end if;
 result:=delete_selected_policies_v1('test_policy_batch_delete','c1',array['p1','p2','p1'],req);
 if jsonb_array_length(result->'deletedIds')<>2 then raise exception 'incorrect selection';end if;
 select data into c from app_data where app_id='test_policy_batch_delete'and data_type='contacts';
 select data into r from app_data where app_id='test_policy_batch_delete'and data_type='renewal_v1';
 if jsonb_array_length(c)<>2 or c->0->>'remarkInfo'<>'保留备注' or c->0->'progressHistory'->0->>'content'<>'必须保留' then raise exception 'customer data changed';end if;
 if jsonb_array_length(c->0->'policies')<>2 or c->0->'policies'->1->>'productName'<>'无ID历史资料' then raise exception 'unselected policies lost';end if;
 if jsonb_array_length(c->1->'policies')<>1 or c->1->'policies'->0->>'id'<>'p3' then raise exception 'related copy not removed';end if;
 if jsonb_array_length(r->'policies')<>1 or r->'policies'->0->>'id'<>'p3' or r->'settings'->>'enabled'<>'true' or jsonb_array_length(r->'imports')<>1 then raise exception 'renewal data changed';end if;
 select data into backup from app_data where app_id='test_policy_batch_delete'and data_type='policy_delete_backup:'||req::text;
 if jsonb_array_length(backup->'renewalPolicies')<>2 or backup->'renewalPolicies'->0->'payments'->0->>'status'<>'已缴费' then raise exception 'backup missing';end if;
 perform delete_selected_policies_v1('test_policy_batch_delete','c1',array['p2','p1'],req);
 if (select count(*)from app_data where app_id='test_policy_batch_delete'and data_type like 'policy_delete_backup:%')<>1 then raise exception 'retry duplicated backup';end if;
 perform delete_selected_policies_v1('test_policy_batch_delete','c1',array['manual'],gen_random_uuid());
 select data into c from app_data where app_id='test_policy_batch_delete'and data_type='contacts';if jsonb_array_length(c->0->'policies')<>1 then raise exception 'contact-only policy not removed';end if;
end $$;
reset role;rollback;
