import type { LocalContentEntryConfig, PresetConfig } from '../presets/types';
import type { ImageBackend, WorldDifficulty } from '../stores/settings';

import {
  currentStatSnapshotTemplate as rawCurrentStatSnapshot,
  mainApiPromptTemplate as rawMainApiPrompt,
  plotLotteryRulesTemplate as rawPlotLotteryRules,
  plotOnlineModeTemplate as rawPlotOnlineMode,
  plotTextToImageNaiTemplate as rawPlotTextToImageNai,
  plotTextToImageTemplate as rawPlotTextToImage,
  variableUpdateFormatTemplate as rawVariableUpdateFormat,
  variableUpdateRulesTemplate as rawVariableUpdateRules,
} from '../assets/standalone-local-content';
import {
  renderStandaloneLocalContentTemplate,
  type StandaloneLocalContentRenderContext,
} from './standaloneLocalContentEjs';
import { applyStandalonePromptMacroReplacements } from '../../runtime/standalonePromptUtils';
import { normalizeLineEndingsTrimmed as normalizeLineEndings } from './textNormalize';

export type StandaloneLocalContentRoute = 'main' | 'variable_update' | 'shared';

export type StandaloneBuiltinAssetRouteOverrideMap = Record<string, StandaloneLocalContentRoute>;

export type StandaloneLocalContentKind = 'worldbook' | 'plot_rule' | 'variable_update_rule' | 'general';

export type StandaloneLocalContentAsset = {
  id: string;
  title: string;
  sourceName: string;
  kind: StandaloneLocalContentKind;
  route: StandaloneLocalContentRoute;
  defaultEnabled: boolean;
  description: string;
  rawContent: string;
};

/** 条目的来源：内置资产 / 预设携带 / 玩家在设置里手填 */
export type StandaloneLocalContentSourceKind = 'builtin' | 'preset' | 'custom';

export type ResolvedStandaloneLocalContentEntry = StandaloneLocalContentAsset & {
  sourceKind: StandaloneLocalContentSourceKind;
};

export type ResolvedStandaloneLocalContentStateEntry = ResolvedStandaloneLocalContentEntry & {
  enabled: boolean;
};

export type StandaloneRuntimeWorldbookContextEntry = {
  id: string;
  title: string;
  sourceName: string;
  sourceKind: StandaloneLocalContentSourceKind;
  kind: StandaloneLocalContentKind;
  defaultRoute: StandaloneLocalContentRoute;
  route: StandaloneLocalContentRoute;
  enabled: boolean;
};

export const VARIABLE_UPDATE_LOCAL_CONTENT_ASSET_IDS = ['variable-update-format', 'variable-update-rules'] as const;

export const REQUIRED_MAIN_REPLY_LOCAL_CONTENT_ASSET_IDS = ['main-api-prompt'] as const;

/** 本地 ComfyUI 用：自然语言句式的生图提示词规则 */
export const TEXT_TO_IMAGE_LOCAL_CONTENT_ASSET_IDS = ['plot-text-to-image'] as const;

/** NovelAI 用：Danbooru 标签流的生图提示词规则。与上面那条互斥，选了后端就自动切 */
export const TEXT_TO_IMAGE_NOVELAI_LOCAL_CONTENT_ASSET_IDS = ['plot-text-to-image-nai'] as const;

export const ONLINE_MODE_LOCAL_CONTENT_ASSET_IDS = ['plot-online-mode'] as const;

export const WORLD_DIFFICULTY_LOCAL_CONTENT_ASSET_IDS = ['plot-world-difficulty'] as const;

export const SETTINGS_MANAGED_LOCAL_CONTENT_ASSET_IDS = [
  ...REQUIRED_MAIN_REPLY_LOCAL_CONTENT_ASSET_IDS,
  ...VARIABLE_UPDATE_LOCAL_CONTENT_ASSET_IDS,
  ...TEXT_TO_IMAGE_LOCAL_CONTENT_ASSET_IDS,
  ...TEXT_TO_IMAGE_NOVELAI_LOCAL_CONTENT_ASSET_IDS,
  ...ONLINE_MODE_LOCAL_CONTENT_ASSET_IDS,
  ...WORLD_DIFFICULTY_LOCAL_CONTENT_ASSET_IDS,
] as const;

