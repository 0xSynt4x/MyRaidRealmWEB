# 05 · 提示词链路

## 主链顺序

`buildMainTurnPrompt()`（`runtime/standaloneTurn.ts`）组装发给正文模型的五段，顺序**固定**：

| #   | 段                      | role   | 内容                           |
| --- | ----------------------- | ------ | ------------------------------ |
| 0   | `system_protocol`       | system | 预设里的主提示词               |
| 1   | `current_stat_snapshot` | user   | 当前 `stat_data` 快照          |
| 2   | `active_worldbook`      | user   | 生效中的世界书条目（整块注入） |
| 3   | `recent_history`        | user   | 前情提要 + 最近若干轮原文      |
| 4   | `latest_user_input`     | user   | 本轮玩家输入                   |

顺序由 `inspectStandaloneMainChainView()` 暴露出来，界面上有对应的链路视图。

🔴 **不要随意调整这五段的顺序。** 变量快照必须早于历史，否则模型会把快照当成历史的一部分。

## 宏

🔴 **宏只有一张表**，实现在 `runtime/standalonePromptUtils.ts` 的
`applyStandalonePromptMacroReplacements()`。全项目 7 个宏：

| 宏                                       | 解析为                | 取值来源                                             |
| ---------------------------------------- | --------------------- | ---------------------------------------------------- |
| `{{user}}`                               | 玩家姓名              | `stat_data.玩家.姓名`，缺省「玩家」                  |
| `{{char}}`                               | 当前角色名            | 调用方传入，缺省「当前角色」                         |
| `{{group}}`                              | 当前群组              | 固定文案                                             |
| `{{scenario}}`                           | 当前位置              | `stat_data.世界.空间定位.当前位置`，缺省「当前场景」 |
| `{{personality}}`                        | 角色性格              | 固定文案                                             |
| `{{lastChatMessage}}`                    | 上一条消息            | 固定文案                                             |
| `{{format_message_variable::stat_data}}` | 完整 `stat_data` JSON | 运行时快照                                           |

🔴 **快照宏（最后一条）必须排在替换链的最后。** 它注入的是整个 JSON，
如果排在前面，后面任何替换都可能命中 JSON 里的内容并二次替换。

## 前情提要

窗口大小：`RECENT_MESSAGE_LIMIT = 8`（`runtime/standaloneTurn.ts`）。

口径唯一在 **`collectStandalonePriorSummaryItems()`**，规则是：

- 取**窗外**的消息——即 `slice(0, 总条数 - 8)`，第 1 ~ N-8 条；
- 只取 `role === 'assistant'` 的消息；
- 只取 `summary_content` 字段，**不是原文**；
- 排除当前轮、排除已归档区间（`message_id <= archivedUntilMessageId` 的跳过）；
- `summary` 为空白的直接丢掉。

最近 8 轮（窗内）**喂原文**。

> 换句话说：老内容走摘要、新内容走原文。改这个口径只改这一处，别在别处再写一套。

## 阶段总结归档

🔴 **只手动、绝不自动。** 归档动作由用户在界面上触发，不要在生成流程里顺手触发。

- 归档后**只保留最新一段**总结，不累积多段。
- 阈值选项 `STAGE_SUMMARY_THRESHOLD_OPTIONS = [100, 200, 300, 500]`
  （`src/utils/stageSummaryThreshold.ts`），单位是消息条数。
- 归档实现见 `src/utils/stageSummaryArchive.ts`。

## 本地内容注入

`resolveStandaloneLocalContentBlocks({ route, ... })` 按**发送目标**筛选：

| route             | 发给谁             |
| ----------------- | ------------------ |
| `main`            | 只发给正文模型     |
| `variable_update` | 只发给变量更新模型 |
| `shared`          | 两边都发           |

主链里有一个特例：**抽奖规则**只在 `scriptedTurn.kind === 'lottery'` 时才注入
（按 `LOTTERY_LOCAL_CONTENT_BLOCK_PREFIX` 前缀过滤）。普通回合不带抽奖规则。

详见 `06-content-assets.md`。

## 发送前整形（上下文裁剪）

🔴 **只裁发送，不碰真状态与存档。** 整形走深拷贝，序列化完即丢，不进内存缓存、不落盘。

快照宏与快照块发出的内容**不等于**内存里的 `stat_data`。两条链口径不同：

| 项 | 正文链 | 变量更新链 |
| --- | --- | --- |
| 去 JSON 缩进（紧凑输出） | ✅ | ✅ |
| 剔除 `$` 开头的键（酒馆助手约定：不发给 AI） | ✅ | ✅ |
| 剔除「设置」块 | ✅ | ❌ **必须保留** |
| 商城只留「物品 / 技能」两个空路径 | ✅ | ✅ |
| 生存状态按模式裁 | ✅ | ✅ |
| NPC 按在场裁 | ❌ 全发 | ✅ 只留本轮正文提到过的 |

生存状态三档：**关闭** → 整块不发；**基础** → 只留血量 / 体力值；**生存** → 全发。

NPC 在场判定：扫本轮正文 + 最新玩家输入，命中名字即留下；另有两个兜底 —— 标记为重要 NPC 的、
以及标记为被关注的。**一个名字都没扫到时不裁**（宁可全发，不能把该更新的漏掉）。

实现：`runtime/standaloneSnapshotTrim.ts`（整形纯函数 + 按链路组装），
在 `runtime/standaloneTurn.ts` 两条链里接入。每项有独立开关，总开关关掉即恢复原行为。

🔴 **总开关默认关闭。** 这项功能会改变发给模型的内容，属于「用户明确知道自己在开什么」才启用的，
不做静默默认。子开关默认全开 —— 一旦打开总开关就是要完整效果。

开关入口在**主界面右侧面板 → 功能设置**标签页，按「发送前裁剪 / 写入前拦截」两组摆放。
开局向导的设置页里没有这一组（那是给首次开局用的，不该塞这种进阶开关）。

🔴 **渲染上下文与快照数据是两条通道，不能混。** 规则文案（本地内容模板）开头是脚本，
会读「设置」与「人物档案」（生存系统模式、NPC 列表与总数）。所以规则文案**始终喂完整数据**，
只有快照宏 / 快照块走整形结果。喂整形数据会出现「生存模式被当成关闭」「NPC 总数渲染为 0」。

## 变量更新是第二遍请求

`buildVariableUpdateSecondPassPrompt()` 是**独立的一次模型调用**，
和正文生成分开，用单独的 API 配置与单独的本地内容路由。
它的输入是当前 `stat_data` + 本轮最新消息，输出是要应用的变量补丁（见 `08-state-and-save.md`）。

## 改提示词链路时的自检

1. 改宏 → 确认快照宏仍在最后。
2. 改顺序 → 确认 `inspectStandaloneMainChainView()` 的 `orderIndex` 同步。
3. 改前情提要口径 → 只改 `collectStandalonePriorSummaryItems()`。
4. 改归档 → 确认没有引入自动触发。
5. 改整形口径 → 确认渲染上下文仍拿完整数据（规则文案不能被裁）。
