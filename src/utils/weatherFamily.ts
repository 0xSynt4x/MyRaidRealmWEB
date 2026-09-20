/**
 * 天气词表 —— 项目里唯一权威来源。
 *
 * 出处：`src/assets/standalone-local-content/variable-update-rules.txt` 第 60~75 行。
 * AI 更新变量时被建议使用这些词（原话「推荐使用标准天气词以获得正确图标显示」），
 * 并注明「可组合描述如'阴转小雨'，系统会匹配包含的关键词」—— 所以判定要支持模糊包含。
 *
 * 这张表同时喂两个地方，别各写一份：
 *   1. 顶栏的天气图标（HeaderBar）
 *   2. 场景横幅的底图分类（SceneBanner —— 按 family 选氛围图）
 *
 * ⚠️ `当前天气` 在 schema 里是自由字符串（z.string()，无枚举约束），
 *    词表只是"推荐"。实际可能出现「辐射尘暴」「血雾弥漫」「无」「室内(地下设施)」这类值，
 *    所以匹配失败必须能兜底（返回 unknown / 默认图标），不能崩。
 */

/** 天气大类 —— 横幅按这个挑底图 */
export type WeatherFamily =
  | 'sunny' // 晴
  | 'cloudy' // 多云
  | 'overcast' // 阴
  | 'rain' // 雨
  | 'snow' // 雪
  | 'fog' // 雾霾
  | 'sand' // 风沙
  | 'special' // 彩虹 / 极光 / 流星
  | 'heat' // 酷热 / 炎热
  | 'cold' // 寒冷 / 严寒 / 冰冻
  | 'unknown'; // 空值或没匹配上 —— 走兜底

/**
 * 特殊天象的细分。
 *
 * 「彩虹 / 极光 / 流星 / 日食 / 月食」都归 `special` 大类，但它们长得完全不一样 ——
 * 挂一张图盖五种，挑哪张都会跟另外四种对不上。所以这里再细一层，让横幅能按「哪一种」选图。
 */
export type WeatherVariant = 'rainbow' | 'aurora' | 'meteor' | 'solar-eclipse' | 'lunar-eclipse';

export interface WeatherMatch {
  family: WeatherFamily;
  icon: string;
  /** 只有特殊天象会带；其余大类为 undefined */
  variant?: WeatherVariant;
}

const DEFAULT_ICON = 'ti ti-sun-wind';

/**
 * 精确匹配表：key 与天气文本完全相等时命中。
 * 把「带括号」「带系列说明」的写法都列进来，避免被模糊匹配抢先。
 */