export const LOCKED_ROUTE_LOCAL_CONTENT_ASSET_IDS = [
  ...REQUIRED_MAIN_REPLY_LOCAL_CONTENT_ASSET_IDS,
  ...VARIABLE_UPDATE_LOCAL_CONTENT_ASSET_IDS,
] as const;

const WORLD_DIFFICULTY_ENTRY_SOURCE_NAME = '[mvu_plot]世界难度';

const WORLD_DIFFICULTY_PROMPTS: Record<WorldDifficulty, string[]> = {
  最简单: [
    '- 新手保护优先：冲突发生前给出明显预警与可规避选项。',
    '- 资源获取宽松：金钱、物资、人脉、情报的获取成功率更高。',
    '- 失败可补救：允许通过额外行动快速挽回，不触发连续性毁灭后果。',
    '- 机遇偏多：更容易遇到贵人、折扣、隐藏奖励与正向随机事件。',
    '- 敌对行为收敛：对手试探多于致命打击。',
  ],
  简单: [
    '- 风险存在但整体宽容：关键节点给出可理解的提示。',
    '- 资源整体略宽松：正常经营即可维持正向循环。',
    '- 失败代价中等偏低：会受损，但通常可在后续1~2轮修复。',
    '- 对手会施压但节奏可控，不连续追杀。',
    '- 保持正反馈：阶段性奖励略高于阶段性损耗。',
  ],
  普通: [
    '- 风险与收益平衡：不偏袒玩家，也不恶意针对。',
    '- 资源获取与消耗对等：需要正常规划预算与行动顺序。',
    '- 失败代价真实：失误会带来后续连锁影响，但不应直接判死局。',
    '- 对手行为符合其动机，会主动竞争但保留博弈空间。',
    '- 奇遇与危机概率均衡，避免连续极端事件。',
  ],
  困难: [
    '- 资源偏紧：收入、补给、援助减少，维护成本上升。',
    '- 对手更主动：会抢占机会、制造压力并放大玩家失误。',
    '- 失败代价高：错误决策可能造成多项指标同步下滑。',
    '- 容错收窄：需要提前规划与留后手，临时补救成本更高。',
    '- 奖励更稀缺：必须通过高质量决策与执行才能稳步推进。',
  ],
  地狱: [
    '- 高压生存：持续危机与强对抗并存，局势变化快。',
    '- 资源极度稀缺：补给、资金、人脉、容错都非常有限。',
    '- 小失误可滚雪球：一次错误可引发连续负面连锁。',
    '- 对手进攻性极强：会主动围堵、截胡、背刺与连环施压。',
    '- 奇遇极少且有代价：高回报机会必须伴随高风险。',
    '- 仅在极优策略或关键突破时给予喘息空间。',
  ],
};

function applyStandaloneLocalContentAssetEnabledState(
  enabledMap: Record<string, boolean>,
  assetIds: readonly string[],
  enabled: boolean,
): Record<string, boolean> {
  const nextEnabledMap = {
    ...enabledMap,
  };

  assetIds.forEach(assetId => {
    nextEnabledMap[assetId] = enabled;
  });

  return nextEnabledMap;
}

export function applyFixedVariableUpdateStandaloneLocalContent(
  enabledMap: Record<string, boolean>,
): Record<string, boolean> {
  const { ['variable-update-thought-template']: _deprecatedThoughtTemplate, ...nextEnabledMap } = enabledMap;

  return {
    ...nextEnabledMap,
    'main-api-prompt': true,
    'variable-update-format': true,
    'variable-update-rules': true,
  };
}

/**
 * 生图提示词规则随后端互斥开关。
 *
 * 两条规则只能开一条 —— AI 每轮只在正文里写一套提示词，
 * NovelAI 吃标签流、ComfyUI 吃自然语言，同时开必然有一条收到错风格的提示词。
 */
export function applyTextToImageToStandaloneLocalContent(
  enabledMap: Record<string, boolean>,
  enabled: boolean,
  backend: ImageBackend = 'comfyui',
): Record<string, boolean> {
  const withComfyUi = applyStandaloneLocalContentAssetEnabledState(
    enabledMap,
    TEXT_TO_IMAGE_LOCAL_CONTENT_ASSET_IDS,
    enabled && backend === 'comfyui',
  );

  return applyStandaloneLocalContentAssetEnabledState(
    withComfyUi,
    TEXT_TO_IMAGE_NOVELAI_LOCAL_CONTENT_ASSET_IDS,
    enabled && backend === 'novelai',
  );
}

