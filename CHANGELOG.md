# Changelog

本项目所有值得注意的变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- `AGENTS.md`：给 AI 编码代理的工作准则。只讲「怎么干活」（协作方式、自主执行、先窄后宽的搜索策略、
  代码与架构、测试验证、工具使用、子 Agent、沟通与输出），**不含项目技术细节**。
- `spec/`：项目工程细则，即 `AGENTS.md` 的「宽」的一侧。含索引 `spec/README.md` 与 11 篇细则：
  架构与模块边界、构建与产物与部署、界面与样式体系、国际化、提示词链路、世界书与本地补充内容、
  预设体系与预设包投递、变量与状态与存档、生图提示词节点、CI 与验收、已知坑与待修。

### Changed

- `README.md`：
  - **修正「预设投递」一节。** 原文称预设包「统一走 CDN，独立版和酒馆版共用同一份」，
    与当前实现不符：预设包随 `dist/` 一起部署，只从自家产物取三档候选（同级相对路径 /
    本地开发地址 / 自家 Cloudflare Pages 绝对地址），jsdelivr 兜底已按「项目完全独立」删除。
    并补充「预设包构建必须排在主构建之后」「改完预设必须重新部署预设包」。
  - **修正构建产物的表述。** 原称「自包含的单文件」，实际是 JS / CSS 内联进 HTML，
    图片与音频位于同级 `dist/assets/`，分发需带上整个 `dist/`，只拿 `index.html` 会缺图。
  - 新增「文档导航」一节，串联 `CONTRIBUTING.md` / `AGENTS.md` / `spec/` / `CHANGELOG.md`。
  - 「目录结构」补上 `spec/`。
- `CONTRIBUTING.md`：
  - 「提交前自检」补齐 CI 实际执行的 `pnpm test`，并加入改动语言文件时的 `pnpm check:i18n`；
    补充「CI 不跑 Prettier」与「CI 绿 ≠ 测试全过」两条提醒。
  - 「部署流程」重写：删掉 tag / GitHub Release 通道，改为「整目录部署到 Cloudflare Pages」。
  - 「已知技术债」修正测试脚本那条过时描述（原称 `pnpm test` 仅作占位，实际 CI 已在执行），
    并改为指向 `spec/11-known-issues.md`；补上「存量代码未整体格式化」一条。
  - 「代码风格」补上 `spec/` 与 `AGENTS.md` 的指引。
- **代码格式统一。** `runtime/standaloneProviderCore.ts`、`runtime/standaloneState.ts`、`schema/schema.json`
  与 `scripts/i18n/` 下三个脚本跑过 Prettier（纯排版，`schema.json` 语义逐字未变）；同时新增 `.prettierignore`
  条目，把世界书 EJS 模板、玩家预设数据、GitHub issue 模板与旧实现存档排除在格式化之外。
  仓库现在 `pnpm format:check` **全绿**。
- **中文文案标点统一为全角。** `src/i18n/index.ts` 中文词条里 39 处「汉字 + 半角冒号」、1 处半角逗号、
  4 处半角括号（如 `世界(必填)`）改为全角，并去掉全角冒号后多余的半角空格；英文词条不动。
  纯显示文案，逻辑与占位符不受影响。
- **打开页面不再自动判定「进游戏还是进配置界面」。** `src/App.vue` 的判定从「已开局标记 + 玩家姓名 +
  API 配置」三重条件，简化为「本会话内是否已进入游戏」：打开一律先给配置界面首页，想接着上次玩自己点
  「继续游戏」挑快照。同步删掉加载时「看到玩家有姓名就补记完成标记」的兼容分支，以及加载时预建运行时
  会话的调用。**存档恢复路径上的 API 检查保留不动**——恢复后若 API 没配齐，仍会存下待续状态并跳到设置页，
  否则玩家会在数据已被覆盖的情况下进游戏、再想配接口就得走「重置游戏」，反而丢存档。

### Removed

