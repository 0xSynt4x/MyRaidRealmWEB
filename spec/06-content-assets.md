# 06 · 世界书与本地补充内容

## 世界书

**位置**：`src/assets/standalone-worldbooks/`，当前 11 篇。

| 文件                                | 题材             |
| ----------------------------------- | ---------------- |
| `capua-blood-sand.md`               | 卡普亚 · 血与沙  |
| `china-1990s-family.md`             | 九十年代中国家庭 |
| `demon-lord-dungeon.md`             | 魔王地下城       |
| `gaokao-simulator.md`               | 高考模拟         |
| `mars-humanoid-cohab.md`            | 火星人形共居     |
| `reform-era-1980s.md`               | 改革开放 1980s   |
| `song-dynasty-cultivation.txt`      | 宋朝修真         |
| `song-dynasty-spiritual-testing.md` | 宋朝灵异试炼     |
| `spirit-girl.md`                    | 灵异少女         |
| `star-aspirations-weiyang.md`       | 星辰志愿 · 未央  |
| `time-loop.md`                      | 时间循环         |

🔴 **世界书没有触发条件，每轮整块塞进提示词。** 这是明确的设计选择：

- 采用「显式启用 + 整块注入」的本地内容模式，不做关键词筛选；
- **不要**「优化」成按关键词筛选；
- **不要**拆成更细的条目。

「世界书」对应「本地补充内容」的一种类型，概念已收敛。

## 本地补充内容

**位置**：`src/assets/standalone-local-content/`。

| 文件                         | 用途                               |
| ---------------------------- | ---------------------------------- |
| `main-api-prompt.txt`        | 正文模型的通用提示词               |
| `variable-update-rules.txt`  | 变量更新规则（**正式口径**）       |
| `variable-update-format.txt` | 变量更新输出格式（**正式口径**）   |
| `current-stat-snapshot.txt`  | 当前变量快照的包装模板             |
| `lottery-request-prompt.txt` | 抽奖专用提示词（独立抽奖请求专用） |
| `lottery-item-skill-rules.txt` | 物品 / 技能 / 品质定义（抽奖请求专用，抄自 `variable-update-rules.txt`） |
| `plot-online-mode.md`        | 联机模式剧情规则                   |
| `plot-text-to-image.md`      | 文生图剧情规则                     |
| `index.ts`                   | 注册表：把上面这些挂成可开关的条目 |

旧的「思维链模板」已经折叠进 `<Analysis>` 段，**不再作为独立规则条目加载**。

## 发送目标（route）

每条本地内容都标了发送目标，决定它进哪一次请求：

| route             | 发送范围           |
| ----------------- | ------------------ |
| `main`            | 只发给正文模型     |
| `variable_update` | 只发给变量更新模型 |
| `shared`          | 两边都发           |

筛选实现在 `resolveStandaloneLocalContentBlocks({ route, ... })`。

## 玩家改写系统条目正文

内置条目的正文允许玩家改，存在本地设置的 `builtinAssetContentOverrides`（跟着设置走、随存档导出导入），
不写文件、不改仓库里的 `.txt` / `.md`：

- 只覆盖正文，标题 / 来源 / 发送目标仍由内置清单定死；
- 渲染前由 `getStandaloneLocalContentManifest(overrides)` 换掉 `rawContent`，
  主回复、变量更新、审稿改稿三条链路都走同一份，不存在「界面改了但实际没发」；
- **空串 = 这条不发送**（渲染为空即丢块），不是回退默认值；还原内置原文靠删掉这个键；
- 「世界难度规则」按当前难度现算，没有可改原文，`isEditableStandaloneBuiltinAssetContent()` 判它只读；
- 归一化 `normalizeStandaloneBuiltinAssetContentOverrides()` 会丢掉清单外的 id 与脏值，
  老存档 / 手改本地存储不会把怪条目带进提示词。
正文与变量更新是**两次独立请求**，路由搞错会导致模型看到不该看的规则。

## 预设 ↔ 世界资料的挂接

`src/assets/worldbook-registry/index.ts` 负责把内置预设和对应的世界资料关联起来。
新增一篇世界书时，除了放文件，还要在注册表里挂上，否则预设选不到它。

## 旧预设兼容

新建、编辑、导出的预设统一使用 **`localContentEntries`**。

旧预设里如果还有 **`worldbookEntries`** 字段，导入时会自动迁移为 `localContentEntries`
（实现在 `src/utils/legacyPresetCompat.ts`）。

🔴 这是**读取老文件的兼容入口**，不是新数据格式。新代码不要写 `worldbookEntries`。

## 相关约束

1. 世界书是**纯数据**，不含逻辑；不要把判断写进 md/txt。
2. 条目整块注入，所以**体积直接影响每轮 token 消耗**——加内容前先想清楚必要性。
3. 变量更新的规则与格式**只有这两个文件是正式口径**，别在代码里再写一份。
