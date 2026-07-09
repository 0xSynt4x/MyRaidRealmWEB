import { Schema } from '../../schema/schema';

/**
 * 前端权威字段（frontend-authoritative fields）
 *
 * 这些字段由前端 UI（商城签到/刷新/兑换/购买等）独占维护，代表玩家当前真实持有的
 * 资源与一次性触发意图。它们**不应**随「时间线回退 / 重新发送 / 重新生成」而被历史楼层
 * 的旧快照覆盖，否则会出现：玩家在重发前刚点的签到/刷新/加积分被旧快照抹掉。
 *
 * - 设置.积分系统.商城刷新：一次性刷新触发开关（前端置 true，AI 执行后由收尾对账归零）
 * - 设置.积分系统.上次签到日期：签到日期，前端独占
 * - 玩家.货币资源.次级货币.积分.数量：积分余额，仅前端增减，AI 规则明确不可更新
 */
export const FRONTEND_AUTHORITATIVE_FIELD_PATHS = {
  /** 一次性刷新触发开关（前端置 true，AI 执行后由收尾对账归零） */
  shopRefresh: '设置.积分系统.商城刷新',
  /** 签到日期，前端独占 */
  lastSignInDate: '设置.积分系统.上次签到日期',
  /** 积分余额，仅前端增减，AI 规则明确不可更新 */
  pointsAmount: '玩家.货币资源.次级货币.积分.数量',
} as const;

export const FRONTEND_AUTHORITATIVE_PATHS = Object.values(
  FRONTEND_AUTHORITATIVE_FIELD_PATHS,
) as readonly string[];

/**
 * 把「实时 session（live）」里的前端权威字段合并进「回退后的快照（base）」。
 *
 * 用于所有「用历史楼层旧快照覆盖当前 session」的回退场景（删除楼层 / 重发 / 重新生成）：
 * 世界剧情类字段跟随旧快照回退（符合预期），但前端权威字段保留 live 里玩家的最新写入，
 * 避免玩家在回退操作前刚做的签到/刷新/积分变动被静默丢弃。
 *
 * 仅当 live 里确实存在该字段时才回写，避免把尚未初始化的结构覆盖成 undefined。
 *
 * @param base 回退目标快照（要被恢复到 session 的旧状态）
 * @param live 回退发生前的实时 session 状态（含玩家最新的前端写入）
 * @returns 合并后的新状态（base 为主，前端权威字段取 live）
 */
export function preserveFrontendAuthoritativeFields(
  base: ReturnType<typeof Schema.parse>,
  live: ReturnType<typeof Schema.parse>,
): ReturnType<typeof Schema.parse> {
  const next = _.cloneDeep(base);

  for (const path of FRONTEND_AUTHORITATIVE_PATHS) {
    if (_.has(live, path)) {
      _.set(next, path, _.get(live, path));
    }
  }

  return Schema.parse(next);
}
