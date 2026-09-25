# 09 · 生图

## 这是什么

独立版可以把剧情里的文字变成图。有**两条后端，二选一**：

| 后端        | 图落在哪                                     | 配置要点                            |
| ----------- | -------------------------------------------- | ----------------------------------- |
| 本地 ComfyUI | ComfyUI 的 output 目录，消息里只记**地址**   | 服务地址 + 工作流 + 提示词节点       |
| NovelAI 兼容 | 本机浏览器 IndexedDB，消息里只记**编号**     | 接口地址 + API Key + 出图参数        |

🔴 两者**不能并存**：AI 每轮只在正文里写一套生图提示词，NovelAI 吃 Danbooru 标签流、
ComfyUI 吃自然语言长句，同时开必然有一条收到错风格的提示词。所以是单选，
两套配置各自保留、切换不丢。

**相关文件**：

| 文件                                            | 职责                                          |
| ----------------------------------------------- | --------------------------------------------- |
| `src/utils/comfyuiClient.ts`                    | ComfyUI 客户端 + **节点识别**（747 行，核心） |
| `src/utils/comfyuiStylePresets.ts`              | ComfyUI 画风预置                              |
| `src/utils/novelAiImageClient.ts`               | NovelAI 协议客户端（含渠道能力兜底）          |
| `src/utils/zipReader.ts`                        | 解 NovelAI 返回的 zip（浏览器原生，无第三方） |
| `src/utils/imageStorage.ts`                     | 云端图片的 IndexedDB 存取、列举与清理         |
| `src/utils/imageStylePresets.ts`                | 画风预置按后端分组（ComfyUI 三套 + NAI 三套） |
| `src/composables/useComfyUiImageGeneration.ts`  | 按后端分发的出图入口（**文件名是历史遗留**）  |
| `src/components/panels/ImageGenerationSettingsCard.vue` | 设置卡：总开关 + 后端单选 + 缓存清理   |
| `src/components/panels/NovelAiSettingsSection.vue`      | NovelAI 参数区                        |
| `src/components/panels/GeneratedImageBrowser.vue`       | 云端图片浏览器（缩略图网格 + 单张删除）|

## 设置结构

```text
imageGeneration.enabled   生图总开关 —— 关掉后 AI 不写提示词、消息里也不显示出图按钮
imageGeneration.backend   'comfyui' | 'novelai'
comfyUi.*                 本地 ComfyUI 参数（开关已上移到总开关）
novelAi.*                 NovelAI 参数 + Key
```

**老配置迁移**：早期版本没有这一层，那时 `comfyUi.enabled` 就是生图总开关。
读到老结构时自动迁成「总开关 = 老 ComfyUI 开关，后端 = comfyui」，玩家无感。

**Key 与地址存 localStorage**（与 API 配置同处），**不进存档**。
**云端图片存 IndexedDB**，消息里只留编号，导出存档不带图片 ——
代价是换机器打开存档看不到图（与 ComfyUI 图的现状语义一致）。

## 提示词规则按后端互斥切换

沿用本地内容条目机制，两条规则只有一条开着：

| 条目 id                  | 风格              | 给谁用        |
| ------------------------ | ----------------- | ------------- |
| `plot-text-to-image`     | 自然语言句子      | 本地 ComfyUI  |
| `plot-text-to-image-nai` | Danbooru 标签流   | NovelAI       |

切换由 `applyTextToImageToStandaloneLocalContent(map, enabled, backend)` 统一处理：
总开关关 → 两条都关；开 + NAI → 只开标签流那条；开 + ComfyUI → 只开自然语言那条。

### 画风预置不带年代标签

`NOVELAI_STYLE_PRESETS` 里**不写 `1980s (style)`** —— 年代属于「世界观内容」，
交给 AI 按剧情写进标签流；画风预置只管渲染方式与质量词。

🔴 选中内置预置时，画风内容**以代码里的文本为准**（读取设置时按预置 id 重新取一遍），
这样改预置文本后老玩家也能跟着更新；只有「自定义 / 不用」才用玩家存的那份。

## NovelAI 协议要点

- 端点：`{地址}/ai/generate-image`，地址**填到路径前缀为止**（官方与兼容站共用一栏）
- 鉴权：`Authorization: Bearer {key}`，**不要按前缀校验 Key**（官方 `pst-`、兼容站 `lat_sk_`）
- `params_version` 必须跟模型代次匹配：`nai-diffusion-5-*` → 4，其余 → 3
- `ucPreset`：**0 重 / 1 轻 / 2 Furry / 3 Human / 4 无**（方向别写反）
- 响应：兼容站只回 zip（要解包）；官方可能带 `Accept: application/json` 直出 JSON
- 尺寸只给三档（1024×1024 / 920×1536 / 1536×920）：实测兼容站会按宽高比自动归类

🔴 **参数按官方协议给全，不因单个兼容站裁剪。** 部分站点会对参数做白名单 + 范围校验，
超范围会被静默回退（实测：步数超 8–12 回退、采样器不在白名单回退、`cfg` 固定 1.0）。
**这是站点行为，不是本程序的 bug** —— 所以界面照给全参数，并写明这一点。

🔴 **测试连接只测地址连通、不验 Key**：往出图端点发一个不带 Key 的轻量请求，
拿到任何 HTTP 响应（含 401/404）就算通，只有网络层报错才算不通 —— 这样**不消耗点数**。
代价是 Key 填错要等点出图才发现，界面上必须写明。

### 已知取舍

- **不实现流式进度**。官方有 `/ai/generate-image-stream` 但**没有官方 Key 实测过**，
  兼容站一律 404。按「一律按能力最弱的兼容站设计」的原则，第一版统一走普通端点，
  界面上给等待态 + 计时。将来官方能力实测后再加。
