# 保险经纪人客户管理系统 UI 设计提示词

## 一、产品概述

- **产品类型**：Web应用（PWA）
- **核心功能**：客户管理、跟进记录、智能提醒、二次开发机会识别
- **目标用户**：保险经纪人、保险代理人（25-45岁，中等技术水平）
- **设计目标**：简洁高效、专业可信、易于上手

---

## 二、设计系统

### 2.1 设计风格

- **整体风格**：现代简约、专业商务
- **设计理念**：以效率为核心，减少视觉干扰，让信息一目了然
- **情绪板关键词**：专业、高效、可信、清爽、有序

### 2.2 色彩方案

- **主色调**：#2563EB（保险蓝）
  - 用途：主要按钮、链接、重点强调、头部导航
  - 色阶：
    - 50: #EFF6FF（最浅背景）
    - 100: #DBEAFE
    - 200: #BFDBFE
    - 300: #93C5FD
    - 400: #60A5FA
    - 500: #3B82F6（主色）
    - 600: #2563EB（主按钮）
    - 700: #1D4ED8（Hover）
    - 800: #1E40AF
    - 900: #1E3A8A

- **辅助色**：#059669（成功绿）
  - 用途：已成交状态、成功提示、正向数据

- **中性色**：
  - 背景色：#F8FAFC（极浅灰）
  - 卡片背景：#FFFFFF（纯白）
  - 文字主色：#0F172A（深灰黑）
  - 文字次色：#64748B（中灰）
  - 文字辅助：#94A3B8（浅灰）
  - 边框色：#E2E8F0（浅灰边）
  - 分割线：#F1F5F9

- **语义色**：
  - 成功：#059669（绿色）
  - 警告：#F59E0B（琥珀色）
  - 错误：#DC2626（红色）
  - 信息：#2563EB（蓝色）

- **状态色**：
  - 已成交：#059669（绿色标签）
  - 跟进中：#2563EB（蓝色标签）
  - 休眠：#94A3B8（灰色标签）
  - 二次开发机会：#F59E0B（橙色高亮）

### 2.3 字体规范

- **主字体**："Inter", "PingFang SC", "Microsoft YaHei", sans-serif
  - 用途：标题、正文、界面文本
  - 安装：`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`

- **辅助字体**："JetBrains Mono", monospace
  - 用途：数字、代码、数据展示

- **字号体系**：

| 级别 | 桌面端 | 移动端 | 字重 | 行高 | 用途 |
|------|--------|--------|------|------|------|
| H1 | 28px | 24px | 700 | 1.2 | 页面大标题 |
| H2 | 22px | 20px | 600 | 1.3 | 区块标题 |
| H3 | 18px | 16px | 600 | 1.4 | 卡片标题 |
| H4 | 16px | 15px | 600 | 1.4 | 小标题 |
| Body | 15px | 14px | 400 | 1.6 | 正文 |
| Small | 13px | 12px | 400 | 1.5 | 辅助文字 |
| Caption | 12px | 11px | 400 | 1.4 | 标注、标签 |

### 2.4 间距系统

- **基础单位**：4px
- **间距尺度**：4/8/12/16/20/24/32/40/48/64px
- **页面边距**：桌面 24px / 平板 16px / 移动端 12px
- **内容最大宽度**：1440px
- **卡片间距**：16px
- **列表项间距**：12px

### 2.5 组件规范

#### 按钮

- **主按钮**：
  - 高度：44px
  - 圆角：8px
  - 背景：#2563EB
  - 文字：白色，15px，600字重
  - 内边距：左右 24px
  - Hover：背景 #1D4ED8，轻微上移 -1px
  - Active：背景 #1E40AF
  - Disabled：背景 #94A3B8，透明度 50%
  - 过渡：all 200ms ease

- **次按钮**：
  - 边框：1px solid #2563EB
  - 背景：透明
  - 文字：#2563EB
  - Hover：背景 #EFF6FF

- **文字按钮**：
  - 文字：#2563EB
  - 无背景
  - Hover：下划线

- **危险按钮**：
  - 背景：#DC2626
  - Hover：背景 #B91C1C

#### 输入框

- 高度：44px
- 圆角：8px
- 边框：1px solid #E2E8F0
- 内边距：左右 16px
- Focus：边框 #2563EB，添加 0 0 0 3px rgba(37, 99, 235, 0.1) 外发光
- Error：边框 #DC2626，显示红色错误提示
- Placeholder：#94A3B8