export function applyOnlineModeToStandaloneLocalContent(
  enabledMap: Record<string, boolean>,
  enabled: boolean,
): Record<string, boolean> {
  return applyStandaloneLocalContentAssetEnabledState(enabledMap, ONLINE_MODE_LOCAL_CONTENT_ASSET_IDS, enabled);
}

export function applyWorldDifficultyToStandaloneLocalContent(
  enabledMap: Record<string, boolean>,
): Record<string, boolean> {
  return applyStandaloneLocalContentAssetEnabledState(enabledMap, WORLD_DIFFICULTY_LOCAL_CONTENT_ASSET_IDS, true);
}

export function isSettingsManagedStandaloneLocalContentAsset(assetId: string): boolean {
  return SETTINGS_MANAGED_LOCAL_CONTENT_ASSET_IDS.includes(
    assetId as (typeof SETTINGS_MANAGED_LOCAL_CONTENT_ASSET_IDS)[number],
  );
}

export function isLockedRouteStandaloneLocalContentAsset(assetId: string): boolean {
  return LOCKED_ROUTE_LOCAL_CONTENT_ASSET_IDS.includes(
    assetId as (typeof LOCKED_ROUTE_LOCAL_CONTENT_ASSET_IDS)[number],
  );
}

const STANDALONE_LOCAL_CONTENT_MANIFEST: StandaloneLocalContentAsset[] = [
  {
    id: 'main-api-prompt',
    title: '主回复标签规则',
    sourceName: '[mvu_plot]不更新变量.md',
    kind: 'general',
    route: 'main',
    defaultEnabled: true,
    description: '主回复硬性基础规则：禁止在正文回合输出变量更新命令，并要求正文必须使用 <contenttext> 标签包裹。',
    rawContent: rawMainApiPrompt,
  },
  {
    id: 'current-stat-snapshot',
    title: '当前变量快照',
    sourceName: '当前变量快照.txt',
    kind: 'general',
    route: 'shared',
    defaultEnabled: true,
    description: '把当前本地游戏状态作为提示词片段送进主回复和变量更新流程。',
    rawContent: rawCurrentStatSnapshot,
  },
  {
    id: 'plot-lottery-rules',
    title: '抽奖结果规则',
    sourceName: '[mvu_plot]抽奖规则.txt',
    kind: 'plot_rule',
    route: 'main',
    defaultEnabled: true,
    description: '当积分系统触发抽奖时，根据当前变量动态渲染抽奖结果约束。',
    rawContent: rawPlotLotteryRules,
  },
  {
    id: 'plot-world-difficulty',
    title: '世界难度规则',
    sourceName: WORLD_DIFFICULTY_ENTRY_SOURCE_NAME,
    kind: 'plot_rule',
    route: 'main',
    defaultEnabled: true,
    description: '按当前已选世界难度动态生成剧情压力、资源稀缺度与失败代价约束。',
    rawContent: '',
  },
  {
    id: 'plot-text-to-image',
    title: '文生图格式规则',
    sourceName: '[mvu_plot]文生图格式(没有生图插件不开).md',
    kind: 'plot_rule',
    route: 'main',
    defaultEnabled: false,
    description: '要求正文在合适段落后输出规定格式的生图提示词。',
    rawContent: rawPlotTextToImage,
  },
  {
    id: 'plot-text-to-image-nai',
    title: '文生图格式规则（NovelAI）',
    sourceName: '[mvu_plot]文生图格式-NovelAI(没有生图插件不开).md',
    kind: 'plot_rule',
    route: 'main',
    defaultEnabled: false,
    description: '要求正文在合适段落后输出 Danbooru 标签流的生图提示词，供 NovelAI 兼容接口使用。',
    rawContent: rawPlotTextToImageNai,
  },
  {
    id: 'plot-online-mode',
    title: '多人联机规则',
    sourceName: '[mvu_plot]多人联机.md',
    kind: 'plot_rule',
    route: 'main',
    defaultEnabled: false,
    description: '要求在多人输入时使用上帝视角，并分别表现每个用户的行动。',
    rawContent: rawPlotOnlineMode,
  },
  {
    id: 'variable-update-format',
    title: '变量输出格式',
    sourceName: '[mvu_update]变量输出格式.txt',
    kind: 'variable_update_rule',
    route: 'variable_update',
    defaultEnabled: true,
    description: '统一主回复与补写流程的变量输出协议，保证 JSON Patch 可解析。',
    rawContent: rawVariableUpdateFormat,
  },
  {
    id: 'variable-update-rules',
    title: '变量更新规则',
    sourceName: '[mvu_update]变量更新规则.txt',
    kind: 'variable_update_rule',
    route: 'variable_update',
    defaultEnabled: true,
    description: '变量更新专用规则，会按当前本地状态动态渲染生存模式、人物列表等检查项。',
    rawContent: rawVariableUpdateRules,
  },
];

