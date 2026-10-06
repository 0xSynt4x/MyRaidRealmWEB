# Changelog

本项目所有值得注意的变更都会记录在此文件。

**一次提交对应一条记录**，按提交时间从早到晚排列；同一天的提交归在同一个日期小节下。
每条记录带提交短哈希与原始提交标题，改动内容按 `Added` / `Changed` / `Fixed` / `Removed` 归类。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## 2026-07-07

### `48e3518` — Initial commit

- **Added** 仓库初始化：`LICENSE` 与 `README.md`。

### `ea33b86` — Initial commit: 1980s-NW standalone web project

- **Added** 项目首次入库，275 个文件、约 93,771 行：网页源码 `src/`、运行时 `runtime/`、
  变量 schema `schema/`、预设包 `preset-package/`、世界书与提示词资产、Webpack 构建配置，
  以及 `legacy-reference/` 旧实现存档。
- **Added** 约 38 个世界观预设 + 21 个 Workshop 世界包；变量驱动的角色 / NPC / 商业 / 阵营模拟、
  本地世界书注入、骰子小游戏、本地存档与 JSON 导入导出；中英双语界面（zh-CN / en）。
- 此提交的内容即 `v1.0.0` 的发布主体。

### `a76040c` — Merge remote-tracking branch 'origin/main'

- **Changed** 合并两条初始提交线（`48e3518` 的 LICENSE / README 与 `ea33b86` 的完整项目），
  `README.md` 冲突以项目侧为准解决。

### `58a5b6a` — docs: expand README with intro, features, tech stack, quick start, and directory structure

- **Changed** `README.md` 扩写：补简介、功能特性、技术栈、快速开始与目录结构。
- 此提交打上 `v1.0.0` 标签。

### `a8f527d` — docs: add English README and bilingual language switch links

- **Added** `README.en.md`，并在中英两份 README 顶部互加语言切换链接。

### `5fa3cc2` — chore: add .gitattributes to normalize line endings to LF

- **Added** `.gitattributes`：统一换行符为 LF，消除 Windows 下的 CRLF 提交噪音。

### `e04313f` — chore: add tooling — scripts, engines, ESLint 9 flat config, Prettier, .nvmrc

- **Added** `.nvmrc`（Node 24）；`package.json` 新增 `typecheck` / `lint` / `lint:fix` /
  `format` / `format:check` / `test` 脚本，以及 `engines` 与 `packageManager` 字段。
- **Added** ESLint 9（flat config）与 Prettier 配置。

### `aac934b` — fix(types): resolve all 90 type-check errors

- **Fixed** 修复完整类型检查下的 90 个 TypeScript 错误（此前构建走 `transpileOnly`，未做类型检查）。
  新增 `src/asset-imports.d.ts` 声明 webpack 的 `?raw` / `?url` 导入与 `require()`；
  在 `host-environment-globals.d.ts` 补 `EventOnReturn` 别名；补 `PresetI18nText` / `PresetI18n`
  类型与 `PresetConfig.i18n` 字段；`PresetDisplayGroup` 的 key 用 `as const` 收紧为字面量类型；
  测试脚本改用可选 catch 绑定。`vue-tsc --noEmit` 现为 0 错误。

### `30cdde5` — ci: add GitHub Actions (CI + Release), issue/PR templates, CONTRIBUTING, CHANGELOG

- **Added** GitHub Actions：`ci.yml`（typecheck + lint + build）与 `release.yml`（tag 触发自动发布）。
- **Added** Issue / PR 模板、`CONTRIBUTING.md` 与本文件 `CHANGELOG.md`。

### `2e17703` — docs: document typecheck/lint/format scripts and link CONTRIBUTING

- **Changed** `README.md` 补上 `typecheck` / `lint` / `format` 脚本说明，并链到 `CONTRIBUTING.md`。

### `101798b` — ci: fix pnpm ignored-builds failure

- **Fixed** `pnpm-workspace.yaml` 里无效的 `allowBuilds` 占位配置改为 `onlyBuiltDependencies: []`
  （显式跳过 `@parcel/watcher` 的原生构建），并在 CI / Release 的安装步骤加
  `--config.strict-dep-builds=false` 兜底。

### `e4b9f26` — ci: use ignoredBuiltDependencies for @parcel/watcher (pnpm 11)

- **Fixed** pnpm 11 用 `allowBuilds` / `ignoredBuiltDependencies` 取代了 `onlyBuiltDependencies`，
  显式把 `@parcel/watcher` 标为忽略，修掉 `pnpm run` 前隐式 install 触发的 `strictDepBuilds` 报错。

### `30ee7f6` — ci: disable verifyDepsBeforeRun and strictDepBuilds to fix implicit-install failure

- **Fixed** 隐式的 pre-run install（`verifyDepsBeforeRun`）会忽略命令行参数，持续让
  typecheck / lint / build 报 `ERR_PNPM_IGNORED_BUILDS`。改为关闭该隐式安装，并把
  `strictDepBuilds` 设为 false，让被忽略的构建脚本降级为警告。

### `0beb904` — fix(types): remove unused 'yaml' from tsconfig types

- **Fixed** `tsconfig.json` 里指向未安装、未使用的 `yaml` 的类型引用，会导致 CI 报
  `error TS2688: Cannot find type definition file for yaml`。

### `d6e83a6` — docs: cut CHANGELOG v1.0.1 (tooling & CI hardening)

- **Changed** 切出 `v1.0.1`：工具链与 CI 加固，含本日上列各项。

## 2026-07-09

### `1c7278e` — fix(messages): 回退楼层时保留前端权威字段，避免签到/刷新/积分被覆盖

- **Fixed** 回退（删除）楼层后重建消息列表时，签到 / 刷新次数 / 积分等前端权威字段被旧数据覆盖，
  改为回退时保留这些字段。

## 2026-09-13

### `1e75217` — refactor: 抽取共享逻辑、合并重复实现并清理死代码

- **Changed** 三处重复的换行归一化实现合并为共享工具模块 `textNormalize`；
  AI 调试追踪的展示逻辑从内容中心面板抽出为独立模块 `aiDebugTraceView`（约 424 行）；
  存档管理从设置面板与初始化向导抽出为共享组合式函数 `useStandaloneArchiveManager`（约 270 行）。
  两个面板合计减掉约 950 行。
- **Removed** 删除未被调用的死函数，清理运行时冗余代码。
- **Added** 新增 `lodash` 开发依赖（本地内容测试脚本需要）；`.gitignore` 忽略 AI 工作目录；
  新增代码分析忽略清单 `.cgcignore` 与重构方案文档。

## 2026-09-20

### `a58416c` — feat(ui): 图标库迁移 Tabler、扁平化改版与天气横幅

- **Changed** 图标库从 FontAwesome 全量换为 Tabler 3.47.0，子集化内联（26.4 KB），
  补 `ti-spin` 旋转动画。
- **Changed** 新增设计令牌体系 `ui-tokens.css` 与 `ornaments.css`，扁平化配色及字号 / 行距档位。
- **Added** 天气驱动的场景横幅（`weatherFamily` 词表 + 底图），配套 `useCoverBackground` 组合式函数。
- **Added** `scripts/i18n/` 体检与补丁工具（`pnpm check:i18n`）；人物卡性别标记统一走
  `GenderIcon` 组件。
- **Removed** 删除 8 个未再引用的自定义开局向导组件。

### `80614e4` — chore: 忽略本地临时目录 Temp/

- **Changed** `.gitignore` 增加 `Temp/`。

### `e78468f` — chore: 删除已无引用的 FontAwesome 内联字体

- **Removed** 删除迁移 Tabler 后已无引用的 FontAwesome 内联字体资源。

### `f06ce41` — feat(build): 资源外置为独立文件，按素材目录分门别类

- **Changed** webpack 的 `?url` 规则由 `asset/inline` 改为 `asset/resource`，图片 / 音频 / 字体
  不再 base64 内联。产物落到 `dist/assets/<源目录>/<名字>.<8 位内容哈希><扩展名>`，
  目录名沿用 `src/assets` 下的原名（banner / home / ornaments 等）。文件名带内容哈希，
  换素材后 URL 跟着变，浏览器不会拿到旧缓存。
- **Changed** `index.html` 由 2.92 MB 降至 2.02 MB，后续新增素材不再撑大 HTML。
  文本资源（世界书、提示词）仍走 `?raw` 内联，运行时读取方式不变。
- **Removed** 删除 `src/assets/backgrounds/` 下 24 张零引用图片（约 1 MB）。

### `784692f` — chore: 删除零引用的装饰 SVG

- **Removed** 删除 `corner` / `divider` / `rail` / `rail-v` / `tile` 五个装饰 SVG
  （逐个 grep 确认无引用；在用的是 `styles/ornaments.css` 里的内联 SVG）。

### `5cba0af` — feat(home): 封面背景音乐改为外置音频，新增音量条

- **Changed** 封面背景音从代码合成的环境音（A 小调和弦 + 滤波扫动）换成真实音轨
  _Beyond the Marble Gate_，走外置资源链路（4.06 MB 不进 HTML，内联成 base64 还要再胖三分之一）。
- **Added** 音量条：播放按钮正下方一条 2px 细线，可拖拽 / 点击定位 / 方向键调节；
  视觉只有 2px，命中区靠 `::before` 上下撑到 16px。默认音量 50%。
- **Changed** 起播先试自动播放，被浏览器策略拦下则退回「等用户首次交互」，点 / 按页面任意处即淡入；
  起播淡入 1.6s、停播淡出 0.7s，离开封面即暂停归零。新增词条 `setup.home.volume`（中 / 英）。

### `8e82b09` — feat(home): 封面加入场动画与开始游戏过场，背景音乐换轨

- **Added** 封面入场动画：黑幕退去 → 底图由暗转亮并缓缓收进 → 极光铺开 → 标题浮出 →
  装饰线从中间展开 → 四个按钮依次落下 → 顶部控件落下，全程约 2.6s。
- **Added** 开始游戏过场：以传送门为圆心推近并提亮，径向光由暗到亮吞掉画面，1.4s 后进游戏。
  圆心直接复用背景脚本算出的传送门坐标（从舞台元素抄到根元素的 `--leave-x/y`），
  缩放与光晕共用同一圆心，推近时传送门在屏幕上原地不动。
- **Changed** 背景音乐换成 _Where Giants Sleep_（4.13 MB），旧的 _Beyond the Marble Gate_ 删除。
  过场期间 `isLeaving` 守卫 + `pointer-events: none`，动画走完再切页面，音乐同步淡出。
- **Changed** 亮度和缩放只给首尾两个关键帧，节奏全交给 `cubic-bezier(0.45, 0, 0.65, 0.55)`
  —— 中间插 `brightness` 关键帧会制造台阶。新增 `prefers-reduced-motion` 覆盖，
  写在动画之后（媒体查询不加特异性，只靠源码顺序），并手工还原被动画钉住的起始值。

### `579c598` — feat: 本地生图上线、产物零 CDN 依赖、界面提示统一入口

- **Added** 本地 ComfyUI 生图：新增「文生图」设置页，排在界面设置之后；
  上传工作流后正文里的 `image### 提示词 ###` 变成可点击出图的图片槽；新增画风预置与提示词拼接，
  AI 侧规则改为只写画面内容；消息新增字段同步进运行时 schema，避免持久化时被静默丢弃。
- **Changed** 产物不再依赖外部 CDN：vue / pinia / klona / lodash / vis-data / vis-network
  全部打进产物，移除构建配置里指向 jsdelivr 的外置出口与已无人 import 的全局映射；
  lodash 这类历史上的全局库改由显式 import 后挂到 `globalThis`。
- **Changed** 预设包改从自家域名加载：新增预设包独立构建、产物随站点一起部署，
  加载候选收敛为「同级相对 → 本地开发地址 → 自家域名」，去掉第三方兜底。
- **Fixed** 界面提示统一入口：原先直接调用运行环境提供的提示库，独立网页里并不存在，触发即报错。
  改为优先用运行环境自带提示、否则回落项目自带通知；挂载点从游戏正文区移到应用根节点，
  开局向导页也能弹出；移除两个设置页里各自重复的一份桥接实现。

## 2026-09-21

### `e0d58bd` — fix: 标签页标题跟随界面语言，英文游戏名补回 s

- **Fixed** 模板补上 `<title>`，避免 JS 执行前标签页显示网址；语言确定后把 `document.title`
  改成对应语言的名字（中文「诸界穿越模拟器」/ 英文「MyRaid Realms」）—— 此前切到英文后
  标签页还是中文。英文游戏名补回少掉的 `s`。