const EXACT_TABLE: Record<string, WeatherMatch> = {
  // ===== 晴天系列 =====
  晴: { family: 'sunny', icon: 'ti ti-sun' },
  晴天: { family: 'sunny', icon: 'ti ti-sun' },
  晴朗: { family: 'sunny', icon: 'ti ti-sun' },
  艳阳: { family: 'sunny', icon: 'ti ti-sun' },
  烈日: { family: 'sunny', icon: 'ti ti-sun' },
  '晴（夜）': { family: 'sunny', icon: 'ti ti-moon' },
  晴夜: { family: 'sunny', icon: 'ti ti-moon' },
  月明: { family: 'sunny', icon: 'ti ti-moon' },
  星空: { family: 'sunny', icon: 'ti ti-star' },

  // ===== 多云系列 =====
  多云: { family: 'cloudy', icon: 'ti ti-sun-wind' },
  少云: { family: 'cloudy', icon: 'ti ti-sun-wind' },
  晴间多云: { family: 'cloudy', icon: 'ti ti-sun-wind' },
  '多云（夜）': { family: 'cloudy', icon: 'ti ti-moon-stars' },
  多云夜: { family: 'cloudy', icon: 'ti ti-moon-stars' },

  // ===== 阴天系列 =====
  阴: { family: 'overcast', icon: 'ti ti-cloud' },
  阴天: { family: 'overcast', icon: 'ti ti-cloud' },
  阴沉: { family: 'overcast', icon: 'ti ti-cloud' },
  密云: { family: 'overcast', icon: 'ti ti-cloud' },
  乌云: { family: 'overcast', icon: 'ti ti-cloud' },

  // ===== 雨天系列 =====
  小雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  微雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  细雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  毛毛雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  阵雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  中雨: { family: 'rain', icon: 'ti ti-cloud-storm' },
  大雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  暴雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  倾盆大雨: { family: 'rain', icon: 'ti ti-cloud-rain' },
  雷雨: { family: 'rain', icon: 'ti ti-cloud-bolt' },
  雷暴: { family: 'rain', icon: 'ti ti-cloud-bolt' },
  雷阵雨: { family: 'rain', icon: 'ti ti-cloud-bolt' },
  冰雹: { family: 'rain', icon: 'ti ti-cloud-storm' },

  // ===== 雪天系列 =====
  雪: { family: 'snow', icon: 'ti ti-snowflake' },
  小雪: { family: 'snow', icon: 'ti ti-snowflake' },
  中雪: { family: 'snow', icon: 'ti ti-snowflake' },
  大雪: { family: 'snow', icon: 'ti ti-snowflake' },
  暴雪: { family: 'snow', icon: 'ti ti-snowflake' },
  雨夹雪: { family: 'snow', icon: 'ti ti-cloud-rain' },
  冻雨: { family: 'cold', icon: 'ti ti-snowflake' },

  // ===== 雾霾系列 =====
  雾: { family: 'fog', icon: 'ti ti-mist' },
  薄雾: { family: 'fog', icon: 'ti ti-mist' },
  浓雾: { family: 'fog', icon: 'ti ti-mist' },
  大雾: { family: 'fog', icon: 'ti ti-mist' },
  霾: { family: 'fog', icon: 'ti ti-mist' },
  雾霾: { family: 'fog', icon: 'ti ti-mist' },

  // ===== 风沙系列 =====
  风: { family: 'sand', icon: 'ti ti-wind' },
  大风: { family: 'sand', icon: 'ti ti-wind' },
  狂风: { family: 'sand', icon: 'ti ti-wind' },
  台风: { family: 'sand', icon: 'ti ti-wind' },
  飓风: { family: 'sand', icon: 'ti ti-wind' },
  龙卷风: { family: 'sand', icon: 'ti ti-tornado' },
  沙尘: { family: 'sand', icon: 'ti ti-wind' },
  沙尘暴: { family: 'sand', icon: 'ti ti-wind' },
  扬沙: { family: 'sand', icon: 'ti ti-wind' },

  // ===== 特殊天气 =====
  彩虹: { family: 'special', icon: 'ti ti-rainbow', variant: 'rainbow' },
  极光: { family: 'special', icon: 'ti ti-wand', variant: 'aurora' },
  流星: { family: 'special', icon: 'ti ti-meteor', variant: 'meteor' },
  日食: { family: 'special', icon: 'ti ti-circle', variant: 'solar-eclipse' },
  月食: { family: 'special', icon: 'ti ti-moon', variant: 'lunar-eclipse' },

  // ===== 温度相关 =====
  酷热: { family: 'heat', icon: 'ti ti-temperature-sun' },
  炎热: { family: 'heat', icon: 'ti ti-temperature-sun' },
  燥热: { family: 'heat', icon: 'ti ti-temperature-sun' },
  闷热: { family: 'heat', icon: 'ti ti-temperature-sun' },
  温暖: { family: 'sunny', icon: 'ti ti-temperature' },
  凉爽: { family: 'cloudy', icon: 'ti ti-temperature' },
  寒冷: { family: 'cold', icon: 'ti ti-temperature-snow' },
  严寒: { family: 'cold', icon: 'ti ti-temperature-snow' },
  冰冻: { family: 'cold', icon: 'ti ti-temperature-minus' },
};