function renderStandaloneLocalContentAsset(
  asset: StandaloneLocalContentAsset,
  renderContext: StandaloneLocalContentRenderContext,
): { content: string; warning: string | null } {
  if (asset.id === 'plot-world-difficulty') {
    return {
      content: normalizeLineEndings(buildWorldDifficultyStandaloneLocalContent(renderContext.worldDifficulty)),
      warning: null,
    };
  }

  const scripted = renderStandaloneLocalContentTemplate({
    template: asset.rawContent,
    renderContext,
    sourceName: asset.sourceName,
  });
  const replaced = applyStandalonePromptMacroReplacements(scripted.content, {
    statData: renderContext.statData,
    snapshotStatData: renderContext.snapshotStatData,
    compactSnapshot: renderContext.compactSnapshot,
  });
  return {
    content: normalizeLineEndings(replaced),
    warning: scripted.warning,
  };
}

export function buildWorldDifficultyStandaloneLocalContent(difficulty: WorldDifficulty): string {
  return [
    `当前世界难度：${difficulty}`,
    '以下为剧情生成约束规则：',
    '禁止只口头描述规则而不体现在事件结果、资源变化、敌我行为与失败代价上。',
    '每次回复至少体现一项关键特征（如资源稀缺度、敌对强度、容错空间、危机频率）。',
    ...WORLD_DIFFICULTY_PROMPTS[difficulty],
  ].join('\n');
}

function shouldIncludeRoute(assetRoute: StandaloneLocalContentRoute, targetRoute: 'main' | 'variable_update'): boolean {
  if (assetRoute === 'shared') {
    return true;
  }

  return assetRoute === targetRoute;
}

export function getStandaloneLocalContentBuiltinRouteOverrides(): StandaloneBuiltinAssetRouteOverrideMap {
  return Object.fromEntries(STANDALONE_LOCAL_CONTENT_MANIFEST.map(asset => [asset.id, asset.route]));
}

export function normalizeStandaloneBuiltinAssetRouteOverrides(
  routeOverrides?: Record<string, unknown> | null,
): StandaloneBuiltinAssetRouteOverrideMap {
  const defaultOverrides = getStandaloneLocalContentBuiltinRouteOverrides();
  const nextOverrides: StandaloneBuiltinAssetRouteOverrideMap = {
    ...defaultOverrides,
  };

  if (!routeOverrides || typeof routeOverrides !== 'object') {
    return nextOverrides;
  }

  Object.entries(defaultOverrides).forEach(([assetId]) => {
    const candidate = routeOverrides[assetId];
    if (candidate === 'main' || candidate === 'variable_update' || candidate === 'shared') {
      nextOverrides[assetId] = candidate;
    }
  });

  return nextOverrides;
}

export function resolveStandaloneBuiltinAssetRoute(input: {
  assetId: string;
  fallbackRoute: StandaloneLocalContentRoute;
  routeOverrides?: StandaloneBuiltinAssetRouteOverrideMap;
}): StandaloneLocalContentRoute {
  if (isLockedRouteStandaloneLocalContentAsset(input.assetId)) {
    return input.fallbackRoute;
  }

  const overrideRoute = input.routeOverrides?.[input.assetId];
  if (overrideRoute === 'main' || overrideRoute === 'variable_update' || overrideRoute === 'shared') {
    return overrideRoute;
  }

  return input.fallbackRoute;
}

export function getStandaloneLocalContentManifest(): StandaloneLocalContentAsset[] {
  return STANDALONE_LOCAL_CONTENT_MANIFEST.map(asset => ({ ...asset }));
}

