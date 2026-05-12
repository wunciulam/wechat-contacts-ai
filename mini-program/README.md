# 保险跟单仔 - 微信小程序版

基于 uni-app + Vue 3 + TypeScript + Pinia + Supabase 的保险经纪人客户管理系统小程序版本。

## 项目结构

```
mini-program/
├── src/
│   ├── components/          # Vue 组件
│   │   └── ContactList.vue  # 客户列表组件
│   ├── pages/               # 页面
│   │   ├── index/           # 客户列表页
│   │   ├── followup/        # 跟进记录页
│   │   ├── policy/          # 保单管理页
│   │   └── contact-detail/  # 客户详情页
│   ├── services/            # 服务层
│   │   ├── supabaseService.ts  # Supabase 数据同步
│   │   └── storage.ts       # 本地存储封装
│   ├── stores/              # Pinia 状态管理
│   │   └── contacts.ts      # 联系人状态
│   ├── types/               # TypeScript 类型
│   │   └── index.ts         # 类型定义
│   ├── App.vue              # 应用根组件
│   ├── main.ts              # 入口文件
│   ├── manifest.json        # 应用配置
│   └── pages.json           # 页面配置
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈

- **uni-app**: 跨平台开发框架
- **Vue 3**: 前端框架，使用 Composition API
- **TypeScript**: 类型安全
- **Pinia**: 状态管理
- **Supabase**: 云端数据库，与网页端共用

## 功能特性

- ✅ 客户列表展示
- ✅ 标签筛选
- ✅ 跟进状态筛选
- ✅ 批量操作（加标签、删标签、删除）
- ✅ 数据云端同步（与网页端共用 Supabase）
- 🔄 添加/编辑客户（开发中）
- 🔄 跟进记录（开发中）
- 🔄 保单管理（开发中）

## 快速开始

### 1. 安装依赖

```bash
cd mini-program
npm install
```

### 2. 配置小程序 AppID

编辑 `src/manifest.json`，填写你的微信小程序 AppID：

```json
{
  "mp-weixin": {
    "appid": "你的微信小程序appid"
  }
}
```

### 3. 运行到微信小程序开发者工具

```bash
# H5 模式（浏览器预览）
npm run dev:h5

# 微信小程序模式
npm run dev:mp-weixin
```

### 4. 发布小程序

```bash
npm run build:mp-weixin
```

编译完成后，使用微信开发者工具打开 `dist/build/mp-weixin` 目录，然后点击上传。

## 数据同步说明

小程序和网页端共用同一个 Supabase 数据库，数据会实时同步。

**重要：** 首次使用时，小程序会生成一个 `app_id`，这个 ID 用于区分不同用户的数据。如果你希望在网页端和小程序端看到相同的数据，需要在两端使用相同的 `app_id`。

当前配置的 Supabase 信息：
- URL: `https://ulgqiixqaxxgodyowrep.supabase.co`
- 数据表: `app_data`

## 与网页端对比

| 功能 | 网页端 | 小程序 |
|-----|-------|--------|
| 客户管理 | ✅ | ✅ |
| 跟进记录 | ✅ | 🔄 |
| 保单管理 | ✅ | 🔄 |
| Excel 导入 | ✅ | ❌（小程序限制） |
| 批量操作 | ✅ | ✅ |
| 标签管理 | ✅ | ✅ |
| 数据同步 | ✅ Supabase | ✅ Supabase |

## 注意事项

1. **Excel 导入**: 小程序不支持直接读取本地文件，此功能暂不可用
2. **本地存储**: 小程序 storage 有容量限制（10MB），大数据量时注意处理
3. **网络请求**: 小程序需要在开发者后台配置域名白名单
4. **图标**: 使用 emoji 替代 lucide-react 图标

## 后续计划

- [ ] 完善客户详情页面
- [ ] 实现跟进记录功能
- [ ] 实现保单管理功能
- [ ] 添加搜索功能
- [ ] 优化 UI 设计
- [ ] 支持支付宝小程序

## 许可证

MIT
