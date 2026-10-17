# AGENTS.md

> 每轮自动加载，**只放红线与速查**。细则 → [`spec/memory/`](./spec/memory/README.md)｜项目知识 → [`spec/README.md`](./spec/README.md)

## 一、跟用户配合

- 🔴 **改代码 / 改文件前先讲后动** —— 说清「改什么 / 为什么 / 影响哪个功能」，等点头。只读操作除外。
- 🔴🔴 **提示词、`schema/`、世界书逐字确认** —— 一个字都不能自己动，无自行决定空间。
- 🔴 **一次只推进一项** —— 讲清 → 等拍板 → 动手 → 报告。
- 🔴 **讲用途不讲名字**；给建议只说「改成什么」，依据另起。
- 结论先行但**必须跟上依据**；选项写清「选什么 / 会怎样 / 代价」。

## 二、硬红线

- 🔴 **工作区改动不提交不推送**，也不问要不要提交。说「上线 / 发布 / 部署」→ 技能 `deploy-online`。
- 🔴 **对外一律 `MyRaidRealm`**，不得出现内部目录名。
- 🔴 **临时产物写 `Temp/`，可复用脚本写 `tools/`**（都已 gitignore，从项目根运行）。
- 🔴 **视觉改动做完直接给用户看**，不自己截图复查。

## 三、干活默认口径

- **搜索先窄后宽**；证据够了就停，进入修改。
- **最小必要改动**；不顺手重构、不清理无关代码、不替换依赖。
- 文档与代码冲突时**以代码为准**。
- 用户建议不利于目标时**直接指出，不迎合**。

## 四、验证

- 验证范围与风险相称；高耦合改动必须验关键路径。
- 🔴 **「CI 绿」≠「测试全过」** —— 看日志里的通过条数与汇总行，不看退出码。
- 提交前跑齐 `typecheck → test → lint → build`，同步补 `CHANGELOG.md`（约定见 `CONTRIBUTING.md`）。

## 五、细则在哪（按需读，别通读）

- **协作 / 提示词确认 / 输出口径** → [`spec/memory/collaboration.md`](./spec/memory/collaboration.md)
- **搜索 / 代码 / 工具 / 子 Agent / 临时文件** → [`spec/memory/code-and-search.md`](./spec/memory/code-and-search.md)
- **界面与样式铁律** → [`spec/memory/ui-rules.md`](./spec/memory/ui-rules.md)
- **验证 / 提交 / changelog / 发布** → [`spec/memory/verify-and-release.md`](./spec/memory/verify-and-release.md)
- **本机长期记忆 / 代码图谱 / 每日流水** → `.workbuddy-ai/memory/`（不随仓库走，需主动读）
