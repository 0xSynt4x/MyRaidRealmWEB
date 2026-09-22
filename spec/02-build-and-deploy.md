# 02 · 构建、产物与部署

## 命令与顺序

| 命令                | 行为                                             |
| ------------------- | ------------------------------------------------ |
| `pnpm build`        | 主构建（production）→ **然后**构建预设包         |
| `pnpm build:dev`    | development 模式主构建 → 然后 development 预设包 |
| `pnpm watch`        | development + `--watch`，只监听主构建            |
| `pnpm build:preset` | 只构建预设包                                     |

**顺序不能反。** 主构建的 `output.clean: true` 会把整个 `dist/` 清空，
所以预设包构建必须排在主构建**之后**——`package.json` 的 `build` 脚本用 `&&` 串起来正是为此。
单独跑 `pnpm build:preset` 而不重新跑主构建是可以的（它不动主产物）。

## 产物结构

```text
dist/
├─ index.html              主产物：JS / CSS 已内联
├─ index.js.map            source map（production 也生成）
├─ index.css.map
├─ index.js.LICENSE.txt
├─ 404.html                ┐
├─ favicon.ico             ├ 来自 src/static/，原样拷到根
├─ apple-touch-icon.png    ┘
├─ assets/                 图片 / 音频（同级相对资源）
│  ├─ audio/  banner/  home/  ornaments/ …
└─ preset-package/
   └─ index.js             预设包（见 07-presets.md）
```

**「单文件」的准确含义**：`index.html` 里 JS 与 CSS 全部内联，没有外部脚本 / 样式请求。
但**图片与音频不是内联的**——它们以同级相对路径放在 `dist/assets/`。
所以分发时要把整个 `dist/` 一起带走，只拿 `index.html` 会缺图。
（`release.yml` 目前只把 `dist/index.html` 发到 GitHub Release，这一点与「整目录分发」不一致，见 `11-known-issues.md`。）

## 内联是怎么做到的

| 目标         | 机制                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| JS 内联      | `HtmlInlineScriptWebpackPlugin`                                                    |
| CSS 内联     | `MiniCssExtractPlugin` 抽取 → `HTMLInlineCSSWebpackPlugin` 注入 `<style>`          |
| 强制单 chunk | `LimitChunkCountPlugin({ maxChunks: 1 })`                                          |
| 零外部依赖   | 构建配置**不设 `externals`**，所有依赖一律打包进产物                               |
| 压缩         | production 用 `TerserPlugin`，`mangle.reserved: ['_', 'toastr', 'YAML', '$', 'z']` |

🔴 **`mangle.reserved` 里的名字不能删。** 这些是挂在 `globalThis` 上被裸调用的全局
（如 `_`、`toastr`），压缩器改了名就会在运行时找不到。

🔴 **不要为了省体积重新引入 `externals` 或 CDN 依赖。** 历史上 vue / pinia / klona / lodash
都走过 CDN，结果 CDN 一断就白屏且没有任何提示。现在的取舍是：产物必须能断网启动。

## 静态资源

### `src/static/` —— 原样拷到产物根

`CopyStaticToRootPlugin` 把该目录下的**文件**直接 emit 到产物根目录，不参与打包、不加内容哈希。
目前三个文件：`favicon.ico`、`apple-touch-icon.png`、`404.html`。

🔴 **`404.html` 必须保留在站点根目录。** Cloudflare Pages 只在站点根找 404 页，
而且「根目录存在 404 页」这件事本身就是关掉它「任何找不到的网址都回首页」这个默认行为的开关。
一旦丢失，任何不存在的 URL 都会返回整份首页（约 2.9 MB）。

🔴 这些文件**不能走 webpack 资源处理**：那会被带上内容哈希塞进 `assets/`，路径就全错了
（浏览器找的是写死的 `/favicon.ico`）。

### `src/assets/` —— 走打包，落到 `dist/assets/`

| 导入写法                       | 结果                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `import x from './a.webp?url'` | 落到 `dist/assets/<源目录>/<name>.[contenthash:8].webp`，返回 URL |
| `import s from './a.txt?raw'`  | 返回**文件源码字符串**，不进产物目录                              |
| `import s from './a.css?raw'`  | 同上，CSS 以字符串形式拿到                                        |

目录名沿用 `src/assets/` 下的原名（`banner` / `home` / `ornaments` / `audio`…），
这样打开产物目录一眼能看出文件属于哪类素材。文件名带 8 位内容哈希，换素材后 URL 跟着变，不吃旧缓存。

### HTML 模板

`src/index.html` 是**纯外壳**（meta / title / 图标声明 / 空的 `#app`），不含任何素材。
模板里写 `<link href="/x">` 会被 `html-loader` 当成模块解析然后构建失败，
所以规则里已设 `sources: false`。**不要改回默认值**——除非同时确认模板里真的没有需要解析的属性。

## 部署

- 主产物 `dist/` 部署到 **Cloudflare Pages**，自定义域名 `myraidrealms.cc.cd`。
- 预设包随 `dist/` 一起部署，走同域路径（详见 `07-presets.md`）。
- 仓库推 `v*` tag 时 `release.yml` 会跑 typecheck + build 并把 `dist/index.html` 发到 GitHub Release。

## 构建相关硬约束

1. 产物必须能**断网启动**，零外部 CDN 依赖。唯一允许的外链是 `src/global.css` 里的字体 `@import`。
2. 不要动 `output.clean` 与「预设包排后」的顺序。
3. 不要把 `src/static/` 的文件挪进 `src/assets/`。
4. 新增静态文件放 `src/static/` 时，确认它确实需要待在**根路径**且**不带哈希**。
