begin;
insert into public.app_data(app_id,data_type,data)values
('test_contact_memberships','contacts','[{"id":"c1","remarkName":"客户甲","categoryId":"a","followUpStatus":"following","progressHistory":[{"id":"r1","date":"2026-11-23","content":"保留跟进"}],"tags":["重要"],"policies":[{"id":"p1"}]}]'),
('test_contact_memberships','categories','[{"id":"a"},{"id":"b"},{"id":"c"}]');
set local role anon;
do $$declare c jsonb;begin
 c:=public.save_contact_category_v1('test_contact_memberships',null,' 客户甲 ','b');
 if c->>'id'<>'c1' or jsonb_array_length(c->'categoryIds')<>2 then raise exception 'same name did not reuse membership';end if;
 c:=public.save_contact_category_v1('test_contact_memberships',null,'客户甲','b');
 if jsonb_array_length(c->'categoryIds')<>2 then raise exception 'duplicate category';end if;
 c:=public.save_contact_category_v1('test_contact_memberships','c1',null,'c','a');
 if c->'categoryIds'?'a' or not(c->'categoryIds'?'b') or not(c->'categoryIds'?'c')then raise exception 'move erased another column';end if;
 c:=public.save_contact_category_v1('test_contact_memberships','c1',null,null,'b',true);
 if not(c->'categoryIds'?'c')or c->>'followUpStatus'<>'following' then raise exception 'remove lost other membership';end if;
 if c->'progressHistory'->0->>'content'<>'保留跟进' or c->'policies'->0->>'id'<>'p1' or not(c->'tags'?'重要')then raise exception 'contact data altered';end if;
 c:=public.save_contact_category_v1('test_contact_memberships','c1',null,null,'c',true);
 if c->>'followUpStatus'<>'idle' then raise exception 'last remove failed';end if;
 c:=public.save_contact_category_v1('test_contact_memberships',null,'新客户','a');
 c:=public.save_contact_category_v1('test_contact_memberships',null,'新 客户','b');
 if jsonb_array_length(c->'categoryIds')<>2 then raise exception 'normalized name duplicated';end if;
 begin
  update public.app_data set data=data||'[{"id":"duplicate","remarkName":"客户甲"}]'::jsonb where app_id='test_contact_memberships' and data_type='contacts';raise exception 'duplicate accepted';
 exception when sqlstate 'PT409' then null;end;
 begin
  perform public.save_contact_category_v1('test_contact_memberships','c1',null,'deleted');raise exception 'missing category accepted';
 exception when sqlstate 'PT409' then null;end;
end $$;
reset role;
rollback;
