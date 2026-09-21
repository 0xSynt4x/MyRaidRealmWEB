/**
 * 「攒够多少条小总结才提示归档」的档位定义。
 *
 * 单独放一个文件是为了避开循环依赖：设置仓库要存这个值，
 * 归档逻辑要读设置仓库，两者都需要这份档位表，谁也不能从对方那儿拿。
 */
export const STAGE_SUMMARY_THRESHOLD_OPTIONS = [100, 200, 300, 500] as const;

export const DEFAULT_STAGE_SUMMARY_THRESHOLD = STAGE_SUMMARY_THRESHOLD_OPTIONS[0];

export function normalizeStageSummaryThreshold(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_STAGE_SUMMARY_THRESHOLD;
  }

  return (STAGE_SUMMARY_THRESHOLD_OPTIONS as readonly number[]).includes(numeric)
    ? numeric
    : DEFAULT_STAGE_SUMMARY_THRESHOLD;
}
