/**
 * 玩家视角的更新日志。
 *
 * 与仓库根目录的 `CHANGELOG.md` 是两回事：那份给开发者看（带提交哈希、内部实现细节、
 * 目录名），这份只写玩家能感知的变化，会被打进产物、在首页的更新日志弹窗里展示。
 *
 * 维护方式：在 `CHANGELOG_SOURCE` 末尾追加一条即可，版本号按序号自动算，不用手改版本常量。
 * 约定：日期写 YYMMDD；每条改动控制在 15 字以内；只写玩家看得见的变化。
 */

export interface ChangelogEntry {
  /** 版本号，形如 `1.10` */
  version: string;
  /** 日期，YYMMDD */
  date: string;
  /** 当天玩家能感知的改动，每条不超过 15 字 */
  items: string[];
}

/** 版本号基数：最早一条为 1.00，之后每追加一条 +0.01 */
const BASE_VERSION_CENT = 100;

/** 本地存储键：记住玩家已经看过哪个版本的更新日志 */
const SEEN_VERSION_STORAGE_KEY = 'th1980s:changelog-seen-version';

/** 按时间从早到晚排列，新条目追加在末尾 */
const CHANGELOG_SOURCE: ReadonlyArray<{ date: string; items: readonly string[] }> = [
  { date: '260707', items: ['游戏首次上线'] },
  { date: '260709', items: ['修复签到积分被覆盖'] },
  { date: '260913', items: ['底层重构，无界面变化'] },
  {
    date: '260920',
    items: ['界面扁平化改版', '新增天气场景横幅', '本地文生图上线', '封面加入场动画', '封面背景音乐上线'],
  },
  {
    date: '260921',
    items: ['正文显示区域加宽', '插图可放大查看', '音乐开关与音量记忆', '修复世界书条目丢失'],
  },
  {
    date: '260922',
    items: ['新增阶段总结归档', '生图节点识别更准', '首页可挑存档继续游戏', '修复世界书重复注入'],
  },
  {
    date: '260923',
    items: ['主辅API合并为API池', '修复存档被撑爆风险', '预设库体积大幅缩小'],
  },
  {
    date: '260924',
    items: ['存档迁移到本地数据库', '修复预设更新不生效', '重置游戏改名回到首页'],
  },
  { date: '260925', items: ['生图新增云端后端', '正文插图可折叠'] },
  { date: '260926', items: ['新增上下文裁剪设置', '画风预置改为分组', '生图种子可固定复现'] },
  { date: '260927', items: ['更新日志弹窗上线'] },
  {
    date: '260928',
    items: [
      '生图支持自动出图',
      '出图可随时放弃',
      '修复插图卡在生成中',
      '编辑消息可改小总结',
      '修复正文标签丢失',
      '变量更新失败可重试',
    ],
  },
  {
    date: '260929',
    items: [
      'API 配置可一键复制',
      '变量更新失败自动换API',
      '面板与按钮样式统一',
      'API 首字超时可中断',
      '修复引号导致文字变色',
      '修复面板顶部样式',
      '每回合自动存档',
      '移除顶栏存档按钮',
    ],
  },
  {
    date: '261001',
    items: ['调试页可回看失败请求', '出图遇限流自动重试', '变量更新报错可定位'],
  },
  {
    date: '261002',
    items: ['新增NPC不再撞编号', '补丁报错提示更准确'],
  },
  {
    date: '261005',
    items: ['抽奖不再推进剧情', '抽奖失败可重来', '抽奖可单独配 API', '回滚时积分一起退回'],
  },
  {
    date: '261006',
    items: ['抽奖物品贴合最近剧情'],
  },
];

/** 第 `index` 条（从 0 起）对应的版本号 */
function formatVersion(index: number): string {
  return ((BASE_VERSION_CENT + index) / 100).toFixed(2);
}

/** 全部更新日志，最新在最前 */
export function getChangelogEntries(): ChangelogEntry[] {
  return CHANGELOG_SOURCE.map((entry, index) => ({
    version: formatVersion(index),
    date: entry.date,
    items: [...entry.items],
  })).reverse();
}

/** 当前版本号（最新一条的版本） */
export function getCurrentVersion(): string {
  return formatVersion(CHANGELOG_SOURCE.length - 1);
}

/**
 * 是否该弹更新日志：当前版本没看过才弹。
 * 本地存储读不到（隐私模式等）时按「该弹」处理，宁可多弹一次也别漏掉新版本说明。
 */
export function shouldShowChangelog(): boolean {
  try {
    return localStorage.getItem(SEEN_VERSION_STORAGE_KEY) !== getCurrentVersion();
  } catch {
    return true;
  }
}

/** 记下玩家已看过当前版本，下次打开不再弹 */
export function markChangelogSeen(): void {
  try {
    localStorage.setItem(SEEN_VERSION_STORAGE_KEY, getCurrentVersion());
  } catch {
    // 本地存储不可用时静默跳过：下次打开再弹一次而已，不影响游戏
  }
}
