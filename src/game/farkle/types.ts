// ===== Farkle 骰子游戏 - 类型定义 =====

/** 骰子面值 1-6 */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** 骰子类型 - 影响1和5的出现概率 */
export enum DiceType {
  /** 🎲 普通骰子 - 标准1/6概率 */
  Normal = 'normal',
  /** 🔴 老千骰子 - 1和5概率-15% */
  Rigged = 'rigged',
  /** 🟡 微调骰子 - 1和5概率-8% */
  Tweaked = 'tweaked',
  /** 🟢 幸运骰子 - 1和5概率+8% */
  Lucky = 'lucky',
  /** 🔵 祝福骰子 - 1和5概率+15% */
  Blessed = 'blessed',
  /** ⚫ 劣势骰子 - 1和5概率-10% */
  Cursed = 'cursed',
}

/** 骰子类型元数据 */
export interface DiceTypeInfo {
  name: string;
  emoji: string;
  bias: number; // 对1和5概率的偏移量
  color: string; // CSS 颜色
  description: string;
}

/** 骰子类型信息映射 */
export const DICE_TYPE_INFO: Record<DiceType, DiceTypeInfo> = {
  [DiceType.Normal]: {
    name: '普通骰子',
    emoji: '🎲',
    bias: 0,
    color: '#9ca3af',
    description: '标准骰子，公平公正',
  },
  [DiceType.Rigged]: {
    name: '老千骰子',
    emoji: '🔴',
    bias: -0.025,
    color: '#ef4444',
    description: '1和5出现概率降低15%',
  },
  [DiceType.Tweaked]: {
    name: '微调骰子',
    emoji: '🟡',
    bias: -0.013,
    color: '#eab308',
    description: '1和5出现概率降低8%',
  },
  [DiceType.Lucky]: {
    name: '幸运骰子',
    emoji: '🟢',
    bias: 0.013,
    color: '#22c55e',
    description: '1和5出现概率提高8%',
  },
  [DiceType.Blessed]: {
    name: '祝福骰子',
    emoji: '🔵',
    bias: 0.025,
    color: '#3b82f6',
    description: '1和5出现概率提高15%',
  },
  [DiceType.Cursed]: {
    name: '劣势骰子',
    emoji: '⚫',
    bias: -0.017,
    color: '#6b7280',
    description: '1和5出现概率降低10%',
  },
};

/** 单颗骰子状态 */
export interface Die {
  id: number; // 唯一标识
  value: DieValue; // 当前面值
  held: boolean; // 是否被保留
  scoring: boolean; // 是否为得分骰子
  justRolled: boolean; // 是否刚掷出（用于动画）
}

/** 得分组合类型 */
export enum ScoringCombo {
  Single1 = 'single_1',
  Single5 = 'single_5',
  ThreeOfAKind = 'three_of_a_kind',
  FourOfAKind = 'four_of_a_kind',
  FiveOfAKind = 'five_of_a_kind',
  SixOfAKind = 'six_of_a_kind',
  Straight = 'straight',
  ThreePairs = 'three_pairs',
  TwoTriplets = 'two_triplets',
}

/** 单个得分组合 */
export interface ScoringResult {
  combo: ScoringCombo;
  dice: DieValue[]; // 参与的骰子值
  score: number;
  label: string; // 人类可读描述
}

/** 赌注类型 */
export enum BetType {
  Currency = 'currency',
  Favor = 'favor',
  Trust = 'trust',
}

/** 单项赌注 */
export interface BetItem {
  type: BetType;
  amount: number;
}

/** 完整赌注配置 */
export interface BetConfig {
  bets: BetItem[];
}

/** 游戏阶段 */
export enum GamePhase {
  /** 选择对手和下注 */
  Setup = 'setup',
  /** 游戏进行中 */
  Playing = 'playing',
  /** 结算 */
  Result = 'result',
}

/** 回合阶段 */
export enum TurnPhase {
  /** 准备掷骰 */
  Rolling = 'rolling',
  /** 掷骰动画中 */
  Animating = 'animating',
  /** 选择保留骰子 */
  Selecting = 'selecting',
  /** Farkle！本回合爆了 */
  Farkled = 'farkled',
  /** 回合结束（存分） */
  Banked = 'banked',
}

/** 玩家类型 */
export enum PlayerType {
  Human = 'human',
  NPC = 'npc',
}

/** 玩家状态 */
export interface PlayerState {
  type: PlayerType;
  name: string;
  totalScore: number;
  diceType: DiceType;
}

/** NPC 配置（从变量中提取） */
export interface NpcConfig {
  id: string;
  name: string;
  favor: number; // 好感度 -100~100
  trust: number; // 信任度 -100~100
  socialStatus: string; // 社会地位
  gender: string;
}

/** 游戏结果 */
export interface GameResult {
  winner: PlayerType;
  playerScore: number;
  npcScore: number;
  npcId: string;
  npcName: string;
  currencyChange: number;
  favorChange: number;
  trustChange: number;
}

/** 游戏日志条目 */
export interface GameLogEntry {
  turn: number;
  player: PlayerType;
  action: string;
  score?: number;
  totalAfter?: number;
}

/** 游戏常量 */
export const GAME_CONSTANTS = {
  /** 骰子数量 */
  DICE_COUNT: 6,
  /** 目标分数 */
  TARGET_SCORE: 4000,
  /** NPC 行动延迟（毫秒） */
  NPC_ACTION_DELAY: 800,
  /** 掷骰动画时长（毫秒） */
  ROLL_ANIMATION_DURATION: 600,
  /** 赌注限制 */
  BET: {
    MIN_CURRENCY: 10,
    MAX_CURRENCY_RATIO: 0.5,
    MIN_FAVOR: 1,
    MAX_FAVOR: 5,
    MIN_TRUST: 1,
    MAX_TRUST: 3,
    /** 好感度下限保护（不能让好感降到这以下） */
    FAVOR_FLOOR: -50,
    /** 信任度下限保护 */
    TRUST_FLOOR: -50,
  },
  /** NPC 接受赌博的好感度门槛 */
  MIN_FAVOR_TO_GAMBLE: -50,
  /** 好感度在 -50~-20 时赌注减半 */
  REDUCED_BET_FAVOR_THRESHOLD: -20,
} as const;
