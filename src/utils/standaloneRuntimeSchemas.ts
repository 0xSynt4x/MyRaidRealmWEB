import { z } from 'zod';

function getStandaloneStatSchema() {
  return (require('../../schema/schema.ts') as typeof import('../../schema/schema')).Schema;
}

const StandaloneRuntimeStatDataSchema = z.unknown().transform(value => getStandaloneStatSchema().parse(value));

const StandaloneRuntimeOptionalStatDataSchema = z
  .unknown()
  .optional()
  .transform(value => {
    if (typeof value === 'undefined') {
      return undefined;
    }

    return getStandaloneStatSchema().parse(value);
  });

const StandaloneProviderChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const StandaloneAiDebugPassTraceSchema = z.object({
  api_label: z.string().min(1),
  api_mode: z.string().min(1),
  requested_at: z.string().min(1),
  transport_mode: z.enum(['streaming', 'non_streaming']),
  request_messages: z.array(StandaloneProviderChatMessageSchema).default([]),
  request_body_text: z.string(),
  raw_response_text: z.string(),
  extracted_text: z.string(),
  error_message: z.string().nullable().optional(),
  // 🔴 必须 optional：老消息里没有这两个键，缺了要能正常读进来。
  api_url: z.string().optional(),
  http_status: z.number().nullable().optional(),
});

const StandaloneAssistantDebugTraceSchema = z
  .object({
    main_pass: StandaloneAiDebugPassTraceSchema.optional(),
    variable_update_pass: StandaloneAiDebugPassTraceSchema.optional(),
    assistant_api_pass: StandaloneAiDebugPassTraceSchema.optional(),
    review_pass: StandaloneAiDebugPassTraceSchema.optional(),
    revise_pass: StandaloneAiDebugPassTraceSchema.optional(),
  })
  .optional();

const StandaloneRuntimePresetMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  localContentEntryCount: z.number().int().nonnegative().default(0),
});

const StandaloneRuntimeWorldbookContextEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceName: z.string().min(1),
  sourceKind: z.enum(['builtin', 'preset', 'custom']),
  kind: z.enum(['worldbook', 'plot_rule', 'variable_update_rule', 'general']),
  defaultRoute: z.enum(['main', 'variable_update', 'shared']).default('shared'),
  route: z.enum(['main', 'variable_update', 'shared']),
  enabled: z.boolean(),
});

const StandaloneRuntimePromptAssetsSchema = z.object({
  sourceName: z.string().min(1),
  parseOk: z.boolean(),
  mode: z.enum(['compact', 'full']),
  totalPromptCount: z.number().int().nonnegative(),
  enabledPromptCount: z.number().int().nonnegative(),
  systemPromptCount: z.number().int().nonnegative(),
  userPromptCount: z.number().int().nonnegative(),
  assistantPromptCount: z.number().int().nonnegative(),
  containsActionOptionsRule: z.boolean(),
});

/** 玩家在设置里手动添加的世界书条目（不挂在预设上，跟着会话走） */
const StandaloneRuntimeCustomWorldbookEntrySchema = z.object({
  name: z.string(),
  content: z.string(),
  registeredWorldbookName: z.string().optional(),
  kind: z.enum(['worldbook', 'plot_rule', 'variable_update_rule', 'general']).optional(),
  route: z.enum(['main', 'variable_update', 'shared']).optional(),
  enabled: z.boolean().optional(),
});

/**
 * 抽奖进度：品质由前端算、次数与保底全由前端维护，因此不进 stat_data（AI 看不到），
 * 只随会话与楼层快照走。`保底计数` 同时承担「累计抽奖次数」展示与保底进度两个用途。
 */
export const StandaloneRuntimeLotteryStateSchema = z
  .object({
    保底计数: z.coerce.number().int().nonnegative().default(0),
  })
  .prefault({});

export const StandaloneRuntimeSessionSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    browser_owner: z.literal('standalone-app'),
    stat_data: StandaloneRuntimeStatDataSchema,
    initial_stat_data: StandaloneRuntimeOptionalStatDataSchema,
    worldbook_context: z.array(StandaloneRuntimeWorldbookContextEntrySchema).default([]),
    custom_worldbook_entries: z.array(StandaloneRuntimeCustomWorldbookEntrySchema).default([]),
    prompt_assets: StandaloneRuntimePromptAssetsSchema.nullable().default(null),
    preset_meta: StandaloneRuntimePresetMetaSchema.nullable().default(null),
    /**
     * 阶段总结：把已经掉出「最近若干轮」窗口、且玩家手动归档过的小总结，
     * 压成一段整体剧情摘要。空串表示还没归档过。
     */
    stage_summary: z.string().default(''),
    /**
     * 归档水位线：message_id 小于等于它的回合，已经被上面那段阶段总结覆盖，
     * 不用再单独塞进提示词。默认 -1 表示一条都没归档。
     */
    stage_summary_archived_until_message_id: z.number().int().default(-1),
    /**
     * 抽奖进度：不进 stat_data，只由前端维护；跟着会话存，读档时一起回来。
     */
    lottery_state: StandaloneRuntimeLotteryStateSchema,
  })
  .transform(session => ({
    ...session,
    initial_stat_data: getStandaloneStatSchema().parse(session.initial_stat_data ?? session.stat_data),
  }));