- **Fixed** 多语言检查脚本跳过注释的规则补上 `//` 行注释（原来只认 `/* */`，
  中文行注释会被误报成「英文块残留中文」）。

### `b8229ea` — feat: 世界书按会话持久化、正文列放宽至 1024、插图查看器与音乐偏好持久化

- **Fixed** 世界书「选了预设、刷新后条目丢失」：写入发生在会话建立之前，落到兜底作用域
  导致读不回来。改为无会话时跳过写入、会话创建后补写（`createStandaloneRuntimeBaseline` /
  `commitStandaloneRuntimeState` / `ensureStandaloneRuntimeBootstrap` 三条路径都挂 flush）；
  手填条目改存进会话的 `custom_worldbook_entries`。
- **Changed** 正文列宽度 660 → 1024px（`--ui-reading-w`），场景横幅与底部输入栏同步变宽；
  横幅新增 `--ui-banner-h-max: 140px` 限高，并显式 `width:100%` 修掉 `aspect-ratio`
  拿被压过的高度反推宽度、导致横幅比正文列窄的问题。
- **Added** 插图内联查看器 `ImageLightbox`（滚轮 / 双指缩放、拖动平移、点击关闭），不再开新窗口；
  `MessageImageSlot` 常驻挂载以保留离场过渡。
- **Added** 首页背景音乐开关与音量持久化（`th1980s:bgm-preference`，默认关、音量 50%）；
  「用户开关」与「此刻是否在响」拆成两个状态，避免自动播放被拦下后把「开着」记成「关」。
- **Changed** 重写文生图提示词规则为输出格式 / 内容规则 / 思考草稿 / 句式模板四层，
  5 个英文句式一字未改；预设「✍️ 绝对古白话-by CHR」整体替换为新的六节写作风格规则。
- **Fixed** 修复测试脚本陈旧问题（`getWorkshopPresets` 已删除、参数改名 `imagePromptEnabled`）。

### `9d33bc8` — fix(settings): 正文字号不再乘界面缩放系数，删除无用的 data-content-size

- **Fixed** 正文五档改为固定 px（15 / 17 / 19 / 21 / 23），不再乘 `--ui-font-scale`。
  此前调「界面字号」会连带把正文一起放大，两个滑块互相干扰。
- **Removed** 删除根节点上无人读取的 `data-content-size` 属性及其 watch 依赖。
  正文字号仍由消息正文元素自带的 `data-size` 生效，功能不变。

### `35d3673` — fix(image): 插图加载失败时显示兜底提示与重新加载按钮

- **Fixed** 线上 https 页面拉本地 ComfyUI 图片会因浏览器「本地网络访问」权限被拒，
  `img` 静默失败只剩破图图标。现在图片槽监听加载失败，改为显示原因提示 + 重新加载按钮
  （重建 `img` 元素重发请求，同时借点击手势给浏览器弹授权框的机会）。

### `649d426` — ci: 修复 Lint 报错、忽略本地临时目录、接入测试步骤

- **Fixed** `check-i18n.cjs` 两条正则用 `{2}` 替代连续空格，修掉 `no-regex-spaces`
  —— 这是 CI 自 9/20 起 11 连红的唯一原因。
- **Fixed** ESLint `ignores` 补上 `Temp/`：`.gitignore` 已忽略但 ESLint 不读它，
  导致本机 lint 366 条噪音淹没真实错误。
- **Added** `ci.yml` 在 Lint 之后、Build 之前加入 Test 步骤（issue #5）。

### `da0b25f` — chore: 设计文档与创作素材移出仓库，改为本地保留

- **Removed** 设计文档与创作素材移出仓库，改为本地保留。

## 2026-09-22

### `1a6389a` — feat: 阶段总结归档 + 修好测试跑器（CI 的测试步骤不再假绿） (#11)

- **Added** 阶段总结归档：把掉出「最近 8 轮」窗口、玩家手动归档过的小总结，用主 API
  压成一段整体剧情摘要写回会话；提示词里 `[阶段总结]` 与 `[前情提要]`（只含水位线之后）并存。
  会话新增 `stage_summary` 与 `stage_summary_archived_until_message_id` 两个字段。
  阈值 100 / 200 / 300 / 500（默认 100），够阈值每轮提醒一次；归档只手动、绝不自动。
- **Fixed** 测试跑器加单条超时看门狗 + 单条失败不中断。此前一条测试的假请求不响应取消信号，
  `await` 悬空 → node 事件循环一空就以 0 退出 → 91 条里只跑了 57 条，CI 却显示绿。
  假请求学会响应取消信号；两条真失败（预设记忆恢复 / 流式预览）修好，只动测试文件，
  产品代码零改动。
- **Removed** 删掉重复的同名 `flushScheduledUiEffects`（后一份覆盖前一份，参数是死的）。

### `f890d72` — feat(comfyui): 提示词节点按标题识别 + 手动指定 (#12)

- **Added** 站点根目录补 `404.html` / `favicon.ico` / `apple-touch-icon.png`，
  构建时由 `CopyStaticToRootPlugin` 原样拷到产物根目录，不走打包。站点根目录必须有 `404.html`，
  否则 Cloudflare Pages 会走 SPA 兜底，任何不存在的网址都返回整份首页（约 2.9 MB）。
- **Changed** 生图工作流的提示词节点识别改为三级，每级可信度都在界面上说清楚：
  ① 节点标题等于 `positive prompt` / `negative prompt`（忽略大小写与空格下划线连字符）；
  ② 顺着采样器的正 / 负输入沿连线回溯文本节点；③ 兜底取第一个能装提示词的节点 ——
  这一步是「猜」，界面不再报成「已识别」。
- **Changed** 提示词字段从死认 `text` 放宽为 `text` / `text_g` / `text_l` / `prompt` /
  `wildcard_text` / `populated_text`，并排除文件名 / 配置类字段（否则加载器节点会被误判）；
  沿连线回溯改用同一套判定，SDXL 的 `text_g` 节点以前回溯不到；界面格式转 API 格式时保留节点标题。
- **Added** 手动指定：下拉框列出工作流里全部节点，能装提示词的排前面、其余列出但禁用；
  手选的正向节点会固定下来（`settings.positiveNodeManual`），重新解析不再覆盖。

### `ba611aa` — feat(text): 角括号「」与『』包裹的对话也走富文本高亮 (#13)

- **Added** 对话包裹规则补上 `「…」` 与 `『…』`，都包成同一个 `.quote` 样式（取 `--accent-primary`），
  不新增任何 CSS。AI 有时用 `「」` 而不是 `“”` 写对话，这段文字此前和正文同色，读不出是台词。
  代码块与行内代码里的角括号不受影响；嵌套写法（外层 `「」` 内层 `『』`）得到嵌套的同色 span。

### `d5dfed5` — docs: 补齐工程细则与协作准则，清理已知问题清单

- **Added** `AGENTS.md`（AI 协作准则，只讲「怎么干活」）与 `spec/`（索引 + 11 篇工程细则：
  架构与模块边界、构建与产物与部署、界面与样式体系、国际化、提示词链路、世界书与本地补充内容、
  预设体系与预设包投递、变量与状态与存档、生图提示词节点、CI 与验收、已知坑与待修）；
  `README.md` 加「文档导航」，`CONTRIBUTING.md` 指向新文档。
- **Removed** 移除 `runtime/standaloneTurn.ts` 里两处死代码：无人调用的预设分块函数，
  以及签名带标题、实现却忽略标题的工具函数。送给模型的提示词逐字未变。
- **Changed** 统一 `runtime/`、`schema/`、`scripts/i18n/` 下 6 个文件的格式；
  新增 `.prettierignore` 条目，排除世界书 EJS 模板、玩家预设数据、issue 模板与旧实现存档。
  仓库现在 `pnpm format:check` 全绿。

### `78e5780` — feat: 首页快照选择浮层，开局流程简化并清理历史残留

- **Added** 首页「继续游戏」改为弹窗浮层挑历史快照：最多列 5 个，每项只给摘要与时间，
  不带设置页存档区那套管理功能。
- **Changed** 打开页面不再自动判定「进游戏还是进配置界面」：一律先给配置界面首页，
  想接着上次玩自己点「继续游戏」挑快照。同步删掉加载时预建运行时会话的调用。
- **Removed** 「已开局标记」机制整体移除：删掉 `src/utils/setupProgress.ts`，
  新增 `src/utils/localGameState.ts` 只保留重置游戏需要的清空本地状态。
- **Fixed** 补齐存档恢复 / 导入的 8 个提示文案 key（中英各一份），清掉 2 个已无引用的 key。
  此前这些提示因缺 key 会显示成 `archive Restore Resume Now` 这种拼出来的鬼东西。
- **Removed** 清掉设置页与设置面板里遗留的存档管理死代码、删除确认里从未生效的「类型」参数，
  ESLint warning 从 59 降到 18（一直 0 error）。
- **Removed** 删除 `legacy-reference/` 旧实现存档与 GitHub Release 分发通道，
  README 与 spec 的历史口径同步改为正面陈述。发布定位收敛为「只走线上整目录部署」。

### `611543c` — fix(prompt): 世界书不再被注入两遍

- **Fixed** 拼「系统协议块」时会把 `route=main` 的本地内容块整批拼进去，但排除名单里只有
  「当前变量快照」一种，**漏了世界书** —— 而世界书本来还有一条独立通道
  （`resolveStandaloneMainWorldbookPrompt` → 主链路里单独成条），于是同一份世界书进了两处。
  实测真实内置预设（卡普阿）：整条提示词 8988 字符，世界书那 3081 字符出现 2 次，
  每次请求白送约 1/3 的提示词。修后世界书出现 1 次，提示词降到 5905 字符。
- **Changed** 把「是不是世界书块」的判据抽成 `isStandaloneMainWorldbookBlock()`，
  系统协议块拼装与独立注入通道共用同一份判据，避免口径漂移。
- **Removed** 测试文件删掉从未接进跑器的 `testMainPromptInjectsWorldbookBeforeRecentHistory`
  （世界书先后顺序不是要求）。

## 2026-09-23

### `52f8eab` — refactor(settings): 主/辅助 API 合并为统一 API 池

- **Changed** 设置页与游戏内设置面板统一为「API 列表 + 使用方式」两张卡片；
  主 API / 辅助 API 均支持多选，并可按顺序排列。
- **Added** 自动重试开关：关闭时只尝试首个 API，开启时失败自动换下一个。
- **Changed** 旧版「单主 API + 辅助 API」配置自动迁移进 API 池。
- **Removed** 移除已无引用的单卡 API 编辑器。

### `fd0228c` — feat(settings): API 池支持 OpenCode Go 会话标识，勾选状态与顺序显示修正

- **Added** 「OpenCode Go 会话标识」开关：勾选后拉模型与生成回复都会附带同一会话请求头。
- **Fixed** 勾选框改为自绘样式：图标字体是精简子集，原先引用的方形勾选图标并不存在，一直没显示。
- **Fixed** 已勾选的 API 按重试顺序排到列表上方，行号与「第 N 位」不再错位；
  修复设置页选中行高亮失效（对渐变用 `color-mix` 是无效写法）。

### `7c6f4a7` — revert(settings): 移除 API 会话标识开关

- **Removed** 回退 `fd0228c` 中该开关的改动，8 个文件恢复原状。该开关用于给推理请求附带
  会话标识头，实测在第三方中转上不生效（中转转发时会丢弃该请求头），且浏览器侧无法伪装
  `User-Agent`，客户端无法绕过，故移除。

### `1c471a5` — fix(storage): 修掉本地存储被调试记录撑爆，老数据自动清理

- **Fixed** 流式响应的原始抄本（整条 SSE 的逐字节转录）会随调试记录一起写进本地存储，
  一个字要裹上 150-200 字节的 JSON 包装（`id` / `model` / `choices` / `delta` 每个分片都重复），
  体积可达正文的上百倍。实测一份只聊了 1 回合（2 层消息）的存档：消息数据 3.91 MB，
  其中调试记录 3.86 MB（98.7%），而 `raw_response_text` 一项就占 3.17 MB —— 真正的正文只有 19.8 KB。
  本地存储已用配额 61.9%，再聊一两回合必然触顶，`setItem` 抛错后部分写入点还会静默吞掉异常
  （表现为存档失败、数据悄悄丢）。修法三处：① 流式响应的原始抄本不再落盘，非流式仍保留；
  ② 存档打包与恢复时都剔除调试记录；③ 清理按会话 id 存的旧预设记忆（换局后旧 key 再没人读）。
- **Changed** 老数据无需用户做任何操作：读取消息时会把老数据里流式的原始抄本抹掉，
  紧接着的写回即完成自愈；历史存档在应用启动时清理一次（留标记，之后跳过），
  导入的老存档也顺手归一化。新增回归测试锁住「只清流式、保留非流式」这条边界
  —— 非流式的原始响应不大且排查时有用，不能一起清掉。