export function inferStandaloneLocalContentKind(input: {
  name?: string;
  sourceName?: string;
  route?: StandaloneLocalContentRoute;
}): StandaloneLocalContentKind {
  const combinedLabel = [input.name, input.sourceName]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' ')
    .trim();

  if (/\[WB\]/i.test(combinedLabel)) {
    return 'worldbook';
  }

  if (/\[mvu_plot\]/i.test(combinedLabel)) {
    return 'plot_rule';
  }

  if (/\[mvu_update\]/i.test(combinedLabel) || input.route === 'variable_update') {
    return 'variable_update_rule';
  }

  return 'general';
}

function normalizeLocalContentEntryList(input: {
  entries: LocalContentEntryConfig[] | null | undefined;
  idPrefix: string;
  sourceNamePrefix?: string;
  description: string;
  sourceKind: StandaloneLocalContentSourceKind;
}): ResolvedStandaloneLocalContentEntry[] {
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const prefix = input.sourceNamePrefix?.trim();

  return entries
    .filter(entry => Boolean(entry?.name?.trim()) && Boolean(entry?.content?.trim()))
    .map((entry, index) => {
      const name = entry.name.trim();
      return {
        id: `${input.idPrefix}-${index}`,
        title: name,
        sourceName: prefix ? `${prefix} / ${name}` : name,
        kind: inferStandaloneLocalContentKind({
          name,
          sourceName: prefix,
          route: entry.route,
        }),
        route: entry.route ?? 'shared',
        defaultEnabled: entry.enabled !== false,
        description: input.description,
        rawContent: entry.content,
        sourceKind: input.sourceKind,
      };
    });
}

function normalizePresetLocalContentEntries(
  preset: PresetConfig | null | undefined,
): ResolvedStandaloneLocalContentEntry[] {
  return normalizeLocalContentEntryList({
    entries: preset?.localContentEntries,
    idPrefix: `preset-local-content-${preset?.id ?? 'adhoc'}`,
    sourceNamePrefix: preset?.name,
    description: '由当前开局模板携带的本地附加内容。',
    sourceKind: 'preset',
  });
}

/** 玩家在设置里手动添加的条目；不挂在预设上，没选预设也能用 */
function normalizeCustomLocalContentEntries(
  entries: LocalContentEntryConfig[] | null | undefined,
): ResolvedStandaloneLocalContentEntry[] {
  return normalizeLocalContentEntryList({
    entries,
    idPrefix: 'custom-local-content',
    description: '在设置里手动添加的本地附加内容。',
    sourceKind: 'custom',
  });
}

export function getStandaloneEffectiveLocalContentManifest(
  preset: PresetConfig | null | undefined,
  customEntries?: LocalContentEntryConfig[] | null,
): ResolvedStandaloneLocalContentEntry[] {
  const builtinEntries = STANDALONE_LOCAL_CONTENT_MANIFEST.map(asset => ({
    ...asset,
    sourceKind: 'builtin' as const,
  }));

  return [
    ...builtinEntries,
    ...normalizePresetLocalContentEntries(preset),
    ...normalizeCustomLocalContentEntries(customEntries),
  ];
}

export function resolveStandaloneLocalContentEntries(input: {
  preset?: PresetConfig | null;
  customEntries?: LocalContentEntryConfig[] | null;
  enabledMap?: Record<string, boolean>;
  builtinRouteOverrides?: StandaloneBuiltinAssetRouteOverrideMap;
}): ResolvedStandaloneLocalContentStateEntry[] {
  const { preset, customEntries, enabledMap = {}, builtinRouteOverrides } = input;

  return getStandaloneEffectiveLocalContentManifest(preset, customEntries).map(asset => {
    const resolvedRoute =
      asset.sourceKind === 'builtin'
        ? resolveStandaloneBuiltinAssetRoute({
            assetId: asset.id,
            fallbackRoute: asset.route,
            routeOverrides: builtinRouteOverrides,
          })
        : asset.route;

    return {
      ...asset,
      route: resolvedRoute,
      enabled: REQUIRED_MAIN_REPLY_LOCAL_CONTENT_ASSET_IDS.includes(
        asset.id as (typeof REQUIRED_MAIN_REPLY_LOCAL_CONTENT_ASSET_IDS)[number],
      )
        ? true
        : (enabledMap[asset.id] ?? asset.defaultEnabled),
    };
  });
}