export const StandaloneRuntimeMessageRoleSchema = z.enum(['user', 'assistant']);

/** 生图记录，索引与正文里第 N 个生图提示词对应 */
export const StandaloneRuntimeGeneratedImageSchema = z.object({
  status: z.enum(['idle', 'running', 'done', 'error']).default('idle'),
  /** 本地 ComfyUI：图片在 ComfyUI 服务上的地址 */
  url: z.string().optional(),
  filename: z.string().optional(),
  /**
   * 云端出图：图片存在本机 IndexedDB 里的编号。
   * 🔴 必须 optional —— 老存档里只有 url、没有编号，缺了要能正常读进来。
   */
  imageId: z.string().optional(),
  prompt: z.string().default(''),
  error: z.string().optional(),
});

export const StandaloneRuntimeMessageBodyPageSchema = z.object({
  text: z.string(),
  raw: z.string(),
  model: z.string().optional(),
});

export const StandaloneRuntimeMessageRecordSchema = z.object({
  message_id: z.number().int().nonnegative(),
  role: StandaloneRuntimeMessageRoleSchema,
  raw_content: z.string(),
  content_text: z.string(),
  /**
   * 正文多页列表（一次请求多条候选，或改稿追加成新页）。
   * 必须是 optional —— 旧存档没有这个键，缺了按单页处理。
   */
  body_pages: z.array(StandaloneRuntimeMessageBodyPageSchema).optional(),
  /**
   * 当前查看的正文页码（从 0 开始）。
   * 必须是 optional —— 旧存档没有这个键，缺了默认为 0。
   */
  body_page_index: z.coerce.number().int().nonnegative().optional(),
  think_content: z.string().nullable().optional(),
  summary_content: z.string().nullable().optional(),
  update_content: z.string().nullable().optional(),
  action_options: z.array(z.string()).default([]),
  formatted: z.string(),
  is_streaming: z.boolean().optional(),
  is_partial: z.boolean().optional(),
  stat_data_snapshot: StandaloneRuntimeOptionalStatDataSchema,
  /**
   * 这条回复「主 API 回复完成那一刻」的游戏数据快照 —— 即本回合变量更新的输入基底 S。
   *
   * 为什么必须单独存一份：`stat_data_snapshot` 在回合收尾时会被覆盖成「打完补丁的最终状态」，
   * 「主回复完成那一刻」的数据就留不下来；手动刷新变量要用它当基点，只能另存。
   *
   * 必须是 optional —— 旧存档没有这个键，缺了要能正常读进来（读取方回退到用户消息快照）。
   */
  variable_update_base_snapshot: StandaloneRuntimeOptionalStatDataSchema,
  variable_update_status: z.enum(['running', 'success', 'failed', 'skipped']).optional(),
  variable_update_warning: z.string().nullable().optional(),
  debug_trace: StandaloneAssistantDebugTraceSchema,
  generated_images: z.array(StandaloneRuntimeGeneratedImageSchema).optional(),
  createdAt: z
    .string()
    .min(1)
    .default(() => new Date().toISOString()),
  /**
   * 本次回复实际用到的模型名。
   * 必须是 optional —— 旧存档没有这个键，缺了要能正常读进来，只是展示时回退到占位文案。
   */
  model: z.string().optional(),
  /**
   * 抽奖结果消息标记：为 true 时，这条回复只在聊天流展示，不参与剧情历史与前情提要。
   * 必须是 optional —— 旧存档没有这个键。
   */
  lottery: z.boolean().optional(),
  /**
   * 这条消息落地时的抽奖进度快照。回退楼层时用它把抽奖次数/保底恢复到当时的值。
   * 必须是 optional —— 旧存档没有这个键，缺了回退时沿用当前值。
   */
  lottery_state_snapshot: StandaloneRuntimeLotteryStateSchema.optional(),
  /**
   * 抽奖请求的参数快照（次数 / 品质清单 / 抽完后的保底计数），只挂在抽奖请求消息（user）上。
   * 「重新发送」重来这次抽奖时复用这份品质清单，保证重来不会改变本次摇出的品质。
   * 必须是 optional —— 旧存档与非抽奖消息都没有这个键。
   */
  lottery_request: z
    .object({
      count: z.coerce.number().int().positive(),
      qualities: z.array(z.string()),
      pity_count_after: z.coerce.number().int().nonnegative(),
    })
    .optional(),
});

export const StandaloneRuntimeMessagesSchema = z.object({
  session_id: z.string().min(1),
  next_message_id: z.number().int().nonnegative(),
  records: z.array(StandaloneRuntimeMessageRecordSchema),
});

export type StandaloneRuntimeSession = z.infer<typeof StandaloneRuntimeSessionSchema>;
export type StandaloneRuntimeLotteryState = z.infer<typeof StandaloneRuntimeLotteryStateSchema>;
export type StandaloneRuntimeMessageRole = z.infer<typeof StandaloneRuntimeMessageRoleSchema>;
export type StandaloneRuntimeMessageBodyPage = z.infer<typeof StandaloneRuntimeMessageBodyPageSchema>;
export type StandaloneRuntimeMessageRecord = z.infer<typeof StandaloneRuntimeMessageRecordSchema>;
export type StandaloneRuntimeMessages = z.infer<typeof StandaloneRuntimeMessagesSchema>;
