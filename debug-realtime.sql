-- Supabase Realtime 诊断脚本
-- 在 Supabase SQL Editor 中运行

-- 1. 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('app_data', 'contacts');

-- 2. 检查 realtime 发布
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 3. 检查表是否在 realtime 发布中
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 4. 如果 app_data 不在 realtime 中，添加它
ALTER PUBLICATION supabase_realtime ADD TABLE app_data;

-- 5. 验证 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('app_data', 'contacts');

-- 6. 检查 app_data 数据
SELECT app_id, data_type, updated_at, jsonb_array_length(data) as record_count
FROM app_data 
ORDER BY updated_at DESC 
LIMIT 10;
