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
});

const StandaloneAssistantDebugTraceSchema = z
  .object({
    main_pass: StandaloneAiDebugPassTraceSchema.optional(),
    variable_update_pass: StandaloneAiDebugPassTraceSchema.optional(),
    assistant_api_pass: StandaloneAiDebugPassTraceSchema.optional(),
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
  })
  .transform(session => ({
    ...session,
    initial_stat_data: getStandaloneStatSchema().parse(session.initial_stat_data ?? session.stat_data),
  }));

export const StandaloneRuntimeMessageRoleSchema = z.enum(['user', 'assistant']);

/** 本地 ComfyUI 生成的插图记录，索引与正文里第 N 个生图提示词对应 */
export const StandaloneRuntimeGeneratedImageSchema = z.object({
  status: z.enum(['idle', 'running', 'done', 'error']).default('idle'),
  url: z.string().optional(),
  filename: z.string().optional(),
  prompt: z.string().default(''),
  error: z.string().optional(),
});

export const StandaloneRuntimeMessageRecordSchema = z.object({
  message_id: z.number().int().nonnegative(),
  role: StandaloneRuntimeMessageRoleSchema,
  raw_content: z.string(),
  content_text: z.string(),
  think_content: z.string().nullable().optional(),
  summary_content: z.string().nullable().optional(),
  update_content: z.string().nullable().optional(),
  action_options: z.array(z.string()).default([]),
  formatted: z.string(),
  is_streaming: z.boolean().optional(),
  is_partial: z.boolean().optional(),
  stat_data_snapshot: StandaloneRuntimeOptionalStatDataSchema,
  variable_update_status: z.enum(['running', 'success', 'failed', 'skipped']).optional(),
  variable_update_warning: z.string().nullable().optional(),
  debug_trace: StandaloneAssistantDebugTraceSchema,
  generated_images: z.array(StandaloneRuntimeGeneratedImageSchema).optional(),
  createdAt: z
    .string()
    .min(1)
    .default(() => new Date().toISOString()),
});

export const StandaloneRuntimeMessagesSchema = z.object({
  session_id: z.string().min(1),
  next_message_id: z.number().int().nonnegative(),
  records: z.array(StandaloneRuntimeMessageRecordSchema),
});

export type StandaloneRuntimeSession = z.infer<typeof StandaloneRuntimeSessionSchema>;
export type StandaloneRuntimeMessageRole = z.infer<typeof StandaloneRuntimeMessageRoleSchema>;
export type StandaloneRuntimeMessageRecord = z.infer<typeof StandaloneRuntimeMessageRecordSchema>;
export type StandaloneRuntimeMessages = z.infer<typeof StandaloneRuntimeMessagesSchema>;
