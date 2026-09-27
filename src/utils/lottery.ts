import { Schema } from '../../schema/schema';

export const LOTTERY_QUALITIES = ['普通', '精良', '稀有', '史诗', '传说'] as const;
export type LotteryQuality = (typeof LOTTERY_QUALITIES)[number];
export type LotteryRewardType = 'item' | 'skill';

export type LotteryTask = {
  id: string;
  count: number;
  qualityPlan: LotteryQuality[];
  pityTriggered: boolean;
  pitySlot: number | null;
};

export type LotteryRewardDraft = {
  slot: number;
  type: LotteryRewardType;
  name: string;
  category: string;
  description: string;
  specialAttributes: string;
};

export type LotteryReward = LotteryRewardDraft & {
  quality: LotteryQuality;
};

const QUALITY_THRESHOLDS: Array<{ max: number; quality: LotteryQuality }> = [
  { max: 50, quality: '普通' },
  { max: 80, quality: '精良' },
  { max: 95, quality: '稀有' },
  { max: 99, quality: '史诗' },
  { max: 100, quality: '传说' },
];

function secureRandomUint32(): number {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return values[0]!;
  }

  throw new Error('当前环境不支持 Web Crypto，无法执行安全抽奖');
}

export function secureRandomIntInclusive(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error(`无效的随机整数范围：${min}-${max}`);
  }

  const range = max - min + 1;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  let value = secureRandomUint32();
  while (value >= limit) {
    value = secureRandomUint32();
  }

  return min + (value % range);
}

export function rollLotteryQuality(): LotteryQuality {
  const roll = secureRandomIntInclusive(1, 100);
  return QUALITY_THRESHOLDS.find(entry => roll <= entry.max)!.quality;
}

export function createLotteryTask(count: number, pityTriggered: boolean, pitySlot = pityTriggered ? 1 : null): LotteryTask {
  const normalizedCount = Math.max(1, Math.min(100, Math.floor(count)));
  const normalizedPitySlot = pityTriggered
    ? Math.max(1, Math.min(normalizedCount, Math.floor(pitySlot ?? 1)))
    : null;
  const qualityPlan = Array.from({ length: normalizedCount }, (_, index) =>
    index + 1 === normalizedPitySlot ? '传说' : rollLotteryQuality(),
  );

  return {
    id: `lottery-${Date.now()}-${secureRandomIntInclusive(0, 0xffff_ffff).toString(16)}`,
    count: normalizedCount,
    qualityPlan,
    pityTriggered,
    pitySlot: normalizedPitySlot,
  };
}

function normalizeRewardType(value: unknown): LotteryRewardType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'item' || normalized === '物品' || normalized === '道具') return 'item';
  if (normalized === 'skill' || normalized === '技能' || normalized === '能力') return 'skill';
  return null;
}

function normalizeText(value: unknown, fallback = ''): string {
  return String(value ?? fallback)
    .split('')
    .map(character => (character.charCodeAt(0) < 32 ? ' ' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const unfenced = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function resolveRawRewardList(text: string): unknown[] | null {
  const json = extractJsonObject(text);
  if (json && Array.isArray(json.rewards)) return json.rewards;

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const rows = lines
    .map(line => line.replace(/^\s*[-*]?\s*\d+[.)、]\s*/, ''))
    .map(line => line.split('|').map(part => part.trim()))
    .filter(parts => parts.length >= 4);

  if (rows.length === 0) return null;
  return rows.map(parts => ({
    type: parts[0],
    name: parts[1],
    category: parts[2],
    description: parts[3],
    specialAttributes: parts.slice(4).join(' | '),
  }));
}

export function parseLotteryRewards(text: string, task: LotteryTask): LotteryReward[] {
  if (task.qualityPlan.length !== task.count) {
    throw new Error(`抽奖任务品质计划错误：需要 ${task.count} 条，收到 ${task.qualityPlan.length} 条`);
  }

  const rawRewards = resolveRawRewardList(text);
  if (!rawRewards || rawRewards.length !== task.count) {
    throw new Error(`抽奖结果数量错误：需要 ${task.count} 条，收到 ${rawRewards?.length ?? 0} 条`);
  }

  const names = new Set<string>();
  return rawRewards.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`第 ${index + 1} 条抽奖结果不是对象`);
    const record = raw as Record<string, unknown>;
    const name = normalizeText(record.name ?? record.名称);
    const type = normalizeRewardType(record.type ?? record.类型);
    if (!name || !type) throw new Error(`第 ${index + 1} 条抽奖结果缺少名称或类型`);

    const normalizedName = name.toLocaleLowerCase();
    if (names.has(normalizedName)) throw new Error(`抽奖结果重复：${name}`);
    names.add(normalizedName);

    return {
      slot: index + 1,
      quality: task.qualityPlan[index]!,
      type,
      name,
      category: normalizeText(record.category ?? record.类别 ?? record.类型说明, type === 'item' ? '抽奖物品' : '抽奖技能'),
      description: normalizeText(record.description ?? record.描述, '由抽奖获得的奖励。'),
      specialAttributes: normalizeText(record.specialAttributes ?? record.特殊属性 ?? record.效果),
    };
  });
}

function escapeJsonPointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function materializeLotteryRewards(
  statData: ReturnType<typeof Schema.parse>,
  rewards: LotteryReward[],
): LotteryReward[] {
  const usedNames = new Set<string>();
  return rewards.map(reward => ({
    ...reward,
    name: uniqueRewardName(reward.name, statData, usedNames),
  }));
}

function uniqueRewardName(name: string, statData: ReturnType<typeof Schema.parse>, usedNames: Set<string>): string {
  const existingNames = new Set([
    ...Object.keys(statData.玩家.物品栏 ?? {}),
    ...Object.keys(statData.玩家.技能系统 ?? {}),
  ].map(value => value.toLocaleLowerCase()));
  let candidate = name;
  let suffix = 2;
  while (existingNames.has(candidate.toLocaleLowerCase()) || usedNames.has(candidate.toLocaleLowerCase())) {
    candidate = `${name}（${suffix}）`;
    suffix += 1;
  }
  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
}

export function buildLotteryPatch(
  statData: ReturnType<typeof Schema.parse>,
  rewards: LotteryReward[],
): Array<Record<string, unknown>> {
  const usedNames = new Set<string>();
  const patch: Array<Record<string, unknown>> = [];

  for (const reward of rewards) {
    const name = uniqueRewardName(reward.name, statData, usedNames);
    const pointer = escapeJsonPointerToken(name);
    if (reward.type === 'item') {
      patch.push({
        op: 'insert',
        path: `/玩家/物品栏/${pointer}`,
        value: {
          数量: 1,
          类型: reward.category,
          品质: reward.quality,
          有效期: '永久',
          特殊属性: reward.specialAttributes,
          备注: reward.description,
        },
      });
    } else {
      patch.push({
        op: 'insert',
        path: `/玩家/技能系统/${pointer}`,
        value: {
          品质: reward.quality,
          描述: reward.description,
          类型: reward.category,
        },
      });
    }
  }

  patch.push(
    { op: 'replace', path: '/设置/积分系统/抽奖触发', value: false },
    { op: 'replace', path: '/设置/积分系统/抽奖次数', value: 0 },
    { op: 'replace', path: '/设置/积分系统/保底触发', value: false },
  );
  return patch;
}

export function formatLotteryRewards(rewards: LotteryReward[]): string {
  return rewards
    .map(reward => {
      const suffix = reward.type === 'item' ? `物品（${reward.category}）` : `技能（${reward.category}）`;
      const extra = reward.specialAttributes ? `；效果：${reward.specialAttributes}` : '';
      return `${reward.slot}. 【${reward.quality}】${suffix}：${reward.name}——${reward.description}${extra}`;
    })
    .join('\n');
}

export function buildLotteryUpdateBlock(patch: Array<Record<string, unknown>>): string {
  return `<UpdateVariable>\n<Analysis>程序已根据固定抽签结果完成奖励入账。</Analysis>\n<JSONPatch>${JSON.stringify(patch)}</JSONPatch>\n</UpdateVariable>`;
}