**大文本框（跟进记录专用）**：
- 最小高度：200px
- 最大高度：600px
- 自动扩展高度
- 圆角：12px
- 内边距：16px
- 字号：15px
- 行高：1.8

#### 卡片

- **客户卡片**：
  - 圆角：12px
  - 阴影：0 1px 3px rgba(0,0,0,0.1)
  - Hover 阴影：0 4px 12px rgba(0,0,0,0.15)
  - 内边距：16px
  - 背景：白色
  - Hover 上移：-2px
  - 过渡：all 200ms ease

- **信息卡片**：
  - 圆角：12px
  - 背景：#F8FAFC
  - 边框：1px solid #E2E8F0
  - 内边距：20px

#### 标签（Tag）

- 高度：24px
- 圆角：12px（全圆角）
- 内边距：左右 10px
- 字号：12px
- 字重：500

**状态标签**：
- 已成交：背景 #D1FAE5，文字 #059669
- 跟进中：背景 #DBEAFE，文字 #2563EB
- 休眠：背景 #F1F5F9，文字 #64748B

**产品标签**：
- 背景：#FEF3C7，文字 #D97706（琥珀色系）

#### 导航

- **顶部导航栏**：
  - 高度：64px
  - 背景：白色
  - 阴影：0 1px 3px rgba(0,0,0,0.05)
  - 固定顶部

- **底部导航栏（移动端）**：
  - 高度：56px
  - 背景：白色
  - 阴影：0 -1px 3px rgba(0,0,0,0.05)
  - 固定底部

#### 提醒红点

- 尺寸：18px
- 背景：#DC2626
- 文字：白色，10px
- 圆角：全圆角
- 位置：右上角偏移

### 2.6 设计原则

- **一致性**：同类型元素保持视觉和交互统一
- **层次清晰**：通过字号、颜色、间距建立视觉层次
- **留白呼吸**：充足的留白让界面不拥挤
- **反馈明确**：所有交互都有清晰的状态反馈
- **移动优先**：设计时先考虑移动端，再适配桌面

---

## 三、关键界面设计

### 界面 1：客户列表首页

**界面概述**：
- **用途**：系统的核心入口，展示所有客户列表，支持快速筛选和查找
- **用户目标**：快速找到目标客户，了解跟进状态
- **关键指标**：客户查找效率、列表加载速度

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  顶部导航栏                                          │
│  Logo    🔍 搜索客户...        🔔  👤               │
├─────────────────────────────────────────────────────┤
│  筛选栏                                              │
│  [全部 ▼] [已成交 ✓] [跟进中] [休眠]                 │
│  [车险 ▼] [寿险] [健康险...]     卡片 ▤ / 列表 ☰    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  客户列表区域                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │ 👤 张三                    [已成交] [寿险]   │   │
│  │ 📱 138****8888              最后跟进: 2天前   │   │
│  │ 🔔 14天未跟进                                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 👤 李四                    [跟进中] [健康险] │   │
│  │ 📱 139****6666              最后跟进: 5天前   │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 👤 王五                    [休眠] [车险]     │   │
│  │ 📱 137****9999              最后跟进: 95天前  │   │
│  │ ⚠️ 90天未跟进，建议唤醒                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [+] 悬浮按钮（新增客户）                              │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **顶部导航栏（Navbar）**：
   - 高度：64px
   - 左侧：Logo（文字"客户管家"或图标）
   - 中间：搜索框（宽度自适应，placeholder"搜索姓名、手机号..."）
   - 右侧：提醒中心图标（带红点计数）、视图切换按钮

2. **筛选栏**：
   - 背景：#F8FAFC
   - 内边距：12px 24px
   - 状态筛选：横向滚动标签组，可多选
   - 产品筛选：下拉选择器，可多选
   - 视图切换：图标按钮组，卡片/列表切换

3. **客户卡片**：
   - 圆角：12px
   - 阴影：0 1px 3px rgba(0,0,0,0.1)
   - 内边距：16px
   - 布局：
     - 顶部：姓名（18px，600字重）+ 状态标签
     - 中部：手机号（14px，#64748B）
     - 底部：最后跟进时间 + 提醒标记
   - Hover：阴影加深，轻微上移

4. **客户列表项**（列表视图）：
   - 高度：72px
   - 布局：头像 + 姓名手机号 + 标签 + 跟进状态
   - 分隔线：1px solid #F1F5F9
   - Hover：背景 #F8FAFC

