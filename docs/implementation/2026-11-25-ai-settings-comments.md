# DeepSeek 配置入口与六条界面批注

开发分支：codex/pen-followup-workbench，工作树 insurance-chat-followup。未发布、未推送、未修改线上环境变量或数据库。

## 入口与使用

跟进工作台右上角「AI 设置」→ 输入 API Key / 选择模型 → 测试连接 → 保存并启用。保存后服务端即时使用，不需要重启。每日梗概和全历史客户分析共用此配置；分析失败处也可打开设置，不丢失聊天草稿。截图OCR仍为本地Tesseract，本轮没有把图片识别改成DeepSeek，不以文本连接成功冒充图像识别已可用。

本地配置保存于工作树 `.deepseek-settings.local`，仅服务端读取，0600权限、临时文件原子替换、Git忽略。Key不写入localStorage、客户app_data或前端环境变量，状态接口不回显Key。失败的替换不覆盖现有配置；测试后更换Key/模型须重新验证，测试凭证5分钟过期。连接测试仅发送固定短句，生成梗概/分析才发送相应沟通材料。

本地中间件沿用127.0.0.1固定Host和Origin校验，拒绝跨站设置请求；已实际用伪造Origin请求得到403，未调用模型。测试限流、20秒上游超时与错误状态均处理，错误不转发上游原始正文。配置成功不自动消耗客户分析额度，由用户点击生成/更新。

线上服务没有本机持久目录，也没有新增管理员登录。本分支的托管 `/api/ai-settings` 仅显示服务端配置状态，公开写入始终403。部署时仍由管理员设置 DEEPSEEK_API_KEY / DEEPSEEK_MODEL；本轮不把公开页面变成线上密钥管理后台。

API按官方Chat Completions文档调用固定DeepSeek域名，默认deepseek-flash，可选deepseek-v4-pro，JSON响应、thinking disabled。参考 https://api-docs.deepseek.com/api/create-chat-completion/ 。测试只使用假的Key和模拟响应，未声称真实账号已连接。

## 批注逐条落实

1. 详情待办日历图标仅行悬停或图标键盘聚焦时出现；触屏常显。避免因勾选框仍有焦点导致图标一直显示。仍使用公共Input日历，选日直接保存。
2. 移除详情待办的「逾期N天」，保留实际日期及原有日期颜色。工作台逾期分类/统计不受此详情批注影响。
3. 跟进状态移到跟进Tab右侧，用公共Select切换、等待服务端确认后显示新状态；失败保留原状态并提示。资料Tab中没有跟进状态。
4. 资料Tab直接复用ImportModal公共字段表单的嵌入形式，无第二层编辑窗口、无「编辑资料」按钮；保存和取消固定底部。切换Tab/关闭保护未保存草稿；失败输入不清空；成功反馈一次。复用生产资料保存RPC的冲突检查，本地服务补齐相同的逐字段合并，保留编辑期间新增的历史、保单和分析。
5. 查看依据等文字动作统一使用公共Button的text变体，悬停/聚焦/禁用和28px高度在公共CSS层定义，移除工作台文字按钮私有视觉覆盖。Tab、姓名导航仍是plain变体。
6. 标签、意向产品、客户分类使用公共Tag；可移除标签的×也纳入公共Tag，复用IconButton，不再自造胶囊或蓝色产品标签。Pen的SqeKS母版同步到12px、灰底、4px圆角和2×8px内边距。

Pen继续在OKhXw组更新资料直编、跟进状态及本地AI设置状态；原来的图片识别方案保留为独立待确认原型，未挪用为已实现页面。预览导出 `/Users/apple/.codex/visualizations/insurance-ai-settings-comments/export.pdf`。

## 文案删减

删除资料里的重复只读字段展示、编辑资料入口与跟进状态；删除详情逾期天数。文字动作和标签去掉私有样式。保留字段名称、密钥存储/材料发送说明、连接测试与保存反馈、输入冲突提示，分别用于输入、确认数据流向和失败重试；没有添加装饰小字。

## 验证结果

最终执行 `VITE_APP_ID=app_yp9dq7mofjm npm run check:release` 全部通过：76项业务测试、类型、68份依赖来源公共UI扫描零违规、生产构建及完整浏览器回归。新增单元覆盖配置测试后保存、模型/Key变化失效、文件权限/重启恢复/写入失败保留、上游错误不泄漏Key；资料并发保存保留历史/保单/分析与字段冲突。

浏览器使用虚拟数据及拦截请求，验证配置失败保留、测试后换模型需重测、保存失败可重试、不回显Key、配置后客户分析及每日梗概调用并进入原保存流程；资料直接编辑/固定底栏、未保存草稿保护、状态失败保持原值、日历悬停、详情无逾期徽标、三入口/保单功能不回归。

人工查看1304×880及390×844截图：customer-profile-desktop、customer-profile-mobile-scroll、customer-followup-mobile、customer-followup-controls-desktop、ai-settings-error-desktop/mobile、ai-settings-enabled-mobile、ai-settings-configured-desktop、workbench-desktop。日期/模型控件、键盘Escape及固定操作栏由完整回归覆盖。截图位于output/ui-regression，结果快照为本目录2026-11-25-ai-settings-browser-results.json。构建仍有原有大包提示。本机状态接口确认configured=false，真实Key尚未填写；所有模型成功状态为测试模拟，未向DeepSeek发送真实客户材料。
