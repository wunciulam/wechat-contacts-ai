-- 为 app_data 表启用实时订阅
-- 在 Supabase SQL Editor 中运行此脚本

-- 启用 realtime 广播
ALTER PUBLICATION supabase_realtime ADD TABLE app_data;

-- 验证是否成功
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