5. **悬浮按钮**：
   - 尺寸：56px
   - 位置：右下角，距边24px
   - 背景：#2563EB
   - 图标：白色 + 号
   - 阴影：0 4px 12px rgba(37, 99, 235, 0.4)

**响应式适配**：
- **桌面端（>1024px）**：侧边导航 + 主内容区
- **平板端（768-1024px）**：顶部导航 + 网格卡片（2列）
- **移动端（<768px）**：底部导航 + 单列卡片

**AI 生成提示词**：
```
Design a modern, clean customer management dashboard interface for an insurance CRM.

Style: Professional SaaS, minimalist design with insurance industry trustworthiness
Color scheme: Primary blue #2563EB, white backgrounds, slate gray text hierarchy
Layout: Top navigation bar with search and notifications, filter bar below, main content area with customer cards in a responsive grid
Components: Rounded cards with subtle shadows, status tags (green for completed, blue for in-progress, gray for dormant), floating action button
Typography: Inter font family, clear hierarchy with bold headings
Features: Card/list view toggle, multi-select filters, customer avatars, last contact timestamps
Mood: Professional, organized, efficient, trustworthy
Effects: Soft shadows, smooth hover transitions (200ms), gentle card lift on hover
Include: Search functionality, notification badges, status indicators, quick-action buttons
Tech stack feel: Modern React-based PWA dashboard
Background: Clean white with light gray #F8FAFC sections
--ar 16:9
```

---

### 界面 2：客户详情页

**界面概述**：
- **用途**：展示单个客户的完整信息和历史记录
- **用户目标**：了解客户全貌，查看历史跟进，执行操作
- **关键指标**：信息查找效率、操作完成率

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  ← 返回           客户详情            [编辑] [删除]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │     👤                                          │   │
│  │                                                  │   │
│  │     张三                                        │   │
│  │     [已成交] [寿险] [健康险]                    │   │
│  │                                                  │   │
│  │     📱 138****8888                              │   │
│  │     🎂 1990-05-20 (35岁)                        │   │
│  │     📍 上海市浦东新区...                        │   │
│  │     💳 保单数量: 3                              │   │
│  │                                                  │   │
│  │     [新增跟进] [设置提醒]                       │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  💡 二次开发机会                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⚡ 险种补充 - 高匹配度                          │   │
│  │    客户仅有医疗险，缺少重疾险保障               │   │
│  │    [标记开发中] [暂不考虑]                      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  📝 跟进记录                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ 2026-02-10 14:30                               │   │
│  │ 今天和客户电话沟通了重疾险方案，客户表示...     │   │
│  │ 📅 下次跟进: 2026-02-15                        │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 2026-02-08 10:00                               │   │
│  │ 初次见面，了解了客户家庭情况和保障需求...       │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 2026-01-15 16:00                               │   │
│  │ 客户转介绍，添加了微信...                       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **头部导航**：
   - 左侧：返回按钮
   - 中间：页面标题"客户详情"
   - 右侧：编辑按钮、更多操作（删除）

2. **客户信息卡片**：
   - 背景：白色
   - 圆角：12px
   - 内边距：24px
   - 居中布局
   - 头像：64px圆形，渐变背景
   - 姓名：22px，600字重，居中
   - 标签组：居中显示
   - 联系信息：图标+文字，左对齐
   - 操作按钮：并排两个主按钮

3. **二次开发机会区域**：
   - 标题：18px，600字重，带💡图标
   - 机会卡片：橙色边框高亮
   - 显示：类型、置信度、推荐理由
   - 操作：两个按钮选择状态

4. **跟进记录时间线**：
   - 标题：18px，600字重
   - 每条记录：
     - 时间戳：12px，#94A3B8
     - 内容：15px，#0F172A，最大显示3行
     - 下次提醒：蓝色标签显示
   - 分隔线：1px solid #F1F5F9
   - 最新记录在顶部

5. **快捷操作区**：
   - 固定在内容底部
   - 两个主按钮：新增跟进、设置提醒

**响应式适配**：
- **桌面端**：左右分栏，左侧信息右侧记录
- **移动端**：单列堆叠，底部固定操作栏

