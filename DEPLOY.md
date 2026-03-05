# 部署指南

本项目支持跨设备数据同步，使用 **Vercel + Supabase** 方案，完全免费。

## 1. 创建 Supabase 账号并设置数据库

### 步骤：
1. 访问 https://supabase.com 注册账号（可用 GitHub 登录）
2. 点击 "New Project"，填写：
   - Name: `wechat-contacts` 或任意名称
   - Password: 生成并保存好密码
3. 等待项目创建完成（约1分钟）

### 创建数据表：
1. 在 Supabase 左侧菜单点击 **SQL Editor**
2. 复制 `supabase_schema.sql` 文件内容
3. 粘贴到 SQL Editor 中，点击 **Run**
4. 看到 "Success. No rows returned" 表示成功

### 获取连接信息：
1. 点击左侧 **Project Settings** → **API**
2. 复制：
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

## 2. 配置环境变量

创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=你的Project URL
VITE_SUPABASE_ANON_KEY=你的anon key
VITE_APP_ID=wechat-contacts  # 推荐：固定同步ID，跨设备/跨域名访问同一份数据
```

## 3. 部署到 Vercel

### 方式一：GitHub 部署（推荐）

1. 将代码上传到 GitHub 仓库
2. 访问 https://vercel.com 注册账号
3. 点击 "Add New..." → "Project"
4. 导入你的 GitHub 仓库
5. 在 **Environment Variables** 中添加：
   - `VITE_SUPABASE_URL` = 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 Supabase anon key
6. 点击 **Deploy**

### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

## 4. 本地开发

```bash
npm install
npm run dev
```

## 使用说明

- **在线模式**：打开网页后自动同步数据到云端
- **离线模式**：无网络时数据保存在本地，联网后自动同步
- **多设备访问**：用同一个 Supabase 项目，不同设备都能访问相同数据

## 数据安全

⚠️ 当前配置允许任何人访问数据。如需增加安全性，可在 Supabase SQL Editor 执行：

```sql
-- 只允许邮箱验证的用户访问
CREATE POLICY "Authenticated users only" ON contacts
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

然后在 Supabase 开启 **Authentication** → **Providers** → **Email**。
