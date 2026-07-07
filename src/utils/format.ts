/**
 * 格式化工具函数
 */

/**
 * 格式化货币数字
 * @param amount 金额
 * @returns 格式化后的货币字符串
 */
export function formatMoney(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化年龄
 * @param age 年龄
 * @returns 格式化后的年龄字符串
 */
export function formatAge(age: number | string): string {
  if (!age || age === '待初始化') return '年龄未知';
  if (typeof age === 'number') return `${age}岁`;
  return String(age);
}

/**
 * 获取品质等级（物品和技能共用）
 * 品质等级: 普通(灰) -> 精良(绿) -> 稀有(蓝) -> 史诗(紫) -> 传说(金)
 * @param quality 品质文本
 * @returns 等级数字 1-5
 */
export function getQualityLevel(quality: string): number {
  const levels: Record<string, number> = {
    普通: 1,
    精良: 2,
    稀有: 3,
    史诗: 4,
    传说: 5,
  };

  return levels[quality] ?? 1;
}

/**
 * 获取品质等级（技能用，与品质等级相同）
 * @param rarity 品质文本
 * @returns 等级数字 0-4
 */
export function getRarityLevel(rarity: string): number {
  return getQualityLevel(rarity);
}

/**
 * 获取严重程度等级
 * @param severity 严重程度文本
 * @returns 等级数字 1-4
 */
export function getSeverityLevel(severity: string): number {
  const levels: Record<string, number> = {
    低: 1,
    中等: 2,
    高: 3,
    紧急: 4,
  };
  return levels[severity] || 1;
}

/**
 * 获取优先级等级
 * @param priority 优先级文本
 * @returns 等级数字 1-4
 */
export function getPriorityLevel(priority: string): number {
  const levels: Record<string, number> = {
    低: 1,
    普通: 2,
    高: 3,
    紧急: 4,
  };
  return levels[priority] || 2;
}

/**
 * 从游戏内"当前时间"字符串中提取稳定的"日期"标识，用于按天判断（如每日签到）。
 *
 * 各世界观的时间格式并不统一，例如：
 *   "1980-01-01 09:00"        -> "1980-01-01"
 *   "魔历 0032-06-01 08:00"    -> "0032-06-01"（含空格前缀，不能简单按空格取第一段）
 *   "公元2024年6月15日 19:42"  -> "公元2024年6月15日"
 *   "天佑三年三月初五 辰时"     -> "天佑三年三月初五"
 *   "宣和二年-正月初一-卯时"    -> "宣和二年-正月初一"
 *
 * 提取策略（按优先级）：
 * 1. 优先匹配标准 YYYY-MM-DD（或 Y-M-D）数字日期，兼容任意前缀/后缀。
 * 2. 匹配 中文"年月日" 形式（含数字或中文数字）。
 * 3. 兜底：剥离末尾的时间段（HH:MM / 中文时辰），用剩余整串作为日期标识。
 *
 * @param gameTime 游戏内当前时间字符串
 * @returns 归一化后的日期标识；无法解析时返回原始去空白字符串
 */
export function extractGameDate(gameTime: string): string {
  const raw = (gameTime || '').trim();
  if (!raw) return '';

  // 1) 标准数字日期 YYYY-MM-DD（分隔符可为 - / .），允许位数不定
  const numericDate = raw.match(/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,2}/);
  if (numericDate) return numericDate[0].replace(/[/.]/g, '-');

  // 2) 中文"年月日"（数字或中文数字均可）
  const cnDate = raw.match(/[\u4e00-\u9fa5\d]+年[\u4e00-\u9fa5\d]+月[\u4e00-\u9fa5\d]+[日号]/);
  if (cnDate) return cnDate[0];

  // 3) 兜底：剥离末尾的时间部分后整串比较
  //    - 阿拉伯数字时间：HH:MM(:SS)
  //    - 中文时辰：如 "辰时"/"卯时"
  const stripped = raw
    .replace(/\s*\d{1,2}:\d{2}(:\d{2})?\s*$/, '')
    .replace(/\s*[子丑寅卯辰巳午未申酉戌亥]时\s*$/, '')
    .replace(/[-/.\s]+$/, '') // 去除剥离时间后残留的尾部分隔符/空白
    .trim();

  return stripped || raw;
}