**AI 生成提示词**：
```
Design a detailed customer profile page for an insurance CRM.

Style: Clean, professional, information-dense but organized
Color scheme: White cards on light gray background #F8FAFC, primary blue #2563EB accents, status color-coded tags
Layout: Header with back button and actions, centered profile card with avatar and contact info, opportunity section with orange highlights, timeline view for follow-up history
Components: Large circular avatar placeholder, status tags, action buttons, timeline cards with timestamps, opportunity cards with confidence badges
Typography: Inter font, 22px name header, 15px body text, 12px timestamps
Features: Customer info display, policy count, contact details, opportunity alerts, follow-up timeline with expand/collapse
Mood: Professional, trustworthy, detailed, actionable
Effects: Subtle card shadows, smooth scrolling timeline, gentle hover states
Include: Profile avatar, status badges, action buttons, timeline history, next reminder indicators, development opportunity highlights
Tech stack feel: Modern mobile-first React app
Interactive elements: Clear call-to-action buttons, expandable timeline items
--ar 9:16
```

---

### 界面 3：新增/编辑客户

**界面概述**：
- **用途**：录入或修改客户信息
- **用户目标**：快速完整地录入客户资料
- **关键指标**：表单完成率、填写时长

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  ← 取消           新增客户            [保存]         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  基本信息 *                                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ 客户姓名 *                                      │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 请输入客户姓名                              ││   │
│  │ └────────────────────────────────────────────┘│   │
│  │                                                  │   │
│  │ 证件号                                          │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 请输入身份证号                              ││   │
│  │ └────────────────────────────────────────────┘│   │
│  │                                                  │   │
│  │ [出生日期] [手机号] [地址]                      │   │
│  │                                                  │   │
│  │ 银行账号                                        │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 请输入银行账号                              ││   │
│  │ └────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  保单信息                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ 保单数量                                        │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 3                                           ││   │
│  │ └────────────────────────────────────────────┘│   │
│  │                                                  │   │
│  │ 已购保单详情                                    │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 平安福2023终身寿险                          ││   │
│  │ │ 重疾险2024版                                ││   │
│  │ │ 意外险A款                                    ││   │
│  │ └────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  客户分类                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ 状态                                            │   │
│  │ [已成交 ✓] [跟进中] [休眠]                      │   │
│  │                                                  │   │
│  │ 意向产品                                        │   │
│  │ [车险] [寿险 ✓] [健康险 ✓] [意外险]            │   │
│  │ [年金险] [财产险] [其他]                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│              [保存客户]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **头部导航**：
   - 左侧：取消按钮（文字）
   - 中间：页面标题"新增客户"/"编辑客户"
   - 右侧：保存按钮（文字主按钮）

2. **表单分组**：
   - 每个分组有标题（18px，600字重）
   - 分组间距：24px
   - 组内字段间距：16px

3. **输入框规范**：
   - 标签：14px，#64748B，位于输入框上方
   - 必填标记：红色 *
   - 输入框：44px高度，8px圆角
   - Focus状态：蓝色边框+光晕

4. **多选标签**：
   - 横向排列，可换行
   - 未选中：灰色边框，白色背景
   - 选中：蓝色背景，白色文字
   - 点击切换状态

5. **大文本框**（保单详情）：
   - 最小高度：100px
   - 自动扩展
   - 圆角：8px

6. **底部保存按钮**：
   - 宽度：100%（移动端）
   - 固定在底部安全区域
   - 主按钮样式

**响应式适配**：
- **桌面端**：两列布局，标签在左输入框在右
- **移动端**：单列堆叠，全宽输入框

**AI 生成提示词**：
```
Design a customer information form for an insurance CRM app.

Style: Clean, professional form design with clear visual hierarchy
Color scheme: White background, primary blue #2563EB for primary actions and selected states, gray #64748B for labels, red for required indicators
Layout: Header with cancel and save buttons, scrollable form divided into sections (Basic Info, Policy Info, Classification), fixed save button at bottom on mobile
Components: Text input fields with floating labels, number stepper for policy count, large textarea for policy details, toggle-style multi-select tags for status and products
Typography: Inter font, 18px section headers, 14px labels, 15px input text
Features: Required field indicators, section dividers, character counters, inline validation, tag-based multi-selection
Mood: Professional, efficient, organized, easy to complete
Effects: Input focus states with blue border and glow, smooth label transitions, selected tag color changes
Include: Customer name, ID number, birthdate, phone, address, bank account fields, policy count and details, status tags (completed, in-progress, dormant), product interest tags
Form validation: Red error messages, inline field validation
Tech stack feel: Modern React form with real-time validation
Mobile optimized: Full-width inputs, large touch targets, sticky save button
--ar 9:16
```

---

### 界面 4：新增跟进记录

