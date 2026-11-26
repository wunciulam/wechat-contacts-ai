# 正式源码与界面约束

开始任何界面设计或开发前，先读本目录《设计偏好.md》。其中记录用户确认的 Pen 视觉基准与最新评论；新增交互沿用该视觉，不得擅自重排或另造主题。

本目录包含其他未发布改动。开始修改前先读《线上正式版说明.md》，使用其中记录的正式源码 `分支 codex/ui-component-enforcement（用 `git -C "/Users/apple/Downloads/AI PROGRAM/insurance" checkout codex/ui-component-enforcement` 检出）` 及对应分支。不要从本目录直接覆盖部署，也不要覆盖这里已有的未发布修改。

所有界面需求先读正式源码的 AGENTS.md、design.md、实际 index.css。使用 components/ui 的 Input（含日期）、SearchInput、Select、Button/IconButton、Field、Tag 和 WorkspaceDialog。不得复制验收页私有控件、使用浏览器原生日期/下拉或另写弹窗。搜索图标由 SearchInput 的 flex 布局留位，公共控件 CSS 必须在 layer 内。普通按钮使用标准变体，plain 仅用于导航、Tab、拖动、颜色选择及文本/列表动作。

在正式源码执行 npm run check:release，新增入口补入静态扫描，新增交互补充 tests/ui。功能、构建通过不能代替视觉走查。必须检查桌面1304×880、手机390×844、展开控件、滚动、固定操作栏、键盘与保存失败状态，并检查截图。待发布版本验证后才能切换正式域名，再核验正式域名，记录实际证据。

每段可见文字必须帮助决定、操作、理解数据、确认结果或满足必要的法律/无障碍要求。当前阅读范围内不重复信息；不添加装饰编号、英文短句、无意义标签和泛泛说明。先展示核心信息及下一步操作，细节按需展开。交付前独立删减文案，检查桌面、手机和滚动状态；交付时说明删除内容及必要保留文字的原因。

# 分支与工作区规则

开发新功能必须在 git 分支上做，不在当前分支直接改，也不动线上正式版分支（codex/ui-component-enforcement、codex/mingya-policy-import-release、codex/policy-renewal-import）。

需要同时运行旧分支与新分支时，用 git worktree，且工作区必须放在本项目内部：

git -C "/Users/apple/Downloads/AI PROGRAM/insurance" worktree add -b codex/<功能名> ".worktrees/<功能名>" <起点提交>

禁止把工作区建到项目外的同级目录（如 ../insurance-xxx）。那会污染 AI PROGRAM 根目录。统一用 .worktrees/ 子目录，该目录已在 .gitignore 中，不会进入提交。

工作区完成后：git worktree remove ".worktrees/<功能名>"，再 git worktree prune，删除残留目录。分支合并或推送后，本地分支可删。

合并前先 git fetch origin，比较 git log --left-right --count origin/<分支>...<分支>，确认不会覆盖他人改动。提交信息用中文说明改动内容与原因。
