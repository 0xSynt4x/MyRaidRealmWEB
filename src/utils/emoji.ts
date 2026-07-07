/**
 * Emoji 相关工具函数
 */

/**
 * 根据性别返回对应的 emoji
 * @param gender 性别文本
 * @returns emoji 字符
 */
export function getGenderEmoji(gender: string): string {
  if (!gender) return '👤';
  if (gender.includes('男')) return '🧑🏻‍🦱';
  if (gender.includes('女')) return '👩🏻‍🦰';
  return '👤';
}

/**
 * 根据严重程度返回对应的 emoji
 * @param severity 严重程度文本
 * @returns emoji 字符
 */
export function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    低: '🟡',
    中等: '🟠',
    高: '🔴',
    紧急: '🆘',
  };
  return icons[severity] || '⚪';
}

/**
 * 根据状态返回对应的 emoji
 * @param status 状态文本
 * @returns emoji 字符
 */
export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    未开始: '☐',
    进行中: '◐',
    已完成: '☑',
  };
  return icons[status] || '☐';
}