**界面概述**：
- **用途**：记录与客户的沟通详情
- **用户目标**：快速记录沟通内容，设置下次跟进
- **关键指标**：记录完成率、内容完整度

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  ← 取消           新增跟进            [保存]         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  跟进内容 *                                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │                                            ││   │
│  │ │  记录今天与客户的沟通内容...                ││   │
│  │ │                                            ││   │
│  │ │  客户需求：                                ││   │
│  │ │  - 想要为家庭配置重疾险                     ││   │
│  │ │  - 预算在1万元/年左右                       ││   │
│  │ │  - 对平安的产品比较感兴趣                   ││   │
│  │ │                                            ││   │
│  │ │  下次需要：                                ││   │
│  │ │  - 发送重疾险对比方案                       ││   │
│  │ │  - 约时间见面详细讲解                       ││   │
│  │ │                                            ││   │
│  │ │                                            ││   │
│  │ └────────────────────────────────────────────┘│   │
│  │                                                  │   │
│  │ 已输入 156 字                                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  设置提醒（可选）                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ ☑️ 提醒我下次跟进                               │   │
│  │                                                  │   │
│  │ 提醒时间                                         │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 📅 2026-02-15  🕐 10:00                     ││   │
│  │ └────────────────────────────────────────────┘│   │
│  │                                                  │   │
│  │ 提醒备注                                         │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 发送重疾险方案，约见面                       ││   │
│  │ └────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│              [保存跟进记录]                          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **大文本输入框**：
   - 最小高度：250px
   - 自动扩展（最大600px）
   - 圆角：12px
   - 内边距：16px
   - 字号：15px
   - 行高：1.8
   - Placeholder："详细记录与客户的沟通内容、客户需求、下一步计划..."

2. **字数统计**：
   - 位置：文本框右下角
   - 样式：12px，#94A3B8
   - 显示："已输入 XXX 字"

3. **提醒设置区域**：
   - 复选框：开启/关闭提醒
   - 时间选择器：日期+时间
   - 备注输入框：小文本框

4. **快捷模板**（可选）：
   - 横向滚动标签
   - 点击自动填入模板文字
   - 例如："初次联系"、"方案讲解"、"跟进回访"

**AI 生成提示词**：
```
Design a follow-up note recording interface for an insurance CRM.

Style: Clean, writing-focused interface with minimal distractions
Color scheme: White background, light gray #F8FAFC for sections, primary blue #2563EB for actions, subtle gray text
Layout: Header with cancel and save, large expandable text area for notes, collapsible reminder section below, sticky save button
Components: Large auto-expanding textarea with word counter, checkbox toggle for reminders, date-time picker, small text input for reminder notes
Typography: Inter font, 15px body text in textarea with 1.8 line height for readability, 14px labels
Features: Generous text area (min 250px), word/character count, reminder scheduling, note templates/tags
Mood: Focused, professional, encourages detailed note-taking
Effects: Textarea auto-expands smoothly, subtle focus outline, checkbox animation
Include: Large free-form text input, optional reminder toggle with datetime picker, reminder note field, quick template suggestions
Interaction: Auto-save draft, smooth scrolling, large touch targets for mobile
Tech stack feel: Modern note-taking app interface
Mobile optimized: Full-width textarea, easy datetime selection, sticky action button
--ar 9:16
```

---

### 界面 5：提醒中心

**界面概述**：
- **用途**：集中展示所有待办跟进提醒
- **用户目标**：快速查看需要处理的客户，执行跟进
- **关键指标**：提醒处理率、平均处理时间

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  提醒中心 (12)                                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  今天 (5)                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⚠️ 张三 - 14天未跟进                           │   │
│  │    跟进中客户超过14天未联系                    │   │
│  │    [立即跟进] [稍后提醒]                       │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 🎂 李四 - 生日快乐                             │   │
│  │    今天是客户生日，可发送祝福                  │   │
│  │    [发送祝福] [忽略]                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  明天 (3)                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📅 王五 - 手动设置的跟进提醒                   │   │
│  │    备注：发送重疾险方案                       │   │
│  │    [查看客户] [完成]                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  本周 (4)                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⏰ 赵六 - 保单即将到期                         │   │
│  │    平安福2023将在30天后到期                   │   │
│  │    [查看详情] [联系客户]                       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **头部**：
   - 标题："提醒中心" + 待处理数量徽章
   - 副标题：日期显示

2. **分组展示**：
   - 按时间分组：今天、明天、本周、本月、已逾期
   - 每组显示数量徽章
   - 组间分隔：24px间距

