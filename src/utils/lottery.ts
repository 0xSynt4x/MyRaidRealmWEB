/**
 * 抽奖品质与保底的前端计算。
 *
 * 品质完全由前端决定：先把每次抽奖的品质算好，再交给抽奖专用提示词要求模型严格遵守。
 * 次数与保底也由前端维护（见 stores/lottery.ts），AI 只负责按品质生成物品/技能。
 */

export type LotteryQuality = '普通' | '精良' | '稀有' | '史诗' | '传说';

/** 保底阈值：累计抽奖次数达到这个数触发一次保底（该次必出传说） */
export const LOTTERY_PITY_THRESHOLD = 100;

/** 单抽价格（积分） */
export const LOTTERY_SINGLE_PRICE = 100;
/** 十连价格（积分），较单抽优惠 */
export const LOTTERY_TEN_PRICE = 900;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 单次品质随机：传说 1%、史诗 4%、稀有 15%、精良 30%、普通 50%。
 * `forceLegendary` 为真时直接返回传说（保底命中）。
 */
export function rollLotteryQuality(forceLegendary = false): LotteryQuality {
  if (forceLegendary) {
    return '传说';
  }

  const r = randomInt(1, 100);
  if (r === 100) return '传说';
  if (r >= 96) return '史诗';
  if (r >= 81) return '稀有';
  if (r >= 51) return '精良';
  return '普通';
}

export type LotteryDrawPlan = {
  /** 本次每次抽奖的品质，长度 = 抽奖次数 */
  qualities: LotteryQuality[];
  /** 本次是否触发保底 */
  pityTriggered: boolean;
  /** 抽奖后的累计抽奖次数（保底进度） */
  pityCountAfter: number;
};

/**
 * 生成一次抽奖的品质清单与保底结果。
 *
 * 保底判定沿用原有规则：
 * - 单抽：累计次数正好踩到阈值倍数时触发；
 * - 多抽（十连等）：本次累计跨越阈值时触发，且只在第 1 次强制传说，其余照常随机。
 */
export function planLotteryDraw(input: { count: number; pityCountBefore: number }): LotteryDrawPlan {
  const count = Math.max(1, Math.floor(input.count));
  const pityCountBefore = Math.max(0, Math.floor(input.pityCountBefore));
  const threshold = LOTTERY_PITY_THRESHOLD;
  const oldProgress = pityCountBefore % threshold;
  const newTotal = pityCountBefore + count;

  const pityTriggered =
    count === 1 ? newTotal % threshold === 0 && newTotal > 0 : oldProgress + count >= threshold;

  const qualities: LotteryQuality[] = [];
  for (let i = 0; i < count; i += 1) {
    qualities.push(rollLotteryQuality(pityTriggered && i === 0));
  }

  const pityCountAfter = pityTriggered ? (count === 1 ? 0 : newTotal % threshold) : newTotal;

  return { qualities, pityTriggered, pityCountAfter };
}
