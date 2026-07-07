// ===== Farkle 骰子游戏 - 核心引擎 =====

import {
  DICE_TYPE_INFO,
  DiceType,
  GAME_CONSTANTS,
  ScoringCombo,
  type Die,
  type DieValue,
  type ScoringResult,
} from './types';

// ===== 骰子掷出 =====

let dieIdCounter = 0;

/**
 * 根据骰子类型掷出一颗骰子
 * 特殊骰子会调整1和5的出现概率
 */
export function rollSingleDie(diceType: DiceType = DiceType.Normal): DieValue {
  const bias = DICE_TYPE_INFO[diceType].bias;
  const rand = Math.random();

  // 1和5的基础概率各为 1/6 ≈ 0.1667
  const prob1 = 1 / 6 + bias;
  const prob5 = 1 / 6 + bias;
  // 其余点数(2,3,4,6)均分剩余概率
  const probOther = (1 - prob1 - prob5) / 4;

  if (rand < prob1) return 1;
  if (rand < prob1 + probOther) return 2;
  if (rand < prob1 + probOther * 2) return 3;
  if (rand < prob1 + probOther * 3) return 4;
  if (rand < prob1 + probOther * 3 + prob5) return 5;
  return 6;
}

/**
 * 掷出指定数量的骰子
 */
export function rollDice(count: number, diceType: DiceType = DiceType.Normal): Die[] {
  return Array.from({ length: count }, () => ({
    id: ++dieIdCounter,
    value: rollSingleDie(diceType),
    held: false,
    scoring: false,
    justRolled: true,
  }));
}

/**
 * 重置骰子ID计数器（新游戏时调用）
 */
export function resetDieIdCounter(): void {
  dieIdCounter = 0;
}

// ===== 计分逻辑 =====

/**
 * 统计每个面值出现的次数
 */
export function countValues(dice: DieValue[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const v of dice) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

/**
 * 计算一组骰子的所有可能得分组合
 * @param diceValues 骰子面值数组
 * @returns 所有可能的得分组合
 */
export function findScoringCombos(diceValues: DieValue[]): ScoringResult[] {
  const results: ScoringResult[] = [];
  const counts = countValues(diceValues);
  const numDice = diceValues.length;

  // 检查6颗骰子的特殊组合
  if (numDice === 6) {
    // 顺子 1-2-3-4-5-6
    if (
      counts[1] === 1 &&
      counts[2] === 1 &&
      counts[3] === 1 &&
      counts[4] === 1 &&
      counts[5] === 1 &&
      counts[6] === 1
    ) {
      results.push({
        combo: ScoringCombo.Straight,
        dice: [1, 2, 3, 4, 5, 6],
        score: 1500,
        label: '顺子 1-2-3-4-5-6',
      });
      return results; // 顺子用完所有骰子，不需要继续
    }

    // 三对
    const pairCount = Object.values(counts).filter(c => c === 2).length;
    if (pairCount === 3) {
      results.push({
        combo: ScoringCombo.ThreePairs,
        dice: diceValues.sort(),
        score: 1500,
        label: '三对',
      });
      return results;
    }

    // 两组三条
    const tripletCount = Object.values(counts).filter(c => c === 3).length;
    if (tripletCount === 2) {
      results.push({
        combo: ScoringCombo.TwoTriplets,
        dice: diceValues.sort(),
        score: 2500,
        label: '两组三条',
      });
      return results;
    }
  }

  // 检查多条组合（六条→五条→四条→三条）
  for (let face = 1; face <= 6; face++) {
    const count = counts[face] || 0;

    if (count >= 6) {
      const baseScore = face === 1 ? 1000 : face * 100;
      results.push({
        combo: ScoringCombo.SixOfAKind,
        dice: Array(6).fill(face as DieValue),
        score: baseScore * 8,
        label: `六个${face}`,
      });
    } else if (count >= 5) {
      const baseScore = face === 1 ? 1000 : face * 100;
      results.push({
        combo: ScoringCombo.FiveOfAKind,
        dice: Array(5).fill(face as DieValue),
        score: baseScore * 4,
        label: `五个${face}`,
      });
    } else if (count >= 4) {
      const baseScore = face === 1 ? 1000 : face * 100;
      results.push({
        combo: ScoringCombo.FourOfAKind,
        dice: Array(4).fill(face as DieValue),
        score: baseScore * 2,
        label: `四个${face}`,
      });
    } else if (count >= 3) {
      const baseScore = face === 1 ? 1000 : face * 100;
      results.push({
        combo: ScoringCombo.ThreeOfAKind,
        dice: Array(3).fill(face as DieValue),
        score: baseScore,
        label: `三个${face}`,
      });
    }
  }

  // 检查剩余的单个1和5（排除已经在多条组合中的）
  const usedInCombos: Record<number, number> = {};
  for (const r of results) {
    for (const d of r.dice) {
      usedInCombos[d] = (usedInCombos[d] || 0) + 1;
    }
  }

  const remaining1 = (counts[1] || 0) - (usedInCombos[1] || 0);
  const remaining5 = (counts[5] || 0) - (usedInCombos[5] || 0);

  for (let i = 0; i < remaining1; i++) {
    results.push({
      combo: ScoringCombo.Single1,
      dice: [1],
      score: 100,
      label: '单个1',
    });
  }

  for (let i = 0; i < remaining5; i++) {
    results.push({
      combo: ScoringCombo.Single5,
      dice: [5],
      score: 50,
      label: '单个5',
    });
  }

  return results;
}

/**
 * 计算一组骰子的最大可能得分
 */
export function calculateMaxScore(diceValues: DieValue[]): number {
  const combos = findScoringCombos(diceValues);
  return combos.reduce((sum, c) => sum + c.score, 0);
}

/**
 * 判断是否 Farkle（没有任何得分骰子）
 */
export function isFarkle(diceValues: DieValue[]): boolean {
  return findScoringCombos(diceValues).length === 0;
}

/**
 * 判断选择的骰子是否构成有效得分
 * @param selectedValues 玩家选择保留的骰子值
 * @param allValues 所有掷出的骰子值
 * @returns 得分，如果无效返回 0
 */
export function calculateSelectedScore(selectedValues: DieValue[]): number {
  if (selectedValues.length === 0) return 0;

  const combos = findScoringCombos(selectedValues);
  const totalScore = combos.reduce((sum, c) => sum + c.score, 0);

  // 验证：所有选中的骰子都必须参与得分
  const totalScoringDice = combos.reduce((sum, c) => sum + c.dice.length, 0);
  if (totalScoringDice !== selectedValues.length) {
    return 0; // 有非得分骰子被选中
  }

  return totalScore;
}

/**
 * 获取所有得分骰子的索引
 * @param diceValues 所有骰子的面值
 * @returns 得分骰子的面值集合（可能重复）
 */
export function getScoringDiceValues(diceValues: DieValue[]): DieValue[] {
  const combos = findScoringCombos(diceValues);
  const scoringValues: DieValue[] = [];
  for (const combo of combos) {
    scoringValues.push(...combo.dice);
  }
  return scoringValues;
}

/**
 * 标记骰子数组中哪些是得分骰子
 */
export function markScoringDice(dice: Die[]): Die[] {
  const values = dice.filter(d => !d.held).map(d => d.value);
  const scoringValues = getScoringDiceValues(values);

  // 复制一份得分值用于标记
  const remaining = [...scoringValues];

  return dice.map(die => {
    if (die.held) return { ...die, scoring: false };

    const idx = remaining.indexOf(die.value);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { ...die, scoring: true };
    }
    return { ...die, scoring: false };
  });
}

