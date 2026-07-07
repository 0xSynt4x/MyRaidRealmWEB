// ===== Farkle 骰子游戏 - NPC AI 引擎 =====

import { findScoringCombos, isFarkle } from './engine';
import { GAME_CONSTANTS, ScoringCombo, type DieValue, type NpcConfig, type ScoringResult } from './types';

// ===== AI 难度等级 =====

/** AI 难度级别 */
export enum AIDifficulty {
  Low = 'low',
  MediumLow = 'medium_low',
  Medium = 'medium',
  MediumHigh = 'medium_high',
  High = 'high',
}

/** 根据社会地位推断 AI 难度 */
export function inferDifficulty(socialStatus: string): AIDifficulty {
  const lower = socialStatus.toLowerCase();

  // 高等级
  if (['大亨', '贵族', '王族', '领主', '议长', '大师', '神', '国王', '天才'].some(k => lower.includes(k))) {
    return AIDifficulty.High;
  }
  // 中高
  if (['富商', '官员', '将军', '教授', '学者', '长老', '执事'].some(k => lower.includes(k))) {
    return AIDifficulty.MediumHigh;
  }
  // 中等
  if (['商人', '职员', '军官', '工匠', '冒险者', '骑士'].some(k => lower.includes(k))) {
    return AIDifficulty.Medium;
  }
  // 中低
  if (['平民', '农民', '工人', '学徒', '士兵'].some(k => lower.includes(k))) {
    return AIDifficulty.MediumLow;
  }
  // 低
  if (['乞丐', '流浪', '奴隶', '囚犯', '流民'].some(k => lower.includes(k))) {
    return AIDifficulty.Low;
  }

  return AIDifficulty.Medium; // 默认中等
}

// ===== AI 决策：选择保留哪些骰子 =====

/** AI 决策结果 */
export interface AIDecision {
  /** 要保留的骰子面值 */
  selectedDice: DieValue[];
  /** 保留这些骰子的得分 */
  score: number;
  /** 是否继续掷骰（true=继续，false=存分） */
  shouldContinue: boolean;
  /** 决策说明（用于UI展示） */
  description: string;
}

/**
 * AI 选择要保留的骰子
 *
 * 策略：
 * - 高难度：总是选择得分最高的组合
 * - 低难度：有概率选择次优组合
 */
export function aiSelectDice(
  diceValues: DieValue[],
  difficulty: AIDifficulty,
): { selected: DieValue[]; score: number } {
  const combos = findScoringCombos(diceValues);
  if (combos.length === 0) return { selected: [], score: 0 };

  // 生成所有可能的保留策略
  const strategies = generateStrategies(combos);

  if (strategies.length === 0) {
    // 回退：至少保留最高分的单个组合
    const best = combos.reduce((a, b) => (a.score > b.score ? a : b));
    return { selected: best.dice, score: best.score };
  }

  // 按得分排序（高→低）
  strategies.sort((a, b) => b.score - a.score);

  // 根据难度决定选哪个策略
  const mistakeChance = getMistakeChance(difficulty);
  if (Math.random() < mistakeChance && strategies.length > 1) {
    // 犯错：选择次优策略
    const idx = Math.min(1 + Math.floor(Math.random() * 2), strategies.length - 1);
    return strategies[idx];
  }

  return strategies[0]; // 选择最优策略
}

/** 生成所有合理的保留策略 */
function generateStrategies(combos: ScoringResult[]): { selected: DieValue[]; score: number; diceUsed: number }[] {
  const strategies: { selected: DieValue[]; score: number; diceUsed: number }[] = [];

  // 策略1：保留所有得分骰子
  const allDice: DieValue[] = [];
  let allScore = 0;
  for (const c of combos) {
    allDice.push(...c.dice);
    allScore += c.score;
  }
  strategies.push({ selected: allDice, score: allScore, diceUsed: allDice.length });

  // 策略2：只保留高分组合（三条以上），留更多骰子继续掷
  const highCombos = combos.filter(c => c.combo !== ScoringCombo.Single1 && c.combo !== ScoringCombo.Single5);
  if (highCombos.length > 0 && highCombos.length < combos.length) {
    const hDice: DieValue[] = [];
    let hScore = 0;
    for (const c of highCombos) {
      hDice.push(...c.dice);
      hScore += c.score;
    }
    strategies.push({ selected: hDice, score: hScore, diceUsed: hDice.length });
  }

  // 策略3：只保留最小得分（1颗得分骰），最大化剩余骰子数
  const singles = combos.filter(c => c.combo === ScoringCombo.Single1 || c.combo === ScoringCombo.Single5);
  if (singles.length > 0) {
    // 只保留1颗价值最高的单骰
    const bestSingle = singles.reduce((a, b) => (a.score >= b.score ? a : b));
    strategies.push({ selected: bestSingle.dice, score: bestSingle.score, diceUsed: 1 });
  }

  return strategies;
}

/** 获取各难度的犯错概率 */
function getMistakeChance(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case AIDifficulty.Low:
      return 0.4;
    case AIDifficulty.MediumLow:
      return 0.25;
    case AIDifficulty.Medium:
      return 0.12;
    case AIDifficulty.MediumHigh:
      return 0.05;
    case AIDifficulty.High:
      return 0.02;
  }
}

