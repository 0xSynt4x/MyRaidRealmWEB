# Changelog

本项目所有值得注意的变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
