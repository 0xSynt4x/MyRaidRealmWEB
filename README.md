# 1980s-NW Standalone

[English](./README.en.md) | **简体中文**

`1980s-NW`（MyRaidRealm）是一个**纯浏览器端的通用模拟经营 / 叙事模拟平台**，题材不限（现实 / 历史 / 修仙 / 奇幻 / 科幻 / 动漫…）。玩家在页面里配置 API、选开局预设、发消息；回复生成、变量更新、存档与本地内容管理全部在网页内完成，**不需要安装任何外部工具**。

构建产物是 `dist/` **整个目录**：`index.html` 的 JS 与 CSS 全部内联，但图片、音频与预设包以同级相对路径放在 `dist/assets/` 与 `dist/preset-package/`。所以**分发只有「整目录部署到线上」一条路** —— 只拿 `index.html` 会缺图、也加载不到开局预设。项目根的 `functions/` 是唯一的服务端代码（Cloudflare Pages Functions，只做同域跨域中转，让没开 CORS 的第三方接口能用）。

## 功能特性

- **独立运行** —— 纯前端产物，浏览器打开线上网址即玩。
- **自带 API 配置** —— 页面内填写 OpenAI 兼容接口（地址 / Key / 模型），驱动正文与变量更新。
- **丰富开局预设** —— 内置约 38 个世界观预设 + 21 个创意工坊世界包，也可以用 AI 生成开局。
- **变量驱动模拟** —— 本地 `stat_data` + `<JSONPatch>` 维护角色、NPC、商业、阵营等结构化状态，每回合自动存档。
- **正文增强** —— 多候选页并发生成与楼层翻页、独立审稿改稿流水线、输入栏斜杠快捷手势。
- **本地补充内容 / 世界书** —— 按发送目标（正文模型 / 变量模型 / 双向）注入规则与世界资料。
- **网页版地图** —— 地点树由模型生成，布局与路网由前端演算。
- **内置小游戏** —— 骰子（Farkle）玩法面板。
- **存档管理** —— 浏览器本地 IndexedDB 多存档 + JSON 导入导出。
- **国际化** —— 内置 `zh-CN`（默认）与 `en` 两种界面语言。

## 技术栈

Vue 3（`<script setup>` 单文件组件）· Pinia · TypeScript 5 · Tailwind CSS v4 + PostCSS + Sass · Zod · vis-network / vis-data · EJS（浏览器端运行时）· Webpack 5 · pnpm（要求 Node 18+，实测 Node 24 / pnpm 11）

## 快速开始

```bash
pnpm install   # 安装依赖
pnpm build     # 生产构建 → dist/（index.html + assets/ + preset-package/）
pnpm watch     # 开发模式 + 监听重建
```

常用脚本：`pnpm typecheck`（`vue-tsc` 完整类型检查）· `pnpm lint` · `pnpm format` · `pnpm test` · `pnpm check:i18n`（改语言文件后跑）。

构建完要**本地预览，请把 `dist/` 整个目录起一个静态服务器**再访问 —— 只开 `index.html` 会缺图、也加载不到预设。

## 文档导航

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) —— 开发环境、提交前自检、代码风格、部署流程
- [`spec/README.md`](./spec/README.md) —— **项目工程细则索引**：架构、构建与部署、界面与样式体系、提示词链路、世界书、预设、变量与存档、生图节点、CI 与验收、已知坑
- [`AGENTS.md`](./AGENTS.md) —— 给 AI 编码代理的工作准则
- [`CHANGELOG.md`](./CHANGELOG.md) —— 版本变更记录

## 目录结构

```text
src/              网页源码（components / stores / composables / presets / assets / utils / i18n）
runtime/          独立运行时（Provider、回合、状态、提示词）
schema/           变量与数据结构 Schema
preset-package/   预设包入口，挂到 window.__TH1980S_PRESETS__
functions/        Cloudflare Pages Functions（唯一服务端代码：同域跨域中转）
scripts/          测试与语言文件校验脚本
spec/             项目工程细则（随仓库提交）
dist/             构建产物（git 忽略）
```

## 部署

`pnpm build` 之后把 `dist/` 整目录部署到 Cloudflare Pages，就是玩家访问的线上网页；`functions/` 随 Pages 一起生效。**改完预设必须连预设包一起重新部署**，只重建主产物不生效。