3. **提醒卡片**：
   - 图标+颜色：不同提醒类型不同图标颜色
     - 超时提醒：⚠️ 橙色
     - 生日提醒：🎂 粉色
     - 到期提醒：⏰ 蓝色
     - 手动提醒：📅 紫色
   - 客户名称：16px，600字重
   - 提醒描述：14px，#64748B
   - 操作按钮：根据类型显示不同操作

4. **操作按钮**：
   - 主操作：蓝色按钮
   - 次操作：文字按钮

5. **空状态**：
   - 图标：🎉
   - 文案："太棒了！所有提醒都已处理"
   - 按钮："查看全部客户"

**AI 生成提示词**：
```
Design a notification/reminder center for an insurance CRM app.

Style: Clean, organized list with clear urgency indicators
Color scheme: White background, color-coded icons (orange for warnings, blue for deadlines, pink for birthdays), gray text for descriptions
Layout: Header with title and badge count, grouped sections by date (Today, Tomorrow, This Week), expandable reminder cards
Components: Icon badges with different colors, customer name headers, description text, action button pairs (primary blue + secondary text)
Typography: Inter font, 16px customer names with 600 weight, 14px descriptions
Features: Grouped by urgency/time, different reminder types with unique icons, quick action buttons, swipe to dismiss (mobile)
Mood: Urgent but organized, actionable, stress-free task management
Effects: Smooth expand/collapse for groups, subtle hover states, icon color coding
Include: Today/Tomorrow/This Week groupings, overdue indicators, multiple reminder types (follow-up overdue, birthday, policy expiry, manual), action buttons
Empty state: Celebration illustration with "All caught up!" message
Tech stack feel: Modern notification center like iOS or Slack
Mobile optimized: Swipe gestures, large touch targets, clear visual hierarchy
--ar 9:16
```

---

### 界面 6：二次开发中心

**界面概述**：
- **用途**：展示系统识别的二次开发机会
- **用户目标**：发现有价值的开发机会，提升业绩
- **关键指标**：机会转化率、识别准确率

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  二次开发机会                                        │
├─────────────────────────────────────────────────────┤
│  筛选: [全部 ▼] [高匹配 ▼]                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 👤 张三                    匹配度: 95%        │   │
│  │                                                  │   │
│  │ 💡 险种补充机会                                  │   │
│  │    客户已购买医疗险（平安健康险2023），          │   │
│  │    但未配置重疾险。建议推荐重疾险产品...         │   │
│  │                                                  │   │
│  │ 客户价值: ⭐⭐⭐⭐⭐                            │   │
│  │ 建议时机: 近期                                   │   │
│  │                                                  │   │
│  │ [查看客户] [标记开发中] [暂不考虑]               │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 👤 李四                    匹配度: 78%        │   │
│  │                                                  │   │
│  │ 💡 保额提升机会                                  │   │
│  │    客户当前寿险保额30万，根据年龄和收入...       │   │
│  │    建议提升至100万保额                          │   │
│  │                                                  │   │
│  │ [查看客户] [标记开发中] [暂不考虑]               │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **机会卡片**：
   - 橙色边框（1px solid #F59E0B）
   - 圆角：12px
   - 内边距：20px
   - 阴影：0 2px 8px rgba(245, 158, 11, 0.1)

2. **匹配度显示**：
   - 位置：右上角
   - 样式：徽章形式
   - 高匹配（>80%）：绿色
   - 中匹配（50-80%）：黄色
   - 低匹配（<50%）：灰色

3. **机会详情**：
   - 图标：💡
   - 类型：18px，600字重
   - 推荐理由：14px，#64748B，最多3行
   - 客户价值：星级评分
   - 建议时机：标签显示

4. **操作按钮**：
   - 查看客户：次按钮
   - 标记开发中：主按钮（蓝色）
   - 暂不考虑：文字按钮

5. **筛选器**：
   - 机会类型筛选
   - 匹配度筛选
   - 状态筛选（待处理/开发中/已转化）

