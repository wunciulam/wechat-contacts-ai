begin;
insert into app_data(app_id,data_type,data)values('test_customer_profile','contacts','[{"id":"c1","remarkName":"客户","remarkInfo":"original","progressHistory":[],"policies":[],"tags":[]}]');
set local role anon;
do $$ declare base jsonb;note_contact jsonb;result jsonb;begin
 select data->0 into base from app_data where app_id='test_customer_profile'and data_type='contacts';
 note_contact:=save_followup_v1('test_customer_profile','c1','add','{"id":"r1","date":"2026-11-21","content":"never overwrite me","completed":false}');
 result:=save_customer_profile_v1('test_customer_profile',base||'{"remarkInfo":"edited profile"}',base);
 if result->'progressHistory'->0->>'content'<>'never overwrite me' or result->>'remarkInfo'<>'edited profile' then raise exception 'profile overwrote followup';end if;
 begin perform save_customer_profile_v1('test_customer_profile',base||'{"remarkInfo":"stale edit"}',base);raise exception 'stale profile accepted';exception when sqlstate 'PT409' then null;end;
 result:=save_customer_profile_v1('test_customer_profile','{"id":"new","remarkName":"新客户","policies":[],"progressHistory":[{"id":"nr","date":"2026-11-21","content":"draft note","completed":false}]}');
 if result->'progressHistory'->0->>'updatedAt' is null then raise exception 'new draft note unversioned';end if;
 perform save_customer_profile_v1('test_customer_profile','{"id":"new","remarkName":"新客户","policies":[],"progressHistory":[{"id":"nr","date":"2026-11-21","content":"draft note","completed":false}]}');
 if (select jsonb_array_length(data)from app_data where app_id='test_customer_profile'and data_type='contacts')<>2 then raise exception 'retry duplicated customer';end if;
end $$;
reset role;rollback;