/**
 * 判断是否所有骰子都得分（热骰 Hot Dice）
 */
export function isHotDice(dice: Die[]): boolean {
  const unheldDice = dice.filter(d => !d.held);
  if (unheldDice.length === 0) return true; // 所有骰子都被保留了

  const values = unheldDice.map(d => d.value);
  const combos = findScoringCombos(values);
  const totalScoringDice = combos.reduce((sum, c) => sum + c.dice.length, 0);

  return totalScoringDice === unheldDice.length;
}

/**
 * 获取骰子类型的概率偏移
 */
export function getDiceBias(diceType: DiceType): number {
  return DICE_TYPE_INFO[diceType].bias;
}

/**
 * 根据信任度获取分配给玩家和NPC的骰子类型
 */
export function getDiceAssignment(trust: number): { playerDice: DiceType; npcDice: DiceType; message: string } {
  if (trust <= -50) {
    return {
      playerDice: DiceType.Rigged,
      npcDice: DiceType.Normal,
      message: '⚠️ 对方给了你一组可疑的骰子',
    };
  }
  if (trust <= -20) {
    return {
      playerDice: DiceType.Tweaked,
      npcDice: DiceType.Normal,
      message: '⚠️ 对方提供的骰子似乎有些异样',
    };
  }
  if (trust <= 20) {
    return {
      playerDice: DiceType.Normal,
      npcDice: DiceType.Normal,
      message: '✅ 公平对决',
    };
  }
  if (trust <= 60) {
    return {
      playerDice: DiceType.Lucky,
      npcDice: DiceType.Normal,
      message: '🍀 对方借给你一组幸运骰子',
    };
  }
  return {
    playerDice: DiceType.Blessed,
    npcDice: DiceType.Cursed,
    message: '💎 对方拿出珍藏的骰子给你，自己用了副旧骰子',
  };
}

/**
 * 检查目标分数是否达成
 */
export function hasReachedTarget(score: number, target: number = GAME_CONSTANTS.TARGET_SCORE): boolean {
  return score >= target;
}