/**
 * 模糊匹配表：天气文本**包含** key 即命中。
 * 顺序即优先级 —— 复合词（"阴转小雨""雷阵雨"）要靠它落到合适的大类。
 */
const FUZZY_TABLE: Array<[string, WeatherMatch]> = [
  // 先判特殊 & 温度，避免被"云/雨"这类通用字抢走
  ['极光', { family: 'special', icon: 'ti ti-wand', variant: 'aurora' }],
  ['流星', { family: 'special', icon: 'ti ti-meteor', variant: 'meteor' }],
  ['彩虹', { family: 'special', icon: 'ti ti-rainbow', variant: 'rainbow' }],
  ['日食', { family: 'special', icon: 'ti ti-circle', variant: 'solar-eclipse' }],
  ['月食', { family: 'special', icon: 'ti ti-moon', variant: 'lunar-eclipse' }],
  ['酷热', { family: 'heat', icon: 'ti ti-temperature-sun' }],
  ['炎热', { family: 'heat', icon: 'ti ti-temperature-sun' }],
  ['燥热', { family: 'heat', icon: 'ti ti-temperature-sun' }],
  ['闷热', { family: 'heat', icon: 'ti ti-temperature-sun' }],
  ['严寒', { family: 'cold', icon: 'ti ti-temperature-snow' }],
  ['寒冷', { family: 'cold', icon: 'ti ti-temperature-snow' }],
  ['冰冻', { family: 'cold', icon: 'ti ti-temperature-minus' }],
  ['冻雨', { family: 'cold', icon: 'ti ti-snowflake' }],
  // 带后缀的口语写法（"大风降温""寒风刺骨"）—— 词表里没列，但实际会写
  ['降温', { family: 'cold', icon: 'ti ti-temperature-snow' }],
  ['寒风', { family: 'cold', icon: 'ti ti-temperature-snow' }],
  ['烈日', { family: 'sunny', icon: 'ti ti-sun' }],

  // 沙 / 尘 —— 预设里出现过「辐射尘暴」
  // ⚠️ 别加裸「风」："暴风雪"含"风"，会被抢成风沙，而它该是雪
  ['沙尘暴', { family: 'sand', icon: 'ti ti-wind' }],
  ['大风', { family: 'sand', icon: 'ti ti-wind' }],
  ['狂风', { family: 'sand', icon: 'ti ti-wind' }],
  ['尘暴', { family: 'sand', icon: 'ti ti-wind' }],
  ['龙卷风', { family: 'sand', icon: 'ti ti-tornado' }],
  ['台风', { family: 'sand', icon: 'ti ti-wind' }],
  ['飓风', { family: 'sand', icon: 'ti ti-wind' }],
  ['沙尘', { family: 'sand', icon: 'ti ti-wind' }],
  ['扬沙', { family: 'sand', icon: 'ti ti-wind' }],

  // 雾 / 霾 —— 「血雾弥漫」「虚空迷雾」这类 exotic 值落这里
  ['雾霾', { family: 'fog', icon: 'ti ti-mist' }],
  ['浓雾', { family: 'fog', icon: 'ti ti-mist' }],
  ['薄雾', { family: 'fog', icon: 'ti ti-mist' }],
  ['大雾', { family: 'fog', icon: 'ti ti-mist' }],
  ['迷雾', { family: 'fog', icon: 'ti ti-mist' }],
  ['血雾', { family: 'fog', icon: 'ti ti-mist' }],
  ['霾', { family: 'fog', icon: 'ti ti-mist' }],
  ['雾', { family: 'fog', icon: 'ti ti-mist' }],

  // 雨
  ['雷暴', { family: 'rain', icon: 'ti ti-cloud-bolt' }],
  ['雷雨', { family: 'rain', icon: 'ti ti-cloud-bolt' }],
  ['雷阵雨', { family: 'rain', icon: 'ti ti-cloud-bolt' }],
  ['冰雹', { family: 'rain', icon: 'ti ti-cloud-storm' }],
  ['暴雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['大雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['中雨', { family: 'rain', icon: 'ti ti-cloud-storm' }],
  ['毛毛雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['细雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['小雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['微雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['阵雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],
  ['雨', { family: 'rain', icon: 'ti ti-cloud-rain' }],

  // 雪
  ['雨夹雪', { family: 'snow', icon: 'ti ti-cloud-rain' }],
  ['暴雪', { family: 'snow', icon: 'ti ti-snowflake' }],
  ['雪', { family: 'snow', icon: 'ti ti-snowflake' }],

  // 阴 / 云 / 晴
  ['阴沉', { family: 'overcast', icon: 'ti ti-cloud' }],
  ['密云', { family: 'overcast', icon: 'ti ti-cloud' }],
  ['乌云', { family: 'overcast', icon: 'ti ti-cloud' }],
  ['阴', { family: 'overcast', icon: 'ti ti-cloud' }],
  ['晴间多云', { family: 'cloudy', icon: 'ti ti-sun-wind' }],
  ['少云', { family: 'cloudy', icon: 'ti ti-sun-wind' }],
  ['多云', { family: 'cloudy', icon: 'ti ti-sun-wind' }],
  ['星空', { family: 'sunny', icon: 'ti ti-star' }],
  ['月明', { family: 'sunny', icon: 'ti ti-moon' }],
  ['晴', { family: 'sunny', icon: 'ti ti-sun' }],
];

/** 匹配天气，命中不到返回 null（调用方自己兜底） */
export function matchWeather(weather: string): WeatherMatch | null {
  const text = (weather || '').trim();
  if (!text) return null;

  const exact = EXACT_TABLE[text];
  if (exact) return exact;

  for (const [key, value] of FUZZY_TABLE) {
    if (text.includes(key)) return value;
  }

  return null;
}

/** 取天气图标（给顶栏用）；没匹配上给默认图标，不会返回空 */
export function getWeatherIcon(weather: string): string {
  return matchWeather(weather)?.icon ?? DEFAULT_ICON;
}

/** 取天气大类（给场景横幅挑底图用）；没匹配上返回 unknown */
export function getWeatherFamily(weather: string): WeatherFamily {
  return matchWeather(weather)?.family ?? 'unknown';
}

/** 天气词本身带夜色信号（时间字段解析不出小时时的退路） */
export function isNightWeather(weather: string): boolean {
  const text = (weather || '').trim();
  return text.includes('夜') || text.includes('月明') || text.includes('星空');
}

/**
 * 从时间文本里读出小时；读不出来返回 null。
 *
 * `当前时间` 是纪元相关的自由文本（"1987-03-14 21:40" / "天宝三载 九月廿一" / "星历 2377.088"），
 * 没有统一格式，所以只抓 24 小时制的 `H:MM` / `HH:MM`。
 * 正则要求冒号前不是数字，避免从 "1987:03" 这类日期段里截出奇怪的小时。
 */
export function parseHour(timeText: string): number | null {
  const text = (timeText || '').trim();
  if (!text) return null;

  const matched = /(?:^|\D)(\d{1,2}):(\d{2})/.exec(text);
  if (!matched) return null;

  const hour = Number(matched[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;

  return hour;
}

/**
 * 是不是夜里 —— 决定横幅要不要压暗。
 *
 * 时间优先：能从时间文本里读出小时，就以它为准（19 点至次日 6 点算夜）；
 * 读不出来（纪元文本里没写钟点）才退一步看天气词里带不带夜色信号。
 */
export function isNight(timeText: string, weather: string): boolean {
  const hour = parseHour(timeText);
  if (hour === null) return isNightWeather(weather);
  return hour >= 19 || hour < 6;
}
