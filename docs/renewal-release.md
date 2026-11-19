# 保单管理与续期提醒

分支：codex/policy-renewal-import。独立目录 insurance-renewal。
基线：4e3a2a8 + 保单弹窗修复 43d218b；原工作目录不受修改。

## 页面与数据

保单管理右上角进入续期提醒，提醒页面右上角为通知设置，无独立侧栏菜单。
客户卡片与表格显示缴费方式、缴费期间、下一期日期、金额、临期状态；点击产品或详情打开完整保单。
保单详情允许补充缴费/保障期限，关联投保人与被保人，查看及处理逐期历史。
三类明亚表格按公司+保单号及应缴日期合并。实际导入覆盖人工状态并留痕，撤单保留历史但退出提醒。
最新一期已缴后仅在周期与缴费结束条件明确时推算下一期（预计），不猜测保障期限。
姓名不足以确认身份时进入导入核对页，用户选择后才能保存。
保单登记与客户资料使用同一次云端写入，关联视图复用同一记录。

## 验证

9项核心测试通过；网页专用类型检查 tsconfig.web.json 通过；生产构建通过。
三份真实表格只读验证：295+145+337条有号记录，422份保单、334个缴费期次。
验证重复上传不增加保单/期次、更新原保单ID不变、两种客户角色查看同一记录、撤单过滤。
按2026-10-22计算10项提醒（包含明确周期推算的预计期次）。
实表尚未写入生产，存在需要人工确认的客户关联。不得把这些统计当作当前线上数据库数量。

## 邮件启用条件

默认 lamwunciu@qq.com、北京时间09:00。默认关闭。
Vercel Production 配置 SMTP_USER、SMTP_PASSWORD（QQ SMTP授权码）、CRON_SECRET（随机调用密钥）。
禁止为密码使用 VITE_ 前缀。授权码不要写入仓库或聊天。
调度安装见 renewal-scheduler.sql；密钥在 Supabase Vault 保存，与 Vercel CRON_SECRET 相同。
验证 QQ SMTP 及调度到达后设置 RENEWAL_SCHEDULER_READY=true，重新部署，再从界面启用。
当前未收到授权码，未配置调度，未发送邮件。每天唯一发送记录防止重复；失败需人工核对后重试。

## 回退

旧生产部署：dpl_9wZADHdqPjWHnMTWad5dU8JdaHan。
旧地址：insurance-fzrjo00cv-lamwunciu-2597s-projects.vercel.app。
发布前数据快照：/Users/apple/.codex/backups/insurance-20261022/before-renewal-release.json（仅本机）。
回退代码不回退业务数据；不要覆盖发布后的新增记录。原正式域名保持 insurance-rose-seven.vercel.app。
