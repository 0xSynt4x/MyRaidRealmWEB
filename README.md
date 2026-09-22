# 1980s-NW Standalone

[English](./README.en.md) | **简体中文**

`1980s-NW`（MyRaidRealm）是一个**纯浏览器端的 AI 文字角色扮演 / 世界模拟**项目：一个自包含的独立网页，在页面内完成回复生成、变量更新、消息记录、存档与本地内容管理。正式运行**不需要安装任何外部工具，也不依赖任何外部运行时脚本**。

构建产物是 `dist/` 整个目录。其中 `index.html` 的 **JS 与 CSS 全部内联进 HTML**，没有外部脚本或样式请求；但图片、音频与预设包**不是内联的**——它们以同级相对路径放在 `dist/assets/` 与 `dist/preset-package/`。所以**分发只有「整目录部署到线上」一条路**，只拿 `index.html` 会缺图、也加载不到开局预设。玩家通过线上网址访问，在页面里配置 API、选择开局预设、开局、发送消息、自动更新游戏变量、保存与导入存档。

## 功能特性

- **独立运行**：纯前端产物，无后端、无框架依赖注入，浏览器打开线上网址即玩。
- **自带 API 配置**：在页面内填写 OpenAI 兼容接口（地址 / Key / 模型），即可驱动正文与变量更新。
- **丰富开局预设**：内置约 38 个世界观预设 + 21 个 Workshop 世界包（末世、修仙、官场、权游、漫威、火影、高考模拟等）。
- **AI 生成开局**：填写世界与角色的关键信息，一键让 AI 生成开局配置并应用。
- **变量驱动模拟**：通过本地 `stat_data` + `<JSONPatch>` 维护角色、NPC、商业、阵营等结构化状态。
- **本地补充内容 / 世界书**：按发送目标（正文模型 / 变量模型 / 双向）注入规则与世界资料。
- **内置小游戏**：骰子（Farkle）玩法面板。
- **存档管理**：浏览器本地存档 + JSON 导入导出。
- **国际化**：内置 `zh-CN`（默认）与 `en` 两种界面语言。

## 技术栈

- **UI 框架**：Vue 3（`<script setup>` 单文件组件）
- **状态管理**：Pinia
- **语言**：TypeScript 5
- **样式**：Tailwind CSS v4 + PostCSS + Sass
- **校验**：Zod
- **图谱/可视化**：vis-network / vis-data
- **模板**：EJS（浏览器端运行时）
- **构建**：Webpack 5，输出 `dist/index.html`（JS / CSS 内联）
- **包管理**：pnpm（要求 Node 18+，开发环境 Node 24 / pnpm 11 已验证）

## 快速开始

```bash
# 1. 安装依赖（本目录即子项目根）
pnpm install

# 2. 生产构建 -> 生成 dist/index.html
pnpm build

# 3. 本地开发（development 模式 + watch 监听重建）
pnpm watch
```

可用脚本（见 `package.json`）：

