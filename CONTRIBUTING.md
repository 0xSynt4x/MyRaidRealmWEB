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

在提交 PR 前，请确保以下命令通过（CI 会按这个顺序执行这四项）：

```bash
pnpm typecheck      # 类型检查，应为 0 错误
pnpm lint           # ESLint，应为 0 error（warning 为已知技术债）
pnpm test           # 测试脚本
pnpm build          # 构建应成功
```

改动语言文件时还要跑：

```bash
pnpm check:i18n     # 词条体检：中英 key 对应、英文残留中文、占位符一致
```

可选：

```bash
pnpm format         # 用 Prettier 格式化（注意：存量代码尚未整体格式化，
                    # 请只对你改动的文件运行，避免产生巨大 diff）
pnpm lint:fix       # 自动修复可修复的 lint 问题
```

> ⚠️ **CI 不跑 Prettier**，所以「CI 绿」不代表格式没问题。
> ⚠️ **「CI 绿」也不等于「测试全过」**：测试跑器出现过假绿（无看门狗时 node 静默退出 0），
> 判据要看日志里的通过条数与结束汇总行，不要只看退出码。

## 代码风格

- 语言：TypeScript + Vue 3 `<script setup>` SFC。
- 缩进 2 空格，单引号，行尾 LF（由 `.gitattributes` 与 Prettier 保证）。
- 目录约定见 `README.md` 的「目录结构」一节。
- 各子系统的工程细则见 [`spec/README.md`](./spec/README.md)（索引 → `spec/NN-*.md`），
  改对应模块前先扫一眼那篇，能省掉不少试错。
- AI 编码代理的工作准则见 [`AGENTS.md`](./AGENTS.md)。
- 独立版边界：所有能力都在本仓的网页源码、运行时与 standalone 资产里实现，
  不引入任何外部运行时或脚本依赖。

## 提交信息

建议采用 [Conventional Commits](https://www.conventionalcommits.org/) 风格，例如：

- `feat: 新增 XXX 预设`
- `fix: 修复变量更新在 XXX 情况下丢失`
- `docs: 更新 README`
- `chore: 升级依赖`

## 部署流程

分发只有「整目录部署到线上」一条路，**没有** tag / GitHub Release 通道
（历史上的 `.github/workflows/release.yml` 已删除）。

1. 更新 `CHANGELOG.md`。
2. 本地跑 `pnpm build`，确认 `dist/` 里同时有 `index.html`、`assets/`、`preset-package/`。
3. 把 `dist/` **整个目录**部署到 Cloudflare Pages（自定义域名 `myraidrealms.cc.cd`）。

> ⚠️ 只拿 `dist/index.html` 分发会缺图、也加载不到开局预设——它引用了同级
> `assets/`（30 个文件）与 `preset-package/`。玩家一律通过线上网址访问，
> **不支持**下载 HTML 到本地玩。

## 已知技术债

完整清单见 [`spec/11-known-issues.md`](./spec/11-known-issues.md)，这里只列最常撞到的三条：

- `src/App.vue` 的向导显示判断在 `computed` 内写入状态（`vue/no-side-effects-in-computed-properties`
  已降级为 warning），后续应重构为 `watch` / 显式方法。属真实反模式，但重构涉及核心开局逻辑，
  请单独跟进，不要顺手改。
- 测试脚本 `scripts/tests/` 历史上依赖 monorepo 根环境（需要 `lodash`、`yaml` 等运行时依赖）。
  当前 CI 已在执行 `pnpm test`，改测试相关代码前先本地实跑一遍确认，别按这条旧记录下判断。
- 仓库存量代码**未整体跑过 Prettier**，全仓库范围跑 `format:check` 会大量失败。
  判断风格以 `.prettierrc.json` 为准，**只对改动的文件**跑 `format`。
