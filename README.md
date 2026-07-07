# 1980s-NW Standalone

`1980s-NW` 是独立浏览器页面项目。正式运行不需要安装或打开 SillyTavern，也不需要加载酒馆脚本。

## 正式入口

- 发布入口：`dist/index.html`
- 源码入口：`src/index.ts`
- 构建配置：根目录 `webpack.1980s-nw-standalone.config.ts`
- 构建命令：在仓库根目录运行 `pnpm build:1980s-nw-standalone`
- 本地开发命令：在仓库根目录运行 `pnpm dev:1980s-nw-standalone`

构建后的 `dist/index.html` 是给用户打开的独立网页。用户在页面里配置 API、选择预设、开局、发送消息、自动更新变量、保存和导入存档。

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
- 加载逻辑：`src/utils/preset-loader.ts` 运行时插入 `<script>` 加载预设包。

正式运行的预设包统一走 CDN，独立版和酒馆版共用同一份，只维护一处、同步更新。`preset-loader.ts` 会按顺序尝试候选地址，本地相对路径和本地开发地址只作为可选回退，正式以 CDN 为准。

注意：由于预设完全依赖该 CDN 地址，若 CDN 失效或断网，网页将无法加载开局预设。这是当前有意的取舍。

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