export function createStandaloneRuntimeWorldbookContext(input: {
  preset?: PresetConfig | null;
  customEntries?: LocalContentEntryConfig[] | null;
  enabledMap?: Record<string, boolean>;
  builtinRouteOverrides?: StandaloneBuiltinAssetRouteOverrideMap;
}): StandaloneRuntimeWorldbookContextEntry[] {
  return resolveStandaloneLocalContentEntries(input).map(asset => ({
    id: asset.id,
    title: asset.title,
    sourceName: asset.sourceName,
    sourceKind: asset.sourceKind,
    kind: asset.kind,
    defaultRoute:
      asset.sourceKind === 'builtin'
        ? (getStandaloneLocalContentBuiltinRouteOverrides()[asset.id] ?? asset.route)
        : asset.route,
    route: asset.route,
    enabled: asset.enabled,
  }));
}

export function getStandaloneLocalContentDefaultEnabledMap(): Record<string, boolean> {
  return Object.fromEntries(STANDALONE_LOCAL_CONTENT_MANIFEST.map(asset => [asset.id, asset.defaultEnabled]));
}

export function normalizeLocalContentEntriesInput(entries: LocalContentEntryConfig[]): LocalContentEntryConfig[] {
  return entries
    .filter(entry => Boolean(entry?.name?.trim()) && Boolean(entry?.content?.trim()))
    .map(entry => ({
      name: entry.name.trim(),
      content: entry.content.trim(),
      registeredWorldbookName: entry.registeredWorldbookName?.trim() || undefined,
      kind: entry.kind ?? inferStandaloneLocalContentKind({ name: entry.name, route: entry.route }),
      route: entry.route ?? 'shared',
      enabled: entry.enabled !== false,
    }));
}

export function resolveStandaloneLocalContentBlocks(input: {
  route: 'main' | 'variable_update';
  enabledMap: Record<string, boolean>;
  renderContext: StandaloneLocalContentRenderContext;
  preset?: PresetConfig | null;
  customEntries?: LocalContentEntryConfig[] | null;
  builtinRouteOverrides?: StandaloneBuiltinAssetRouteOverrideMap;
}): string[] {
  const { route, enabledMap, renderContext, preset, customEntries, builtinRouteOverrides } = input;
  const manifest = resolveStandaloneLocalContentEntries({ preset, customEntries, enabledMap, builtinRouteOverrides });

  return manifest
    .filter(asset => asset.enabled && shouldIncludeRoute(asset.route, route))
    .map(asset => {
      const rendered = renderStandaloneLocalContentAsset(asset, renderContext);
      if (rendered.warning) {
        console.warn('[StandaloneLocalContent] 资产渲染已回退为原文:', {
          assetId: asset.id,
          sourceName: asset.sourceName,
          warning: rendered.warning,
        });
      }

      if (!rendered.content) {
        return null;
      }

      return [`[本地内容:${asset.title}]`, rendered.content].join('\n');
    })
    .filter((block): block is string => Boolean(block));
}

/**
 * 判断一个已渲染的本地内容块是不是「世界书」条目。
 *
 * 世界书有独立注入通道（`resolveStandaloneMainWorldbookPrompt` → 主链路里单独成条），
 * 系统协议块拼装时必须用同一个判据把它排除，否则同一份世界书会在提示词里出现两遍。
 */
export function isStandaloneMainWorldbookBlock(block: string): boolean {
  return /^\[本地内容:.*\]/.test(block) && /\[WB\]/.test(block);
}

export function resolveStandaloneMainWorldbookPrompt(renderedBlocks: string[]): string {
  return renderedBlocks.filter(isStandaloneMainWorldbookBlock).join('\n\n').trim();
}

export function resolveStandaloneBuiltinLocalContentRenderedContent(input: {
  assetId: string;
  renderContext: StandaloneLocalContentRenderContext;
}): string {
  const asset = STANDALONE_LOCAL_CONTENT_MANIFEST.find(item => item.id === input.assetId);
  if (!asset) {
    return '';
  }

  const rendered = renderStandaloneLocalContentAsset(asset, input.renderContext);
  return rendered.content;
}

export function renderResolvedStandaloneLocalContentEntry(input: {
  entry: ResolvedStandaloneLocalContentEntry;
  renderContext: StandaloneLocalContentRenderContext;
}): string {
  const rendered = renderStandaloneLocalContentAsset(input.entry, input.renderContext);
  return rendered.content;
}