### `db0f820` — fix(storage): 预设库只留用得上的字段，老数据启动时自动裁剪

- **Fixed** 导入酒馆预设时是整份原样存盘的，而原始预设 JSON 里除了提示词条目和排序表，
  还带着 `extensions`（正则脚本、内嵌世界书、插件配置）等一大堆字段 —— 代码里一处都没读过它。
  实测本机：预设库 1.09 MB / 571,879 字符，其中一份预设独占 1.02 MB，而它的 `extensions`
  一项就是 959.5 KB（占该份 91.8%），真正会用到的 `prompts` 只有 77.2 KB、`prompt_order` 5.3 KB。
  改为导入与保存编辑时只保留 `prompts` + `prompt_order`，其余顶层字段不落盘；
  老数据在应用启动时裁剪一次（留标记，之后跳过）。
- **Added** 新增回归测试锁住「冗余字段不落盘」与「只跑一次」。

### `af459a5` — feat(chat): 回复楼层头显示本次实际使用的模型名

- **Added** AI 楼层头从固定显示「AI」改为显示服务端响应里回传的模型名；名字带目录前缀时
  只取最后一段（如「[公益]官方/deepseek」显示为「deepseek」）。
- **Changed** 流式（逐数据块）与非流式两条路径都提取响应中的模型名并向上透传；
  仅在正式消息落地时写入，流式生成期间仍显示占位文案，避免闪烁。消息结构新增可选字段，
  存档校验同步登记为可选字段，旧存档缺该键时正常读取并回退显示「AI」。
  仅覆盖 OpenAI 兼容协议。

## 2026-09-24

### `40376a1` — docs: CHANGELOG 改为按提交记录并补齐全部历史

- **Changed** `CHANGELOG.md` 整份重写为纯时间线：43 条记录与 43 个提交一一对应、顺序一致，
  按日期小节（`## YYYY-MM-DD`）分组，取消 `[Unreleased]` / `[1.0.1]` / `[1.0.0]` 三个版本大节；
  `v1.0.0` / `v1.0.1` 两个 tag 改为正文里的一句标注。此前 43 个提交里只有 7 个写过 changelog，
  09-13~09-21 的 15 个提交与 09-22 三个 PR、09-23 的 API 池改动全部缺失。
- **Added** `CONTRIBUTING.md` 新增「Changelog 约定」一节：每次提交补一条、按提交时间分开写、
  merge 也要留、短哈希提交后回填；部署流程第 1 步改为引用该节。
- **Fixed** 顺带修掉 `1c471a5` 引入的 Prettier 不合规（测试注册表里一行 125 字符，超 `printWidth` 120），
  只拆行、不改逻辑。
- 验证：`typecheck` / `test`（94/94）/ `lint` / `build` 全绿；全仓 `prettier --check` 全绿。

### `0264991` — docs(presets): 补「预设有两种」的存储归属说明

- **Added** `spec/07` 新增一节，明确区分两类预设：开局预设（项目自带，运行时从
  `dist/preset-package/` 动态加载，不落盘，既不该进 IndexedDB 也不该进 localStorage）、
  酒馆预设（兼容 SillyTavern 格式，由用户导入，会随导入数量持续增长，必须进 IndexedDB）。
- **Changed** 原「预设是什么」改名「开局预设是什么」，避免与新节撞名；同时记下两个易混概念
  （预设记忆、预设收藏 / 分组）都留在 localStorage。

### `c6dff90` — feat(storage): 存档与会话数据迁移到 IndexedDB

- **Fixed** localStorage 只有 5MB 硬上限，且写入失败同步抛错。实测聊一回合消息数据就达
  3.91 MB（其中 98.7% 是流式响应的原始抄本），本地存储已用配额 61.9%，再聊一两回合必然触顶，
  表现为存档失败、数据悄悄丢。IndexedDB 配额按磁盘比例给，是这类数据的正确归宿。
- **Added** 存储层：`standaloneIndexedDb.ts`（IndexedDB 的 Promise 薄封装，手写不引第三方库，
  含连接缓存、事务提交等待、配额 / 不可用错误归一化）与 `standaloneStorage.ts`（统一落盘入口）。
  两项关键设计：启动时一次性迁移 localStorage → IndexedDB，先写成功再删旧副本；
  小数据进内存缓存、读接口保持同步，避开「Vue `computed` 不能 `await`」引发的整棵组件树异步化，
  存档载荷不进缓存、走异步按需读写。
- **Changed** 会话、消息、`stat_data` 读写改走存储层，函数签名不变；存档载荷改异步
  （`saveStandaloneArchiveSnapshot` / `restoreStandaloneArchiveById` / `deleteStandaloneArchive` /
  `downloadStandaloneArchiveById` 返回 Promise），索引仍走内存缓存保持同步，相关调用点补 `await`；
  `src/index.ts` 挂载应用前 `await` 存储初始化，顺序不可调整。
- **Changed** 设置、音量、徽章、预设记忆等小配置仍留在 localStorage：它们离 5MB 上限差两个数量级，
  搬进 IndexedDB 不解决问题，还会破坏首屏同步读语言的链路。IndexedDB 不可用时整体降级回
  localStorage；落盘失败先打日志再兜底写 localStorage，不静默丢数据。
- **Added** 文档同步：新增「本地存储」章节说明取舍与两条设计，并把启动链路、分层边界、
  状态所有权、README 的存档策略更新为现状。

### `b6c0e58` — chore(infra): 补 Docker 部署与 Playwright e2e

- **Added** 一套自包含的容器化方案，依赖解析、构建、运行全部在容器内完成，宿主只需要 docker，
  不需要装 node 或 pnpm（本仓 pin 的是 `pnpm@11.5.2`，宿主环境不一定装得上）。
  `Dockerfile` 多阶段构建（`node:22-alpine` 构建 → `nginx:alpine` 运行，运行镜像里只有 `dist/` 产物，
  构建走 `pnpm build`，因此「预设包必须排在主构建之后」这条顺序约束自动生效）、
  `docker-compose.yml`（对外 8080）、`nginx.conf`（`index.html` 不缓存、带内容哈希的资源长缓存、开 gzip）、
  `.dockerignore`（挡掉 `node_modules` / `dist` / `.git` / `e2e`，避免构建上下文爆炸）。
- **Added** `e2e/` Playwright 用例，测容器里的部署产物而非开发服务器：部署冒烟（渲染、无运行时错误、
  静态资源可达、缓存策略、本地存储可用）与存储迁移（老数据搬进 IndexedDB 且清掉旧副本、
  迁移后刷新仍读得到、6MB 载荷读写完整 —— 超过 localStorage 的 5MB 上限）。
- **Added** `spec/02` 的容器化章节，并记下两个坑：`pnpm build` 不做类型检查（ts-loader 开着
  `transpileOnly`），类型问题只能靠 `pnpm typecheck` 发现；家目录不可写时 `docker compose build`
  会因写不了 `~/.docker/buildx/` 失败，需把 `BUILDX_CONFIG` 指到仓内。

### `114ae39` — fix(storage): 酒馆预设库也迁进 IndexedDB

- **Fixed** 上一版把「名字带 localStorage 的小数据」一律留在 localStorage，酒馆预设库因此被漏掉。
  它不是小数据：整个库序列化成一个字符串存在**单个 key** 里，用户导入多少就存多少，会随使用
  持续增长 —— 导入时的裁剪只让它长得慢一点，不改变趋势，撑爆 5MB 是早晚的事。（开局预设不属于这类：
  它不落盘，是项目资产。）`th1980s:standalone-tavern-preset-library` 加进迁移清单。
- **Changed** 连带两个 key 一起处理：老格式的单份导入预设
  `th1980s:standalone-tavern-preset-override`（读一次并进库里，之后删掉），以及「已裁剪过」标记
  `...-library-slimmed`（不同步读写的话每次启动都会重裁一遍）。`standaloneTavernPreset.ts` 的读写
  改走存储层，`canUseLocalStorage()` 守卫随之移除 —— 只搬数据不改守卫的话，IndexedDB 模式下守卫
  照样放行、数据却已经搬走，界面会读到空库，用户的预设看起来「凭空消失」。
- **Changed** 🔴 接口保持同步：`loadStandaloneTavernPresetLibrary()` 被 `ContentCenterPanel.vue`
  里的一批 `computed` 和 `standaloneTurn.ts` 的回合逻辑同步调用，改成异步会拖垮整条链。
  它进内存缓存，签名不变，顺带省掉了每次刷新都重新 `JSON.parse` 整个库的开销。
- **Added** 申请持久化存储：容量大了不等于更不容易丢 —— IndexedDB 在磁盘压力下可能被整体回收。
  初始化后调一次 `navigator.storage.persist()`，失败忽略。
- **Fixed** 修掉一个假承诺：`handleWriteFailure()` 说「至少留一份在 localStorage，下次还能恢复」，
  但 `migrateOneKey()` 只要 IndexedDB 里已有该 key 就删掉 localStorage 副本（哪怕是旧值），
  兜底的最新数据下次启动会被当「旧副本」清掉。迁移不再负责清理这份副本。
- **Removed** 删掉 `clearStandaloneStorage()`：它末尾的 `idbClear()` 清的是整个库、包含所有存档，
  而存档只能由用户手动删；原注释还写着「重置游戏走这里」，与实际语义正好相反。
  重置存储状态的入口只保留动内存的那一个。
- **Added** 加开发期自检：同步读接口收到不在缓存名单里的 key 时直接抛错，把「静默返回 null」
  这种失效方式变成显式失败（webpack 注入 `__STANDALONE_DEV__`，生产构建摇掉）。
- 覆盖：新增 e2e 用例验证预设库被迁移、旧副本清掉、且迁移后仍能**同步**读到。

### `0a509a0` — fix(deploy): 预设包不再长缓存，否则更新到不了老用户

- **Fixed** nginx 给 `/preset-package/` 配的是 `max-age=31536000, immutable`，但预设包产物是
  **固定文件名** `index.js`（`webpack.preset-package.config.ts` 里 `output.filename: 'index.js'`，
  不带内容哈希）。`immutable` 的语义是「在 max-age 期间连条件请求都不用发」，于是重新部署预设包后，
  老用户浏览器里还是旧文件 —— 拿不到新预设，除非手动清缓存。这正好抵消了项目对预设包的设计意图：
  `spec/07-presets.md` 明确写着预设「体积大、更新频繁，和主产物解耦后可以单独重新部署」。
  改成和 `index.html` 一样的 `no-cache`：每次带 ETag 重验证，内容没变返回 304，开销很小，
  但能保证拿到新预设。`/assets/` 那条 `immutable` 保持不动 —— 那里的文件名确实带 8 位内容哈希。
- **Changed** e2e 的缓存策略用例补上预设包这一档：断言可达、且**不能**带 `immutable`。
  之前这条用例只覆盖了 `index.html` 和 `assets`，正好漏掉配错的那一档。

### `3ec11f9` — chore(deploy): 删掉进镜像的 sourcemap，顺带清掉死代码

- **Fixed** `dist/index.js.map` 与 `index.css.map` 是构建残留（JS/CSS 已经内联进 `index.html`），
  却会被 `COPY dist` 一起带进运行镜像。实测占 9.5MB —— 产物总共 18MB，一半以上是它们，
  白白增加部署与回源带宽。在 runtime 阶段 `rm -f` 掉：构建照旧产出 sourcemap（本地调试还要用），
  只是不进最终镜像。产物体积 18MB → 8.5MB。
- **Removed** 顺带清掉上一轮遗留的死代码：`clearStandaloneStorage()` 删掉之后，底层的 `idbClear()`
  就没有任何调用者了。留着它，将来有人想做「重置」时正好又会踩上「连存档一起清掉」那个坑。

### `8ecb619` — fix(storage): 修掉 CI 挂掉的两个根因 + 两处失实描述

- **Fixed** `window.localStorage` → 裸 `localStorage`（7 处）。测试替身只往 `globalThis` 上挂了
  `localStorage`，`window` 替身里没有这个属性。于是 Node 下 `window.localStorage` 是 `undefined`，
  `.getItem` 抛 TypeError，而这个异常被 `safeLocalGet` / `safeLocalSet` 的 try/catch 吞掉 ——
  表现成「读永远返回空、写永远失败」，浏览器里完全看不出来（`window.localStorage === localStorage`），
  只有单元测试能暴露。垫片区加了注释说明为什么不能写 `window.localStorage`。