// ===== AI 决策：继续掷还是存分 =====

/**
 * AI 决定是否继续掷骰
 *
 * 决策因素：
 * 1. 好感度 → 冒险倾向（好感高=保守，好感低=激进）
 * 2. 当前回合累积分数
 * 3. 剩余骰子数（骰子越多越值得冒险）
 * 4. 双方分数差距
 * 5. AI 难度
 */
export function aiShouldContinue(params: {
  turnScore: number;
  remainingDice: number;
  npcTotalScore: number;
  playerTotalScore: number;
  favor: number;
  difficulty: AIDifficulty;
  targetScore: number;
}): boolean {
  const { turnScore, remainingDice, npcTotalScore, playerTotalScore, favor, difficulty, targetScore } = params;

  // 如果存分就能赢，立即存分
  if (npcTotalScore + turnScore >= targetScore) {
    return false;
  }

  // 基础风险阈值：累积超过此分数就考虑存分
  let riskThreshold = 300;

  // 好感度调整：好感越高阈值越低（越容易存分）
  // 好感度 -100 → +300 (阈值600，非常激进)
  // 好感度 0 → +0 (阈值300，标准)
  // 好感度 100 → -200 (阈值100，非常保守)
  riskThreshold -= favor * 2;
  riskThreshold = Math.max(50, Math.min(600, riskThreshold));

  // 分数差距调整：落后时更激进
  const scoreDiff = npcTotalScore - playerTotalScore;
  if (scoreDiff < -1000) {
    riskThreshold += 200; // 大幅落后，更激进
  } else if (scoreDiff < -500) {
    riskThreshold += 100;
  } else if (scoreDiff > 1000) {
    riskThreshold -= 100; // 大幅领先，更保守
  }

  // 剩余骰子数调整：骰子越多越值得冒险
  if (remainingDice >= 5) {
    riskThreshold += 150; // 5-6颗骰子，值得冒险
  } else if (remainingDice >= 4) {
    riskThreshold += 80;
  } else if (remainingDice <= 2) {
    riskThreshold -= 100; // 只剩1-2颗，很危险
  }

  // 难度微调
  switch (difficulty) {
    case AIDifficulty.Low:
      // 低难度有随机性
      riskThreshold += (Math.random() - 0.5) * 200;
      break;
    case AIDifficulty.MediumLow:
      riskThreshold += (Math.random() - 0.5) * 100;
      break;
    case AIDifficulty.High:
      // 高难度更精确，减少随机性
      break;
    default:
      riskThreshold += (Math.random() - 0.5) * 60;
  }

  // 最终决策：当前回合分数是否超过阈值
  if (turnScore >= riskThreshold) {
    // 超过阈值后，以概率决定是否存分
    // 超过越多，存分概率越高
    const excessRatio = (turnScore - riskThreshold) / Math.max(riskThreshold, 100);
    const bankProbability = Math.min(0.9, 0.3 + excessRatio * 0.5);
    return Math.random() > bankProbability; // 返回 true 表示继续
  }

  return true; // 未超过阈值，继续
}

// ===== AI 完整回合决策 =====

/**
 * AI 执行完整的一次决策（选择骰子 + 决定是否继续）
 */
export function aiMakeDecision(params: {
  diceValues: DieValue[];
  turnScore: number;
  totalDice: number;
  npcTotalScore: number;
  playerTotalScore: number;
  npc: NpcConfig;
  targetScore?: number;
}): AIDecision {
  const {
    diceValues,
    turnScore,
    totalDice,
    npcTotalScore,
    playerTotalScore,
    npc,
    targetScore = GAME_CONSTANTS.TARGET_SCORE,
  } = params;

  // 检查 Farkle
  if (isFarkle(diceValues)) {
    return {
      selectedDice: [],
      score: 0,
      shouldContinue: false,
      description: `${npc.name} Farkle了！本回合分数清零`,
    };
  }

  const difficulty = inferDifficulty(npc.socialStatus);

  // 选择要保留的骰子
  const { selected, score } = aiSelectDice(diceValues, difficulty);
  const newTurnScore = turnScore + score;
  const remainingDice = totalDice - selected.length;

  // 热骰检测：如果保留所有骰子，可以重掷全部6颗
  const isHot = remainingDice === 0;
  const effectiveRemaining = isHot ? GAME_CONSTANTS.DICE_COUNT : remainingDice;

  // 决定是否继续
  const shouldContinue = aiShouldContinue({
    turnScore: newTurnScore,
    remainingDice: effectiveRemaining,
    npcTotalScore,
    playerTotalScore,
    favor: npc.favor,
    difficulty,
    targetScore,
  });

  // 生成描述
  const combos = findScoringCombos(selected);
  const comboDesc = combos.map(c => c.label).join('、');
  let description: string;

  if (shouldContinue) {
    if (isHot) {
      description = `${npc.name} 保留 ${comboDesc}（+${score}分），热骰！重掷全部骰子！`;
    } else {
      description = `${npc.name} 保留 ${comboDesc}（+${score}分），继续掷骰！`;
    }
  } else {
    description = `${npc.name} 保留 ${comboDesc}（+${score}分），存入 ${newTurnScore} 分`;
  }

  return {
    selectedDice: selected,
    score,
    shouldContinue,
    description,
  };
}