**AI 生成提示词**：
```
Design a sales opportunity/upsell center for an insurance CRM.

Style: Opportunity-focused with clear value propositions, warm accent colors for opportunities
Color scheme: White cards with orange #F59E0B borders for opportunities, green for high match scores, gray for customer info
Layout: Header with filters, scrollable list of opportunity cards, each card showing customer name, match percentage badge, opportunity type, detailed reasoning
Components: Match percentage badges (color-coded by score), opportunity type icons, star ratings for customer value, action button groups, expandable reasoning text
Typography: Inter font, customer names 16px bold, match scores prominent, 14px descriptive text
Features: Filter by opportunity type and match score, sort by value or urgency, one-click actions to view customer or mark status
Mood: Opportunity-driven, optimistic, actionable, revenue-focused
Effects: Orange glow on opportunity cards, smooth badge color transitions, hover lift effects
Include: Match percentage (AI confidence), opportunity types (supplement, upgrade, family, renewal), detailed reasoning, customer value ratings, suggested timing
Empty state: "No opportunities found" with tips to add more customer data
Tech stack feel: Modern sales intelligence dashboard
Mobile optimized: Card-based layout, clear tap targets, collapsible details
--ar 9:16
```

---

### 界面 7：提醒设置

**界面概述**：
- **用途**：配置提醒规则和偏好
- **用户目标**：自定义提醒触发条件和通知方式
- **关键指标**：设置完成率

**布局结构**：

```
┌─────────────────────────────────────────────────────┐
│  ← 返回           提醒设置                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  通知方式                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ ☑️ 应用内提醒                                   │   │
│  │                                                  │   │
│  │ ☑️ 邮件提醒                                     │   │
│  │ ┌────────────────────────────────────────────┐│   │
│  │ │ 邮箱: your@email.com                        ││   │
│  │ └────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  提醒规则                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │ ☑️ 跟进超时提醒                                 │   │
│  │    跟进中客户超过 [14] 天未跟进时提醒           │   │
│  │    ────────────────────────────────────        │   │
│  │                                                  │   │
│  │ ☑️ 休眠客户唤醒                                 │   │
│  │    已成交客户超过 [90] 天未跟进时提醒           │   │
│  │    ────────────────────────────────────        │   │
│  │                                                  │   │
│  │ ☑️ 保单到期提醒                                 │   │
│  │    保单到期前 [30] 天提醒                       │   │
│  │    ────────────────────────────────────        │   │
│  │                                                  │   │
│  │ ☐ 生日祝福提醒                                  │   │
│  │    客户生日当天提醒                             │   │
│  │    ────────────────────────────────────        │   │
│  │                                                  │   │
│  │ ☑️ 二次开发提醒                                 │   │
│  │    标记的开发机会超过 [7] 天未行动时提醒        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│              [保存设置]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**详细规范**：

1. **开关组件**：
   - 圆角开关样式
   - 开启：蓝色背景，白色圆点居右
   - 关闭：灰色背景，白色圆点居左
   - 点击动画：200ms过渡

2. **滑块/数字输入**：
   - 显示当前天数
   - 范围：1-365
   - 可滑动或点击修改

3. **分组展示**：
   - 每个规则独立卡片
   - 卡片内分隔线
   - 启用时显示详细设置

4. **保存按钮**：
   - 固定在底部
   - 主按钮样式

**AI 生成提示词**：
```
Design a reminder settings page for an insurance CRM.