- **Fixed** 测试里 17 处调用补上 `await`：`saveStandaloneArchiveSnapshot`（10 处）/
  `restoreStandaloneArchiveById`（5 处）/ `pruneStandaloneArchiveDebugTraces`（2 处）在存储层改造时
  全部 async 化，生产代码的调用点当时都补了 `await`，但 `scripts/tests/` 里的 17 处一处没补。
  其中一处拿到 Promise 后立刻取 `.id` 得到 `undefined`，`restoreStandaloneArchiveById(undefined)`
  抛「未找到对应的本地存档」，异常冒到顶层直接打断测试进程 —— 排在后面的 17 条用例根本没执行。
  这就是「94 条只跑到 77 条」的原因：只看失败条数会低估问题。
- **Fixed** `spec/08` 与第 7 条自检打架：文档写的是「静默返回 null」，但第 7 条加的自检让开发构建
  直接抛错。改成：开发构建抛错（显式失败）、生产构建静默返回空，两边都写明。
- **Fixed** `handleWriteFailure` 注释仍是假承诺：上一轮修掉了 `migrateOneKey` 删兜底副本的问题，
  但注释里「用户下次打开还能从这份恢复」仍不成立 —— IndexedDB 模式下启动只从 IndexedDB 填内存缓存，
  localStorage 里那份兜底永远不会被自动读回。把话说清：兜底只保证数据还在磁盘上，不会自动生效。
- 验证：单测 94 通过 / 94（reviewer 的验收线）；`typecheck` 通过；e2e 9 passed（重建镜像后跑的）。

### `35069ff` — docs: 补齐项目含糊处的说明并登记待办

- **Added** `AGENTS.md` 新增「临时文件与工作目录」节，明确临时产物落 `Temp/`。
- **Changed** `spec/10` 补测试环境替身清单（含 `window` 是部分替身、没有 `localStorage`）、
  测试判据改为看日志里的通过 / 失败条数与总数、把静态检查盲区说准。
- **Changed** `spec/11` 补「测试脚本不纳入类型检查」的前提漏洞，登记「重置游戏」文案待办；
  `spec/07` 表格列宽格式对齐（内容未改）。

### `a071c52` — Merge pull request #14 from Rose-Fish/feat/indexeddb-storage-migration

- **Changed** 合并社区贡献的 IndexedDB 存储迁移分支（PR #14）进 main，内容即上方 `c6dff90`
  「存档与会话数据迁移到 IndexedDB」那条；本次合并无冲突。
- 合并后另起 `611bd91` 收拾 PR 带进来的格式化问题。

### `611bd91` — fix(i18n): 入口「重置游戏」改名为「回到首页」，与实际行为对齐

- **Changed** 这个入口实际做的是：清掉待恢复存档的挂起状态、清当前这局的会话与统计变量、清消息，
  然后回到首页 —— 全程不碰存档。原名读起来像会把存档一起清掉，容易误操作。中英文案各 7 条统一口径：
  按钮、进行中、弹窗标题、弹窗说明、确认键、成功 / 失败提示；弹窗说明补上「已保存的存档不受影响」。
- **Changed** 7 处内部注释与控制台日志同步改名，避免以后读代码错位。
- **Fixed** e2e 补上漏用的 `legacySessionKey`，把两处硬编码 key 换成参数（顺带消掉一条 lint 告警）；
  格式化 PR #14 带进来的 6 个不合规文件，`format:check` 恢复全绿。
- **Removed** `spec/11` 删掉已完成的「重置游戏」待办。

## 2026-09-25

### `0224cd1` — feat(image): 生图支持多后端，新增 NovelAI 云端出图

- **Added** 设置里新增「生图」卡：一个总开关 + 本地 ComfyUI / NovelAI 二选一。
  老存档里 ComfyUI 开着的话，自动迁移成「总开关开 + 后端 ComfyUI」，玩家无感。
- **Added** 存储层：用浏览器原生能力解 zip（不引第三方库）；云端图片走 IndexedDB 存取，
  带占用统计、单张删除与一键清空；消息里只记图片编号，不塞二进制。
- **Added** NovelAI 客户端：按官方协议发请求；地址栏官方与兼容站都能填，程序只补路径。
  采样器与调度的候选混排「官方名 + 兼容站名」，模型可点按钮向站点问询（拿不到就按原因明说，
  绝不拿内置候选冒充站点返回）。只测连通，不验 Key。
- **Changed** 出图分发：出图按钮按当前后端判断可用性；NAI 出图落 IndexedDB，刷新页面仍在。
- **Added** 提示词：新增 NovelAI 专用的 Danbooru 标签流规则，与原有自然语言规则随后端互斥自动切换，
  不需要玩家手动管。
- **Changed** 界面：生图设置卡改造 + NovelAI 参数区（候选下拉可手填）+ 图片浏览器 + 消息图片槽
  按编号取图与「图片已丢失」兜底。
- **Fixed** 下拉弹层：补全 `option` / `optgroup` 的主题底色，修掉分组标题与弹层四周因半透明而透底的问题。
- **Changed** 预设：内置预设里「3.1P破限」与「哈基米摆尾」默认关闭（规则本体与末尾排序表两处同步，
  实际生效的是排序表那份）。
- **Changed** 文档：重写 `spec/09-image-gen.md`，补齐后端分发、模型名单、候选命名与图片浏览器的说明。
- 本地验证：`typecheck` 无报错 / 97 条测试全过 / `lint` 0 error / 主产物与预设包均构建成功。

### `1efc300` — fix(image): 生图失败提示分清「没填 Key」与「被站点拒绝」，正文插图可折叠

- **Fixed** 云端出图失败时，把「还没填 API Key」和「Key 被站点拒绝」拆成两种提示；后者带上站点
  返回的原始说明，不再一律回一句「API Key 无效或没填」，免得把最有用的排查线索吞掉。
- **Changed** 正文里已生成的插图，底栏左侧那行文字提示改为折叠开关：点一下收起图片、只留底栏一行，
  再点一下展开；重画出新图时自动展开。
- **Removed** 清理因上面改动而失效的旧文案（中英各一条）。

### `4a6286c` — fix(runtime): 去掉变量更新补写的 60 秒硬超时，改为只跟随取消

- **Fixed** 变量更新补写（正文之后的第二遍请求）原来有一条写死的 60 秒超时，慢模型经常没回复完
  就被掐断，导致正文保留但变量整轮丢失。`runtime/standaloneTurn.ts` 拆掉整条超时链路
  （固定时长常量、定时中止信号、带超时的包装函数），两处调用点直接发起补写请求，只传主取消信号。
  补写现在只在玩家取消或新回合开始时中断，不再自动掐断。正文生成侧本来就没有超时，未改动；
  出图的独立超时也未改动。
- **Changed** `scripts/tests` 两条原本靠「把定时器加速成 0 毫秒」触发超时的测试，改为假请求返回
  HTTP 500，继续验证补写失败后的收尾（忙碌标志清零、失败信息落盘、正文保留）。
- **Removed** `src/composables/useMessageActions.ts` 清理随之失效的超时识别逻辑与两处「超时」提示分支，
  统一走变量更新失败提示（文案不变）。

## 2026-09-26

### `12366ff` — feat: 新增上下文裁剪体系与「功能设置」页

- **Added** 发送前裁剪：新增快照整形模块，按正文链与辅助链分别裁剪发给模型的世界状态。
  正文链剔除设置块，辅助链按在场情况裁剪 NPC，生存状态按当前模式保留；商城数据塌成空路径，
  减少无效 token 占用。总开关默认关闭，关闭时行为与旧版完全一致。
- **Added** 写入前拦截：变量更新补丁含下划线前缀路径时丢弃；生存模块关闭时丢弃生存状态相关路径。
- **Changed** 界面：界面设置右侧新增「功能设置」页，原「功能」卡与上下文裁剪整块迁入；
  裁剪开关改两列网格、开关靠右对齐，窄屏也能放下两列；开局向导设置页移除裁剪开关，只保留在正式界面。
- **Added** 变量更新格式说明按生存模式显隐规则；补充 6 项测试，全量 104/104 通过；同步 `spec` 03 / 05 / 08。

### `840e448` — refactor: 上下文裁剪的两项改为无条件生效

- **Changed** `$` 前缀剔除与生存状态按模式裁从可选开关里拿掉，改为任何情况下都执行。
  起因：总开关默认关闭，这两项跟着一起不生效 —— 默认状态下正文照样看得到玩家与 NPC 的生存状态数值
  （生存系统关着时那几个 100 毫无意义，只会诱导正文写出「你的血量是 100」这类出戏内容）。
  这是正确性要求，不是偏好，写进开关只会让它被误关掉。其余项（紧凑输出、剔「设置」、商城塌陷、
  NPC 裁剪、写入层拦截）仍跟总开关走。
- **Changed** `runtime/standaloneSnapshotTrim.ts`：删掉两个开关（类型、默认值、持久化键列表），
  新增 baseline 无条件项；总开关关闭时也走整形流程，不再直接返回原数据。
- **Changed** `SettingsPanel.vue` 删对应两行开关；`i18n` 删两条文案，说明改为「这两项始终生效」。
- **Changed** 测试：master switch 那条改名并改断言（关闭时两项照样生效），defaults to disabled 同步改；
  `spec/05-prompt-pipeline.md` 表格加「受总开关控制」列，并说明哪两项不受控。

### `979429a` — docs: 新增铁律 —— 动 schema 与本地内容文本前必须先确认

- **Added** `AGENTS.md` 新增一条铁律：`schema/` 是数据契约，`src/assets/standalone-local-content/`
  下的文本会被原样拼进发给模型的提示词。这两处都是逐字手工设计的，**每个字都有意义** ——
  改标点、调措辞、加一行 EJS 控制、挪一个换行，全都算改动。规则写进「协作方式（本仓特有）」，
  紧跟「改代码前先讲后动」之后，并明确这条更严：上一条允许对常规实现细节自行决定，
  这一条没有任何可自行决定的空间。
- 立这条的起因：`variable-update-format.txt` 曾随裁剪方案一起改动（加 EJS 条件包裹、
  把生存状态那一行拆成两个分支）而未单独确认。

### `fc7a934` — refactor: 上下文裁剪只剩「只发在场 NPC」一个开关

- **Changed** 其余裁剪全部改为无条件生效，不再提供开关：去 JSON 缩进、正文不发「设置」、
  商城只留路径、NPC 裁剪时保留重要与被关注、写入前拦截 `_` 字段与生存状态。这些要么是正确性要求，
  要么是纯收益无风险的整形，做成开关只会让「必须做的事」变成「可能没做」。
  「启用上下文裁剪」总开关一并删除 —— 只剩一个选项时它没有意义。
- **Changed** `runtime/standaloneSnapshotTrim.ts`：设置类型 9 个字段 → 1 个（`trimNpc`），
  组装函数去掉总开关分支，`compact` 恒为 true。
- **Changed** `SettingsPanel.vue`：11 行开关 → 1 行，删掉卡片说明、分组标题与已无引用的样式。
- **Changed** 写入层护栏改无条件（`useMessageActions` / `standaloneTurn`），
  `resolveStandalonePatchGuard` 不再依赖设置。
- **Removed** `i18n` 删 12 条文案（中英各 12），只留标题与「只发在场 NPC」。
- **Changed** 测试：`MasterSwitchKeepsUnconditionalTrims` → `AlwaysApplies`，
  `DefaultsToDisabled` → `DefaultsToEnabled`；`spec/03`、`spec/05` 同步。

## 2026-09-27

### `2fdfaae` — feat: 画风预置改为分组体系，生图种子可固定复现

- **Added** 画风预置从 4 套扩到 12 套，下拉按「动漫 / 写实 / 传统媒介 / 特殊风格」四组展示
  （`optgroup`），新增 `StylePresetGroupId` / `STYLE_PRESET_GROUPS` 与 `groupStylePresets()`；
  ComfyUI 与 NovelAI 两套预置的 id 与顺序一一对应。
- **Changed** 预置文本不再写死年代：原有 3 套的提示词全塞了年代标签（ComfyUI 三条带 `1980s`，
  NAI 三条带 `retro artstyle` / `vhs (style)` / `faded colors`），等于不管选哪套出图都被强制加一层
  复古滤镜 —— 而项目只是名字叫 1980s。年代改为交给剧情按需描述；只有「复古赛璐璐动画」保留复古卖点，
  降为普通一档。
- **Added** 关掉「每次出图都不一样」后可以填固定种子（留空自动补一个），出图可复现；
  种子完全由前端决定，**不再沿用工作流里写死的那个值**（那个值在本程序里不认）。
