# 07 · 预设体系与预设包投递

## 预设是什么

开局预设 = 一套世界观 + 角色 + 主提示词 + 本地内容开关 + 世界资料挂接。
当前约 **38 个世界观预设 + 21 个 Workshop 世界包**。

## 预设不打包进主产物

🔴 **预设不内联进 `dist/index.html`。** 它是**运行时动态加载**的：

```text
src/presets/*           预设源码（含 ws/ 世界包 JSON）
  ↓ 汇总
src/presets/index.ts    PRESETS
  ↓ 打包
preset-package/index.ts → window.__TH1980S_PRESETS__
  ↓ 构建产物
dist/preset-package/index.js
  ↓ 运行时加载
src/utils/preset-loader.ts  动态插入 <script>，读 window.__TH1980S_PRESETS__
```

这样做的原因：预设体积大、更新频繁，和主产物解耦后可以单独重新部署。

## 候选地址（重要）

`getBundleUrlCandidates()` 按顺序尝试三档，**全部指向自家产物**：

| 顺序 | 地址                                                       | 用途                               |
| ---- | ---------------------------------------------------------- | ---------------------------------- |
| 1    | `../preset-package/index.js`（相对当前页面）               | 线上首选；页面部署在根路径时命中   |
| 2    | `http://127.0.0.1:5500/dist/1980s/preset-package/index.js` | 本地开发服务器                     |
| 3    | `https://myraidrealms.cc.cd/preset-package/index.js`       | 自家 Cloudflare Pages 绝对地址兜底 |

第 3 档存在的意义：万一将来页面挪到子路径，相对路径会解析错，绝对地址仍然可用。

🔴 **预设包只从自家产物取，不要加任何外部 CDN 候选。**

失败时会依次尝试并把「失败链」打进控制台（`[1980s-presets]` 前缀），
排查线上加载问题时看这条日志。

## 构建顺序

```bash
pnpm build          # = 主构建（会清空 dist/）→ 再构建预设包
pnpm build:preset   # 只构建预设包
```

🔴 **预设包构建必须排在主构建之后。** 主构建的 `output.clean: true` 会把整个 `dist/` 清空，
顺序反了预设包会被删掉。`package.json` 里用 `&&` 串起来正是为此，
`webpack.preset-package.config.ts` 顶部也写了这条警告。

🔴 **改完预设必须重新构建并重新部署预设包。** 只重新构建主产物不会生效——
预设是运行时从外部文件取的，不在 HTML 里。

## 预设收藏与分组

- 收藏：`src/utils/preset-favorites.ts`
- 分组：`src/utils/preset-groups.ts`

这两处只影响界面组织，不影响预设内容。

## 旧预设兼容

新建、编辑、导出的预设统一用 `localContentEntries`。
旧字段 `worldbookEntries` 在导入时由 `src/utils/legacyPresetCompat.ts` 自动迁移。
详见 `06-content-assets.md`。

## 改预设时的自检

1. 预设 JSON 里**不要**再写 `worldbookEntries`。
2. 新增世界资料要在 `src/assets/worldbook-registry/index.ts` 挂上。
3. 改完跑 `pnpm build`（会连带构建预设包），然后**重新部署预设包**。
4. 线上验证：开控制台看 `[1980s-presets]` 日志，确认命中的是第几档候选。
