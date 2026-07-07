import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type BadgeTab =
  | 'shop'
  | 'business'
  | 'players'
  | 'notebook'
  | 'characters'
  | 'world'
  | 'publicOpinion'
  | 'todoSummary'
  | 'riskOpportunity';

interface BadgeCounts {
  shop: number;
  business: number;
  players: number;
  notebook: number;
  characters: number;
  world: number;
  publicOpinion: number;
  todoSummary: number;
  riskOpportunity: number;
}

interface BadgeSnapshot {
  shopItems: Record<string, unknown>;
  shopSkills: Record<string, unknown>;
  inventoryDetails: Record<string, unknown>;
  businessIntel: Record<string, unknown>;
  businessEnterprise: Record<string, unknown>;
  playerSkills: Record<string, unknown>;
  playerItems: Record<string, unknown>;
  notebookCrisis: Record<string, unknown>;
  notebookOpportunity: Record<string, unknown>;
  notebookTodo: Record<string, unknown>;
  charactersRecord: Record<string, unknown>;
  worldState: Record<string, unknown>;
  publicOpinion: Record<string, unknown>;
}

type BadgePulseStates = Record<BadgeTab, boolean>;
type BadgeChangedKeys = Record<BadgeTab, string[]>;
type BadgeMutedTabs = Record<BadgeTab, boolean>;

interface BadgePersistedState {
  counts: BadgeCounts;
  snapshot: BadgeSnapshot | null;
  pulseStates?: BadgePulseStates;
  changedKeys?: BadgeChangedKeys;
  mutedTabs?: BadgeMutedTabs;
}

const STORAGE_KEY = 'tavern_helper_1980s_left_sidebar_badges';

function defaultCounts(): BadgeCounts {
  return {
    shop: 0,
    business: 0,
    players: 0,
    notebook: 0,
    characters: 0,
    world: 0,
    publicOpinion: 0,
    todoSummary: 0,
    riskOpportunity: 0,
  };
}

function emptySnapshot(): BadgeSnapshot {
  return {
    shopItems: {},
    shopSkills: {},
    inventoryDetails: {},
    businessIntel: {},
    businessEnterprise: {},
    playerSkills: {},
    playerItems: {},
    notebookCrisis: {},
    notebookOpportunity: {},
    notebookTodo: {},
    charactersRecord: {},
    worldState: {},
    publicOpinion: {},
  };
}

function defaultPulseStates(): BadgePulseStates {
  return {
    shop: false,
    business: false,
    players: false,
    notebook: false,
    characters: false,
    world: false,
    publicOpinion: false,
    todoSummary: false,
    riskOpportunity: false,
  };
}

function defaultChangedKeys(): BadgeChangedKeys {
  return {
    shop: [],
    business: [],
    players: [],
    notebook: [],
    characters: [],
    world: [],
    publicOpinion: [],
    todoSummary: [],
    riskOpportunity: [],
  };
}

function defaultMutedTabs(): BadgeMutedTabs {
  return {
    shop: false,
    business: false,
    players: false,
    notebook: false,
    characters: false,
    world: false,
    publicOpinion: false,
    todoSummary: false,
    riskOpportunity: false,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return _.isPlainObject(value) ? (value as Record<string, unknown>) : {};
}

function pickDefinedEntries(entries: Array<[string, unknown]>): Record<string, unknown> {
  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!_.isNil(value)) {
      acc[key] = _.cloneDeep(value);
    }
    return acc;
  }, {});
}

