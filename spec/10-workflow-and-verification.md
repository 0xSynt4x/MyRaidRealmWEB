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
  → Typecheck → Lint → Test → Build → Upload dist/index.html
```

- Test 放在 Build **之前**：测试不过就别浪费构建时间。
- 🔴 **CI 不跑 Prettier。** 仓库里有存量格式失败（未整体格式化），
  所以「CI 绿」不代表格式没问题，也**不要**用「CI 会格式化」当理由。
- 同一分支的重复推送只保留最新一次运行（`concurrency.cancel-in-progress`）。

## 发布流程

`.github/workflows/release.yml`，推 `v*` tag 触发：typecheck → build → 建 GitHub Release。

```bash
# 确保 CHANGELOG.md 已更新
git tag v1.2.3
git push origin v1.2.3
```

⚠️ Release 只附 `dist/index.html`，不含 `dist/assets/` 与 `dist/preset-package/`，
详见 `11-known-issues.md`。

## 测试

```bash
pnpm test   # node scripts/tests/run-standalone-local-content-tests.cjs
```

🔴 **「CI 绿」≠「测试全过」。** 这个跑器出现过**假绿**：
没有看门狗时 node 会静默退出 0，看起来通过实际什么都没跑。

判据要看**日志里的 `✔` 条数与结束汇总行**，不要只看退出码。

### 测试环境的三条铁律

1. **假请求必须响应取消。** 否则被测代码的取消分支永远走不到。
2. **假流式要把 `[DONE]` 吊在闸门后。** 提前放行会让流式解析测不出真实时序。
3. **界面流式投影有 120ms 防抖**，只 flush 微任务等不到结果——测试里要推进假时钟。

## 静态检查的两个盲区

- 🔴 **`eslint.config.mjs` 的 `ignores` 必须显式列 `Temp/**`。**
  ESLint 不读 `.gitignore`，漏了本地 lint 会被几百条临时脚本噪音淹没，
  掩盖源码里的真实错误。
- 🔴 **测试文件不在 `tsconfig.json` 的 `include` 里**（只含 `src` / `runtime` / `schema` / `*.d.ts`），
  所以 `vue-tsc` **查不出**测试文件里的「重复函数实现」这类错误。
  改测试文件时要靠运行、不能只靠类型检查。

## 产物验收

构建完成后确认：

1. `dist/index.html` 能**断网**打开（零外部 CDN 依赖，唯一外链是字体 `@import`）。
2. `dist/` 根目录有 `404.html`、`favicon.ico`、`apple-touch-icon.png`。
3. `dist/preset-package/index.js` 存在（预设包构建没被主构建清掉）。
4. 打开页面看控制台 `[1980s-presets]` 日志，确认预设加载成功。
5. 全局变量垫片生效：控制台里 `_`、`toastr` 可用（缺了会在初始化阶段就炸）。
