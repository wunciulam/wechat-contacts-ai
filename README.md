<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 微信通讯录 AI 助手

一款专为保险经纪人设计的微信客户管理工具，支持联系人管理、跟进记录、保单管理等功能。

## 功能特性

- **联系人管理**：支持手动录入、AI识别导入、Excel表格导入
- **Excel导入**：支持客户信息表和保单信息表导入，自动按证件号去重合并
- **跟进工作台**：记录跟进进度，支持状态切换
- **保单管理**：管理客户保单信息
- **标签管理**：灵活的标签系统，支持批量操作
- **云端同步**：数据自动同步到云端（Supabase），无需登录

## 快速开始

### 前置要求

- Node.js >= 18

### 安装和运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入以下信息：
# - VITE_GEMINI_API_KEY: Gemini API 密钥（用于AI识别，可选）
# - VITE_SUPABASE_URL: Supabase 项目 URL（用于云端同步）
# - VITE_SUPABASE_ANON_KEY: Supabase anon public 密钥
# - VITE_APP_ID: （推荐）你的“同步ID”，用于跨设备/跨域名共享同一份云端数据（例如：wechat-contacts）

# 3. 运行开发服务器
npm run dev
```

### 配置 Supabase 云端同步（可选）

1. 访问 [Supabase](https://supabase.com) 注册账号
2. 创建新项目（选择免费套餐）
3. 进入 **Settings** → **API**，复制 URL 和 anon public key
4. 进入 **SQL Editor**，执行以下 SQL 创建数据表：

```sql
CREATE TABLE app_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, data_type)
);

-- 启用 RLS 但允许匿名访问
CREATE POLICY "Allow access for app" ON app_data
  FOR ALL USING (true);
```

5. 将 URL 和密钥填入 `.env.local`

## Excel 导入格式

### 客户信息表

支持以下表头（自动识别）：

| 客户姓名 | 证件号 | 手机号 | 地址 | 银行账号 |
|----------|--------|--------|------|----------|

**去重规则**：按证件号 > 手机号 > 姓名 优先级匹配

### 保单信息表

支持以下表头（自动识别）：

| 保单号 | 产品名称 | 保险公司 | 保费 | 生效日期 | 投保人姓名 | 被保人 | 手机号 |
|--------|----------|----------|------|----------|------------|--------|--------|

**去重规则**：按保单号去重，关联到已有客户（证件号/手机号匹配）

## 技术栈

- React 19
- TypeScript
- Tailwind CSS 4
- Supabase（云端存储）
- xlsx（Excel解析）
- Google Gemini API（可选）

## 许可证

MIT
