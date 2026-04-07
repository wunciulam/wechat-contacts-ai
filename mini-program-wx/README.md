# 保险跟单仔 - 微信小程序原生版

## 项目说明

这是一个原生微信小程序版本，使用微信小程序原生语法开发，无需额外构建工具，可直接在微信开发者工具中打开运行。

## 项目位置
`/Users/linhuanchao/Downloads/TEST/insurance/mini-program-wx`

## 文件结构

```
mini-program-wx/
├── app.js                 # 小程序入口
├── app.json               # 全局配置
├── app.wxss               # 全局样式
├── sitemap.json           # 站点地图
├── utils/
│   └── storage.js         # 本地存储工具
├── pages/
│   ├── index/             # 客户列表页
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   ├── contact/           # 客户详情/编辑页
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   ├── followup/          # 跟进记录页
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   └── policy/            # 保单管理页
│       ├── index.wxml
│       ├── index.wxss
│       ├── index.js
│       └── index.json
└── images/                # 图标目录（需自行添加）
```

## 使用方法

### 1. 打开微信开发者工具
下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 导入项目
1. 打开微信开发者工具
2. 点击 "导入项目"
3. 选择 `/Users/linhuanchao/Downloads/TEST/insurance/mini-program-wx` 目录
4. 填写你的小程序 AppID（如果没有，可以选择测试号）
5. 点击 "确定"

### 3. 添加图标（可选）
在 `images/` 目录下添加以下图标文件：
- `contact.png` / `contact-active.png` - 客户标签图标
- `followup.png` / `followup-active.png` - 跟进标签图标
- `policy.png` / `policy-active.png` - 保单标签图标

如果不添加图标，标签栏会显示文字。

### 4. 预览和调试
- 点击 "编译" 按钮查看效果
- 使用真机调试功能在手机上预览

## 功能说明

### 客户管理
- 查看客户列表
- 搜索客户（姓名、手机号）
- 添加新客户
- 编辑客户信息
- 删除客户
- 查看保单数量

### 跟进记录
- 显示所有跟进记录
- 按时间排序
- 显示待跟进数量
- 跳转客户详情

### 保单管理
- 显示所有保单
- 统计总保费
- 统计有效保单数
- 跳转客户详情

## 数据存储

数据存储在小程序本地存储中，使用 `wx.getStorageSync` 和 `wx.setStorageSync` 进行读写。

如果需要与网页端数据同步，需要额外接入 Supabase API。

## 与网页端对比

| 功能 | 网页端 | 小程序 |
|-----|-------|--------|
| 客户管理 | ✅ | ✅ |
| 跟进记录 | ✅ | ✅ |
| 保单管理 | ✅ | ✅ |
| Excel 导入 | ✅ | ❌ |
| 标签筛选 | ✅ | ❌ |
| 批量操作 | ✅ | ❌ |
| 数据同步 | ✅ Supabase | 本地存储 |

## 后续优化

- [ ] 接入 Supabase 实现数据同步
- [ ] 添加标签筛选功能
- [ ] 添加跟进记录编辑功能
- [ ] 添加保单录入功能
- [ ] 优化 UI 设计