- **Added** 变量更新补丁新增格式修复层：补丁读不进去时先整形外壳（去代码围栏、全角标点转半角、
  抠出 JSON 内容、去注释、去多余逗号）再交回原解析 / 写入流程，整形过会在消息上留痕；
  实测 16 个畸形样本通过数 3 → 12，值保真 2/2。
- **Changed** 主回复不再重复走一遍补丁解析（主回合提示词已明令不输出 `<UpdateVariable>`，
  且送应用前先剥掉整个变量块），改为只解析标签、零行为变化；补丁唯一来源＝辅助 API。
- **Changed** NovelAI 画风下拉同步改为分组展示；`i18n` 增 13 个 key（4 个分组标题 + 9 个画风名），
  `filmPhoto` 由「八十年代胶片」改为「胶片摄影」。
- **Changed** 补充相关测试（`TEST_FILTER=rescue pnpm test`）；`eslint` 忽略 `docs/` 目录下的探针脚本
  （ESLint 不读 `.gitignore`，里面的 `.cjs` 探针原本会被误报 89 个 error）。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。
  已部署到线上，首页与本地 `dist/index.html` 逐字节一致（3,012,123 字节，sha256 `9047a702…`）。

### `934ff0c` — docs: 补齐缺失的 19 条 changelog，并把约定写进仓库内配置

- **Added** `CHANGELOG.md` 补齐 `af459a5`(09-23) 之后的 19 条记录（09-24 ~ 09-27）：
  该约定早在 `40376a1` 就写进 `CONTRIBUTING.md`，但此后一次都没执行，导致 19 个提交全缺。
  补录后 62 条 = 62 个提交，一一对应。
- **Changed** `AGENTS.md`「协作方式（本仓特有）」新增铁律：**一旦提交就必须同步补一条 changelog**，
  附自查判据（条目数 == 提交数）与这次漏写 19 条的事故记录 —— 约定得写在 AI / 协作者真会读到的地方，
  只写进 `CONTRIBUTING.md` 等于没写。
- **Changed** `CONTRIBUTING.md`「Changelog 约定」补「提交前自查」代码块（条数对齐 + `prettier --check`），
  并加粗一句「写 changelog 和改代码是同一件事的两半，不是可选的收尾步骤」。
- **Changed** `.github/pull_request_template.md`：勾选项「已**按需**更新 `CHANGELOG.md`」改为硬要求
  「每次提交都已补一条（附判据）」—— 「按需」正是这条约定被架空的根源；
  顺带补上模板里漏掉的 `pnpm test` 勾选项（CI 本来就有这道）。
- **Removed** 不采纳 CI 自动校验：直推 main（有 bypass）时 CI 根本不跑、拦不住主路径；
  且「条目数严格相等」的判据在 squash / merge 场景会误报，不可信的红灯比没有更糟。

### `046c5a9` — feat: 首页新增更新日志弹窗与右下角版本号

- **Added** 首页（封面页）新增更新日志弹窗：当前版本没看过才弹，点遮罩 / 关闭按钮 / `ESC` 都能关。
  内容是**玩家视角**的更新日志，与仓库根 `CHANGELOG.md` 分开维护 —— 那份带提交哈希、内部目录名
  与实现细节，不能直接给玩家看。关闭即写本地标记（`th1980s:changelog-seen-version`），
  同一版本不再弹。
- **Added** 首页右下角常驻当前版本号。版本号由更新日志条数推导：最早一条 1.00，之后每追加一条 +0.01，
  当前 11 条 = `v1.10` —— 以后加日志不用手改版本常量。
- **Added** `src/utils/changelog.ts`（日志数据 + 版本计算 + 已读判定）与
  `src/components/panels/ChangelogModal.vue`（弹窗本体）；`src/i18n/index.ts` 补 3 条中英文案。
- **Changed** 弹窗配色全部走主题令牌（`--glass-bg-heavy` / `--accent-primary` / `--ui-font-scale` 等），
  6 套主题逐一定义核对过，不学声明弹窗那样硬编码单套暗色。
- **Changed** 更新日志条目的日期沿用 `YYMMDD`、每条改动限 15 字以内，只写玩家看得见的变化。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

## 2026-09-28

### `aeb51bb` — fix: 更新日志弹窗改挂首页并重做视觉

- **Fixed** 更新日志弹窗此前挂在 App 根组件：它首帧就要显示，而挂载点 `#modal-container`
  在 App 组件树内部，此刻 `.app-container` 还没插进 `document` → `Teleport` 用
  `querySelector` 找不到目标，整块内容被静默丢弃（Vue 只在 dev 下警告）。
  现改挂到配置向导首页内，并给 `Teleport` 加 `defer`，把目标解析推迟到应用挂载完成后。
- **Changed** 弹窗挂载位置从 App 层挪进首页（`SetupWizard`）内部，只在首页出现、不再全局常驻；
  版本变化后首次进首页仍自动弹一次。挂在页面 `Transition` 之外，避免切页时跟着做过渡动画。
- **Changed** 首页右下角版本号由纯文本改为可点击按钮，点它可随时把更新日志翻出来重看
  —— 此前关掉就只能等下一次版本变化，看不到历史。
- **Changed** 弹窗视觉重做：去掉顶部标题区（版本号已在右下角），改为固定高度
  （`min(520px, 78%)`，窄屏 `min(560px, 86%)`）、超出部分在内容区内部滚动；
  卡片改半透明底（`--glass-bg-heavy` 走伪元素 + `opacity: 0.92`，避开渐变主题下 `color-mix` 整条失效）；
  遮罩暗度从 0.55 降到 0.25 且不再做磨砂 —— 首页背景本身是暗色场景图，
  整页模糊 + 高暗度会让弹窗与遮罩亮度趋同、看着像实心黑，透不出背后纹理。
- **Changed** 内容区类名从公共的 `.modal-body` 改为专属 `.changelog-body`：公共类在 `global.css`
  里带 `background: var(--bg-primary)` 实色底，会盖住卡片半透明效果，专属类名可彻底隔离。
- **Removed** `changelog.currentVersion` 中英文案（标题区去掉后不再使用）。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `377aee8` — feat: 生图支持自动出图与手动放弃

- **Added** 生图设置新增「自动生图」开关（默认关）：开启后正文里一出现**写完整**的生图提示词
  （`image###…###` 成对）就自动出图，不用手点；关着维持「手动点按钮」的原样。
  只在**正在生成**的那条消息上触发，打开旧存档不会把历史提示词一次性灌进出图队列；同一条只自动出一次。
- **Added** 「生成中」的图片槽新增**放弃**按钮：点了真掐断请求（走两条后端客户端既有的中止能力），
  该张落成「已放弃，可重新生成」并可点重试。按钮与「生成 / 重试」同位、同一套样式。
- **Fixed** 出图前工作流准备不了时（不是 API 格式 / JSON 坏），原来只弹提示就返回、
  **不写回图片状态** → 该张永远停在「生成中」转圈、再点也只是重新标一次「生成中」。
  现统一落成「失败」并把原因写在图上。
- **Fixed** 正文流式生成期间出的图会丢：此时正式楼层还没落地，图片记录写进 `messages` 找不到楼层被静默丢弃。
  现流式期间先按「楼层号 + 第几张」暂存，楼层落地时自动并回 —— 生成中点出图不白点。
- **Changed** 生成中（正文流式 / 变量更新）不再禁用出图按钮，随时可以点。
- **Changed** 玩家更新日志新增 260928 一条（自动出图 / 可放弃 / 修复卡住），版本号随之 +0.01。
- **Docs** `AGENTS.md` 新增「界面与样式」一节：UI 必须先找同类元素、优先复用已有类、
  同层级元素位置与尺寸与样式一致、别拿全局公共类名（`.modal-*`）做局部样式。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `a8678e6` — feat: 编辑消息支持小总结

- **Added** AI 楼层的编辑框现在把**小总结**跟正文放在同一个输入区里：小总结用它原本的 `<summary>` 标签
  包着跟在正文后面，把整段标签删掉就等于删掉这楼的小总结，不必另开一块输入区；
  用户楼层没有小总结，编辑框只给正文。
- **Fixed** 打开编辑框、一个字没改就发送，会把该楼的小总结抹掉 —— 编辑草稿此前只取正文，
  回写时「草稿里没有小总结」被当成「用户主动删掉了小总结」。现草稿从一开始就按编辑框形态
  （正文 + 小总结）存，拆解 / 写回互为逆操作。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `eacc241` — feat: 非流式也能触发自动生图

- **Fixed** 接口不支持流式时（请求按流式发、但只回一整坨 JSON）自动生图不触发：逐段回调一次都不触发，
  流式投影层压根不建立，消息上「正在流式」这个标记不为真，而自动生图此前只认它。
  现改为「**正在流式** 或 **这条消息刚落地**」—— 落地是流式与降级两条路径的公共终点。
  落地信号只在运行时真正落地时置位，换存档 / 清空消息会清回空，
  所以打开旧存档不会把历史提示词一次性灌进出图队列；去重判据（已有图 / 正在出图就跳过）一字未动。
- **Changed** 约定 `tools/` 为可复用工具目录（判据：换个参数还能再用 = 工具，只验证过某一次 = 一次性留 `Temp/`）：
  `AGENTS.md`「临时文件与工作目录」写明判据与「一律从项目根运行」，
  `.gitignore` 忽略 `tools/`（仅本地保留、不随仓库公开），`eslint.config.mjs` 忽略列表同步加 `tools/**`。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `d105c1c` — chore: 玩家更新日志补小总结条目

- **Changed** `src/utils/changelog.ts` 的 260928 条目补一条「编辑消息可改小总结」：
  该功能已在 `a8678e6` 上线，但玩家更新日志漏了 —— 玩家日志只写玩家看得见的变化，漏了等于玩家不知道。
- 顺带回填上一条（`eacc241`）的短哈希。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `97da430` — docs: reposition project as a general-purpose simulation platform

- **Changed** 项目定位表述统一校正为「**纯浏览器端的通用模拟经营 / 叙事模拟平台（题材不限）**」：
  `README.md`、`README.en.md`、`spec/README.md` 的首段定位句，`AGENTS.md` 的「项目上下文」，
  以及 `package.json` 的 `description`。原表述（「AI 文字角色扮演 / 世界模拟」「独立网页游戏」
  「Standalone 1980s-NW browser project」）都没点出「通用、题材不限」，容易被当成单一题材项目。
- 起因：仓库代号带 `1980s`，长期被误读成「1980s 专属题材」；实际内置约 40 个世界观预设
  与 21 个创意工坊世界包，横跨现实 / 历史 / 修仙 / 奇幻 / 科幻 / 动漫 / 末世 / 无限流，题材不限。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `1f2f7c9` — feat: 预设条目支持调整顺序

- **Added** 「内容中心 → 预设 → 预设条目」的条目可以调整顺序：每条右侧新增上移 / 下移按钮，
  首条与末条自动禁用。这个顺序就是实际发送给 AI 的块顺序（列表上方的「发送内容列表」同步反映），
  所以调整顺序等于调整发送结构。按钮写法与样式沿用项目已有的世界书条目、助手接口配置卡。
- **Changed** 顺序调整只对可编辑预设（导入的 / 「复制为可编辑副本」出来的）生效，
  内置预设只读、按钮禁用；改动即时落盘，不需要再点「保存条目」。
- **Fixed** 移动条目不再重置编辑表单：此前「展开条目改了内容还没保存就点移动」会把未保存的改动冲掉。
- 四道检查：`typecheck` ✓ ｜ `test` 105/105 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `2372942` — fix: 正文标签丢失时自动补齐

- **Fixed** 模型偶尔漏写 `<contenttext>` 包裹（正文裸在 `</analysis_block>` 与 `<summary>` 之间）时正文被吞：
  落库那条走「整段原文」兜底，把 `<analysis_block>` / `<summary>` / `<action_options>` 连同正文一起当正文显示；
  流式预览那条正文直接为空。现改为没有 `<contenttext>` 时把非正文块（思考 / 小总结 / 变量块 / 行动选项）
  整块剥掉，剩下的文字当正文 —— 等价于在 `</analysis_block>` 之后、`<summary>` 之前把正文框回来。
- **Fixed** 生图提示词外衣 `<texttoimage>` 只去标签本身、保留里面的 `image### 提示词 ###`
  （整块剥掉会把图一起弄没）；流式输出中途未闭合的半截块从开标签处截断，不再闪进正文预览。
- **Changed** 补齐逻辑收在 `src/utils/taggedReply.ts` 一处，四个入口同时生效
  （后端落库 / 前端流式预览 / 编辑后重解析 / 消息卡渲染）；`<contenttext>` 存在但内容为空时**不**兜底，
  避免拿别的块凑正文。
