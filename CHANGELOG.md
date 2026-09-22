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
  - 「发布流程」注明 GitHub Release 只附 `dist/index.html`，不含 `dist/assets/` 与
    `dist/preset-package/`，正式分发走 Cloudflare Pages 整目录部署。
  - 「已知技术债」修正测试脚本那条过时描述（原称 `pnpm test` 仅作占位，实际 CI 已在执行），
    并改为指向 `spec/11-known-issues.md`；补上「存量代码未整体格式化」一条。
  - 「代码风格」补上 `spec/` 与 `AGENTS.md` 的指引。
- **代码格式统一。** `runtime/standaloneProviderCore.ts`、`runtime/standaloneState.ts`、`schema/schema.json`
  与 `scripts/i18n/` 下三个脚本跑过 Prettier（纯排版，`schema.json` 语义逐字未变）；同时新增 `.prettierignore`
  条目，把世界书 EJS 模板、玩家预设数据、GitHub issue 模板与旧实现存档排除在格式化之外。
  仓库现在 `pnpm format:check` **全绿**。

### Removed

- `runtime/standaloneTurn.ts`：清掉两处死代码——无人调用的预设分块函数 `resolveStandalonePresetSections()`，
  以及签名带标题、实现却完全忽略标题的 `formatNamedPromptBlock()`。两处调用点改为直接对内容去首尾空白，
  送给模型的提示词内容不变。

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
