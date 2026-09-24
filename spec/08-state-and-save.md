# 08 · 变量、状态与存档

## 变量更新链路

🔴 变量更新由本地 `stat_data` + `<JSONPatch>` + 运行时链路完成，不依赖任何全局对象。

## stat_data 结构

**单一真源是 `schema/schema.ts`**（Zod Schema），配套一份 `schema/schema.json`。

- 顶层用**中文键名**：`设置` / `世界` / `玩家` / `NPC` / `商业` / `势力` …
- 所有字段用 `.prefault(...)` 给出兜底值，解析失败也能拿到可用结构。
- `Schema.parse()` 的结果类型即 `StandaloneCurrentStatData`。

🔴 改 Schema 时同步改 `schema.json`，两者是同一个契约的两份表达。

## 变量更新的两遍请求

```text
① 正文请求    → 生成剧情正文
② 变量更新请求 → 输入「当前 stat_data + 本轮最新消息」，输出补丁
```

两次是**独立的模型调用**，可以用不同的 API 配置、走不同的本地内容路由（见 `05-prompt-pipeline.md`）。

### 输出格式

模型必须在 `<UpdateVariable>` 块内输出**一个 `<Analysis>` + 一个 `<JSONPatch>`**：

```text
<UpdateVariable>
  <Analysis>…</Analysis>
  <JSONPatch>[ …操作对象数组… ]</JSONPatch>
</UpdateVariable>
```

- `<JSONPatch>` 内容必须是**合法的 JSON 数组**，只含操作对象，不含注释、尾逗号、额外文本。
- 不需要更新时输出 `[]`（不能省略块）。
- 正式口径写在 `src/assets/standalone-local-content/variable-update-format.txt`
  与 `variable-update-rules.txt`——**不要在代码里再写一份规则**。

解析在 `src/utils/taggedReply.ts`（用正则取 `<JSONPatch>` 块内容）。

## 本地存储

数据分两处放，按「大不大、会不会长」来分：

| 数据                                                        | 位置          | 理由                                      |
| ----------------------------------------------------------- | ------------- | ----------------------------------------- |
| 会话、消息、`stat_data`、存档载荷、存档索引、**酒馆预设库** | **IndexedDB** | 量大且随使用持续增长                      |
| 设置、BGM 偏好、徽章、预设记忆、待恢复标记、裁剪标记        | localStorage  | 都是小配置，搬进 IndexedDB 不解决任何问题 |

**为什么必须分开**：localStorage 只有 5MB，而且是**硬上限**、写入失败同步抛错。
实测聊一回合就能吃掉六成配额（消息 3.91 MB，其中 98.7% 是调试记录），
再聊一两回合必然触顶，表现为存档失败、数据悄悄丢。IndexedDB 配额按磁盘比例给（几百 MB 起），
是这类数据的正确归宿。设置类小数据留在 localStorage，还顺带保住了首屏同步读语言的链路
（见 `04-i18n.md`）。

**酒馆预设库为什么也在这一类**：整个库序列化成一个字符串存在单个 key 里，用户导入多少就存多少，
会持续增长 —— 裁剪只让它长得慢一点，不改变趋势。见 `07-presets.md` 的「预设有两种」。
注意**开局预设不落盘**，不属于这里任何一类。

实现在 `src/utils/standaloneStorage.ts`（存储层）与 `src/utils/standaloneIndexedDb.ts`（IndexedDB 封装）。
后者是手写的 Promise 薄封装，**没有引入第三方库**——硬边界要求零外部运行时依赖，而这里只需要 KV 读写。

### 两条关键设计

**1. 启动时一次性迁移，之后运行期不再碰 localStorage。**

`src/index.ts` 在挂载应用**之前** `await initializeStandaloneStorage()`：
把老用户 localStorage 里的数据搬进 IndexedDB，**先写成功再删旧副本**，搬完即清。

🔴 **这个顺序不能变。** 会话 id、消息楼层、统计变量都在存储层后面，
初始化晚一步就会读到空数据，表现为「存档打不开、聊天记录消失」。

**2. 小数据进内存缓存，读接口保持同步。**

会话、消息、`stat_data`、存档索引、**酒馆预设库**在启动时一次性读进内存，
之后**同步读缓存、写时同步更新缓存并异步落盘**。

