# 1980s-NW Standalone

[English](./README.en.md) | **简体中文**

`1980s-NW`（MyRaidRealm）是一个**纯浏览器端的 AI 文字角色扮演 / 世界模拟**项目。它把原本运行在 SillyTavern（酒馆）里的玩法完全搬到独立网页中：正式运行**不需要安装或打开 SillyTavern，也不需要加载任何酒馆脚本**。

构建产物是 `dist/index.html`：**JS 与 CSS 全部内联进 HTML**，没有外部脚本或样式请求。图片与音频以同级相对路径放在 `dist/assets/`，所以分发时要把整个 `dist/` 一起带走，只拿 `index.html` 会缺图。用户打开 `index.html` 即可配置 API、选择开局预设、开局、发送消息、自动更新游戏变量、保存与导入存档。

## 功能特性

- **独立运行**：单个 HTML 文件，双击即可打开，无后端、无框架依赖注入。
- **自带 API 配置**：在页面内填写 OpenAI 兼容接口（地址 / Key / 模型），即可驱动正文与变量更新。
- **丰富开局预设**：内置约 38 个世界观预设 + 21 个 Workshop 世界包（末世、修仙、官场、权游、漫威、火影、高考模拟等）。
- **AI 生成开局**：填写世界与角色的关键信息，一键让 AI 生成开局配置并应用。
- **变量驱动模拟**：通过本地 `stat_data` + `<JSONPatch>` 维护角色、NPC、商业、阵营等结构化状态，独立于 MVU。
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

构建完成后，直接用浏览器打开 `dist/index.html` 即可使用。

## 文档导航

| 文档                                   | 内容                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 开发环境、提交前自检、代码风格、发布流程                                                                                  |
| [`AGENTS.md`](./AGENTS.md)             | 给 AI 编码代理的工作准则（怎么干活）                                                                                      |
| [`spec/README.md`](./spec/README.md)   | **项目工程细则索引**：架构、构建与部署、界面与样式体系、提示词链路、世界书、预设、变量与存档、生图节点、CI 与验收、已知坑 |
| [`CHANGELOG.md`](./CHANGELOG.md)       | 版本变更记录                                                                                                              |

## 正式入口

- 发布入口：`dist/index.html`
- HTML 模板：`src/index.html`
- 源码入口：`src/index.ts`
- 构建配置：`webpack.1980s-nw-standalone.config.ts`
- 构建命令：在本目录运行 `pnpm build`
- 本地开发命令：在本目录运行 `pnpm watch`（development 模式监听重建）

构建后的 `dist/index.html` 是给用户打开的独立网页。用户在页面里配置 API、选择预设、开局、发送消息、自动更新变量、保存和导入存档。

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
├─ legacy-reference/        # 旧酒馆脚本参考（不作为入口，仅存档）
├─ docs/                    # 计划、进度、快照、设计稿（本地保留，不进仓库）
├─ spec/                    # 项目工程细则（AGENTS.md 的「宽」的一侧）
├─ scripts/tests/           # 测试脚本
├─ dist/                    # 构建产物（index.html，git 忽略）
└─ webpack.1980s-nw-standalone.config.ts
```

## 发布边界

正式独立版只依赖网页源码、运行时代码和 standalone 资产。

会进入独立网页主流程的内容：

- `src/`
- `runtime/`
- `schema/schema.ts`
- `dist/index.html` 和同目录构建产物
- `src/assets/standalone-local-content/`
- `src/assets/standalone-worldbooks/`
- `src/assets/worldbook-registry/`

不要作为独立版入口加载的内容：

- `legacy-reference/assistant-api/`（原 `脚本/辅助API(Legacy)/`）
- `legacy-reference/variable-schema/`（原 `脚本/变量结构(Legacy)/`）

这些目录是旧酒馆项目参考，能力已由网页内部实现替代，不属于独立 HTML 主流程。独立版的回复生成、辅助变量更新、消息记录、存档和本地内容管理都已经在网页内部完成。

`preset-package/`（原 `脚本/预设包/`）不在上面的「不要加载」名单里：它是预设的运行时来源，见下方「预设投递」一节。

`package.json` 保留在本目录下，是为了给构建工具一个清晰的子项目边界，避免根构建误把旧参考目录当成入口扫描；这不代表独立版仍依赖酒馆。

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

> 原先还有一档 jsdelivr 读 GitHub 发布仓的兜底，已按「项目完全独立」的要求删除。

注意：预设完全依赖自家产物，若预设包未部署或路径不对，网页将无法加载开局预设。
**改完预设必须重新构建并重新部署预设包**，只重新构建主产物不会生效。
完整口径（含候选地址与排查日志）见 [`spec/07-presets.md`](./spec/07-presets.md)。

## 多人联机

多人联机因缺少独立服务器支持，独立版暂不提供。相关旧酒馆联机脚本已从本目录移除。

## 本地内容和世界书策略

独立版接受当前的本地内容模式：显式启用条目，并按发送目标注入。

- `main`：只发送给正文模型
- `variable_update`：只发送给变量更新模型
- `shared`：两边都发送

这里不会完整复刻 SillyTavern 的关键词触发、插入深度、递归触发等世界书机制。旧的“世界书”概念在独立版里对应“本地补充内容”的一种类型。

当前有效资产放在：

- `src/assets/standalone-local-content/`：通用提示词、变量更新规则、抽奖、文生图等规则
- `src/assets/standalone-worldbooks/`：已迁入独立版的预设世界资料
- `src/assets/worldbook-registry/index.ts`：把内置预设和对应世界资料挂接起来

## 旧预设兼容

新建、编辑和导出的预设统一使用 `localContentEntries`。

旧预设里如果仍有 `worldbookEntries` 字段，导入时会自动尝试迁移为 `localContentEntries`。这是读取老文件用的兼容入口，不是新项目的新数据格式。

## 变量更新

独立版不使用 MVU 全局对象。变量更新由本地 `stat_data`、`<JSONPatch>` 和独立运行链路完成。

正式规则在：

- `src/assets/standalone-local-content/variable-update-rules.txt`
- `src/assets/standalone-local-content/variable-update-format.txt`

旧的思维链模板已经折叠进 `<Analysis>` 段，不再作为独立规则条目加载。

## 存档策略

当前短期保留浏览器本地存档和 JSON 导入导出方案。

如果后续需要长期大存档，再考虑 IndexedDB、压缩或减少 debug 信息体积。