| 命令             | 说明                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm build`     | 生产模式构建 → `dist/index.html`，并串行构建预设包               |
| `pnpm build:dev` | development 模式单次构建（便于调试）                             |
| `pnpm watch`     | development 模式 + `--watch`，改动即重建                         |
| `pnpm typecheck` | 用 `vue-tsc` 做完整类型检查（0 错误）                            |
| `pnpm lint`      | 运行 ESLint（0 error；warning 为已知技术债）                     |
| `pnpm format`    | 用 Prettier 格式化（存量代码未整体格式化，建议只对改动文件运行） |

构建完成后可**本地预览**：把 `dist/` 整个目录起一个静态服务器再访问（只开 `index.html` 会缺图、也加载不到预设）。

## 文档导航

| 文档                                   | 内容                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 开发环境、提交前自检、代码风格、部署流程                                                                                  |
| [`AGENTS.md`](./AGENTS.md)             | 给 AI 编码代理的工作准则（怎么干活）                                                                                      |
| [`spec/README.md`](./spec/README.md)   | **项目工程细则索引**：架构、构建与部署、界面与样式体系、提示词链路、世界书、预设、变量与存档、生图节点、CI 与验收、已知坑 |
| [`CHANGELOG.md`](./CHANGELOG.md)       | 版本变更记录                                                                                                              |

## 正式入口

- 部署入口：`dist/`（整目录）
- HTML 模板：`src/index.html`
- 源码入口：`src/index.ts`
- 构建配置：`webpack.1980s-nw-standalone.config.ts`
- 构建命令：在本目录运行 `pnpm build`
- 本地开发命令：在本目录运行 `pnpm watch`（development 模式监听重建）

构建后的 `dist/` 整目录部署到 Cloudflare Pages，即为玩家访问的线上网页。玩家在页面里配置 API、选择预设、开局、发送消息、自动更新变量、保存和导入存档。

## 目录结构

```
1980s-NW/
├─ src/                     # 网页源码（独立版主流程）
│  ├─ index.ts / index.html # 应用入口与 HTML 模板
│  ├─ App.vue               # 根组件
│  ├─ components/           # UI 组件
│  │  ├─ layout/            # 布局（Header、侧栏、主区、面板）
│  │  ├─ panels/            # 功能面板（角色、商业、阵营、抽奖、设置…）
│  │  ├─ setup/             # 开局向导（预设选择、创意工坊、AI 生成）
│  │  ├─ config/            # 世界/玩家/商业/阵营配置
│  │  ├─ game/              # 骰子小游戏组件
│  │  └─ common/            # 通用组件
│  ├─ stores/               # Pinia 状态（消息、设置、statData…）
│  ├─ composables/          # 组合式函数
│  ├─ presets/              # 开局预设定义（含 ws/ 世界包 JSON）
│  ├─ assets/               # standalone 本地内容、世界书、注册表
│  ├─ utils/                # 运行时/独立版工具函数
│  ├─ game/                 # Farkle 骰子游戏引擎
│  └─ i18n/                 # 国际化（zh-CN / en）
├─ runtime/                 # 独立运行时（Provider、回合、状态、提示词）
├─ schema/                  # 变量/数据结构 Schema（schema.ts / schema.json）
├─ preset-package/          # 预设包入口（挂到全局供网页运行时加载）
├─ assets-design/           # 设计稿与原始预设 JSON（不参与构建）
├─ docs/                    # 计划、进度、快照、设计稿（本地保留，不进仓库）
├─ spec/                    # 项目工程细则（AGENTS.md 的「宽」的一侧）
├─ scripts/tests/           # 测试脚本
├─ dist/                    # 构建产物（index.html，git 忽略）
└─ webpack.1980s-nw-standalone.config.ts
```

## 预设投递

开局预设不打包进 `dist/index.html`，而是在网页运行时从外部预设包脚本动态加载。

- 预设源码定义：`src/presets/`，汇总为 `presets/index.ts` 的 `PRESETS`。
- 预设包入口：`preset-package/index.ts`，把 `PRESETS` 挂到全局 `window.__TH1980S_PRESETS__`。
- 构建产物：`dist/preset-package/index.js`。**必须在主构建之后构建**——主构建会清空整个 `dist/`，
  `pnpm build` 已用 `&&` 串好这个顺序。
- 加载逻辑：`src/utils/preset-loader.ts` 运行时插入 `<script>` 加载预设包。

预设包**随 `dist/` 一起部署**，只从自家产物取，**不依赖任何外部 CDN**。加载时按顺序尝试三档候选：

1. 同级相对路径 `../preset-package/index.js`（页面部署在根路径时命中）
2. 本地开发服务器 `http://127.0.0.1:5500/dist/1980s/preset-package/index.js`
3. 自家 Cloudflare Pages 绝对地址（页面挪到子路径时的兜底）

注意：预设完全依赖自家产物，若预设包未部署或路径不对，网页将无法加载开局预设。
**改完预设必须重新构建并重新部署预设包**，只重新构建主产物不会生效。
完整口径（含候选地址与排查日志）见 [`spec/07-presets.md`](./spec/07-presets.md)。

## 多人联机

多人联机需要独立服务器支持，当前版本暂不提供。

## 本地内容和世界书策略

独立版接受当前的本地内容模式：显式启用条目，并按发送目标注入。

- `main`：只发送给正文模型
- `variable_update`：只发送给变量更新模型
- `shared`：两边都发送

这里采用「显式启用 + 按发送目标注入」的本地内容模式：条目整块注入，不做关键词筛选。「世界书」即「本地补充内容」的一种类型。

当前有效资产放在：

- `src/assets/standalone-local-content/`：通用提示词、变量更新规则、抽奖、文生图等规则
- `src/assets/standalone-worldbooks/`：内置的预设世界资料
- `src/assets/worldbook-registry/index.ts`：把内置预设和对应世界资料挂接起来

## 旧预设兼容

新建、编辑和导出的预设统一使用 `localContentEntries`。

旧预设里如果仍有 `worldbookEntries` 字段，导入时会自动尝试迁移为 `localContentEntries`。这是读取老文件用的兼容入口，不是新项目的新数据格式。

## 变量更新

变量更新由本地 `stat_data`、`<JSONPatch>` 和运行时链路完成，不依赖任何全局对象。

正式规则在：

- `src/assets/standalone-local-content/variable-update-rules.txt`
- `src/assets/standalone-local-content/variable-update-format.txt`

思维链模板已折叠进 `<Analysis>` 段，不作为独立规则条目加载。

## 存档策略

当前短期保留浏览器本地存档和 JSON 导入导出方案。

如果后续需要长期大存档，再考虑 IndexedDB、压缩或减少 debug 信息体积。