这样做的收益是 `loadStandaloneRuntimeSession()`、`loadStandaloneTavernPresetLibrary()` 这类
被 store 初始化和 `computed` 调用的函数**签名保持不变**，避开了「Vue 的 `computed` 不能 await」
引发的整棵组件树异步化。酒馆预设库尤其依赖这一点：`ContentCenterPanel.vue` 里有一批 `computed`
同步取它，`standaloneTurn.ts` 在回合逻辑里也同步取；顺带还省掉了每次刷新都重新 `JSON.parse`
整个库的开销。
存档载荷（单个可达数 MB）不进缓存，走 `readLargeAsync` / `writeLargeAsync` 按需异步读写。

🔴 **`readStorageSync` 只认缓存名单里的 key。** 类型系统拦不住漏加：
**开发构建下**收到不在名单里的 key 会直接抛错（把静默失效变成显式失败）；
**生产构建**没有这道自检，表现为「读永远是空」。
给存储层加新数据时，必须同时把它加进 `standaloneStorage.ts` 的迁移清单 ——
漏了的话，要么读永远是空，要么老用户的数据不跟着搬。

### 降级与兜底

- IndexedDB 不可用（Safari 无痕模式等）时**整体退回 localStorage 路径**：容量还是 5MB，但功能不中断、数据不丢。
- 落盘失败时先打日志，**再尝试写 localStorage 兜底**。⚠️ 这份兜底只保证「数据还在磁盘上」，
  **不会被自动读回** —— IndexedDB 模式下启动只从 IndexedDB 填内存缓存。恢复它需要排障手段
  （例如清掉 IndexedDB 里对应的 key 再刷新），或者直接依赖导出的存档。
- 启动迁移失败时，那一个 key 留在 localStorage 里继续可用，不影响其他 key，也不中断启动。

⚠️ **容量变大不等于更不容易丢。** localStorage 满了只是拒绝写入、不动已有数据；
IndexedDB 在磁盘压力下，浏览器**可能整体回收整个站点的数据**。应用启动时会调一次
`navigator.storage.persist()` 申请持久化（失败忽略，不影响功能），但**拿不到也不代表数据一定安全**，
所以导出存档仍然是唯一的可靠备份手段。

## 存档

| 常量                                          | 用途                 |
| --------------------------------------------- | -------------------- |
| `STANDALONE_ARCHIVE_INDEX_STORAGE_KEY`        | 存档索引（列表）     |
| `buildStandaloneArchiveStorageKey(archiveId)` | 单个存档的 key       |
| `STANDALONE_ARCHIVE_PENDING_RESUME_KEY`       | 「待恢复」的临时状态 |

实现在 `src/utils/archive.ts`，界面层封装在 `composables/useStandaloneArchiveManager.ts`。

- 支持多存档 + JSON 导入导出。
- 存档**载荷**放 IndexedDB，读写是**异步**的（`saveStandaloneArchiveSnapshot` /
  `restoreStandaloneArchiveById` / `deleteStandaloneArchive` / `downloadStandaloneArchiveById`
  都返回 Promise）。**存档索引**小而读得频繁，走内存缓存，`listStandaloneArchives()` 仍是同步的。

## 状态所有权

| 数据                                      | 归属                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| 设置（字号、行距、主题、语言、API 配置…） | `stores/settings.ts`，key `tavern_helper_settings_诸界穿越模拟器_NW`                          |
| 消息                                      | `stores/messages.ts`                                                                          |
| 变量                                      | `stores/statData.ts` + `stores/statDataActions.ts`；运行时读写走 `runtime/standaloneState.ts` |
| 存档                                      | `src/utils/archive.ts`                                                                        |
| 本地存储（落盘入口）                      | `src/utils/standaloneStorage.ts`，底层是 `src/utils/standaloneIndexedDb.ts`                   |

🔴 **不要从组件里绕过 store 直接改 `stat_data`，也不要绕过 `standaloneStorage.ts` 直接碰 IndexedDB 或 localStorage。**
前端权威状态的判定在 `src/utils/frontendAuthoritativeState.ts`，别在别处再实现一套。

## 相关约束

1. 改 Schema → 同步 `schema.json`，并检查存档导入是否兼容。
2. 变量更新的规则/格式只有那两个 txt 是正式口径。
3. 设置持久化的 localStorage key 是历史名，**不要改**（改了老用户设置全丢）。
4. 新增需要持久化的数据，**先判断该进 IndexedDB 还是 localStorage**（见「本地存储」的取舍表），
   并同步更新 `standaloneStorage.ts` 的迁移清单——漏了清单里的 key，老用户的数据不会跟着搬过去。
5. 存储 key 的字符串一律**不要改**：迁移逻辑靠前缀识别老数据，改了会让老用户数据读不回来。
