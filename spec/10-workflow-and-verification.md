# 10 · CI、验收与发布

## 提交前必过

```bash
pnpm typecheck    # vue-tsc --noEmit，应为 0 错误
pnpm lint         # ESLint 9 flat config，应为 0 error（warning 是已知技术债）
pnpm build        # 构建必须成功
pnpm check:i18n   # 改动语言文件时必跑
```

## CI 流程

`.github/workflows/ci.yml`，push / PR 到 `main` 触发，步骤顺序：

```text
Checkout → Setup pnpm → Setup Node(.nvmrc) → Install
  → Typecheck → Lint → Test → Build
```

- Test 放在 Build **之前**：测试不过就别浪费构建时间。
- 🔴 **CI 不跑 Prettier。** 仓库里有存量格式失败（未整体格式化），
  所以「CI 绿」不代表格式没问题，也**不要**用「CI 会格式化」当理由。
- 同一分支的重复推送只保留最新一次运行（`concurrency.cancel-in-progress`）。
- 🔴 **CI 不产出可下载的构建产物。** 以前有一步 `actions/upload-artifact` 上传
  `dist/index.html`，已随「只走线上分发」的定位一起删除——构建只用于验证，产物由部署流程产出。

## 部署流程

分发只有「整目录部署到线上」一条路，**没有** tag / GitHub Release 通道
（历史上的 `.github/workflows/release.yml` 已删除）。

- 主产物 `dist/`（含 `assets/` 与 `preset-package/`）部署到 **Cloudflare Pages**。
- 部署前先本地跑一遍 `pnpm build` 确认产物完整；只拿 `dist/index.html` 分发会缺图、缺预设。
- 详见 `02-build-and-deploy.md` 的「部署」一节。

## 测试

```bash
pnpm test   # node scripts/tests/run-standalone-local-content-tests.cjs
```

🔴 **「CI 绿」≠「测试全过」。** 这个跑器出现过**假绿**：
没有看门狗时 node 会静默退出 0，看起来通过实际什么都没跑。

判据要看**日志里的 `✔` 条数、`✖` 条数与结束汇总行**，不要只看退出码。

🔴 **还要盯「总数」。** 用例里抛未捕获异常会让进程**中途退出**，排在后面的用例根本不会跑 ——
表现是「`✔` 条数比平时少一大截」而不是「`✖` 变多」，只看失败数会低估问题。
拿不准正常总数时，先在 `main` 上跑一遍做基线（当前基线是 **94 条**）。

### 测试环境的替身清单

测试跑在 Node 里，没有浏览器。跑器用 `Object.defineProperty(globalThis, ...)` 垫了这些：

| 全局名                  | 替身          | 说明                                                                                                                      |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `localStorage`          | 内存 Map 版   | 挂在 `globalThis` 上                                                                                                      |
| `window`                | **部分替身**  | 只有 `document` / `parent` / `location` / `dispatchEvent` / `setTimeout` / `clearTimeout` / `frameElement` / `innerWidth` |
| `document`              | 极简替身      | `documentElement.lang` / `body.appendChild` / `createElement` / `querySelector`                                           |
| `File`                  | 继承 `Blob`   | 带 `name` / `lastModified`                                                                                                |
| `toastr`                | 空实现        | 四个方法都是空函数                                                                                                        |
| `eventOn` / `eventEmit` | mock 事件总线 | 存在 `Map` 里，没有真实事件循环                                                                                           |

`fetch` 由各用例按需替换，测完在 `finally` 里还原。

🔴 **`window` 是部分替身，它上面没有 `localStorage`。**
代码里写 `window.localStorage`，浏览器里等价于 `localStorage`，测试里却是 `undefined` ——
再被 `try/catch` 一吞就变成**静默读空**：不报错、不打日志，极难定位。

**铁律：拿这些 mock 的东西一律写裸全局名（`localStorage`）或 `globalThis.xxx`，不要写 `window.xxx`。**

### 测试环境的三条铁律

1. **假请求必须响应取消。** 否则被测代码的取消分支永远走不到。
2. **假流式要把 `[DONE]` 吊在闸门后。** 提前放行会让流式解析测不出真实时序。
3. **界面流式投影有 120ms 防抖**，只 flush 微任务等不到结果——测试里要推进假时钟。

## 静态检查的两个盲区

- 🔴 **`eslint.config.mjs` 的 `ignores` 必须显式列 `Temp/**`。**
  ESLint 不读 `.gitignore`，漏了本地 lint 会被几百条临时脚本噪音淹没，
  掩盖源码里的真实错误。
- 🔴 **测试文件不在 `tsconfig.json` 的 `include` 里**（只含 `src` / `runtime` / `schema` / `*.d.ts`），
  所以 `vue-tsc` **查不出**测试文件里的错误 —— 不只「重复函数实现」，
  **接口误用也一并漏掉**：公开函数从同步改成异步后，调用方漏了 `await`、拿 Promise 当对象用，
  类型上本该直接报错，却查不出来，一直拖到运行时才炸。
  所以**改公开函数签名时必须手动全局搜调用点**，改测试文件时要靠运行、不能只靠类型检查。

## 产物验收

构建完成后确认：

1. `dist/index.html` 能**断网**打开（零外部 CDN 依赖，唯一外链是字体 `@import`）。
2. `dist/` 根目录有 `404.html`、`favicon.ico`、`apple-touch-icon.png`。
3. `dist/preset-package/index.js` 存在（预设包构建没被主构建清掉）。
4. 打开页面看控制台 `[1980s-presets]` 日志，确认预设加载成功。
5. 全局变量垫片生效：控制台里 `_`、`toastr` 可用（缺了会在初始化阶段就炸）。
