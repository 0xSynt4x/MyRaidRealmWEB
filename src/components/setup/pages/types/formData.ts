import type { StandaloneLocalContentKind, StandaloneLocalContentRoute } from '../../../../utils/standaloneLocalContent';

// AI 生成页表单与模块状态类型

export type AiGenerateModuleKey = 'world' | 'player' | 'npc';

// 本地内容条目输入数据结构
export interface LocalContentEntryInput {
  name: string;
  content: string;
  kind: StandaloneLocalContentKind;
  route: StandaloneLocalContentRoute;
}

export interface SecondaryCurrencyFormData {
  name: string;
  amount: number | null;
  exchangeRate: string;
  usage: string;
}

export interface WorldModuleFormData {
  worldType: string;
  eraName: string;
  worldRules: string[];
  survivalMode: '关闭' | '基础模式' | '生存模式';
  worldOrganizationNetwork: string;
  additionalRequirement: string;
}

export interface PlayerModuleFormData {
  playerName: string;
  playerAge: string;
  playerGender: string;
  playerIdentity: string;
  playerGoal: string;
  playerSkills: string;
  mainCurrencyName: string;
  initialFunds: number | null;
  secondaryCurrency: SecondaryCurrencyFormData | null;
  pointsExchangeRatio: number | null;
  inventory: string;
  notebook: string;
  businessEntity: string;
  factionRelationship: string;
  additionalRequirement: string;
}

export interface NpcModuleFormData {
  importantNPCs: string;
  npcCountPreference: string;
  identityAndProfession: string;
  personalityAndStatus: string;
  playerRelationshipDirection: string;
  additionalRequirement: string;
}

export interface AiGenerateFormData {
  world: WorldModuleFormData;
  player: PlayerModuleFormData;
  npc: NpcModuleFormData;
  localContentEntries: LocalContentEntryInput[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  data: AiGenerateFormData;
  errors: ValidationError[];
  isValid: boolean;
  optionalSectionExpanded: boolean;
}

export const defaultWorldModuleFormData: WorldModuleFormData = {
  worldType: '',
  eraName: '',
  worldRules: [''],
  survivalMode: '关闭',
  worldOrganizationNetwork: '',
  additionalRequirement: '',
};

export const defaultPlayerModuleFormData: PlayerModuleFormData = {
  playerName: '',
  playerAge: '',
  playerGender: '',
  playerIdentity: '',
  playerGoal: '',
  playerSkills: '',
  mainCurrencyName: '',
  initialFunds: null,
  secondaryCurrency: null,
  pointsExchangeRatio: null,
  inventory: '',
  notebook: '',
  businessEntity: '',
  factionRelationship: '',
  additionalRequirement: '',
};

export const defaultNpcModuleFormData: NpcModuleFormData = {
  importantNPCs: '',
  npcCountPreference: '',
  identityAndProfession: '',
  personalityAndStatus: '',
  playerRelationshipDirection: '',
  additionalRequirement: '',
};

export const defaultFormData: AiGenerateFormData = {
  world: defaultWorldModuleFormData,
  player: defaultPlayerModuleFormData,
  npc: defaultNpcModuleFormData,
  localContentEntries: [],
};