- **Added** 两条回归测试（完整回复、流式各一条，共 8 个用例），测试套件 105 → 107 条。
- **Changed** 玩家更新日志（`src/utils/changelog.ts`）260928 追加一条「修复正文标签丢失」——
  这条修复玩家看得见（正文不再串标签、不再空白），玩家日志不该漏。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `9f3df3d` — feat: 变量更新失败后可直接重试

- **Added** 变量更新失败时，在消息卡「变量更新」折叠标题的「更新失败」徽标右侧新增**重试**按钮：
  点一下按原回复重跑变量更新（走辅助 API），正文不重新生成，跑完状态回到「已更新」或再次「更新失败」。
  按钮只在**最新一条 AI 回复**上出现 —— 重跑是以「这条回复之前的快照」为基线重算、并直接提交为当前存档，
  对历史楼层重跑会把存档倒回那层、丢掉后面楼层已演进的进度，所以非最新楼层即使失败也不给入口。
- **Changed** 按钮样式沿用出图槽那排（描边胶囊 + 悬停转主色），未另起一套观感；
  点击加了阻止冒泡，不会连带把折叠区展开 / 收起。
- **Changed** `i18n` 增 `messageCard.variableUpdateRetry`（中「重试」/ 英「Retry」）。
- **Changed** 玩家更新日志（`src/utils/changelog.ts`）260928 追加「变量更新失败可重试」。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `build` ✓ ｜ `lint` 本次改动文件零输出
  （仓库级 `lint` 另报 4 个 error，全部来自未跟踪的 `server/multiplayer/.wrangler/tmp/` 构建缓存，
  与本次改动无关）。

## 2026-09-29

### `ac01ce0` — chore: server 子项目暂不纳入版本控制

- **Changed** `.gitignore` 忽略 `server/`：联机服务子项目尚未完成，先只留本地、不进版本控制。
- **Changed** `eslint.config.mjs` 忽略列表加 `server/**`：它 `.wrangler/tmp/` 下的构建缓存
  会被 `no-unused-vars` / `no-empty` 误报成 error —— 上一条提交（`9f3df3d`）记录的那 4 个
  仓库级 `lint` error 即出自此处，本次一并消掉，仓库级 `lint` 回到 0 error。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `3f3ace4` — feat: API 列表支持复制配置

- **Added** API 列表每张卡片新增**复制**按钮（在卡片头部那排图标里，位于删除左侧）：
  点一下把该条配置整份克隆（地址、密钥、模型、已拉取的模型列表），新条目紧跟原条目后面，
  内部编号重新生成、不会与原条目撞号。游戏内设置浮层与开局向导设置页两处都加。
- **Changed** 复制后立即落盘（与上移 / 下移同一套 persist + 失败回滚 + 错误提示），刷新不丢；
  副本不自动勾选成主 API / 辅助 API，参不参与重试仍由玩家自己勾（与删除时自动摘勾的逻辑对称）。
- **Changed** `i18n` 增 `settings.duplicateApi`（中「复制此 API」/ 英「Duplicate this API」）。
- **Changed** 玩家更新日志（`src/utils/changelog.ts`）新增 260929 一条「API 配置可一键复制」。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `061ee7e` — refactor(ui): 统一浮层令牌、图标按钮与面板内距

- **Changed** 圆角与卡片底色收口到统一令牌：全项目 `var(--radius-*)` → `var(--ui-radius-*)`
  （532 处，41 个 `.vue` 加 `global.css` / `setup-shared.css`）；`--bg-card` / `--card-bg`
  在**变量定义层**统一指向 `--card-bg-strong`（12 处定义 + 39 处引用）—— 现在两者全项目零引用，
  仅作兼容别名保留。改定义层而不是逐处替换，是为了后续新增引用自动同色。
- **Changed** `.glass` / `.glass-heavy` 从「底色 + 模糊 + 四边描边 + 阴影」瘦成只给底色 + 模糊的
  基础层；左侧栏与右侧栏接上 `.glass`（这两处原本就是「`--glass-bg` + `--glass-blur-light`」，
  接线后视觉零变化）。
- **Changed** `.ui-card` 从「20px 圆角 + 光泽层 + 悬停浮起」改为「13px + `--card-shadow`，
  无光泽、无悬停」，悬停浮起拆成可选修饰类 `.ui-card--interactive`；6 处「四条声明与 `.ui-card`
  完全一致」的卡片容器接上该类（零视觉变化）。
- **Changed** 新增全局 `.ui-icon-btn`（只管底色 / 描边 / 圆角 / 悬停 / 禁用态，宽高由使用处给）
  及 `.danger` / `.warning` / `.accent` 变体：设置面板 10 处 API 操作按钮、业务详情删除按钮、
  确认框两个按钮统一接上，确认框自身皮肤瘦身约 120 行。顺手修掉「删除按钮 hover 反而不红」——
  原先危险变体的悬停色被通用悬停规则盖掉了。
- **Changed** 输入框样式收口到 `.ui-control`，替换 34 处 `.setup-field-input`（含删掉
  `setup-shared.css` 里那份逐条重复的定义、`global.css` 里两条并行主题选择器）；
  带框输入框现在只有一处来源。`.setup-underline-input`（下划线风格）按设计保留。
- **Fixed** 清掉面板 / 弹窗自己叠加的内距：派系 24px、商业上边 24px、设置右侧 14px、
  内容中心 `gap` 10px、业务详情弹窗 10px 等 → 内距只由外框统一给 12px。
  赞赏页与笔记本按设计保留原内距。
- **Changed** 商城 / 抽奖顶部积分栏等高：内距统一 `16px 18px`、积分图标统一 24px、
  加 `min-height: 76px` 抹平两侧内容天然高度差（改前约 68px vs 73px）。
- **Changed** 商业面板里那个「带边框圆角的小卡片」`.stat-item` 改名 `.stat-tile` ——
  它与全局同名的「文字统计项」是两种东西，此前靠 scoped 覆盖共存。
- **Removed** `--compact-confirm-*` 6 个变量在 5 个主题块里的 30 行定义（确认框已并入
  `.ui-icon-btn` 体系，全项目零引用）。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `efb7706` — fix: 辅助 API 补丁不可用时自动换下一个候选

- **Fixed** 辅助 API 返回的 `<UpdateVariable>` 块存在、但内容不可用（没有 `<JSONPatch>`、
  JSON 解析不了、补丁写不进状态）时，此前会直接判定更新失败、不再尝试后面的候选 ——
  后面配着的辅助 API 一个都不会被用到。现在拿到块先按正式流程试算一遍
  （格式化 → 解析 → 写入护栏 → 应用），只有真的写进状态（界面显示「已更新」）才收下，
  否则记一笔继续试下一个；候选全部试完仍无一成功才报失败，失败原因逐条列出
  （哪个 API、卡在哪一步）。
- **Changed** 判据与界面一致：以「变量更新真的成功」为准，而不是「拿到了块」。
  自动回合收尾与手动重跑共用这一处逻辑，两条路径同时生效；
  「自动重试」开关语义不变（关掉时只留第一个候选，坏了也不换）。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `9022be8` — chore: 回填 CHANGELOG 短哈希

- **Changed** 回填上两条记录的短哈希（`061ee7e` / `efb7706`）—— 纯文档改动。
  同批一并回填上一轮遗留的 `3f3ace4`。

### `a5cf698` — chore: 玩家更新日志补两条

- **Changed** 玩家更新日志（`src/utils/changelog.ts`）260929 追加「变量更新失败自动换API」
  与「面板与按钮样式统一」：上两个提交（`061ee7e` / `efb7706`）都有玩家在界面上看得见的变化 ——
  变量更新遇坏内容会自己换备用 API、按钮与卡片样式统一 —— 玩家日志不该漏。
- 四道检查：`typecheck` ✓ ｜ `test` 107/107 ✓ ｜ `lint` 0 error（17 个存量 warning）✓ ｜ `build` ✓。

### `e03e73c` — feat: 每回合自动存档、API 首字超时看门狗与一批界面修复

> 短哈希待回填（按约定并入下一次提交）。

- **Added** 每回合**自动存档**：变量更新成功、状态已落盘之后，紧接着写一份存档。
  它固定用编号 `standalone-archive-auto`、每轮覆盖同一个 storage key，所以**永远只占一行、
  只保留最新局面**，不像手动存档那样越存越多；存档列表与「继续游戏」的存档选择器里都能看到它，
  并带独立标识（列表里是「自动存档」小标签 + 时间字段显示「最后更新」，
  选择器里是时间左侧一枚金色徽标）与手动档区分开。
- **Added** 自动存档写入用一条 Promise 链串行化：存档是异步落盘、每回合都会触发，
  两轮挨得极近时两次写入可能乱序完成、把旧快照盖在新快照上；排队后保证「最后写进去的 = 最新局面」。
- **Added** API 配置新增「**首字超时判失败**」开关（默认**关**，老存档升级后行为与之前完全一致）：
  打开后，流式请求超过设定秒数还没收到任何正文增量就掐断判失败，秒数可填 1~600（默认 30），
  非法输入回落默认、越界夹到区间内。计时从「请求发出」开始算，所以连接挂死、响应头都不回的情况同样算失败；
  收到第一段正文就停表，之后出字再慢也不再按超时处理。看门狗与「玩家主动取消」共用同一个中断控制器，
  点停止仍然立即生效。超时抛的是机器码 `standalone_first_token_timeout:<秒>`，
  界面按当前语言显示成「模型 N 秒内没有输出任何内容，已按失败处理（首字超时）」。
  游戏内设置浮层与开局向导设置页两处都加，顺带把原来的「自动重试」复选框换成同款开关、说明居右。
- **Changed** 三个面板（商业 / 派系 / 笔记本）的头部栏底色从实色改成透明，交给外层浮层统一承担 ——
  半透明主题下原来那条自铺的底色会与两侧割裂；内容区上方补一条与头部下内距等宽的白，
  否则头部只剩一条细线收口、区块贴着线（笔记页 tab 内容区就是这种做法）。
  商业面板的统计条另修两处：`justify-content` 回到靠左（全局 `.stats-bar` 是 space-around）、
  去掉 `backdrop-filter` 并显式清掉全局的渐变 `border-image`。
- **Changed** 本地内容测试补三条：对话引号着色的回归用例、首字超时（挂死流被掐断后抛机器码）、
  首字到达后不再被超时打断。另在扫描中标记出一条**未注册的死测试**（期望与当前提示词组装不符：
  首条 system 消息已不含 `[原版预设:主系统提示词]`，夹具里的 `世界` 字段也早已从 `createRenderContext()`
  移除，后者已就地修掉）—— 它想覆盖的场景已由 `testMainPromptSkipsDuplicatedMappedPresetSections` 覆盖，
  保留注释说明复活它需要按当前真实输出重写断言。
- **Changed** `.gitignore` 忽略 `.playwright-cli/`（本机无头浏览器探测留下的目录）。
- **Fixed** 对话引号内含转义字符时**着色错位**：正文里的单引号 / 尖括号会被转义成 `&#39;` / `&lt;` /
  `&gt;`（都含 `&`），原先 `&quot;` 配对的字符类排除了 `&`，一旦对话里出现它们配对就被切断，
  引号颜色会串到别的句子上。改为 `[\s\S]*?` 惰性匹配。
- **Removed** 顶栏「存档（生成大总结并下载）」按钮及整套逻辑：`HeaderBar.vue` 整文件删除（563 行，
  自扁平化改版起一直 `display:none` 却仍在挂载、跑 document 监听），`App.vue` 去掉 `#header` 插槽与
  它的 import，`MainLayout.vue` 的 `--header-height: 0px` 保留但注释改为「顶栏已删除」。
  三点菜单从四项变三项（刷新变量 / 回到首页 / 全屏）；顺带把刷新失败提示从 `header.archiveFailed`
  改回语义正确的 `header.refreshFailed`。清掉 7 个只剩它引用的 i18n key（中英各一）：
  `header.archiving` / `header.archiveAndDownload` / `header.archiveConfirmTitle` /
  `header.archiveConfirmMessage` / `header.continueArchive` / `header.archiveSuccess` / `header.archiveFailed`。
  ⚠️ 该按钮与设置页的「阶段总结归档」**本就不重复** —— 它只打包快照下载、零 API 调用，
  历史文案「生成大总结」是遗留措辞，从未实现过；玩家要的功能一个没少。
- **Changed** 玩家更新日志（`src/utils/changelog.ts`）260929 追加五条：「API 首字超时可中断」
  「修复引号导致文字变色」「修复面板顶部样式」「每回合自动存档」「移除顶栏存档按钮」。
- 四道检查：`typecheck` ✓ ｜ `test` 113/113 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓ ｜
  `check:i18n` PASS。

## 2026-09-30

