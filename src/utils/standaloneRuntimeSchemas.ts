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
  sourceKind: z.enum(['builtin', 'preset']),
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

export const StandaloneRuntimeSessionSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    browser_owner: z.literal('standalone-app'),
    stat_data: StandaloneRuntimeStatDataSchema,
    initial_stat_data: StandaloneRuntimeOptionalStatDataSchema,
    worldbook_context: z.array(StandaloneRuntimeWorldbookContextEntrySchema).default([]),
    prompt_assets: StandaloneRuntimePromptAssetsSchema.nullable().default(null),
    preset_meta: StandaloneRuntimePresetMetaSchema.nullable().default(null),
  })
  .transform(session => ({
    ...session,
    initial_stat_data: getStandaloneStatSchema().parse(session.initial_stat_data ?? session.stat_data),
  }));

export const StandaloneRuntimeMessageRoleSchema = z.enum(['user', 'assistant']);

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