function toStringArray(value: unknown): string[] {
  if (!_.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function createSnapshot(data: any): BadgeSnapshot {
  const world = data?.世界;
  const worldInfo = world?.信息层级;

  return {
    shopItems: _.cloneDeep(toRecord(data?.商城?.物品)),
    shopSkills: _.cloneDeep(toRecord(data?.商城?.技能)),
    inventoryDetails: _.cloneDeep(toRecord(data?.玩家?.库存详情)),
    businessIntel: _.cloneDeep(toRecord(data?.玩家?.商业情报)),
    businessEnterprise: _.cloneDeep(toRecord(data?.玩家?.经营实体)),
    playerSkills: _.cloneDeep(toRecord(data?.玩家?.技能系统)),
    playerItems: _.cloneDeep(toRecord(data?.玩家?.物品栏)),
    notebookCrisis: _.cloneDeep(toRecord(data?.玩家?.记事本?.潜在危机)),
    notebookOpportunity: _.cloneDeep(toRecord(data?.玩家?.记事本?.当前机遇)),
    notebookTodo: _.cloneDeep(toRecord(data?.玩家?.记事本?.待办事项)),
    charactersRecord: _.cloneDeep(toRecord(data?.人物档案)),
    worldState: pickDefinedEntries([
      ['力量体系', world?.力量体系],
      ['玩法侧重', world?.玩法侧重],
      ['权力结构', world?.社会环境?.权力结构],
      ['社会氛围', world?.社会环境?.社会氛围],
      ['主流价值观', world?.社会环境?.主流价值观],
      ['运行规则', world?.运行规则?.length ? world.运行规则 : undefined],
      ['叙事玩法', world?.叙事玩法],
      ['区域特征', world?.空间定位?.区域特征],
    ]),
    publicOpinion: pickDefinedEntries([
      ['全局重大事件', worldInfo?.全局重大事件],
      ['势力动态', worldInfo?.势力动态],
      ['区域事件', worldInfo?.区域事件],
      ['本地消息', worldInfo?.本地消息],
      ['圈内传闻', worldInfo?.圈内传闻],
    ]),
  };
}

function diffRecordAddedOnlyKeys(oldRecord: Record<string, unknown>, newRecord: Record<string, unknown>): string[] {
  const changedKeys: string[] = [];

  Object.keys(newRecord).forEach(key => {
    if (!_.has(oldRecord, key)) {
      changedKeys.push(key);
    }
  });

  return changedKeys;
}

function diffRecordAddedOrModifiedKeys(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);
  const changedKeys: string[] = [];

  keys.forEach(key => {
    const hasOld = _.has(oldRecord, key);
    const hasNew = _.has(newRecord, key);

    // 仅统计新增或修改，不统计删除
    if (!hasOld && hasNew) {
      changedKeys.push(key);
      return;
    }

    if (hasOld && !hasNew) {
      return;
    }

    if (!_.isEqual(oldRecord[key], newRecord[key])) {
      changedKeys.push(key);
    }
  });

  return changedKeys;
}

function normalizePersistedState(raw: unknown): BadgePersistedState {
  const counts = _.isPlainObject(raw) ? _.get(raw, 'counts', {}) : {};
  const snapshot = _.isPlainObject(raw) ? _.get(raw, 'snapshot', null) : null;

  const pulseStates = _.isPlainObject(raw) ? _.get(raw, 'pulseStates', {}) : {};
  const changedKeys = _.isPlainObject(raw) ? _.get(raw, 'changedKeys', {}) : {};
  const hasPulseStates = _.isPlainObject(raw) && _.has(raw, 'pulseStates');
  const mutedTabs = _.isPlainObject(raw) ? _.get(raw, 'mutedTabs', {}) : {};

  const normalizedCounts: BadgeCounts = {
    shop: Math.max(0, Number(_.get(counts, 'shop', 0)) || 0),
    business: Math.max(0, Number(_.get(counts, 'business', 0)) || 0),
    players: Math.max(0, Number(_.get(counts, 'players', 0)) || 0),
    notebook: Math.max(0, Number(_.get(counts, 'notebook', 0)) || 0),
    characters: Math.max(0, Number(_.get(counts, 'characters', 0)) || 0),
    world: Math.max(0, Number(_.get(counts, 'world', 0)) || 0),
    publicOpinion: Math.max(0, Number(_.get(counts, 'publicOpinion', 0)) || 0),
    todoSummary: Math.max(0, Number(_.get(counts, 'todoSummary', 0)) || 0),
    riskOpportunity: Math.max(0, Number(_.get(counts, 'riskOpportunity', 0)) || 0),
  };

  return {
    counts: normalizedCounts,
    snapshot: _.isPlainObject(snapshot)
      ? {
          shopItems: toRecord(_.get(snapshot, 'shopItems', {})),
          shopSkills: toRecord(_.get(snapshot, 'shopSkills', {})),
          inventoryDetails: toRecord(_.get(snapshot, 'inventoryDetails', {})),
          businessIntel: toRecord(_.get(snapshot, 'businessIntel', {})),
          businessEnterprise: toRecord(_.get(snapshot, 'businessEnterprise', {})),
          playerSkills: toRecord(_.get(snapshot, 'playerSkills', {})),
          playerItems: toRecord(_.get(snapshot, 'playerItems', {})),
          notebookCrisis: toRecord(_.get(snapshot, 'notebookCrisis', {})),
          notebookOpportunity: toRecord(_.get(snapshot, 'notebookOpportunity', {})),
          notebookTodo: toRecord(_.get(snapshot, 'notebookTodo', {})),
          charactersRecord: toRecord(_.get(snapshot, 'charactersRecord', {})),
          worldState: toRecord(_.get(snapshot, 'worldState', {})),
          publicOpinion: toRecord(_.get(snapshot, 'publicOpinion', {})),
        }
      : null,
    pulseStates: {
      shop: hasPulseStates ? Boolean(_.get(pulseStates, 'shop', false)) : normalizedCounts.shop > 0,
      business: hasPulseStates ? Boolean(_.get(pulseStates, 'business', false)) : normalizedCounts.business > 0,
      players: hasPulseStates ? Boolean(_.get(pulseStates, 'players', false)) : normalizedCounts.players > 0,
      notebook: hasPulseStates ? Boolean(_.get(pulseStates, 'notebook', false)) : normalizedCounts.notebook > 0,
      characters: hasPulseStates ? Boolean(_.get(pulseStates, 'characters', false)) : normalizedCounts.characters > 0,
      world: hasPulseStates ? Boolean(_.get(pulseStates, 'world', false)) : normalizedCounts.world > 0,
      publicOpinion: hasPulseStates
        ? Boolean(_.get(pulseStates, 'publicOpinion', false))
        : normalizedCounts.publicOpinion > 0,
      todoSummary: hasPulseStates
        ? Boolean(_.get(pulseStates, 'todoSummary', false))
        : normalizedCounts.todoSummary > 0,
      riskOpportunity: hasPulseStates
        ? Boolean(_.get(pulseStates, 'riskOpportunity', false))
        : normalizedCounts.riskOpportunity > 0,
    },
    changedKeys: {
      shop: toStringArray(_.get(changedKeys, 'shop')),
      business: toStringArray(_.get(changedKeys, 'business')),
      players: toStringArray(_.get(changedKeys, 'players')),
      notebook: toStringArray(_.get(changedKeys, 'notebook')),
      characters: toStringArray(_.get(changedKeys, 'characters')),
      world: toStringArray(_.get(changedKeys, 'world')),
      publicOpinion: toStringArray(_.get(changedKeys, 'publicOpinion')),
      todoSummary: toStringArray(_.get(changedKeys, 'todoSummary')),
      riskOpportunity: toStringArray(_.get(changedKeys, 'riskOpportunity')),
    },
    mutedTabs: {
      shop: Boolean(_.get(mutedTabs, 'shop', false)),
      business: Boolean(_.get(mutedTabs, 'business', false)),
      players: Boolean(_.get(mutedTabs, 'players', false)),
      notebook: Boolean(_.get(mutedTabs, 'notebook', false)),
      characters: Boolean(_.get(mutedTabs, 'characters', false)),
      world: Boolean(_.get(mutedTabs, 'world', false)),
      publicOpinion: Boolean(_.get(mutedTabs, 'publicOpinion', false)),
      todoSummary: Boolean(_.get(mutedTabs, 'todoSummary', false)),
      riskOpportunity: Boolean(_.get(mutedTabs, 'riskOpportunity', false)),
    },
  };
}

export const useBadgeStore = defineStore('badge', () => {
  const badgeCounts = ref<BadgeCounts>(defaultCounts());
  const previousSnapshot = ref<BadgeSnapshot | null>(null);
  const pulseStates = ref<BadgePulseStates>(defaultPulseStates());
  const changedKeys = ref<BadgeChangedKeys>(defaultChangedKeys());
  const mutedTabs = ref<BadgeMutedTabs>(defaultMutedTabs());
  const initialized = ref(false);
  let saveStateTimer: number | null = null;
  let lastSavedPayload = '';

  const shopBadge = computed(() => badgeCounts.value.shop);
  const businessBadge = computed(() => badgeCounts.value.business);

  function buildPersistedState(): BadgePersistedState {
    return {
      counts: badgeCounts.value,
      snapshot: previousSnapshot.value,
      pulseStates: pulseStates.value,
      changedKeys: changedKeys.value,
      mutedTabs: mutedTabs.value,
    };
  }

  function flushStateSave() {
    saveStateTimer = null;

    const payload = buildPersistedState();
    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === lastSavedPayload) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, serializedPayload);
      lastSavedPayload = serializedPayload;
    } catch (error) {
      console.warn('[BadgeStore] 保存角标状态失败:', error);
    }
  }

  function saveState() {
    if (saveStateTimer !== null) {
      return;
    }

    saveStateTimer = window.setTimeout(() => {
      flushStateSave();
    }, 0);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const persisted = normalizePersistedState(raw ? JSON.parse(raw) : null);
      badgeCounts.value = persisted.counts;
      previousSnapshot.value = persisted.snapshot;
      pulseStates.value = persisted.pulseStates ?? defaultPulseStates();
      changedKeys.value = persisted.changedKeys ?? defaultChangedKeys();
      mutedTabs.value = persisted.mutedTabs ?? defaultMutedTabs();
      lastSavedPayload = raw ? JSON.stringify(buildPersistedState()) : '';
    } catch (error) {
      console.warn('[BadgeStore] 读取角标状态失败，回退默认值:', error);
      badgeCounts.value = defaultCounts();
      previousSnapshot.value = null;
      pulseStates.value = defaultPulseStates();
      changedKeys.value = defaultChangedKeys();
      mutedTabs.value = defaultMutedTabs();
      lastSavedPayload = '';
    }

    initialized.value = true;
  }

  function ensureInitialized(initialData: any) {
    if (!initialized.value) {
      loadState();
    }

    if (!previousSnapshot.value) {
      previousSnapshot.value = createSnapshot(initialData);
      saveState();
    }
  }

  function applyDataChange(newData: any) {
    ensureInitialized(newData);

    const oldSnapshot = previousSnapshot.value ?? emptySnapshot();
    const newSnapshot = createSnapshot(newData);

    const shopChangedKeys = [
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.shopItems, newSnapshot.shopItems).map(key => `物品:${key}`),
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.shopSkills, newSnapshot.shopSkills).map(key => `技能:${key}`),
    ];
    const shopDelta = shopChangedKeys.length;

    const businessChangedKeys = [
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.inventoryDetails, newSnapshot.inventoryDetails).map(
        key => `库存:${key}`,
      ),
      ...diffRecordAddedOnlyKeys(oldSnapshot.businessIntel, newSnapshot.businessIntel).map(key => `情报:${key}`),
      ...diffRecordAddedOnlyKeys(oldSnapshot.businessEnterprise, newSnapshot.businessEnterprise).map(
        key => `实体:${key}`,
      ),
    ];
    const businessDelta = businessChangedKeys.length;

    const playersChangedKeys = [
      ...diffRecordAddedOnlyKeys(oldSnapshot.playerSkills, newSnapshot.playerSkills).map(key => `技能:${key}`),
      ...diffRecordAddedOnlyKeys(oldSnapshot.playerItems, newSnapshot.playerItems).map(key => `物品:${key}`),
    ];
    const playersDelta = playersChangedKeys.length;

    const notebookChangedKeys = [
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.notebookCrisis, newSnapshot.notebookCrisis).map(
        key => `危机:${key}`,
      ),
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.notebookOpportunity, newSnapshot.notebookOpportunity).map(
        key => `机遇:${key}`,
      ),
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.notebookTodo, newSnapshot.notebookTodo).map(key => `待办:${key}`),
    ];
    const notebookDelta = notebookChangedKeys.length;

    const todoSummaryChangedKeys = diffRecordAddedOrModifiedKeys(oldSnapshot.notebookTodo, newSnapshot.notebookTodo);
    const todoSummaryDelta = todoSummaryChangedKeys.length;

    const riskOpportunityChangedKeys = [
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.notebookCrisis, newSnapshot.notebookCrisis).map(
        key => `危机:${key}`,
      ),
      ...diffRecordAddedOrModifiedKeys(oldSnapshot.notebookOpportunity, newSnapshot.notebookOpportunity).map(
        key => `机遇:${key}`,
      ),
    ];
    const riskOpportunityDelta = riskOpportunityChangedKeys.length;

    const charactersChangedKeys = diffRecordAddedOnlyKeys(oldSnapshot.charactersRecord, newSnapshot.charactersRecord);
    const charactersDelta = charactersChangedKeys.length;

    const worldChangedKeys = diffRecordAddedOrModifiedKeys(oldSnapshot.worldState, newSnapshot.worldState);
    const worldDelta = worldChangedKeys.length;

    const publicOpinionChangedKeys = diffRecordAddedOrModifiedKeys(
      oldSnapshot.publicOpinion,
      newSnapshot.publicOpinion,
    );
    const publicOpinionDelta = publicOpinionChangedKeys.length;

    if (shopDelta > 0) {
      badgeCounts.value.shop += shopDelta;
      pulseStates.value.shop = true;
      changedKeys.value.shop = _.uniq(shopChangedKeys);
    }

    if (businessDelta > 0) {
      badgeCounts.value.business += businessDelta;
      pulseStates.value.business = true;
      changedKeys.value.business = _.uniq(businessChangedKeys);
    }

    if (playersDelta > 0) {
      badgeCounts.value.players += playersDelta;
      pulseStates.value.players = true;
      changedKeys.value.players = _.uniq(playersChangedKeys);
    }

    if (notebookDelta > 0) {
      badgeCounts.value.notebook += notebookDelta;
      pulseStates.value.notebook = true;
      changedKeys.value.notebook = _.uniq(notebookChangedKeys);
    }

    if (todoSummaryDelta > 0) {
      changedKeys.value.todoSummary = _.uniq(todoSummaryChangedKeys);
      if (mutedTabs.value.todoSummary) {
        badgeCounts.value.todoSummary = 0;
        pulseStates.value.todoSummary = false;
      } else {
        badgeCounts.value.todoSummary += todoSummaryDelta;
        pulseStates.value.todoSummary = true;
      }
    }

    if (riskOpportunityDelta > 0) {
      changedKeys.value.riskOpportunity = _.uniq(riskOpportunityChangedKeys);
      if (mutedTabs.value.riskOpportunity) {
        badgeCounts.value.riskOpportunity = 0;
        pulseStates.value.riskOpportunity = false;
      } else {
        badgeCounts.value.riskOpportunity += riskOpportunityDelta;
        pulseStates.value.riskOpportunity = true;
      }
    }

    if (charactersDelta > 0) {
      badgeCounts.value.characters += charactersDelta;
      pulseStates.value.characters = true;
      changedKeys.value.characters = _.uniq(charactersChangedKeys);
    }

    if (worldDelta > 0) {
      changedKeys.value.world = _.uniq(worldChangedKeys);
      if (mutedTabs.value.world) {
        badgeCounts.value.world = 0;
        pulseStates.value.world = false;
      } else {
        badgeCounts.value.world += worldDelta;
        pulseStates.value.world = true;
      }
    }

    if (publicOpinionDelta > 0) {
      changedKeys.value.publicOpinion = _.uniq(publicOpinionChangedKeys);
      if (mutedTabs.value.publicOpinion) {
        badgeCounts.value.publicOpinion = 0;
        pulseStates.value.publicOpinion = false;
      } else {
        badgeCounts.value.publicOpinion += publicOpinionDelta;
        pulseStates.value.publicOpinion = true;
      }
    }

    previousSnapshot.value = newSnapshot;
    saveState();
  }

  /**
   * 重置角标对比基线（不改变角标计数）
   * 用于“发送消息前”记录一份当前快照，后续在远端更新后只对比本次增量。
   */
  function resetComparisonBaseline(data: any) {
    ensureInitialized(data);
    previousSnapshot.value = createSnapshot(data);
    saveState();
  }

  function markAsRead(tab: BadgeTab) {
    badgeCounts.value[tab] = 0;
    pulseStates.value[tab] = false;
    saveState();
  }

  function setTabMuted(tab: BadgeTab, muted: boolean) {
    mutedTabs.value[tab] = muted;
    if (muted) {
      badgeCounts.value[tab] = 0;
      pulseStates.value[tab] = false;
    }
    saveState();
  }

  function isTabMuted(tab: BadgeTab): boolean {
    return Boolean(mutedTabs.value[tab]);
  }

  function clearPulse(tab: BadgeTab) {
    if (!pulseStates.value[tab]) return;
    pulseStates.value[tab] = false;
    saveState();
  }

  function dismissChangedKey(tab: BadgeTab, key: string) {
    if (!changedKeys.value[tab].length) return;
    changedKeys.value[tab] = changedKeys.value[tab].filter(item => item !== key);
    saveState();
  }

  function isPulsing(tab: BadgeTab): boolean {
    return badgeCounts.value[tab] > 0 && pulseStates.value[tab];
  }

  function isChangedKey(tab: BadgeTab, key: string): boolean {
    return changedKeys.value[tab].includes(key);
  }

  function getBadgeCount(tab: BadgeTab): number {
    return badgeCounts.value[tab] ?? 0;
  }

  return {
    badgeCounts,
    shopBadge,
    businessBadge,
    pulseStates,
    changedKeys,
    mutedTabs,
    ensureInitialized,
    applyDataChange,
    resetComparisonBaseline,
    markAsRead,
    clearPulse,
    dismissChangedKey,
    setTabMuted,
    isTabMuted,
    isPulsing,
    isChangedKey,
    getBadgeCount,
  };
});
