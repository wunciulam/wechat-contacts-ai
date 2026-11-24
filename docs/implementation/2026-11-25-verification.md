# 跟进工作台本地验收

分支：codex/pen-followup-workbench。所有开发在 insurance-chat-followup 工作树；正式源码与线上数据库未改动。Pen 先以 ib1WA 为母版更新首页及对应状态，之后按该视觉实现。

## 验证范围

- `VITE_APP_ID=app_yp9dq7mofjm npm run check:release`：固定标识仅供构建和拦截请求的虚拟数据回归。实际结果全部通过：类型、71项业务/领域/API模拟测试、66份依赖来源UI扫描及构建；浏览器所有数据库请求被fixture拦截，不接触真实客户。
- 浏览器1304×880、390×844：既有保单、联系人、分类流程；真实本机Tesseract长图/批量识别、重叠去重、日期待确认、默认勾选、逐日梗概、原话、AI证据、安排任务、完成结果失败保留、原子保存、撤销完成保留历史、未来折叠、手机内联改期、规则弹窗及键盘Escape。
- SQL在临时PGlite数据库执行新迁移与既有跟进恢复触发器；以anon角色验证原子保存、相同请求重试、期望值冲突、半批次错误回滚、撤销不删沟通、阻止对应任务重复、拒绝过期分析。没有连接或修改线上库。
- SQL复现：临时安装 `@electric-sql/pglite`，设置 `PGLITE_MODULE` 指向包入口后执行 `node tests/database/followup-bundle.mjs`。

截图在 output/ui-regression/：chat-ocr-desktop、chat-review-desktop、chat-summary-desktop/mobile、workbench-desktop/mobile、followup-panel-desktop/mobile、workbench-future-mobile、workbench-reschedule-mobile。已单独查看截图，修正日期断行、更多资料图标折行、详情关闭图标位置、手机改期宽度；保留Pen的灰Tab、三列布局、头像、阶段轨道与AI边框。

## 文案删减

删除全局沟通日期、线下补充框、导入流程里的下一步分析/待办；原文不再整块输出。删除首页已完成入口及重复结果按钮；完成后只保留短反馈和撤销。勾选数量只在固定底栏展示一次。详细规则、依据与原话按需展开。

保留日期/说话人待核对提示（防止错归档）、保存失败反馈（防止误以为成功）、AI待更新状态（区分当前材料与旧分析）、提醒规则中的约定优先和激活依据（解释候选来源）。未来7天是展示分段，未来计划本身从明天起计算。

## 尚未执行

没有部署、推送或应用线上迁移。本机服务端未配置DeepSeek Key，AI接口以模拟返回验证，未声称真实模型已联调成功。需配置 `.env.chat-local.local` 的 `DEEPSEEK_API_KEY` 并重启本地服务后才会调用真实模型；截图OCR不需要Key。每天刷新在打开工作台时运行，不含离线推送。

浏览器结果快照：2026-11-25-browser-results.json。构建仍有项目既有的大包体积提示，不影响本地回归；未声称完成性能优化。