Style: Clean settings interface with clear toggles and sliders
Color scheme: White background, gray dividers, blue #2563EB for enabled states, gray for disabled
Layout: Header with back button, grouped settings sections, individual rule cards with toggles and configuration options, sticky save button
Components: Toggle switches, number input steppers/sliders for days, checkbox groups for notification methods, email input field
Typography: Inter font, 18px section headers, 15px rule titles, 14px descriptions
Features: Enable/disable individual rules, customize days for each trigger, select notification methods (in-app, email), email configuration
Mood: Organized, customizable, user-control focused
Effects: Smooth toggle animations, slider interactions, section expand/collapse
Include: Notification method selection (in-app, email), rule list with toggles (follow-up timeout, dormant customer, policy expiry, birthday, development opportunity), day configuration for each rule
Tech stack feel: Modern iOS/Android settings screen
Mobile optimized: Large toggle targets, easy number input, clear visual grouping
--ar 9:16
```

---

## 四、全局交互规范

### 4.1 页面加载

- **骨架屏**：列表加载时显示骨架屏
- **加载动画**：旋转的蓝色圆环
- **渐进加载**：优先加载首屏内容

### 4.2 状态反馈

- **加载中**：显示加载指示器
- **空状态**：友好的插图+引导文案
- **错误状态**：清晰的错误提示+重试按钮
- **成功状态**：Toast提示（2秒后消失）

**Toast样式**：
- 背景：#0F172A（深色）
- 文字：白色
- 圆角：8px
- 位置：底部居中
- 动画：淡入+上滑

### 4.3 过渡动画

- **页面切换**：滑动+淡入，300ms
- **元素出现**：轻微上移+淡入，200ms
- **Hover效果**：颜色/阴影变化，200ms
- **列表项删除**：左滑+淡出，300ms

### 4.4 手势操作（移动端）

- **左滑列表项**：显示快捷操作（编辑、删除）
- **下拉列表**：刷新数据
- **上拉列表**：加载更多
- **点击卡片**：进入详情
- **长按**：多选模式

### 4.5 键盘快捷键（桌面端）

- **Ctrl/Cmd + K**：快速搜索
- **Ctrl/Cmd + N**：新增客户
- **ESC**：返回上一页/取消
- **Ctrl/Cmd + S**：保存

---

## 五、特殊设计考虑

### 5.1 无障碍访问（Accessibility）

- 所有图片添加alt文本
- 表单元素关联label
- 颜色对比度符合WCAG AA标准（4.5:1）
- 支持键盘导航
- 焦点状态清晰可见（2px蓝色边框）

### 5.2 国际化（i18n）

- 预留文字扩展空间
- 日期格式本地化
- 手机号格式适配

### 5.3 暗黑模式（未来支持）

- 背景色：#0F172A
- 卡片背景：#1E293B
- 文字主色：#F8FAFC
- 文字次色：#94A3B8
- 边框：rgba(255,255,255,0.1)

---

## 六、设计交付物清单

- [x] 设计系统规范（本文档）
- [ ] 高保真设计稿（Figma链接）
- [ ] 交互原型（关键流程）
- [ ] 响应式适配方案
- [ ] 切图资源（图标、Logo）

---

## 七、直接可用的 AI 提示词示例

### 提示词 1：生成首页 Hero/仪表盘
```
Design a modern customer management dashboard for an insurance broker CRM.

Style: Professional SaaS dashboard, clean and organized
Colors: Primary blue #2563EB, white backgrounds, slate gray #64748B text, subtle shadows
Layout: Fixed top navigation with logo, search bar, and notification icon, filter bar below with status and product tags, main content area with customer cards in responsive grid, floating action button
Components: Rounded customer cards with avatar placeholders, status badges (green for completed, blue for in-progress, gray for dormant), floating add button with shadow, card/list view toggle
Typography: Inter font, clear hierarchy with bold headings and legible body text
Features: Real-time search, multi-select filters, view mode toggle, customer info preview (name, phone, last contact), notification badges
Mood: Professional, efficient, trustworthy, organized
Effects: Smooth card hover with lift and shadow enhancement, gentle transitions, clean whitespace
Quality: High-end, polished, modern web application aesthetic
Include: Insurance industry context, customer management workflow, reminder indicators
--ar 16:9
```

### 提示词 2：生成移动端客户列表
```
Design a mobile customer list interface for an insurance CRM app.

Style: Mobile-first design, thumb-friendly, card-based layout
Colors: White cards on light gray #F8FAFC background, blue #2563EB accents, color-coded status tags
Layout: Bottom navigation bar (Customers, Opportunities, Reminders, Settings), scrollable card list, floating add button
Components: Full-width customer cards with large touch targets, circular avatars, status badges, last contact info, swipe actions
Typography: Inter font, 16px customer names, 14px secondary info
Features: Pull-to-refresh, swipe to quick actions, infinite scroll, search bar that collapses on scroll
Mood: Mobile-optimized, fast, efficient on-the-go usage
Effects: Smooth scrolling, rubber-band pull refresh, card press states
Include: Mobile navigation patterns, touch-optimized buttons, offline indicators
--ar 9:19.5
```

### 提示词 3：生成表单界面
```
Design a customer information form for an insurance CRM mobile app.

Style: Clean, focused form design with excellent usability
Colors: White background, blue #2563EB for primary actions and selected states, red for required fields, gray for placeholders
Layout: Scrollable form with grouped sections, sticky header and save button, large input fields
Components: Full-width text inputs with clear labels, toggle-style tag selectors for multi-choice, large textarea, date pickers
Typography: Inter font, clear section headers, readable input text
Features: Inline validation, auto-save drafts, smart defaults, helpful placeholders
Mood: User-friendly, efficient data entry, professional
Effects: Input focus animations, smooth keyboard transitions, validation feedback
Include: Customer data fields, policy information, classification tags, progress indication
--ar 9:16
```

---

**文档版本**：v1.0  
**最后更新**：2026-02-11  
**设计师**：AI产品助手