- **「已开局标记」机制整体移除。** 删掉 `src/utils/setupProgress.ts`（localStorage 键
  `tavern_helper_1980s_setup_completed:<作用域>` 的读写与内存缓存），新增 `src/utils/localGameState.ts`
  只保留「重置游戏」需要的清空本地状态（`clearSetupCompleted` → `clearLocalGameState`）。
  四处 `markSetupCompleted()` 调用（设置页开局提交后 ×2、存档恢复后、世界配置面板应用后）一并删除——
  它们本来就紧跟着「进入游戏」的事件通知，主界面已在监听该通知，标记是多余的。
  测试脚本里对应的 `setup completed state stays scoped per chat` 用例与 4 处断言同步删除。
- **清掉设置页与设置面板里遗留的存档管理死代码。** 两处都从 `useStandaloneArchiveManager()`
  解构了一批早已没人读的返回值（`archiveRefreshTick`、`currentArchiveSession`、`currentArchiveMessages`、
  `currentArchiveMessageIds`、`currentArchiveMessageIdPreview`、`setArchiveStatus`、
  `refreshStandaloneArchiveList`），以及各 11 个没人用的 `utils/archive` / `utils/standaloneRuntime` 导入——
  存档界面搬进 `useStandaloneArchiveManager` 后遗留在原地的。该 composable 里只被这两处消费的
  `currentArchiveMessageIdPreview` 一并删除。
  另清掉 `SettingsPanel.vue` 的 `survivalModeSummaryMap`、`WorldConfigDashboard.vue` 的
  `useStatDataActions` 导入、`FactionsConfigCompact.vue` 的 `editingPlayerRelation`、
  `App.vue` 的 `const { t } = useI18n()`。全仓 ESLint 从 **59 warning 降到 18**（一直是 0 error）。
- **清掉删除确认里那个从未生效的「类型」参数。** `DeleteOptions.typeName` 被 4 处老老实实传了
  类型名（商业情报 / 招募角色 / 潜在危机·当前机遇·待办事项 / 技能·物品），但确认框文案
  `common.deleteConfirmMessage` 只有 `{name}` 一个占位符，类型从头到尾没被渲染过。
  `src/utils/deleteHelper.ts` 去掉该字段，`src/composables/useDelete.ts` 只留 `deleteItem`
  （`deleteProperty` / `deleteArrayItem` 两个包装无人调用，一并删除），4 个调用点去掉该字段。
  **界面文案一个字未变。**
- **GitHub Release 分发通道整体移除。** 删掉 `.github/workflows/release.yml`（推 tag 自动发 Release），
  以及 `ci.yml` 里的 `Upload build artifact` 步骤。分发定位收敛为「只走线上整目录部署」，
  不再提供「下载单个 HTML 到本地玩」的通道——`dist/index.html` 引用了同级 `assets/`（30 个文件）
  与 `preset-package/`，脱离它们打不开完整游戏。文档同步改口径：`README.md` / `README.en.md` /
  `CONTRIBUTING.md` / `spec/README.md` / `spec/02` / `spec/10` / issue 与 PR 模板 / `package.json` 描述。
- `runtime/standaloneTurn.ts`：清掉两处死代码——无人调用的预设分块函数 `resolveStandalonePresetSections()`，
  以及签名带标题、实现却完全忽略标题的 `formatNamedPromptBlock()`。两处调用点改为直接对内容去首尾空白，
  送给模型的提示词内容不变。

### Fixed

- **补齐存档恢复 / 导入的提示文案。** 恢复与导入存档后的提示引用了 8 个语言文件里根本
  不存在的 key（`archiveRestoreResumeNow` / `archiveRestoreNeedsSettings` /
  `archiveImportResumeNow` / `archiveImportNeedsSettings`，`setup.standalone` 与
  `contentCenter` 两套各 4 条），界面上会显示成 `archive Restore Resume Now` 这种由
  缺 key 兜底逻辑拼出来的鬼东西。中英各补一份，覆盖首页 / 设置页 / 设置面板 / 开局向导 /
  存档管理 5 个调用点。同批清掉两个已无引用的文案 key（`setup.standalone.archiveEmpty`、
  `contentCenter.archive.noMessageIds`）。
