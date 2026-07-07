# 贡献指南 / Contributing

感谢你对 **1980s-NW (MyRaidRealm)** 的关注。本文件说明本地开发与提交约定。

## 环境要求

- Node.js（见 `.nvmrc`，当前为 24；最低 18）
- pnpm 9+（推荐使用 `packageManager` 字段固定的版本）

## 本地开发

```bash
pnpm install        # 安装依赖
pnpm build          # 生产构建 -> dist/index.html
pnpm watch          # 开发模式，监听重建
```

## 提交前自检

在提交 PR 前，请确保以下命令通过（CI 也会执行前三项）：

```bash
pnpm typecheck      # 类型检查，应为 0 错误
pnpm lint           # ESLint，应为 0 error（warning 为已知技术债）
pnpm build          # 构建应成功
```

可选：

```bash
pnpm format         # 用 Prettier 格式化（注意：存量代码尚未整体格式化，
                    # 请只对你改动的文件运行，避免产生巨大 diff）
pnpm lint:fix       # 自动修复可修复的 lint 问题
```

## 代码风格

- 语言：TypeScript + Vue 3 `<script setup>` SFC。
- 缩进 2 空格，单引号，行尾 LF（由 `.gitattributes` 与 Prettier 保证）。
- 目录约定见 `README.md` 的「目录结构」一节。
- 独立版边界：不要引入 SillyTavern / MVU / 酒馆脚本依赖，
  也不要把 `legacy-reference/` 当作入口，详见 README「发布边界」。

## 提交信息

建议采用 [Conventional Commits](https://www.conventionalcommits.org/) 风格，例如：

- `feat: 新增 XXX 预设`
- `fix: 修复变量更新在 XXX 情况下丢失`
- `docs: 更新 README`
- `chore: 升级依赖`

## 发布流程

发布由 tag 触发（见 `.github/workflows/release.yml`）：

```bash
# 确保 CHANGELOG.md 已更新
git tag v1.2.3
git push origin v1.2.3
```

推送 tag 后，CI 会自动类型检查、构建并把 `dist/index.html` 发布到对应 Release。

## 已知技术债

- `src/App.vue` 的向导显示判断在 `computed` 内写入状态（`vue/no-side-effects-in-computed-properties`
  已降级为 warning），后续应重构为 `watch` / 显式方法。
- 测试脚本 `scripts/tests/` 依赖根 monorepo 环境（需要 `lodash`、`yaml` 等运行时依赖），
  在本独立仓库中暂无法直接运行，`pnpm test` 仅作占位。
