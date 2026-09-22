# 01 · 架构与模块边界

## 技术栈

| 层         | 选型                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| UI         | Vue 3 `<script setup>` 单文件组件                                               |
| 状态       | Pinia                                                                           |
| 语言       | TypeScript 5（`strict: true`，但 `noUnusedLocals` / `noUnusedParameters` 关闭） |
| 样式       | Tailwind CSS v4 + PostCSS + Sass                                                |
| 校验       | Zod                                                                             |
| 图谱可视化 | vis-network / vis-data                                                          |
| 模板       | EJS（浏览器端运行时）                                                           |
| 构建       | Webpack 5 → 内联单文件 `dist/index.html`                                        |
| 包管理     | pnpm（见 `package.json` 的 `packageManager`，Node 见 `.nvmrc`）                 |

## 启动链路

```text
src/index.html        纯外壳：meta / title / 图标声明 / 空的 #app，不含任何素材
  ↓
src/index.ts          第 1 行 import './standalone-globals'（全局垫片，必须最先）
  ↓                   loadInitialLocale()：从 localStorage 读 locale 并同步到 <html>
  ↓                   readyState === 'loading' ? DOMContentLoaded : 立即执行
  ↓
createApp(App) → createPinia() → messagesStore.setupEventListeners() → mount('#app')
```

- 设置持久化的 localStorage key 是 `tavern_helper_settings_诸界穿越模拟器_NW`（历史名，**不要改**，改了会丢老用户的设置）。
- `getHostModeLabel()` / `getSafeCurrentMessageId()` 在 `src/utils/hostEnvironment.ts`，
  用来在日志里区分「独立页 / 被 iframe 嵌」两种宿主形态。

## 分层与边界

| 层       | 位置                          | 职责                                          | 边界                                  |
| -------- | ----------------------------- | --------------------------------------------- | ------------------------------------- |
| 入口层   | `src/index.ts`、`src/App.vue` | 挂载、开局向导 / 主界面分流                   | 不写业务逻辑                          |
| 状态层   | `src/stores/`                 | Pinia store：设置、消息、变量、开局、布局…    | 不直接调模型；持久化只碰 localStorage |
| 运行时层 | `runtime/`                    | 组装提示词、调 Provider、跑回合、解析变量补丁 | **不依赖任何 Vue 组件**，可独立测试   |
| 资产层   | `src/assets/`、`src/presets/` | 世界书、本地内容、预设、图标                  | 纯数据，不含逻辑                      |
| 工具层   | `src/utils/`                  | 格式化、存档、生图、提示、世界书桥接…         | 无状态优先                            |
| 视图层   | `src/components/`             | 组件树                                        | 只读 store，不直接读写 localStorage   |
| 契约层   | `schema/`                     | Zod Schema：变量结构定义                      | 单一真源，改这里要同步 `schema.json`  |

**`runtime/` 与 `src/` 的分界是刻意的**：`runtime/` 是「不依赖 UI 的引擎」，
`tsconfig.json` 的 `include` 同时包含两者。改运行时逻辑时不要往里 import Vue 组件。

## runtime/ 模块职责

| 文件                                | 职责                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `runtime/index.ts`                  | 统一出口，re-export 其余模块                                                                |
| `runtime/openAiCompatibleApiUrl.ts` | API 地址规范化：补 `/chat/completions`、`/models` 后缀，识别 Google Gemini 端点             |
| `runtime/standalonePromptUtils.ts`  | **提示词宏替换**（唯一实现，见 `05-prompt-pipeline.md`）                                    |
| `runtime/standaloneProviderCore.ts` | Provider 请求核心：API 配置校验、消息组装、流式接收、调试追踪                               |
| `runtime/standaloneState.ts`        | 当前 `stat_data` 的读写与 seed（基于 localStorage）                                         |
| `runtime/standaloneTurn.ts`         | **回合执行**：主链生成、变量更新 pass、前情提要收集（`collectStandalonePriorSummaryItems`） |

## 状态所有权

- **设置**：`stores/settings.ts`，唯一持久化点。字号、行距、主题、语言、API 配置、本地内容开关都在这里。
- **消息**：`stores/messages.ts`，含事件监听装配（`setupEventListeners`）。
- **变量**：`stores/statData.ts` + `stores/statDataActions.ts`；运行时读写走 `runtime/standaloneState.ts`。
- **存档**：`src/utils/archive.ts` + `composables/useStandaloneArchiveManager.ts`。

改动状态时保持「谁写谁负责」：不要从组件里绕过 store 直接改 `stat_data` 或 localStorage。

## 硬边界

1. **不引入 SillyTavern / MVU / 酒馆脚本依赖。** 相关旧实现只在 `legacy-reference/` 存档。
2. **不引入运行时外部依赖。** 所有依赖一律打进产物，构建配置里**没有 `externals`**（见 `02-build-and-deploy.md`）。
3. **不使用 IndexedDB。** 存档走 localStorage + JSON 导入导出。
4. **保持单文件产物。** 任何新增依赖都要先确认它能被内联。
