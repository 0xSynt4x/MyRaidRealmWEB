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

## 存档

🔴 **不使用 IndexedDB。** 全部走 localStorage + JSON 导入导出。

| 常量                                          | 用途                 |
| --------------------------------------------- | -------------------- |
| `STANDALONE_ARCHIVE_INDEX_STORAGE_KEY`        | 存档索引（列表）     |
| `buildStandaloneArchiveStorageKey(archiveId)` | 单个存档的 key       |
| `STANDALONE_ARCHIVE_PENDING_RESUME_KEY`       | 「待恢复」的临时状态 |

实现在 `src/utils/archive.ts`，界面层封装在 `composables/useStandaloneArchiveManager.ts`。

- 支持多存档 + JSON 导入导出。
- 如果将来需要长期大存档，再考虑 IndexedDB、压缩或减少 debug 信息体积——
  **当前明确不引入**。

## 状态所有权

| 数据                                      | 归属                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| 设置（字号、行距、主题、语言、API 配置…） | `stores/settings.ts`，key `tavern_helper_settings_诸界穿越模拟器_NW`                          |
| 消息                                      | `stores/messages.ts`                                                                          |
| 变量                                      | `stores/statData.ts` + `stores/statDataActions.ts`；运行时读写走 `runtime/standaloneState.ts` |
| 存档                                      | `src/utils/archive.ts`                                                                        |

🔴 **不要从组件里绕过 store 直接改 `stat_data` 或 localStorage。**
前端权威状态的判定在 `src/utils/frontendAuthoritativeState.ts`，别在别处再实现一套。

## 相关约束

1. 改 Schema → 同步 `schema.json`，并检查存档导入是否兼容。
2. 变量更新的规则/格式只有那两个 txt 是正式口径。
3. 不引入 IndexedDB。
4. 设置持久化的 localStorage key 是历史名，**不要改**（改了老用户设置全丢）。