### `6ba66c8` — docs: 高敏感资产（schema / 提示词）改动前必须先确认

- **Added** `CONTRIBUTING.md` 新增「🔴 高敏感资产：改动前必须先确认」一节：用表格列出四处逐字手工设计的
  资产（`schema/` 数据契约、`src/assets/standalone-local-content/` 本地提示词与 EJS 模板、
  `src/assets/standalone-worldbooks/` 内置世界资料、各预设里的提示词文本），并说明各自的敏感点
  （`schema/` 影响存档兼容与变量更新链路；提示词文本会被**原样**拼进发给模型的提示词）。
  规则要求先开 Issue 说明「改哪一句 / 改成什么 / 为什么」、确认后再提 PR，
  明确「顺带调整」「统一措辞」不构成授权、未经确认的 PR 会被要求先回退。
  此前 `CONTRIBUTING.md` 对这类资产**完全没有约定**。
- **Changed** `AGENTS.md` 同一条 🔴🔴 准则的覆盖范围从两处（`schema/` 与 `standalone-local-content/`）
  扩到四处，补上 `standalone-worldbooks/` 与各预设里的提示词文本，与 `CONTRIBUTING.md` 口径对齐。
- **Changed** 顺带回填上一条提交 `e03e73c` 的短哈希（按约定并入本次提交，不单独开回填提交）。
- 四道检查：`typecheck` ✓ ｜ `test` 113/113 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

## 2026-10-01

### `80c0705` — feat: 出图限流闸门与渠道判定、调试页留档失败请求、变量更新报错可定位

- **Added** 「内容中心 → 控制台调试」新增「失败的请求」区块。主 API / 辅助 API 报错后弹窗一闪而过，
  原先调试页里**一条都留不下** —— 列表是 assistant 消息楼层派生的，而失败回合根本不会产生楼层。
  现在请求一发出就先存快照（地址 / 模型 / 完整请求体 / 时间），失败时补上 HTTP 状态、服务端原始返回与错误文案；
  调试页最上方可展开回看「请求消息 / 请求体 / 原始返回 / 错误」，并可一键清空（二次确认）。
- **Added** 失败记录只留最近 20 条（新的插到最前），单条按 `request_body_text` 60k / `raw_response_text` 20k /
  每条 message 8k 截断，避免完整提示词撑爆 IndexedDB 配额。存储 key `th1980s:standalone-ai-debug-failures`，
  **固定 key、不绑会话**（绑会话会让 store 初始化被迫异步）。新增 `scripts/tests/check-ai-debug-failures.cjs`
  （35 项断言：截断 / 滚动 / 非法数据读取 / 往返 / 异常取回），已挂进 `pnpm test` 链。
- **Changed** 记录口径 = 「**实际发出、没拿到可用结果的请求**」：玩家主动取消（abort）、API 未配齐这类
  「请求压根没发出去」的情况**不记**。请求层失败时把 trace 挂到抛出的 `Error` 上（`standaloneDebugTrace` 属性），
  上层据此留档；`StandaloneAiDebugPassTrace` 补 `api_url` / `http_status` 两个可选字段（老存档可读）。
- **Added** NovelAI 出图走**模块级全局闸门**：同时只跑 1 条、相邻请求最小间隔 1 秒、吃到 429 后全局冷却 5 秒
  并按 3s → 6s 指数退避重试（最多 2 次）。此前自动生图会把一楼的多个提示词**一次性全触发**，
  同一瞬间多条并发打向同一个站，很容易被限流；排队等待不计入超时，失败路径也必须归还闸门。
- **Added** 出图渠道**自动判定**（地址 host 是 `image.novelai.net` / `novelai.net` → 官方，其余 → 兼容站），
  玩家不用选。判定结果只用于收窄「采样器 / 调度候选」与「获取模型」的行为，**不改变请求体结构**；
  判成官方时「获取模型」直接短路（一次请求都不发，文案改成「请手动填写模型名」），
  不再白试三个必然失败的端点。采样器下拉按渠道只显示当前那一组，但**当前值永远并进本组**，
  避免老配置掉成「自定义…」看着像坏了。
- **Changed** 变量更新失败时**报错能定位**：补丁应用失败会带上「第 N/M 条补丁（操作 + 完整路径）」，
  父路径不存在会指出断在第几段、断点路径是什么。此前只有一句「补丁无法应用」，
  玩家和排查都只能靠猜。测试补一条断言锁住这个格式。
- **Changed** 提示词（`standalone-local-content/`）把「罩杯 / 身材（身高体重三围）」统一换成**体型**
  （`plot-text-to-image.md` 的 5 个句式模板 + `variable-update-rules.txt` 的外貌字段规则，
  取值为 `纤细 / 苗条 / 匀称 / 丰满 / 娇小 / 高挑`）。
- **Changed** 消息卡片「变量更新失败原因」的标签去掉多余的冒号（后面紧跟的就是内容）。
- **Changed** 玩家更新日志（`src/utils/changelog.ts`）261001 追加三条：「调试页可回看失败请求」
  「出图遇限流自动重试」「变量更新报错可定位」。
- 四道检查：`typecheck` ✓ ｜ `test` 113 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓ ｜
  `check:i18n` PASS。

### `a829a0c` — chore: 出图与外貌提示词补「体型」「年龄」写法约束

> 短哈希待回填（按约定并入下一次提交）。

- **Changed** 出图提示词（`plot-text-to-image.md` / `plot-text-to-image-nai.md`）新增两条约束：
  ① 明确「你写的这段是直接交给绘图模型的画面内容，画风与质量词由程序在后台拼在你这段前面」，
  避免模型在正文里重复堆画风 / 质量标签；② 外貌只用体型词描述，不写三围 / 罩杯等具体数字或尺码
  （即使 `/个人信息/外貌` 字段里有也不写）。
- **Changed** 出图提示词新增「年龄感」写法：一律不写年龄数字，改用正向词带出
  （年轻 `young` / `youthful`，成熟 `mature` / `elegant` / `sophisticated`，年长 `middle-aged` / `elderly`）；
  成熟及以上**必须搭配** `beautiful` / `elegant` 类正向词，单写 `mature` / `middle-aged` 会显老，
  可加 `smooth flawless skin` 往回拉。NovelAI 版按标签流给等价写法（`young woman` / `mature female` / `old woman`）。
- **Changed** 变量更新规则（`variable-update-rules.txt`）外貌字段补「一律用体型描述，禁止写三围、罩杯等具体数字或尺码」。
- **Changed** 顺带回填上一条提交 `80c0705` 的短哈希（按约定并入本次提交，不单独开回填提交）。
- 四道检查：`typecheck` ✓ ｜ `test` 113/113 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

## 2026-10-02

### `6e8a5f9` — perf: 变量更新链优化：报错可定位、NPC 编号防撞、提示词大幅精简

> 短哈希待回填（按约定并入下一次提交）。

- **Changed** 补丁报错补上**定位信息**。起因是两类「补丁文本看着一点没错、就是写不进去」的失败：
  ① `replace` / `remove` 打到一个**挂在下层对象里**的键 —— 真实成因多半是**路径少写了一层**
  （实测：`/人物档案/NPC_1/当前状态` 少了 `个人信息` 这一层），报错却只说「键不存在」，
  看着像字段名写错，来回找也看不出问题；② `insert` 打到一个**已存在**的键 —— 新增 NPC 撞了已占用的编号。
  现在 ① 会在下一层里找同名键，唯一命中就直接写出正确路径，例如
  `Object target key does not exist: 当前状态（父对象 /人物档案/NPC_1 里没有这个键，但它挂在下层对象 "个人信息" 里 —— 正确路径应为 /人物档案/NPC_1/个人信息/当前状态）；replace 只能改已存在的键，新建字段请用 insert`；
  ② 会指明「覆盖已存在的对象请用 replace，新建 NPC 请换一个未被占用的编号」。
- **Changed** 下一层有**多个**同名键时只报父对象、**不给路径** —— 给错等于引导改坏数据，宁可不给。
- **Changed** 其余报错各补一句：`delta` 打到非数字字段会带出当前值类型；数组下标类报错带出数组长度；
  路径不以 `/` 开头、父级既不是对象也不是数组、整份数据替换等情形也各有一句说明。
- **Added** 单测 `variable update patch error hints`：锁住「唯一命中下层对象时给出正确路径」
  「歧义时不给路径」「insert 撞已存在键时指明改用 replace」三条。

- **Fixed** 新增 NPC 撞编号。变量更新链的快照会按「在场」裁剪 NPC，被裁掉的 NPC 在提示词里
  **彻底消失**，但补丁校验仍按完整数据做 —— 模型只能拿看得见的编号往后推，于是撞上一个不在场 NPC 的编号。
  `src/assets/standalone-local-content/variable-update-format.txt` 开头新增一段脚本，从**完整存档**
  （`stat_data`，不是裁剪后的快照）算出已占用编号与下一个可用编号，在 `rule` 段输出两行：
  `NPC ids in use: NPC_1, NPC_2, NPC_4, NPC_7` 与
  `next new NPC id: NPC_8 (snapshot omits absent NPCs, whose ids remain occupied)`。
  没有 NPC 时自动省略「已占用」那行；键不是 `NPC_数字` 格式的不参与计数。
- **Removed** 三句「没有变量可更新」的兜底说明（实际每轮必然有变量要更新）：`variable-update-format.txt`
  的 `rule` 段与 `[Legality Check]` 段各一句，以及 `runtime/standaloneTurn.ts` 元指令里的第 4 条
  —— 原第 5 条「商城刷新例外」顺位改为第 4 条，措辞去掉「例外」。
- **Changed** 删两句、加两行，该文件渲染后体积基本持平。
- 验证：渲染探针三种场景（编号跳号 `1/2/4/7`、一个 NPC 都没有、键不是 `NPC_数字` 格式）输出均正确。

- **Changed** `src/assets/standalone-local-content/variable-update-format.txt` 的 `<Analysis>` 模板
  从七段（场景锚点 / 角色状态速查 / 变量清单 / 意图校准 / 逻辑构建 / 跳过声明 / 合法性检查）压成 6 行。
  `<Analysis>` 排在 `<JSONPatch>` **之前** —— 模型照模板逐项写满会拉长输出，
  一旦截断**先丢的是补丁**，整批作废。源文件 5,832 → 4,158 字节（101 → 62 行）。
- **Removed** 逐字段检查清单（10 行）压成一行 `before finalizing, check: ...`；
  删掉 `[Skip Declaration]`、`[Logic Construction]`、`[Character Status Quick Check]` 三段纯思考引导。
- **Removed** 三条创作约束（不过度解读玩家输入 / 不写支配服从框架 / 保持角色独立性）——
  变量更新链只读正文、出补丁，不生成剧情，这类约束归正文链（预设侧）管。
- **Added** 一句明确的写短指令：`keep it brief ... the patch matters, not the analysis`。
- **Changed** 保留的硬约束一条没丢：输出语言、格式封口、关系变化需事件支撑、在场 NPC 状态必须更新、生存逻辑自检。
- **Fixed** 连带修掉单测 `variable update format hides survival rules by mode` 的 4 条失效断言 ——
  它们断言的字符串全部来自被删掉的 `<Analysis>` 模板。format 现在只区分「关闭 vs 开启」，
  不再区分「基础 vs 生存」（逐字段清单的职责在 `variable-update-rules.txt`），断言据此改写。

- **Changed** `variable-update-format.txt` 的 `rule` 段从 20 条压到 13 条，渲染后 2,041 → 1,380 字节（**−32%**），
  整个文件 3,326 → 2,665 字节（**−20%**）。这是该文件渲染后的最大一块（占 61%），
  压缩方式只有合并重复与精简措辞，**硬约束一条没删**（除下条）。
- **Changed** `insert` 的 6 个子项（对象新建键 / 数组追加 `/-` / 数组下标 `/{index}` / 禁止 insert 到数组根 /
  事件日志追加 / 增量优先）压成 2 条；`replace` / `delta` / `remove` 三条「目标须已存在」合并表述。
- **Removed** `no redundant operations: do not emit duplicate writes to same path in one patch unless strictly ordered and necessary` ——
  模型极少主动发重复写，且「除非严格有序且必要」这个例外等于把规则架空；校验层对重复写本就容忍（顺序执行），
  删了最多多几条冗余操作，不影响正确性。
- **Fixed** 语法错误：`output only contain exactly one` → `output exactly one <UpdateVariable> block containing one <Analysis> and one <JSONPatch>`。
- 验证：渲染探针输出正常（警告无），四类 EJS 结构（脚本块 / 条件块 / 插值 / 内联条件）在三种存档场景下均正确。
- 四道检查：`typecheck` ✓ ｜ `test` 114/114 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

