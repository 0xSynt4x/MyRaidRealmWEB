export type RelationLevelClass = 'favor-high' | 'favor-medium' | 'favor-neutral' | 'favor-low';
export type TrustLevelClass = 'trust-high' | 'trust-medium' | 'trust-neutral' | 'trust-low';

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * 将 -100~100 的关系值转换为 0~100 进度条百分比
 */
export function getRelationPercent(value: number): number {
  return clampPercent(((value + 100) / 200) * 100);
}

export function getFavorClass(favor: number): RelationLevelClass {
  if (favor >= 60) return 'favor-high';
  if (favor >= 20) return 'favor-medium';
  if (favor >= -20) return 'favor-neutral';
  return 'favor-low';
}

export function getTrustClass(trust: number): TrustLevelClass {
  if (trust >= 60) return 'trust-high';
  if (trust >= 20) return 'trust-medium';
  if (trust >= -20) return 'trust-neutral';
  return 'trust-low';
}