- **修掉世界书在提示词里被注入两遍。** 拼「系统协议块」时会把 `route=main` 的本地内容块整批拼进去，
  但排除名单里只有「当前变量快照」一种，**漏了世界书** —— 而世界书本来还有一条独立通道
  （`resolveStandaloneMainWorldbookPrompt` → 主链路里单独成条），于是同一份世界书进了两处。
  实测真实内置预设（卡普阿）：整条提示词 8988 字符，世界书那 3081 字符**出现 2 次**
  （系统块 1 次 + 独立条目 1 次），每次请求白送约 1/3 的提示词。
  修法：把「是不是世界书块」的判据抽成 `isStandaloneMainWorldbookBlock()`，系统协议块拼装与
  独立注入通道共用同一份判据。修后实测：世界书出现 **1 次**，提示词 8988 → **5905 字符**。
  同批删掉测试文件里从未接进跑器的 `testMainPromptInjectsWorldbookBeforeRecentHistory`
  （世界书先后顺序不是要求）。
- **修掉本地存储被调试记录撑爆。** 流式响应的原始抄本（整条 SSE 的逐字节转录）会随调试记录一起写进
  本地存储，一个字要裹上 150-200 字节的 JSON 包装（`id` / `model` / `choices` / `delta` 每个分片都重复），
  **体积可达正文的上百倍**。实测一份只聊了 1 回合（2 层消息）的存档：消息数据 3.91 MB，其中调试记录
  3.86 MB（98.7%），而调试记录里 `raw_response_text` 一项就占 3.17 MB —— 真正的正文只有 19.8 KB。
  本地存储已用配额 61.9%，**再聊一两回合必然触顶**，`setItem` 抛错后部分写入点还会静默吞掉异常
  （表现为存档失败、数据悄悄丢）。修法三处：① 流式响应的原始抄本不再落盘，非流式仍保留（它本就是
  一次完整响应）；② 存档打包与恢复时都剔除调试记录，旧存档恢复后不再把数 MB 调试信息写回本地；
  ③ 清理按会话 id 存的旧预设记忆（换局后旧 key 再没人读，此前只增不减）。同批把两条断言「存档保留
  调试记录」的回归测试反向更新为「存档剔除调试记录」。
  **老数据无需用户做任何操作**：读取消息时会把老数据里流式的原始抄本抹掉，紧接着的写回即完成自愈；
  历史存档在应用启动时清理一次（留标记，之后跳过），导入的老存档也顺手归一化。新增回归测试锁住
  「只清流式、保留非流式」这条边界——非流式的原始响应不大且排查时有用，不能一起清掉。

## [1.0.1] - 2026-07-07

### Added

- `.gitattributes`：统一换行符为 LF，消除 Windows 下的 CRLF 提交噪音。
- `.nvmrc`：固定 Node 版本为 24。
- `package.json`：新增 `typecheck` / `lint` / `lint:fix` / `format` / `format:check` / `test` 脚本，
  以及 `engines` 与 `packageManager` 字段。
- ESLint 9（flat config）+ Prettier 配置。
- 资源导入类型声明 `src/asset-imports.d.ts`（`?raw` / `?url` / webpack `require`）。
- `src/presets/types.ts`：补充 `PresetI18nText`、`PresetI18n` 类型与 `PresetConfig.i18n` 字段。
- GitHub Actions：`ci.yml`（typecheck + lint + build）与 `release.yml`（tag 触发自动发布）。
- Issue / PR 模板与 `CONTRIBUTING.md`。
- 英文版文档 `README.en.md` 及中英双语切换链接。

### Fixed

- 修复完整类型检查下的 90 个 TypeScript 错误（此前构建用 transpileOnly 未做类型检查）。
  类型检查现为 0 错误。
- 移除 `tsconfig.json` 中未安装、未使用的 `yaml` 类型引用。
- 修正 `pnpm-workspace.yaml` 的无效 `allowBuilds` 占位配置，改用
  `ignoredBuiltDependencies` 并关闭隐式的 run 前 install，修复 CI 的 ignored-builds 失败。

## [1.0.0] - 2026-07-07

### Added

- 首个正式发布。发布自包含单文件 `dist/index.html`，浏览器打开即用。
- 约 38 个世界观预设 + 21 个 Workshop 世界包。
- 变量驱动的角色/NPC/商业/阵营模拟、本地世界书注入、骰子小游戏、本地存档与 JSON 导入导出。
- 中英双语界面（zh-CN / en）。

[Unreleased]: https://github.com/0xSynt4x/MyRaidRealmWEB/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/0xSynt4x/MyRaidRealmWEB/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/0xSynt4x/MyRaidRealmWEB/releases/tag/v1.0.0