### `00e8860` — chore: 补玩家更新日志（261002）

- **Added** `src/utils/changelog.ts` 的 `CHANGELOG_SOURCE` 追加 `261002` 一条：
  `新增NPC不再撞编号`、`补丁报错提示更准确` —— 上一批变量更新链改动里玩家能感知的两点。
  那批改动原本按当时的口径没进玩家日志，本次补上（版本号随之 +0.01，玩家下次打开会弹一次）。
- **Changed** 顺带回填上一条提交 `6e8a5f9` 的短哈希（按约定并入本次提交，不单独开回填提交）。

## 2026-10-04

### `d720893` — fix: 变量更新补丁漏层路径修复：快照带缩进、兜底补全中间层、手动刷新取基点

- **Fixed** 快照改回**带缩进**输出（`runtime/standaloneSnapshotTrim.ts` 的 `compact: true` → `false`）。
  根因：单行紧凑 JSON 把 NPC 的 `个人信息` 这一层埋进上千字符的长行里，模型分不清
  `当前状态` / `当前位置` 挂在哪一层，写出 `/人物档案/NPC_1/当前状态` 这类**少一层**的路径被写入层拦下。
  实测同一快照单行 1,437 字符 vs 多行 2,859 字符（约翻倍），属正确性必要开销，不再为省 token 压成单行。
- **Fixed** 补丁修复层（`src/utils/variableUpdateRescue.ts`）新增「**漏写中间层**」路径补全：
  文本能读成合法补丁后，逐条检查路径，对走不到的段在父对象的直接子对象里找**恰好一个**含该字段名的对象补回去。
  三条闸门缺一不可 —— ① 只补一层、断点前缀须全部真实存在；② 候选唯一命中（0 个或 ≥2 个都不动）；
  ③ 补完必须能走通。不限定根（`玩家` / `人物档案.<NPC>` / `世界`… 任何一层都适用），**只改写法、不改值**。
  例：`/玩家/主货币/数量` → `/玩家/货币资源/主货币/数量`；`/人物档案/NPC_1/当前状态` → `/人物档案/NPC_1/个人信息/当前状态`。
- **Fixed** 手动刷新变量的**取基点**错误。新增消息字段 `variable_update_base_snapshot`（`src/stores/messages.ts`
  - `src/utils/standaloneRuntimeSchemas.ts`）：记录「主回复完成那一刻」的游戏数据 S，写入后不再改动
    （区别于回合收尾会被覆盖成最终状态的 `stat_data_snapshot`）。刷新时优先取它，避免用「当前存档」
    （已含后续回合改动 → 重复累加）或「发送时快照」（丢掉主 API 生成期间的操作）；旧存档没有该键则回退用户消息快照。
- **Changed** 运行时（`runtime/standaloneTurn.ts`）新增 `readLiveStatData` 回调，把「辅助 API 的输入基底」
  与「应用补丁的基底」统一到同一处读取：正文回来读一次作 S，应用补丁时再读一次作基底（含生成期间的前端改动），
  补丁全程只在运行时**净应用一次**。
- **Removed** 前端（`src/composables/useMessageActions.ts`）的 `rebaseVariableUpdateOntoLiveState` 补丁重放逻辑
  及其 `rebaseOntoLiveState` 开关 —— 改由运行时单点应用后不再需要，同时消除「重放导致重复累加」的隐患。
- **Changed** 提示词（`variable-update-format.txt`）：`<Analysis>` 段恢复逐项检查清单，并补一句
  **NPC 字段层级说明**（`当前穿着` / `当前位置` / `当前状态` … 在 `人物档案.<NPC_ID>.个人信息` 下、关系数据是独立对象）；
  `variable-update-rules.txt` 去掉重要 NPC 行里冗余的「个人信息.」前缀。
- **Changed** 世界书 `standalone-worldbooks/time-loop.md` 的 NPC 结构改为 `个人信息` / `关系数据` 两层嵌套，与 schema 对齐。
- **Changed** `spec/05-prompt-pipeline.md`：把「去 JSON 缩进（紧凑输出）」一条改为「快照带缩进输出（不做紧凑化）」，
  并补上单行 vs 多行的实测数据与原因。
- **Added** 单测（`scripts/tests/run-standalone-local-content-tests.ts`，+317 行）：补丁应用到「应用时刻读到的实时数据」、
  缺 `readLiveStatData` 时回退、手动刷新优先用存的 S、快照 `compact === false`、漏层路径补全（个人信息层 / 关系数据层 /
  世界层 / 正确路径不动 / 未知字段不动 / 歧义不动）。
- 四道检查：`typecheck` ✓ ｜ `test` 118/118 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

### `e465c44` — chore: 补玩家更新日志（261004）

- **Added** `src/utils/changelog.ts` 的 `CHANGELOG_SOURCE` 追加 `261004` 一条：
  `NPC 变量更新更稳`、`刷新变量不再算错` —— 上一条提交 `d720893` 里玩家能感知的两点。
  版本号 1.14 → **1.15**，玩家下次打开会弹一次。
- **Changed** 顺带回填上一条提交 `d720893` 的短哈希（按约定并入本次提交，不单独开回填提交）。

## 2026-10-05

### `62a045a` — refactor: 抽奖拆成独立 AI 请求；提示词补补丁规则与物品 / 技能定义独立成段

- **Changed** 抽奖从「挂在剧情回合上」重构为**一次独立 AI 请求**（专用提示词 + 抽奖 API），
  正文链与变量更新链不再出现任何抽奖规则或抽奖字段；抽奖结果只进聊天流，不进剧情历史与前情提要。
- **Added** 设置新增**抽奖 API**（可单独指定，缺省回退主 API）；新增抽奖专用提示词
  `src/assets/standalone-local-content/lottery-request-prompt.txt`。
- **Changed** 品质 / 次数 / 保底改由前端算好（`src/utils/lottery.ts` 的 `planLotteryDraw`）再交给模型，
  模型只按指定品质生成物品 / 技能；抽奖进度存会话（`lottery_state`）并随楼层快照（`lottery_state_snapshot`）回退。
- **Changed** 抽奖请求的「重新发送」= **重来**：复用原楼层存的抽奖参数（`lottery_request`）与「扣费后」快照，
  不重复扣费；抽奖结果楼层屏蔽「编辑 / 重新生成 / 删除 / 重试变量更新」按钮。
- **Changed** 抽奖失败不再退款、不再删请求楼层 —— 请求楼层原地保留，状态停在「发送抽奖那一刻」，
  玩家点「重新发送」重来；失败仍弹错误提示。
- **Removed** 抽奖四个 schema 字段（`抽奖触发` / `$保底次数` / `保底触发` / `抽奖次数`）从 schema、
  约 34 个预设、21 个世界包、i18n 白名单中全部移除；旧存档由 zod 自动剥除未知字段。
- **Removed** 抽奖的积分强制回写（`restoreFrontendPointsForLottery`）、失败退款逻辑、旧的
  `scriptedTurn` 权宜机制与 `plot-lottery-rules.txt`。
- **Fixed** **积分 / 商城刷新 / 签到日期改随楼层回退**：原先 `preserveFrontendAuthoritativeFields`
  在回退时保留这三个字段的实时值，导致「买了东西回滚后物品没了、积分也没回来」；
  现改为所有字段一起回退，保证「回滚 = 回到过去」。该机制仅保留「AI 回合收尾对账」用途。
- **Changed** 抽奖 API 轮询的应用基底固定为「发送抽奖那一刻」的快照（不再每次读实时会话），
  多次候选 API 尝试互不累积。
- **Changed** `spec/05-prompt-pipeline.md`、`spec/06-content-assets.md`、`spec/08-state-and-save.md` 同步更新。
- **Added** `src/assets/standalone-local-content/lottery-item-skill-rules.txt`：物品栏 / 技能系统 / 品质五档的定义，
  从 `variable-update-rules.txt` 抄一份给抽奖请求用（抽奖请求不带 `variable-update-rules.txt`，
  原先模型拿不到品质语义与字段契约）。
- **Changed** 抽奖请求消息由三段扩为四段：
  **变量快照 → 物品 / 技能 / 品质定义 → 最近一条非抽奖 AI 回复 → 抽奖专用提示词**。
- **Changed** `lottery-request-prompt.txt`：补 `<JSONPatch>` 规则（合法 JSON 数组、新增用 `insert`、
  同名用 `delta` 加数量、路径只落在物品栏 / 技能系统、每次抽奖结果都要有对应写入）与完整输出示例；
  删掉与新规则段重复的字段说明与半截品质说明。
- **Added** 测试三条：两份定义的一致性守卫（防漂移）、`planLotteryDraw` 保底边界、抽奖进度随楼层回退。
  其中技能生成时机一句两份**有意不同**（主链「根据行动自动生成」/ 抽奖「根据剧情生成」），
  不纳入一致性断言，改为两份各自守住自己的表述。
- **Removed** 清掉抽奖调用入参里一个从未被消费的字段（`pityTriggered`）：
  保底提示文案用的是前端算出的抽奖计划结果，这个入参传进来后没有任何消费者。
- **Added** 玩家更新日志 `261005`：抽奖不再推进剧情 / 抽奖失败可重来 / 抽奖可单独配 API / 回滚时积分一起退回。
- **Removed** 玩家日志里 `261004` 那条（事后补的）；**约定改为玩家日志随代码一起提交**，不再事后补。
- 四道检查：`typecheck` ✓ ｜ `test` 120/120 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

## 2026-10-06

### `74b4558` — fix: 抽奖生成的物品 / 技能要求与最近一次剧情相关

- **Changed** 抽奖专用提示词（`src/assets/standalone-local-content/lottery-request-prompt.txt`）**新增一条规则**：
  抽奖生成的物品 / 技能除贴合当前世界观与玩家处境外，还须与**上文最近一次剧情内容**相关
  —— 优先呼应那段剧情，产出该剧情里用得上的东西；若上文没有提供剧情内容（如开局即抽），
  则退回只按世界观与玩家处境生成。
  原先只有「贴合世界观与玩家处境」一条，模型拿不到「要关联剧情」的指令，会把请求里那条最近剧情当空气
  （组装见 `runtime/standaloneTurn.ts` 的 `buildLotteryTurnPrompt`：最近一条非抽奖 AI 回复作为第 3 段消息传入）。
- **Added** 玩家更新日志 `261006`：抽奖物品贴合最近剧情。
- **Changed** 顺带回填上一条提交 `62a045a` 的短哈希，并修正上一条遗留的 3 行列表缩进（prettier 格式，纯排版）
  —— 均按约定并入本次提交，不单独开回填提交。
- 四道检查：`typecheck` ✓ ｜ `test` 120/120 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。

### — fix: 抽奖请求多带一段剧情上下文；抽奖提示词不再约束生成内容

> 短哈希待回填（按约定并入下一次提交）。

- **Changed** 抽奖请求的历史消息由「最近一条非抽奖 AI 回复」扩为**最近一段剧情上下文**
  （`runtime/standaloneTurn.ts`）：复用主链的最近窗口（`RECENT_MESSAGE_LIMIT = 8` 条、同一过滤口径，
  抽奖楼层自动排除），保留原始 user / assistant 角色。只给一条 AI 回复时，模型看不到
  「玩家此刻在哪、在做什么」，生成物只能凭变量快照猜，容易与当前场景脱节。
  配套把 `resolveStandaloneRecentHistoryMessages` 的「玩家最新输入」参数改为可选（旁路请求没有这一条），
  对主链行为零影响。
- **Changed** 抽奖专用提示词（`lottery-request-prompt.txt`）：删掉「生成内容须呼应那段剧情」那一条，
  并给「为每次抽奖生成一个物品或技能，品质必须等于上面指定的品质」补上「奖品内容须贴合当前世界观与玩家处境」。
  **抽奖规则不再约束生成什么内容**，内容交给模型看到的剧情上下文自然决定 —— 与旧版同一口径
  （旧版抽奖挂在剧情回合上，规则同样不管内容；见 `tavern_helper_template-main` 的抽奖提示词，
  全文只讲品质、对生成内容一字未提）。
- **Changed** `spec/05-prompt-pipeline.md` 同步：抽奖请求第三段由「最近一条非抽奖 AI 回复」改为「最近一段剧情上下文」。
- **Changed** 玩家更新日志 `261006` 文案由「抽奖物品贴合最近剧情」改为「抽奖物品贴合当前场景」
  （该条尚未上线，直接改文案；上一条提交里的记录保持原样）。
- 四道检查：`typecheck` ✓ ｜ `test` 120/120 + 35 ✓ ｜ `lint` 0 error（14 个存量 warning）✓ ｜ `build` ✓。
