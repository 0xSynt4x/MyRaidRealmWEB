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
