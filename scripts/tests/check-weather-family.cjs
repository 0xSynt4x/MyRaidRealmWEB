/**
 * 天气词表检查 —— 纯断言，不依赖游戏运行时，不联网、不写文件。
 *
 * 跑法：node scripts/tests/check-weather-family.cjs
 *
 * 为什么要单独跑这个：`src/utils/weatherFamily.ts` 是「顶栏天气图标 + 场景横幅选图」的
 * 唯一权威来源，表一改就可能悄悄串味 —— 比如给模糊表加了个裸「风」，
 * 「暴风雪」就会被抢成风沙；又比如特殊天象少了 `variant`，横幅就会拿极光图配彩虹。
 * 这类错**类型检查抓不到**，只能靠断言兜。
 *
 * 用跟 run-standalone-local-content-tests.cjs 同一套手法：typescript 的 transpileModule
 * 直接吃 .ts 源码，不需要先编译。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const srcPath = path.resolve(__dirname, '../../src/utils/weatherFamily.ts');
const source = fs.readFileSync(srcPath, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: srcPath,
}).outputText;

const shim = { exports: {} };
new Function('exports', 'module', 'require', js)(shim.exports, shim, require);
const { matchWeather, getWeatherFamily, getWeatherIcon, isNight, parseHour } = shim.exports;

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    passed += 1;
  } catch {
    failures.push(`${label}\n      期望 ${JSON.stringify(expected)} / 实得 ${JSON.stringify(actual)}`);
  }
}

// ---- 1. 特殊天象必须各归各的 variant（横幅靠它选图，串了就配错画面）----
const SPECIAL_VARIANTS = {
  彩虹: 'rainbow',
  极光: 'aurora',
  流星: 'meteor',
  日食: 'solar-eclipse',
  月食: 'lunar-eclipse',
};
for (const [word, variant] of Object.entries(SPECIAL_VARIANTS)) {
  const matched = matchWeather(word);
  check(`「${word}」的大类是 special`, matched && matched.family, 'special');
  check(`「${word}」的 variant 是 ${variant}`, matched && matched.variant, variant);
}
// 带后缀的口语写法也要落到对的 variant
check('「极光漫天」→ aurora', matchWeather('极光漫天').variant, 'aurora');
check('「流星雨」→ meteor', matchWeather('流星雨').variant, 'meteor');
check('「日食进行中」→ solar-eclipse', matchWeather('日食进行中').variant, 'solar-eclipse');

// ---- 2. 容易被通用字抢走的复合词 ----
check('「暴风雪」该是雪，不能被裸「风」抢成风沙', getWeatherFamily('暴风雪'), 'snow');
check('「大风降温」该是冷', getWeatherFamily('大风降温'), 'cold');
check('「寒风刺骨」该是冷', getWeatherFamily('寒风刺骨'), 'cold');
check('「阴转小雨」该是雨', getWeatherFamily('阴转小雨'), 'rain');
check('「雷阵雨」该是雨', getWeatherFamily('雷阵雨'), 'rain');
check('「雨夹雪」该是雪', getWeatherFamily('雨夹雪'), 'snow');
check('「晴间多云」该是多云', getWeatherFamily('晴间多云'), 'cloudy');

// ---- 3. 预设里真实出现过的 exotic 值 ----
check('「辐射尘暴」→ 风沙', getWeatherFamily('辐射尘暴'), 'sand');
check('「血雾弥漫」→ 雾', getWeatherFamily('血雾弥漫'), 'fog');
check('「烈日当空」→ 晴', getWeatherFamily('烈日当空'), 'sunny');

// ---- 4. 兜底：认不出必须给 unknown / 默认图标，不能崩 ----
check('空串 → unknown', getWeatherFamily(''), 'unknown');
check('「无」→ unknown', getWeatherFamily('无'), 'unknown');
check('「室内(地下设施)」→ unknown', getWeatherFamily('室内(地下设施)'), 'unknown');
check('认不出时图标走默认', getWeatherIcon(''), 'fa-solid fa-cloud-sun');

// ---- 5. 夜色三态：时间优先，天气词兜底 ----
check('12:00 + 晴（夜）不该判成夜里', isNight('1987-03-14 12:00', '晴（夜）'), false);
check('21:40 → 夜', isNight('1987-03-14 21:40', '晴'), true);
check('19:00 → 夜', isNight('1987-03-14 19:00', '晴'), true);
check('05:30 → 夜', isNight('1987-03-14 05:30', '晴'), true);
check('06:00 → 白天', isNight('1987-03-14 06:00', '晴'), false);
check('18:59 → 白天', isNight('1987-03-14 18:59', '晴'), false);
check('时间没钟点 + 晴（夜）→ 夜', isNight('天宝三载 九月廿一', '晴（夜）'), true);
check('时间没钟点 + 晴 → 白天', isNight('天宝三载 九月廿一', '晴'), false);
check('parseHour 不该从日期段里误抓', parseHour('星历 2377.088'), null);
check('parseHour 正常读钟点', parseHour('1987-03-14 21:40'), 21);

if (failures.length) {
  console.error(`天气词表检查：${passed} 项通过，${failures.length} 项失败\n`);
  failures.forEach(item => console.error(`  ✗ ${item}\n`));
  process.exit(1);
}
console.log(`天气词表检查：${passed} 项全部通过`);
