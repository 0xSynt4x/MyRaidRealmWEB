# 项目细则索引

> 本目录是 `AGENTS.md` 的「宽」的一侧：`AGENTS.md` 只讲**怎么干活**，这里放**项目本身的知识**。
> 实际代码是最终依据；本目录与代码不一致时以代码为准，并顺手把文档改回来。

## 0. 使用原则

1. 先用本文件定位到子系统，再打开对应的 `spec/NN-*.md`，最后以实际代码确认。
2. **按需读，不要通读。** 只打开与当前任务直接相关的章节。
3. 文档只描述**当前基线**，不写历史沿革。历史过程在 `docs/plan/`、`docs/progress/`（本地保留，不进仓库）。
4. 改动落地后，同步更新受影响的本目录文档；涉及路径或边界变化时，同时更新本文件的索引表。

## 1. 项目定位

`1980s-NW`（对外名 `MyRaidRealm`）是一个**纯浏览器端的 AI 文字角色扮演 / 世界模拟**项目。
构建产物是 `dist/` **整个目录**：`index.html` 里 JS / CSS 全部内联，但图片、音频与预设包是同级的 `dist/assets/` 与 `dist/preset-package/`。**分发只有整目录部署到线上一条路**，不存在「下载单个 HTML 到本地玩」的通道。无后端、无框架依赖注入。

**本项目是自包含的独立网页应用。** 全部能力都在本仓的网页源码、运行时与 standalone 资产里实现，不依赖任何外部工具或外部运行时。

## 2. 总体数据流

```text
src/index.html（纯外壳：#app + 图标声明）
  ↓
src/index.ts —— 第 1 行装全局垫片（standalone-globals）→ 挂 Pinia → 挂 App
  ↓
App.vue —— 开局向导 / 主界面二选一
  ↓
stores/ —— settings / messages / statData / setup / layout / diceGame / ...
  ↓
runtime/ —— 组装提示词 → 调模型 → 流式接收 → 解析回复与变量补丁
  ↓
utils/ —— 本地内容注入、世界书、存档、格式化、生图、提示
  ↓
localStorage（存档）+ dist/index.html 单文件产物
```

## 3. 细则索引

| #   | 主题                                           | 细则文档                                                               | 主要代码位置                                                    |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | 架构、模块边界、目录职责                       | [`01-architecture.md`](./01-architecture.md)                           | `src/`、`runtime/`、`schema/`                                   |
| 2   | 构建、单文件产物、静态资源、部署               | [`02-build-and-deploy.md`](./02-build-and-deploy.md)                   | `webpack.*.config.ts`、`src/static/`                            |
| 3   | 界面与样式体系（令牌、字号、列宽、图标、提示） | [`03-ui-system.md`](./03-ui-system.md)                                 | `src/styles/`、`src/components/`                                |
| 4   | 国际化                                         | [`04-i18n.md`](./04-i18n.md)                                           | `src/i18n/index.ts`、`scripts/i18n/`                            |
| 5   | 提示词链路（组装顺序、宏、前情提要、阶段总结） | [`05-prompt-pipeline.md`](./05-prompt-pipeline.md)                     | `runtime/standalonePromptUtils.ts`                              |
| 6   | 世界书与本地补充内容                           | [`06-content-assets.md`](./06-content-assets.md)                       | `src/assets/standalone-*/`                                      |
| 7   | 预设体系与预设包投递                           | [`07-presets.md`](./07-presets.md)                                     | `src/presets/`、`preset-package/`、`src/utils/preset-loader.ts` |
| 8   | 变量、状态与存档                               | [`08-state-and-save.md`](./08-state-and-save.md)                       | `schema/`、`src/stores/statData.ts`、`src/utils/archive.ts`     |
| 9   | 生图提示词节点                                 | [`09-image-gen.md`](./09-image-gen.md)                                 | `src/utils/comfyuiClient.ts`                                    |
| 10  | CI、验收与发布流程                             | [`10-workflow-and-verification.md`](./10-workflow-and-verification.md) | `.github/workflows/`、`scripts/`                                |
| 11  | 已知坑与待修                                   | [`11-known-issues.md`](./11-known-issues.md)                           | 全局                                                            |

## 4. 仓库结构

```text
src/
├─ index.ts / index.html  应用入口与 HTML 模板（模板是纯外壳）
├─ standalone-globals.ts  全局垫片，必须是 index.ts 的第一个 import
├─ App.vue                根组件：开局向导 / 主界面
├─ components/            layout(8) panels(18) common(12) game(5) config(4) setup(3)
├─ stores/                Pinia：settings / messages / statData / setup / layout / …
├─ composables/           useComfyUiImageGeneration / useStandaloneArchiveManager / …
├─ presets/               开局预设定义（含 ws/ 世界包 JSON）
├─ assets/
│  ├─ standalone-local-content/  通用提示词、变量更新规则、抽奖、文生图
│  ├─ standalone-worldbooks/     内置世界资料（11 篇）
│  ├─ worldbook-registry/        预设 ↔ 世界资料的挂接表
│  └─ tabler/                    自动生成的图标样式表
├─ styles/                ui-tokens.css / ornaments.css / delete-button.css
├─ utils/                 运行时与独立版工具（41 个模块）
├─ game/                  Farkle 骰子游戏引擎
├─ i18n/index.ts          国际化（zh-CN 默认 / en）
└─ static/                原样拷到产物根的静态文件（404.html / favicon.ico / apple-touch-icon.png）

runtime/          独立运行时：Provider、回合、状态、提示词宏
schema/           变量与数据结构 Schema（schema.ts / schema.json）
preset-package/   预设包入口，挂到 window.__TH1980S_PRESETS__
scripts/tests/    测试脚本
scripts/i18n/     语言文件校验与补丁工具
spec/             本目录：项目细则（随仓库走）
docs/             计划、进度、快照、设计稿（本地保留，不进仓库）
assets-design/    设计稿与原始预设 JSON（本地保留，不进仓库）
Temp/             本机临时排查脚本与截图（不进仓库，ESLint 已显式忽略）
```

## 5. 文档维护规则

- 代码清理、文件删除、目录调整完成后，至少同步：本文件的索引表与仓库结构、受影响的 `spec/NN-*.md`。
- `CHANGELOG.md` 是历史记录，**不因现状清理而改写历史条目**。
- 本目录文档随仓库提交；`docs/` 下的过程文档不随仓库公开，两者不要混放。
