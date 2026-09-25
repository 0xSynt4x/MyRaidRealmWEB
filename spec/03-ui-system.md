# 03 · 界面与样式体系

## 令牌是唯一来源

所有颜色、尺寸、字号、间距都走 **`src/styles/ui-tokens.css`** 里的 `--ui-*` 变量。
🔴 **不许在组件里写死颜色。**

该文件里的变量分两类：

| 类别     | 例子                                                   | 说明                           |
| -------- | ------------------------------------------------------ | ------------------------------ |
| 语义层   | `--ui-panel`、`--ui-text`、`--ui-muted`、`--ui-accent` | 组件只用这一层                 |
| 底层主题 | `--accent-primary`、`--text-primary`、`--glass-bg`     | 由主题切换决定，语义层引用它们 |

🔴 **`rgba(var(--x-rgb), a)` 的坑**：分量变量（`--accent-primary-rgb`、`--ui-scrim-rgb`…）必须真的存在，
否则整条声明会**静默失效**——不报错，只是样式不生效。新增这类写法前先确认分量变量已定义。

压在照片 / 底图上的浮层颜色恒定、**不跟主题走**，单独一套：`--ui-on-scrim`、`--ui-on-scrim-dim`、
`--ui-on-scrim-accent`、`--ui-on-scrim-success`、`--ui-on-scrim-danger`。

## 字号体系

两层机制：

1. **全局缩放系数** `--ui-font-scale`，由根节点的 `[data-size='1'~'5']` 决定：

   | 档                | 1    | 2（默认） | 3    | 4    | 5    |
   | ----------------- | ---- | --------- | ---- | ---- | ---- |
   | `--ui-font-scale` | 0.92 | 1         | 1.17 | 1.25 | 1.33 |

   同一批 `[data-size]` 块还会覆盖 `--text-xs/sm/base/lg/xl`。

2. **语义字号** `--ui-fs-*`：`meta` / `label` / `body` / `opt` / `input` / `reading` / `name` / `scene`。

🔴 **除正文外，一律写成 `calc(Npx * var(--ui-font-scale))`。** 直接写死 px 会破坏全局字号缩放。

🔴 **正文是唯一例外。** 正文有**独立的档位设置** `contentFontSize`，
作用在 `MessageCard.vue` 的 `.message-content[data-size='N']` 上，取值固定
**15 / 17 / 19 / 21 / 23 px**，**不乘** `--ui-font-scale`。这是有意设计，不要"顺手统一"。

## 行距

5 档，由 `.app-container` 的 `[data-line='1'~'5']` 决定 `--line-height-base`：

| 档  | 1   | 2   | 3（默认） | 4   | 5   |
| --- | --- | --- | --------- | --- | --- |
| 值  | 1.4 | 1.6 | 1.8       | 2   | 2.2 |

正文行距读 `var(--line-height-base)`；界面元件的行距另有一套 `--ui-leading-reading` / `--ui-leading-ui`。

## 列宽：一处改、三处变

`--ui-reading-w`（当前 1024px）被**三个地方共用**：

- 正文列 —— `src/components/common/ContentText.vue`
- 场景横幅 —— `src/components/layout/SceneBanner.vue`
- 底部输入栏 —— `src/components/common/ActionBar.vue`

🔴 改这一个值，三处会同时变化，**这是预期行为**，不是 bug。
另外 `.banner` 的 `width: 100%` 不能省，否则横幅会跟着列宽缩。

## 布局尺寸

`--ui-rail-w`（左侧竖栏）、`--ui-panel-w`（右栏）、`--ui-edge-gutter`（竖标签离边距离）、
`--ui-topbar-h`（顶栏高，顶栏当前隐藏）。
间距走 `--ui-space-1..6`；消息区走 `--ui-msg-gap` / `--ui-msg-pad-x` / `--ui-msg-pad-y`。
圆角：`--ui-radius`（全局，当前 0 = 硬边）+ `--ui-radius-sm/md/lg`。

## 设置项与开关

右侧面板里的设置项一律用**现成范式**，别自造：

| 用途 | 用什么 |
| --- | --- |
| 一行「标签 + 控件」 | `.setting-row`（相邻行自动带上分隔线） |
| 开关 | `.setting-row` + `.toggle-switch` |
| 多选一（分段） | `.seg-control` |
| 多选一（药丸） | `.chip-group` + `.chip` |

- 标签写 `.row-label`，卡片说明写 `.card-hint`。
- 需要「标签靠左、控件靠右」整行铺满时，用 `display: flex` + `justify-content: space-between`，
  **别把控件直接跟在文字后面** —— 标签长短不一会让同一张卡里的控件参差不齐。
- 一组开关要分组时用带组标题的分组块，**别用网格平铺** —— 平铺看不出层次，也看不出哪些是子项。
- 禁用态加 `is-disabled` 类（降透明度），别只靠 `:disabled` 属性。
- 子项缩进用专门的修饰类加 `padding-left`，不要靠空格。

🔴 **新增设置项时字号必须 `calc(Npx * var(--ui-font-scale))`。** 写死 px 会让这一项在用户调字号档位时纹丝不动，
跟整个界面脱节。

## 图标

🔴 **全项目统一 Tabler Icons 3.47.0**，内联子集在 `src/assets/tabler/tabler-inline.css`。

- 该文件是**自动生成的，请勿手改**；生成脚本是 `Temp/iconlab/build-tabler.py`（本地工具，不进仓库）。
- 字体以 base64 data URI 内联，**产物不依赖外网**。当前保留项目实际用到的 188 个图标。
- 使用图标时**基类 `.ti` 不能省**（它负责 `font-family: 'tabler-icons'` 与对齐）。
- 新增图标要重跑生成脚本，不要手写 `@font-face`。

## 提示（toast）

🔴 **唯一入口是 `src/utils/notify.ts`。** 不要在组件里直接写 `toastr.xxx()`。

它做一件事：能拿到宿主提供的提示库就用（保持观感一致），拿不到就回落到项目自己的通知系统
（`stores/notification.ts`）。全项目只此一处做这个判断。

🔴 通知容器必须挂在 `App.vue` 的根节点上，否则开局向导阶段弹不出来。

## 浮层

插图点击走**内联查看器** `src/components/common/ImageLightbox.vue`。
不要改回 `window.open`——独立产物里新开窗口会脱离应用上下文。

## 背景音乐

- 开关与音量存在 localStorage 的 `th1980s:bgm-preference`，**默认关闭 + 音量 50%**。
- 🔴「用户开关」与「此刻是否在响」必须是**两个状态**：开关是用户的意愿，
  是否在响还取决于浏览器自动播放策略与当前页面。不要用一个布尔量表示两件事。

## 装饰与背景

`--ui-orn-*`（纹样）、`--ui-noise-opacity` / `--ui-noise-blend`（噪点）、`--ui-vignette-strength`（暗角）。
浅色主题下这几项会被覆盖为 0 或调低，避免发脏。
`--ui-banner-*` 控制场景横幅的宽高比、最大高度、圆角、聚焦点与换天气时的淡入淡出时长。