- **不做额度查询**：兼容站没有该接口。
- **不做自动清理**：图片缓存只做手动清理入口，不偷偷删玩家的图。

### 模型名单：能问就问，问不到就让玩家手填

「获取模型」按钮走 `fetchNovelAiModels()`：依次试 `{地址}/ai/models`、`/v1/models`、
`/models`，从 `{data:[{id}]}` / `{models:[…]}` / 裸数组里挖模型名，**只读、不消耗点数**。

🔴 **官方没有公开的模型列表接口**，兼容站也未必有。拿不到时按原因分开说话
（地址不通 / 被拒 / 该站没这个接口），**绝不用一份内置名单冒充「站点返回的模型」**。
内置那三个候选始终在，手填入口始终可用。

### 采样器 / 调度：候选下拉 + 「自定义」手填

同一个下拉里既有 NAI 官方名（`k_euler` 这种 `k_` 前缀），也有兼容站实际吃的
ComfyUI 名（`res_multistep`、`dpmpp_2m` 这种）—— 实测同一家站对前者回退、对后者生效。
所以下拉用 `<optgroup>` **分成两组**显示，别让两套命名混成一锅。

🔴 **不要用 `<input list>` + `<datalist>` 做这个。** 原生 datalist 会按输入框里已有的
文字做前缀过滤 —— 框里已经有 `k_euler_ancestral` 时下拉只显示匹配项，看着像「候选没几个」，
而且它的弹出层是浏览器原生样式，跟旁边 `.comfy-select` 的 `<select>` 完全不是一套皮。
三个「候选 + 手填」字段（模型 / 采样器 / 调度）统一用 `<select>` + `自定义…` 选项。

手填怎么落地：字段里**存的始终是最终要发出去的字符串**，下拉只负责显示 ——
值是候选之一就显示候选，否则显示「自定义…」并露出下面的手填框（`CUSTOM_OPTION_VALUE` 哨兵）。
切到「自定义」会把字段清空、露出占位符里的默认值；出图时空值一律落回默认，
**别把空串发出去**。这样不需要额外存一份「当前是不是自定义」的状态。

🔴 **原生下拉弹层的配色有两个坑，改下拉前必须知道：**

1. **`optgroup` 也要单独定底色。** `global.css` 里原本只给 `option` 定了
   `background-color: var(--bg-card-solid)`，分组标题那一行没定 —— 它会跟着**弹层底**走。
2. **`select` 自己的底色必须不透明。** 弹层底色取自 select 的 `background-color`，
   而设置卡里 `.text-input/.number-input/.comfy-select/.comfy-textarea` 共用一条规则、
   底色是 `var(--input-bg, var(--glass-border))` —— **`--input-bg` 全项目没有定义**，
   实际落到 `--glass-border`（半透明边框色）。于是弹层是半透明的、分组标题那一行透出后面的内容。
   所以 `.comfy-select` 必须显式 `background: var(--bg-card-solid)` 覆盖掉。

> `--input-bg` / `--control-bg` / `--control-border` 这几个令牌在 `global.css` 里只有引用、
> 没有定义（主题块只定义了 `--control-bg-elevated`）。动到输入控件底色时留意这一点。

### 云端图片浏览器

设置卡「图片缓存」那行有个「浏览图片」，打开 `GeneratedImageBrowser.vue`：
缩略图网格（最新在前）、点开看大图（复用 `ImageLightbox`）、单张删除。
删除后要把外面的占用统计重新算一遍（组件 `emit('changed')` → 卡片 `refreshCacheUsage()`）。

🔴 列表每次打开都重读 IndexedDB —— 出图随时发生，缓存里没有「变更通知」可用。
读不出来的坏数据直接跳过，不让一条坏记录把整张列表打断。

## ComfyUI 节点识别顺序

🔴 识别顺序是**固定的四级**，从可信到不可信：

| 优先级 | 依据                                                                             | 可信度           |
| ------ | -------------------------------------------------------------------------------- | ---------------- |
| 1      | **玩家手动指定**的节点                                                           | 最高，选过就固定 |
| 2      | **节点标题**改成 `positive prompt` / `negative prompt`（不分大小写、不分分隔符） | 高               |
| 3      | 从**采样器的正负连线回溯**                                                       | 中               |
| 4      | **兜底猜**：认「唯一的文字字段」                                                 | 最低             |

🔴 **第 4 级「猜的」必须在界面上单独提示，不许报成「已识别」。**
用户需要知道这次是猜的，才能判断要不要手动改。

### 字段白名单

节点里放提示词的字段名不只一个，按优先级取：

```text
text → text_g → text_l → prompt → wildcard_text → populated_text
```

- `text_g` / `text_l` 是 SDXL 的双文本编码器字段；
- `wildcard_text` 是通配符节点的字段；
- 不要再往这个列表里加字段名而不确认它真的承载提示词。

### 兜底猜的限制

第 4 级只在**节点里恰好只有一个字符串字段**时才敢用，
而且必须先过 `NON_PROMPT_FIELD_PATTERN` 排除掉文件名、配置项之类的字段——
否则加载器节点（里面一堆路径/配置字符串）会被误判成提示词节点。

### 手动指定是粘性的

玩家手动选过节点后就**固定**（不会被后续自动识别覆盖），
只有两种情况失效：

1. 工作流文本被改动；
2. 玩家手动选回「未指定」。

这样避免「用户选好了，换了一轮又被自动识别改回去」。

## 相关文档

- 完整方案与调研数据：`docs/plan/2026-09-25_1411_image-backend-multi-provider-plan.md`
- 生图探测与工作流样本在 `Temp/comfyui-probe/`（本地工具目录，不进仓库）。
