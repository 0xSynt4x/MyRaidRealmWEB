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

🔴 **世界书没有触发条件，每轮整块塞进提示词。** 这是明确的设计选择，不是偷懒：

- 不复刻 SillyTavern 的关键词触发、插入深度、递归触发那套机制；
- **不要**「优化」成按关键词筛选；
- **不要**拆成更细的条目。

「世界书」在独立版里对应「本地补充内容」的一种类型，概念已收敛。

## 本地补充内容

**位置**：`src/assets/standalone-local-content/`。

| 文件                         | 用途                               |
| ---------------------------- | ---------------------------------- |
| `main-api-prompt.txt`        | 正文模型的通用提示词               |
| `variable-update-rules.txt`  | 变量更新规则（**正式口径**）       |
| `variable-update-format.txt` | 变量更新输出格式（**正式口径**）   |
| `current-stat-snapshot.txt`  | 当前变量快照的包装模板             |
| `plot-lottery-rules.txt`     | 抽奖玩法规则（仅抽奖回合注入）     |
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
